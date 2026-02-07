import { useCallback } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TaskCard } from './TaskCard'
import { registerCardRef, useIsFlying } from './TaskAnimationLayer'
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

  const flying = useIsFlying(task.id)

  const refCallback = useCallback(
    (el: HTMLDivElement | null) => {
      setNodeRef(el)
      registerCardRef(task.id, el)
    },
    [setNodeRef, task.id],
  )

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : flying ? 0 : 1,
  }

  return (
    <div
      ref={refCallback}
      style={style}
      {...attributes}
      {...listeners}
    >
      <TaskCard task={task} onClick={onClick} isDragging={isDragging} />
    </div>
  )
}
