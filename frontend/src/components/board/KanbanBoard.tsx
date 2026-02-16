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
import { markLocalMove } from '@/hooks/useWebSocket'
import { calculateInsertPosition } from '@/lib/position'
import { BoardColumn } from './BoardColumn'
import { TaskCard } from './TaskCard'
import { TaskAnimationLayer, startFlight, getCardRect } from './TaskAnimationLayer'
import type { Task } from '@/types'

/** Find a droppable container by id from the array */
const findContainer = (containers: Parameters<CollisionDetection>[0]['droppableContainers'], id: string | number) =>
  containers.find((c) => c.id === id)

/** Find the column droppable whose horizontal band contains the pointer. */
const findColumnAtPointer = (args: Parameters<CollisionDetection>[0]) => {
  const px = args.pointerCoordinates?.x ?? 0
  for (const entry of args.droppableContainers) {
    const id = String(entry.id)
    if (!id.startsWith('column-') || entry.disabled) continue
    const node = entry.node.current
    if (!node) continue
    const rect = node.getBoundingClientRect()
    if (px >= rect.left && px <= rect.right) {
      return { id: entry.id, rect }
    }
  }
  return null
}

/**
 * Custom collision detection using "between-midpoints" with LIVE DOM rects.
 *
 * Uses getBoundingClientRect() instead of cached droppableRects so that
 * CSS transforms applied by verticalListSortingStrategy are accounted for.
 * This eliminates the stale-rect problem that caused tasks not to shift
 * correctly during drag.
 */
const kanbanCollision: CollisionDetection = (args) => {
  const withinCollisions = pointerWithin(args)

  // Find column via pointerWithin or horizontal band fallback
  const withinColumn = withinCollisions.find((c) =>
    String(c.id).startsWith('column-'),
  )

  let col: { id: string | number; rect: DOMRect } | null = null
  if (withinColumn) {
    const entry = findContainer(args.droppableContainers, withinColumn.id)
    const node = entry?.node.current
    if (node) col = { id: withinColumn.id, rect: node.getBoundingClientRect() }
  }
  if (!col) col = findColumnAtPointer(args)
  if (!col) return closestCenter(args)

  const columnRect = col.rect
  const pointerY = args.pointerCoordinates?.y ?? 0

  // Collect tasks in this column (excluding active) using live DOM rects
  const tasksInColumn: { id: string | number; rect: DOMRect }[] = []
  for (const entry of args.droppableContainers) {
    const id = entry.id
    if (id === args.active.id || entry.disabled || String(id).startsWith('column-')) continue
    const node = entry.node.current
    if (!node) continue
    const rect = node.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    if (cx >= columnRect.left && cx <= columnRect.right) {
      tasksInColumn.push({ id, rect })
    }
  }
  tasksInColumn.sort((a, b) => a.rect.top - b.rect.top)

  // Empty column → return column droppable
  if (tasksInColumn.length === 0) {
    return [{ id: col.id, data: { droppableContainer: undefined } }]
  }

  // Pointer above first task's midpoint → target first task
  const firstMid = tasksInColumn[0].rect.top + tasksInColumn[0].rect.height / 2
  if (pointerY <= firstMid) {
    return [{ id: tasksInColumn[0].id, data: { droppableContainer: undefined } }]
  }

  // "between-midpoints" — find which gap the pointer sits in
  for (let i = 0; i < tasksInColumn.length - 1; i++) {
    const nextMid = tasksInColumn[i + 1].rect.top + tasksInColumn[i + 1].rect.height / 2
    if (pointerY <= nextMid) {
      return [{ id: tasksInColumn[i + 1].id, data: { droppableContainer: undefined } }]
    }
  }

  // Pointer past last task's midpoint
  // Same-column: return last task so verticalListSortingStrategy can shift
  // Cross-column: return column ID to signal "append to end"
  const activeEntry = findContainer(args.droppableContainers, args.active.id)
  const activeNode = activeEntry?.node.current
  if (activeNode) {
    const activeRect = activeNode.getBoundingClientRect()
    const cx = activeRect.left + activeRect.width / 2
    if (cx >= columnRect.left && cx <= columnRect.right) {
      return [{ id: tasksInColumn[tasksInColumn.length - 1].id, data: { droppableContainer: undefined } }]
    }
  }
  return [{ id: col.id, data: { droppableContainer: undefined } }]
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
  const { tasksByStatus, getFilteredTasks } = useBoardStore()
  const moveTask = useMoveTask(currentProject?.id ?? '', currentBoard?.id ?? '')
  const { isExpanded, toggle } = useExpandedTasks(currentBoard?.id ?? '')
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [draggedCardHeight, setDraggedCardHeight] = useState(72)
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null)
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const prevDelta = useRef({ x: 0, y: 0 })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  // Measure droppables once before drag starts — MeasuringStrategy.Always causes
  // oscillation where re-measured (transformed) rects reset the sort baseline
  const measuring = useMemo(() => ({
    droppable: { strategy: MeasuringStrategy.BeforeDragging },
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

    for (const tasks of Object.values(tasksByStatus)) {
      const task = tasks.find((t) => t.id === taskId)
      if (task) {
        setActiveTask(task)
        setDragOverColumnId(task.status.id)
        setDragOverItemId(null)
        break
      }
    }
  }, [tasksByStatus])

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

  // Fix 3: simplified — no more insertAfterRef
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
      for (const [statusId, tasks] of Object.entries(tasksByStatus)) {
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
  }, [activeTask, tasksByStatus])

  const handleDragCancel = useCallback(() => {
    setActiveTask(null)
    setDragOverColumnId(null)
    setDragOverItemId(null)
    setTilt({ x: 0, y: 0 })
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
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

      // Determine target column
      let targetStatusId: string | undefined
      if (overId.startsWith('column-')) {
        targetStatusId = overId.replace('column-', '')
      } else {
        for (const [statusId, tasks] of Object.entries(tasksByStatus)) {
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

      // Exclude the dragged task so position calc doesn't self-reference
      const filtered = (tasksByStatus[targetStatusId] ?? []).filter(
        (t) => t.id !== taskId,
      )

      // Fix 1 & 3: compute insertIdx matching the visual exactly.
      //
      // Same-column: verticalListSortingStrategy shows gap at overIndex.
      //   arrayMove(items, activeIdx, overIdx) puts active at overIdx.
      //   In the filtered array (active removed), the insert position is:
      //     dragging down (activeOrigIdx < overOrigIdx) → overIdxInFiltered + 1
      //     dragging up   (activeOrigIdx > overOrigIdx) → overIdxInFiltered
      //
      // Cross-column: collision returns the task AFTER the gap (between-midpoints).
      //   Always insert BEFORE the over task (= overIdxInFiltered).
      //   Column ID means "append to end".
      let insertIdx: number
      if (overId.startsWith('column-')) {
        // Dropped on empty area / column → append
        insertIdx = filtered.length
      } else if (fromStatusId === targetStatusId) {
        // Same column — match verticalListSortingStrategy visual
        const columnTasks = tasksByStatus[targetStatusId] ?? []
        const activeOrigIdx = columnTasks.findIndex((t) => t.id === taskId)
        const overOrigIdx = columnTasks.findIndex((t) => t.id === overId)
        const overIdxInFiltered = filtered.findIndex((t) => t.id === overId)

        if (overIdxInFiltered === -1) {
          insertIdx = filtered.length
        } else if (activeOrigIdx < overOrigIdx) {
          // Dragging down: visual puts active after items that shifted up
          insertIdx = overIdxInFiltered + 1
        } else {
          // Dragging up (or same position): visual puts active before over
          insertIdx = overIdxInFiltered
        }
      } else {
        // Cross column: always insert before the over task
        const overIdxInFiltered = filtered.findIndex((t) => t.id === overId)
        insertIdx = overIdxInFiltered === -1 ? filtered.length : overIdxInFiltered
      }

      // Calculate position from filtered array using shared utility
      const sortedPositions = filtered.map((t) => t.position)
      const position = calculateInsertPosition(sortedPositions, insertIdx)

      // Animate back to position (works even if nothing changed)
      const translated = active.rect.current.translated
      if (translated) {
        const fromRect = new DOMRect(translated.left, translated.top, translated.width, translated.height)
        startFlight(taskId, activeTask, fromRect, true)
      }

      // No-op if nothing changed — just animate back, no mutation
      if (fromStatusId === targetStatusId && activeTask.position === position) {
        setActiveTask(null)
        return
      }

      // Capture store snapshot before optimistic update (for error rollback)
      const prevSnapshot: Record<string, Task[]> = {}
      for (const [sid, tasks] of Object.entries(tasksByStatus)) {
        prevSnapshot[sid] = [...tasks]
      }

      // Mark as local drag so WS echo won't re-animate
      markLocalMove(taskId)

      // Optimistic update + clear overlay
      useBoardStore.getState().moveTask(taskId, fromStatusId, targetStatusId, position)
      setActiveTask(null)

      moveTask.mutate({
        taskId,
        fromStatusId,
        data: { status_id: targetStatusId, position },
        _prevSnapshot: prevSnapshot,
      })
    },
    [activeTask, tasksByStatus, moveTask]
  )

  // Cross-column placeholder: index where a gap should appear in the target column.
  // Collision returns the task AFTER the gap, so placeholder goes at that index (before it).
  const getPlaceholderIdx = (statusId: string): number => {
    if (!activeTask || dragOverColumnId !== statusId || activeTask.status.id === statusId) return -1

    const tasks = getFilteredTasks(statusId)
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
            tasks={getFilteredTasks(status.id)}
            onTaskClick={onTaskClick}
            onAddTask={() => onAddTask(status.id)}
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
