import { useCallback, memo } from 'react'
import { useSortable, defaultAnimateLayoutChanges, type AnimateLayoutChanges } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TaskCard } from './TaskCard'
import { registerCardRef, useIsFlying } from './TaskAnimationLayer'
import type { Task } from '@/types'

interface SortableTaskCardProps {
  task: Task
  onClick: () => void
  hideWhileDragging?: boolean
  compact?: boolean
  isExpanded?: boolean
  onToggleExpand?: () => void
  expandedContent?: React.ReactNode
}

// Animate layout during sorting so other tasks shift to make room.
// Skip only for the item that was just dropped (flight animation handles it).
const animateLayoutChanges: AnimateLayoutChanges = (args) => {
  if (args.wasDragging) return false
  // Force animation during active sorting for smooth reorder feedback
  if (args.isSorting) return true
  return defaultAnimateLayoutChanges(args)
}

export const SortableTaskCard = memo(function SortableTaskCard({ task, onClick, hideWhileDragging, compact, isExpanded, onToggleExpand, expandedContent }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, animateLayoutChanges })

  const flying = useIsFlying(task.id)

  const refCallback = useCallback(
    (el: HTMLDivElement | null) => {
      setNodeRef(el)
      registerCardRef(task.id, el)
    },
    [setNodeRef, task.id],
  )

  // Cross-column: collapse height so source column closes gap
  const collapsed = isDragging && hideWhileDragging
  // Same-column: keep height (dnd-kit needs it for displacement) but hide visually
  const invisible = isDragging && !hideWhileDragging

  const style: React.CSSProperties = {
    // Invisible (same-column active): DON'T apply transform — keep DOM at original position
    // so dnd-kit's WhileDragging re-measurement sees a stable rect (prevents oscillation).
    // Collapsed (cross-column): transform doesn't matter since height is 0.
    // Normal siblings: apply transform for smooth displacement animation.
    transform: invisible ? undefined : CSS.Translate.toString(transform),
    transition: collapsed
      ? 'height 200ms ease, margin 200ms ease, padding 200ms ease'
      : (isDragging ? 'none' : transition),
    ...(flying && { opacity: 0 }),
    ...(collapsed && { height: 0, overflow: 'hidden', marginTop: 0, marginBottom: 0 }),
    ...(invisible && { opacity: 0 }),
  }

  return (
    <div
      ref={refCallback}
      style={style}
      {...attributes}
      {...listeners}
    >
      {collapsed ? null : (
        <TaskCard task={task} onClick={onClick} compact={compact} isExpanded={isExpanded} onToggleExpand={onToggleExpand} expandedContent={expandedContent} />
      )}
    </div>
  )
})
