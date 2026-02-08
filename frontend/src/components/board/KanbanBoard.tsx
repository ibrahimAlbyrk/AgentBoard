import { useState, useCallback, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragMoveEvent,
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
import { TaskAnimationLayer, startFlight } from './TaskAnimationLayer'
import type { Task } from '@/types'

interface KanbanBoardProps {
  onTaskClick: (task: Task) => void
  onAddTask: (statusId: string) => void
}

export function KanbanBoard({ onTaskClick, onAddTask }: KanbanBoardProps) {
  const { statuses, currentProject } = useProjectStore()
  const { tasksByStatus, getFilteredTasks } = useBoardStore()
  const moveTask = useMoveTask(currentProject?.id ?? '')
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null)
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const prevDelta = useRef({ x: 0, y: 0 })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const taskId = String(event.active.id)
    prevDelta.current = { x: 0, y: 0 }
    setTilt({ x: 0, y: 0 })
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

      // Determine insert index in the filtered array
      let insertIdx: number
      if (overId.startsWith('column-')) {
        insertIdx = filtered.length
      } else {
        const overIdx = filtered.findIndex((t) => t.id === overId)
        if (overIdx === -1) {
          insertIdx = filtered.length
        } else if (fromStatusId === targetStatusId) {
          // Same column: direction determines before/after
          const origActive = (tasksByStatus[fromStatusId] ?? []).findIndex(
            (t) => t.id === taskId,
          )
          const origOver = (tasksByStatus[fromStatusId] ?? []).findIndex(
            (t) => t.id === overId,
          )
          // Moving down → insert after over task; moving up → insert before
          insertIdx = origActive < origOver ? overIdx + 1 : overIdx
        } else {
          insertIdx = overIdx
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
    return idx === -1 ? tasks.length : idx
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 p-6 h-full overflow-x-auto">
        {statuses.map((status) => (
          <BoardColumn
            key={status.id}
            status={status}
            tasks={getFilteredTasks(status.id)}
            onTaskClick={onTaskClick}
            onAddTask={() => onAddTask(status.id)}
            placeholderIdx={getPlaceholderIdx(status.id)}
            hideDragSourceId={
              activeTask && dragOverColumnId && dragOverColumnId !== activeTask.status.id && activeTask.status.id === status.id
                ? activeTask.id
                : undefined
            }
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
              <TaskCard task={activeTask} onClick={() => {}} isDragOverlay />
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
