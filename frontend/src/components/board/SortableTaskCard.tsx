import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TaskCard } from './TaskCard'
import type { Task } from '@/types'

interface SortableTaskCardProps {
  task: Task
  onClick: () => void
}

export function SortableTaskCard({ task, onClick }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="transition-opacity duration-150"
      {...attributes}
      {...listeners}
    >
      <TaskCard task={task} onClick={onClick} isDragging={isDragging} />
    </div>
  )
}
