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
import { BoardColumn } from './BoardColumn'
import { TaskCard } from './TaskCard'
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
      setActiveTask(null)
      const { active, over } = event
      if (!over || !activeTask) return

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
        if (!targetStatusId!) return
      }

      const fromStatusId = activeTask.status.id
      if (fromStatusId === targetStatusId && tasksByStatus[fromStatusId]?.findIndex(t => t.id === taskId) === targetIndex) {
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

      <DragOverlay>
        {activeTask && (
          <div className="rotate-3 opacity-90">
            <TaskCard task={activeTask} onClick={() => {}} isDragOverlay />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
