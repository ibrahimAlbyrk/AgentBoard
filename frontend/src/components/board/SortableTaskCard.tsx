import { useCallback } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TaskCard } from './TaskCard'
import { registerCardRef, useIsFlying } from './TaskAnimationLayer'
import type { Task } from '@/types'

interface SortableTaskCardProps {
  task: Task
  onClick: () => void
  hideWhileDragging?: boolean
  compact?: boolean
}

export function SortableTaskCard({ task, onClick, hideWhileDragging, compact }: SortableTaskCardProps) {
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

  const hidden = isDragging && hideWhileDragging

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(flying && { opacity: 0 }),
    ...(hidden && { height: 0, overflow: 'hidden', margin: 0, padding: 0 }),
  }

  return (
    <div
      ref={refCallback}
      style={style}
      {...attributes}
      {...listeners}
    >
      {isDragging && !hidden ? (
        <div className="h-[72px] rounded-xl border-2 border-dashed border-[var(--accent-solid)]/30 bg-[var(--accent-muted-bg)]/50" />
      ) : hidden ? null : (
        <TaskCard task={task} onClick={onClick} compact={compact} />
      )}
    </div>
  )
}
