import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const taskId = String(event.active.id)
    for (const tasks of Object.values(tasksByStatus)) {
      const task = tasks.find((t) => t.id === taskId)
      if (task) {
        setActiveTask(task)
        break
      }
    }
  }, [tasksByStatus])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || !activeTask) {
        setActiveTask(null)
        return
      }

      const taskId = String(active.id)
      const overId = String(over.id)

      let targetStatusId: string
      let targetIndex = 0

      if (overId.startsWith('column-')) {
        targetStatusId = overId.replace('column-', '')
        const columnTasks = tasksByStatus[targetStatusId] ?? []
        targetIndex = columnTasks.length
      } else {
        for (const [statusId, tasks] of Object.entries(tasksByStatus)) {
          const idx = tasks.findIndex((t) => t.id === overId)
          if (idx !== -1) {
            targetStatusId = statusId
            targetIndex = idx
            break
          }
        }
        if (!targetStatusId!) {
          setActiveTask(null)
          return
        }
      }

      const fromStatusId = activeTask.status.id
      if (fromStatusId === targetStatusId && tasksByStatus[fromStatusId]?.findIndex(t => t.id === taskId) === targetIndex) {
        setActiveTask(null)
        return
      }

      const targetTasks = tasksByStatus[targetStatusId] ?? []
      let position: number
      if (targetTasks.length === 0) {
        position = 1024
      } else if (targetIndex === 0) {
        position = (targetTasks[0]?.position ?? 1024) / 2
      } else if (targetIndex >= targetTasks.length) {
        position = (targetTasks[targetTasks.length - 1]?.position ?? 0) + 1024
      } else {
        const before = targetTasks[targetIndex - 1]?.position ?? 0
        const after = targetTasks[targetIndex]?.position ?? before + 2048
        position = (before + after) / 2
      }

      // Mark as local drag so WS echo won't re-animate
      markLocalMove(taskId)

      // FLIP animation for cross-column moves: capture overlay position as "from"
      if (fromStatusId !== targetStatusId) {
        const translated = active.rect.current.translated
        if (translated) {
          const fromRect = new DOMRect(translated.left, translated.top, translated.width, translated.height)
          startFlight(taskId, activeTask, fromRect, true)
        }
      }

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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 p-6 h-full overflow-x-auto">
        {statuses.map((status) => (
          <BoardColumn
            key={status.id}
            status={status}
            tasks={getFilteredTasks(status.id)}
            onTaskClick={onTaskClick}
            onAddTask={() => onAddTask(status.id)}
          />
        ))}
      </div>

      <TaskAnimationLayer />

      <DragOverlay dropAnimation={null}>
        {activeTask && (
          <div style={{
            transform: 'scale(1.03)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
            borderRadius: 12,
          }}>
            <TaskCard task={activeTask} onClick={() => {}} isDragOverlay />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
