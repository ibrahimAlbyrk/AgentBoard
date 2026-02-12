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
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useProjectStore } from '@/stores/projectStore'
import { useBoardStore } from '@/stores/boardStore'
import { useMoveTask } from '@/hooks/useTasks'
import { markLocalMove } from '@/hooks/useWebSocket'
import { BoardColumn } from './BoardColumn'
import { TaskCard } from './TaskCard'
import { TaskAnimationLayer, startFlight, getCardRect } from './TaskAnimationLayer'
import type { Task } from '@/types'

/** Helper: is a droppable rect horizontally inside a column rect? */
const isInColumn = (
  id: string | number,
  r: { left: number; width: number },
  colRect: { left: number; right: number },
) => {
  if (String(id).startsWith('column-')) return false
  const cx = r.left + r.width / 2
  return cx >= colRect.left && cx <= colRect.right
}

/** Find the column droppable whose horizontal band contains the pointer. */
const findColumnAtPointer = (args: Parameters<CollisionDetection>[0]) => {
  const px = args.pointerCoordinates?.x ?? 0
  for (const [id, rect] of args.droppableRects.entries()) {
    if (String(id).startsWith('column-') && px >= rect.left && px <= rect.right) {
      return { id, rect }
    }
  }
  return null
}

/**
 * Custom collision detection for Kanban cross-column drags.
 * 1. pointerWithin for direct task hit
 * 2. Find column by horizontal band (works even above/below the droppable zone)
 * 3. closestCenter scoped to tasks inside that column
 */
const kanbanCollision: CollisionDetection = (args) => {
  const withinCollisions = pointerWithin(args)

  // Pointer directly over a task card
  const directTask = withinCollisions.find(
    (c) => !String(c.id).startsWith('column-'),
  )
  if (directTask) return [directTask]

  // Find the column — first try pointerWithin, then fall back to horizontal band lookup.
  // The fallback handles the case when the pointer is above/below the droppable zone
  // (e.g. in the column header area) where pointerWithin wouldn't match.
  const withinColumn = withinCollisions.find((c) =>
    String(c.id).startsWith('column-'),
  )
  const col = withinColumn
    ? { id: withinColumn.id, rect: args.droppableRects.get(withinColumn.id)! }
    : findColumnAtPointer(args)

  if (col) {
    const columnRect = col.rect
    if (columnRect) {
      const allClosest = closestCenter(args)
      const nearestInColumn = allClosest.find((c) => {
        const r = args.droppableRects.get(c.id)
        return r ? isInColumn(c.id, r, columnRect) : false
      })

      if (nearestInColumn) {
        const nearestRect = args.droppableRects.get(nearestInColumn.id)
        const pointerY = args.pointerCoordinates?.y ?? 0

        // Pointer below nearest task: check if it's the bottom-most in column
        if (nearestRect && pointerY > nearestRect.top + nearestRect.height) {
          const hasLowerTask = allClosest.some((c) => {
            if (c.id === nearestInColumn.id) return false
            const r = args.droppableRects.get(c.id)
            return r ? isInColumn(c.id, r, columnRect) && r.top > nearestRect.top : false
          })

          if (!hasLowerTask) {
            const activeRect = args.droppableRects.get(args.active.id)
            if (activeRect && isInColumn(args.active.id, activeRect, columnRect)) {
              return [nearestInColumn]
            }
            return [{ id: col.id, data: { droppableContainer: undefined } }]
          }
        }

        return [nearestInColumn]
      }
    }
    return [{ id: col.id, data: { droppableContainer: undefined } }]
  }

  return closestCenter(args)
}

interface KanbanBoardProps {
  onTaskClick: (task: Task) => void
  onAddTask: (statusId: string) => void
  compact?: boolean
}

export function KanbanBoard({ onTaskClick, onAddTask, compact }: KanbanBoardProps) {
  const { statuses, currentProject, currentBoard } = useProjectStore()
  const { tasksByStatus, getFilteredTasks } = useBoardStore()
  const moveTask = useMoveTask(currentProject?.id ?? '', currentBoard?.id ?? '')
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [draggedCardHeight, setDraggedCardHeight] = useState(72)
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null)
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const prevDelta = useRef({ x: 0, y: 0 })
  const insertAfterRef = useRef(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // Re-measure droppables while dragging so variable-height cards stay accurate
  const measuring = useMemo(() => ({
    droppable: { strategy: MeasuringStrategy.Always },
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
        insertAfterRef.current = false
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

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over, active } = event
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

      // Determine above/below using dragged card center vs over card center.
      // Used for both same-column and cross-column to keep placeholder + position calc consistent.
      if (overItemId) {
        const translated = active.rect.current.translated
        if (translated) {
          const activeCenterY = translated.top + translated.height / 2
          const overCenterY = over.rect.top + over.rect.height / 2
          insertAfterRef.current = activeCenterY > overCenterY
        }
      } else {
        insertAfterRef.current = false
      }
    }
  }, [activeTask, tasksByStatus])

  const handleDragCancel = useCallback(() => {
    setActiveTask(null)
    setDragOverColumnId(null)
    setDragOverItemId(null)
    setTilt({ x: 0, y: 0 })
    insertAfterRef.current = false
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

      // Determine insert index in the filtered array.
      // Use pointer-based insertAfterRef for both same-column and cross-column
      // instead of original-index heuristic which breaks with variable-height cards.
      let insertIdx: number
      if (overId.startsWith('column-')) {
        insertIdx = filtered.length
      } else {
        const overIdx = filtered.findIndex((t) => t.id === overId)
        if (overIdx === -1) {
          insertIdx = filtered.length
        } else {
          insertIdx = insertAfterRef.current ? overIdx + 1 : overIdx
        }
      }

      // Calculate position from filtered array
      let position: number
      if (filtered.length === 0) {
        position = 1024
      } else if (insertIdx <= 0) {
        position = (filtered[0]?.position ?? 1024) / 2
      } else if (insertIdx >= filtered.length) {
        position = (filtered[filtered.length - 1]?.position ?? 0) + 1024
      } else {
        const before = filtered[insertIdx - 1]?.position ?? 0
        const after = filtered[insertIdx]?.position ?? before + 2048
        position = (before + after) / 2
      }

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

      // Mark as local drag so WS echo won't re-animate
      markLocalMove(taskId)

      // Optimistic update + clear overlay
      useBoardStore.getState().moveTask(taskId, fromStatusId, targetStatusId, position)
      setActiveTask(null)

      moveTask.mutate({
        taskId,
        fromStatusId,
        data: { status_id: targetStatusId, position },
      })
    },
    [activeTask, tasksByStatus, moveTask]
  )

  // Cross-column placeholder: index where a gap should appear in the target column
  const getPlaceholderIdx = (statusId: string): number => {
    if (!activeTask || dragOverColumnId !== statusId || activeTask.status.id === statusId) return -1

    const tasks = getFilteredTasks(statusId)
    if (!dragOverItemId) return tasks.length

    const idx = tasks.findIndex(t => t.id === dragOverItemId)
    if (idx === -1) return tasks.length
    return insertAfterRef.current ? idx + 1 : idx
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={kanbanCollision}
      measuring={measuring}
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
          />
        ))}
      </div>

      <TaskAnimationLayer />

      <DragOverlay dropAnimation={null}>
        {activeTask && (
          <div style={{
            perspective: 600,
          }}>
            <div style={{
              transform: `scale(1.03) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              transition: 'transform 150ms ease-out',
              transformStyle: 'preserve-3d',
              boxShadow: `${-tilt.y * 0.5}px ${tilt.x * 0.5 + 12}px 40px -8px rgba(0,0,0,0.35)`,
              borderRadius: 12,
            }}>
              <TaskCard task={activeTask} onClick={() => {}} isDragOverlay compact={compact} />
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
