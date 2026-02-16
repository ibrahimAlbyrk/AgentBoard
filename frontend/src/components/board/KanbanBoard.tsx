import { useState, useCallback, useRef, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  closestCenter,
  type CollisionDetection,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragMoveEvent,
  MeasuringStrategy,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useProjectStore } from '@/stores/projectStore'
import { useBoardStore } from '@/stores/boardStore'
import { useMoveTask } from '@/hooks/useTasks'
import { useExpandedTasks } from '@/hooks/useExpandedTasks'
import { useSubtasks } from '@/hooks/useSubtasks'
import { markLocalMove, flushPendingWSUpdates } from '@/hooks/useWebSocket'
import { calculateInsertPosition } from '@/lib/position'
import { BoardColumn } from './BoardColumn'
import { TaskCard } from './TaskCard'
import { TaskAnimationLayer, startFlight, getCardRect } from './TaskAnimationLayer'
import type { Task } from '@/types'

/**
 * Collision detection for multi-container Kanban board.
 *
 * Uses pointerWithin to find the target column, then closestCenter among
 * that column's tasks. Both use cached droppableRects (pre-transform),
 * avoiding the stale-rect bug caused by reading getBoundingClientRect()
 * on CSS-transformed elements.
 */
const kanbanCollision: CollisionDetection = (args) => {
  // 1. Find which column(s) the pointer is within
  const pointerCollisions = pointerWithin(args)
  const columnHit = pointerCollisions.find((c) => String(c.id).startsWith('column-'))

  if (!columnHit) {
    // Pointer not inside any column — fall back to global closestCenter
    return closestCenter(args)
  }

  const columnRect = args.droppableRects.get(columnHit.id)
  if (!columnRect) return closestCenter(args)

  // 2. Filter to only tasks inside the hit column (using cached rects)
  const tasksInColumn = args.droppableContainers.filter((entry) => {
    if (entry.id === args.active.id || entry.disabled) return false
    if (String(entry.id).startsWith('column-')) return false
    const rect = args.droppableRects.get(entry.id)
    if (!rect) return false
    const cx = rect.left + rect.width / 2
    return cx >= columnRect.left && cx <= columnRect.right
  })

  // 3. Empty column → return column droppable
  if (tasksInColumn.length === 0) {
    return [{ id: columnHit.id, data: { droppableContainer: undefined } }]
  }

  // 4. Find closest task within the column using closestCenter
  // closestCenter gives more predictable collision for vertical lists
  const collisions = closestCenter({
    ...args,
    droppableContainers: tasksInColumn,
  })

  return collisions.length > 0 ? collisions : [{ id: columnHit.id, data: { droppableContainer: undefined } }]
}

interface KanbanBoardProps {
  onTaskClick: (task: Task) => void
  onAddTask: (statusId: string) => void
  compact?: boolean
}

function ExpandedSubtasks({ projectId, boardId, taskId, onTaskClick }: { projectId: string; boardId: string; taskId: string; onTaskClick: (task: Task) => void }) {
  const { data } = useSubtasks(projectId, boardId, taskId)
  const subtasks = data?.data ?? []
  if (subtasks.length === 0) return null
  const sorted = [...subtasks].sort((a, b) => a.position - b.position)
  return (
    <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] space-y-1">
      {sorted.map((s) => (
        <button
          key={s.id}
          onClick={(e) => { e.stopPropagation(); onTaskClick(s) }}
          className="w-full flex items-center gap-1.5 py-1 px-1 rounded text-left hover:bg-[var(--overlay)] transition-colors"
        >
          <span
            className="size-2 rounded-full shrink-0 border"
            style={{
              backgroundColor: s.completed_at ? 'rgb(16, 185, 129)' : `${s.status.color ?? 'var(--text-tertiary)'}30`,
              borderColor: s.completed_at ? 'rgb(16, 185, 129)' : s.status.color ?? 'var(--text-tertiary)',
            }}
          />
          <span
            className="text-[11px] truncate"
            style={{
              textDecoration: s.completed_at ? 'line-through' : undefined,
              color: s.completed_at ? 'var(--text-tertiary)' : undefined,
            }}
          >
            {s.title}
          </span>
        </button>
      ))}
    </div>
  )
}

export function KanbanBoard({ onTaskClick, onAddTask, compact }: KanbanBoardProps) {
  const { statuses, currentProject, currentBoard } = useProjectStore()
  const { tasksByStatus, filters } = useBoardStore()
  const getFilteredTasks = useBoardStore((s) => s.getFilteredTasks)
  const moveTask = useMoveTask(currentProject?.id ?? '', currentBoard?.id ?? '')
  const { isExpanded, toggle } = useExpandedTasks(currentBoard?.id ?? '')
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [draggedCardHeight, setDraggedCardHeight] = useState(72)
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null)
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const prevDelta = useRef({ x: 0, y: 0 })
  const dragSnapshotRef = useRef<Record<string, Task[]> | null>(null)

  // Memoize filtered tasks per column — prevents new array refs on every render
  // which would cause dnd-kit to reset its internal sort state mid-drag
  const latestFilteredMap = useMemo(() => {
    const result: Record<string, Task[]> = {}
    for (const status of statuses) {
      result[status.id] = getFilteredTasks(status.id)
    }
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statuses, tasksByStatus, filters])

  // During drag, freeze filtered tasks so WS updates don't break dnd-kit sort state
  const filteredTasksMap = dragSnapshotRef.current ?? latestFilteredMap

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  // Re-measure droppables during drag so collision detection uses current rects.
  // WhileDragging avoids the oscillation that MeasuringStrategy.Always causes,
  // while keeping rects up-to-date as items shift.
  const measuring = useMemo(() => ({
    droppable: { strategy: MeasuringStrategy.WhileDragging },
  }), [])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const taskId = String(event.active.id)
    prevDelta.current = { x: 0, y: 0 }
    setTilt({ x: 0, y: 0 })

    // Measure the card's actual height for placeholder sizing
    const cardRect = getCardRect(taskId)
    if (cardRect) {
      setDraggedCardHeight(cardRect.height)
    }

    // Freeze filtered tasks during drag so WS updates don't break dnd-kit
    useBoardStore.getState().setIsDragging(true)
    dragSnapshotRef.current = latestFilteredMap

    const fresh = useBoardStore.getState().tasksByStatus
    for (const tasks of Object.values(fresh)) {
      const task = tasks.find((t) => t.id === taskId)
      if (task) {
        setActiveTask(task)
        setDragOverColumnId(task.status.id)
        setDragOverItemId(null)
        break
      }
    }
  }, [latestFilteredMap])

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const { delta } = event
    const velocityX = delta.x - prevDelta.current.x
    const velocityY = delta.y - prevDelta.current.y
    prevDelta.current = { x: delta.x, y: delta.y }

    // Clamp tilt: max ±12 degrees, velocity drives the angle
    const maxTilt = 12
    const sensitivity = 0.6
    const tiltY = Math.max(-maxTilt, Math.min(maxTilt, velocityX * sensitivity))
    const tiltX = Math.max(-maxTilt, Math.min(maxTilt, -velocityY * sensitivity))
    setTilt({ x: tiltX, y: tiltY })
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event
    if (!over || !activeTask) return

    const overId = String(over.id)
    let targetColumnId: string | undefined
    let overItemId: string | null = null

    if (overId.startsWith('column-')) {
      targetColumnId = overId.replace('column-', '')
    } else {
      overItemId = overId
      const fresh = useBoardStore.getState().tasksByStatus
      for (const [statusId, tasks] of Object.entries(fresh)) {
        if (tasks.some((t) => t.id === overId)) {
          targetColumnId = statusId
          break
        }
      }
    }

    if (targetColumnId) {
      setDragOverColumnId(targetColumnId)
      setDragOverItemId(overItemId)
    }
  }, [activeTask])

  const handleDragCancel = useCallback(() => {
    dragSnapshotRef.current = null
    useBoardStore.getState().setIsDragging(false)
    flushPendingWSUpdates()
    setActiveTask(null)
    setDragOverColumnId(null)
    setDragOverItemId(null)
    setTilt({ x: 0, y: 0 })
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      dragSnapshotRef.current = null
      useBoardStore.getState().setIsDragging(false)
      flushPendingWSUpdates()
      setDragOverColumnId(null)
      setDragOverItemId(null)
      const { active, over } = event
      if (!over || !activeTask) {
        setActiveTask(null)
        return
      }

      const taskId = String(active.id)
      const overId = String(over.id)
      const fromStatusId = activeTask.status.id

      // Read fresh state to avoid stale closure issues
      const freshTasksByStatus = useBoardStore.getState().tasksByStatus

      // Determine target column
      let targetStatusId: string | undefined
      if (overId.startsWith('column-')) {
        targetStatusId = overId.replace('column-', '')
      } else {
        for (const [statusId, tasks] of Object.entries(freshTasksByStatus)) {
          if (tasks.some((t) => t.id === overId)) {
            targetStatusId = statusId
            break
          }
        }
      }
      if (!targetStatusId) {
        setActiveTask(null)
        return
      }

      const columnTasks = freshTasksByStatus[targetStatusId] ?? []
      const filtered = columnTasks.filter((t) => t.id !== taskId)

      const sortedPositions = filtered.map((t) => t.position).sort((a, b) => a - b)

      let position: number
      if (overId.startsWith('column-')) {
        // Dropped on empty column area → append to end
        position = calculateInsertPosition(sortedPositions, filtered.length)
      } else if (fromStatusId === targetStatusId) {
        // Same column reorder — compare positions to determine direction
        const overIdxInFiltered = filtered.findIndex((t) => t.id === overId)
        if (overIdxInFiltered === -1) {
          // No-op — animate back
          const translated = active.rect.current.translated
          if (translated) {
            startFlight(taskId, activeTask, new DOMRect(translated.left, translated.top, translated.width, translated.height), true)
          }
          setActiveTask(null)
          return
        }
        // Use position values (not array indices) to determine drag direction
        const overPosition = filtered[overIdxInFiltered]?.position ?? 0
        const draggingDown = activeTask.position < overPosition
        const insertIdx = draggingDown ? overIdxInFiltered + 1 : overIdxInFiltered
        position = calculateInsertPosition(sortedPositions, insertIdx)
      } else {
        // Cross column: insert at the over task's position
        const overIdx = filtered.findIndex((t) => t.id === overId)
        const insertIdx = overIdx === -1 ? filtered.length : overIdx
        position = calculateInsertPosition(sortedPositions, insertIdx)
      }

      // Animate back to position
      const translated = active.rect.current.translated
      if (translated) {
        const fromRect = new DOMRect(translated.left, translated.top, translated.width, translated.height)
        startFlight(taskId, activeTask, fromRect, true)
      }

      // No-op if nothing changed
      if (fromStatusId === targetStatusId && activeTask.position === position) {
        setActiveTask(null)
        return
      }

      // Capture store snapshot before optimistic update (for error rollback)
      const prevSnapshot: Record<string, Task[]> = {}
      for (const [sid, tasks] of Object.entries(freshTasksByStatus)) {
        prevSnapshot[sid] = [...tasks]
      }

      // Mark as local drag so WS echo won't re-animate
      markLocalMove(taskId)

      // Optimistic update first — ensures task is visible in new position
      useBoardStore.getState().moveTask(taskId, fromStatusId, targetStatusId, position)

      // Clear overlay AFTER optimistic update so there's no visual gap
      setActiveTask(null)

      moveTask.mutate({
        taskId,
        fromStatusId,
        data: { status_id: targetStatusId, position },
        _prevSnapshot: prevSnapshot,
      })
    },
    [activeTask, moveTask]
  )

  // Placeholder: index where a gap should appear in the target column during drag.
  const getPlaceholderIdx = (statusId: string): number => {
    if (!activeTask || dragOverColumnId !== statusId) return -1

    const tasks = filteredTasksMap[statusId] ?? []

    if (activeTask.status.id === statusId) {
      // Same-column: show placeholder at hover position (skip if no over item)
      if (!dragOverItemId || dragOverItemId === activeTask.id) return -1
      const idx = tasks.findIndex(t => t.id === dragOverItemId)
      return idx === -1 ? -1 : idx
    }

    // Cross-column
    if (!dragOverItemId) return tasks.length
    const idx = tasks.findIndex(t => t.id === dragOverItemId)
    if (idx === -1) return tasks.length
    return idx
  }

  // Use fresh task data from store for overlay (handles WS updates during drag)
  const freshOverlayTask = activeTask
    ? (Object.values(tasksByStatus).flat().find(t => t.id === activeTask.id) ?? activeTask)
    : null

  const announcements = useMemo(() => ({
    onDragStart({ active }: { active: { id: string | number } }) {
      return `Picked up task ${active.id}`
    },
    onDragOver({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) {
      return over ? `Task ${active.id} is over ${over.id}` : `Task ${active.id} is not over a droppable area`
    },
    onDragEnd({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) {
      return over ? `Task ${active.id} was dropped on ${over.id}` : `Task ${active.id} was dropped`
    },
    onDragCancel({ active }: { active: { id: string | number } }) {
      return `Dragging was cancelled. Task ${active.id} was dropped`
    },
  }), [])

  // Stable callback refs per status to prevent BoardColumn re-renders
  const addTaskCallbacks = useMemo(() => {
    const map: Record<string, () => void> = {}
    for (const status of statuses) {
      map[status.id] = () => onAddTask(status.id)
    }
    return map
  }, [statuses, onAddTask])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={kanbanCollision}
      measuring={measuring}
      accessibility={{ announcements }}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 p-6 overflow-x-auto min-h-[200px]">
        {statuses.map((status) => (
          <BoardColumn
            key={status.id}
            status={status}
            tasks={filteredTasksMap[status.id] ?? []}
            onTaskClick={onTaskClick}
            onAddTask={addTaskCallbacks[status.id]}
            placeholderIdx={getPlaceholderIdx(status.id)}
            placeholderHeight={draggedCardHeight}
            hideDragSourceId={
              activeTask && dragOverColumnId && dragOverColumnId !== activeTask.status.id && activeTask.status.id === status.id
                ? activeTask.id
                : undefined
            }
            compact={compact}
            isTaskExpanded={isExpanded}
            onToggleExpand={toggle}
            renderExpandedContent={(t) => (
              <ExpandedSubtasks
                projectId={currentProject?.id ?? ''}
                boardId={currentBoard?.id ?? ''}
                taskId={t.id}
                onTaskClick={onTaskClick}
              />
            )}
          />
        ))}
      </div>

      <TaskAnimationLayer />

      <DragOverlay dropAnimation={null}>
        {freshOverlayTask && (
          <div aria-hidden="true" style={{
            perspective: 600,
          }}>
            <div style={{
              transform: `scale(1.03) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              transition: 'transform 150ms ease-out',
              transformStyle: 'preserve-3d',
              boxShadow: `${-tilt.y * 0.5}px ${tilt.x * 0.5 + 12}px 40px -8px rgba(0,0,0,0.35)`,
              borderRadius: 12,
            }}>
              <TaskCard task={freshOverlayTask} onClick={() => {}} isDragOverlay compact={compact} />
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
