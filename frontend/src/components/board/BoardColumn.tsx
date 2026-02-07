import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SortableTaskCard } from './SortableTaskCard'
import type { Status, Task } from '@/types'

interface BoardColumnProps {
  status: Status
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onAddTask: () => void
}

export function BoardColumn({ status, tasks, onTaskClick, onAddTask }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${status.id}` })

  return (
    <div className="w-80 flex-shrink-0 flex flex-col max-h-full">
      <div className="flex items-center justify-between px-3 py-2 mb-2">
        <div className="flex items-center gap-2">
          <span
            className="size-3 rounded-full"
            style={{ backgroundColor: status.color || '#6b7280' }}
          />
          <span className="text-sm font-semibold">{status.name}</span>
          <span className="text-xs text-muted-foreground bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <Button variant="ghost" size="icon-xs" onClick={onAddTask}>
          <Plus className="size-4" />
        </Button>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto rounded-lg p-2 space-y-2 min-h-[100px] transition-colors ${
          isOver ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-100 dark:bg-gray-800/50'
        }`}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-20 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg text-sm text-muted-foreground">
            No tasks
          </div>
        )}
      </div>
    </div>
  )
}
