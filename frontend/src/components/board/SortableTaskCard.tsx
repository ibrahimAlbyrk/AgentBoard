import { useCallback } from 'react'
import { useSortable, defaultAnimateLayoutChanges, type AnimateLayoutChanges } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TaskCard } from './TaskCard'
import { registerCardRef, useIsFlying } from './TaskAnimationLayer'
import type { Task } from '@/types'

interface SortableTaskCardProps {
  task: Task
  onClick: () => void
  hideWhileDragging?: boolean
  placeholderHeight?: number
  compact?: boolean
  isExpanded?: boolean
  onToggleExpand?: () => void
  expandedContent?: React.ReactNode
}

// Skip layout animation when an item is being dropped (wasDragging = true).
// This prevents the overlap/jump glitch during same-column reorder because
// the default layout animation conflicts with dnd-kit's transform removal.
const animateLayoutChanges: AnimateLayoutChanges = (args) => {
  if (args.wasDragging) return false
  return defaultAnimateLayoutChanges(args)
}

export function SortableTaskCard({ task, onClick, hideWhileDragging, placeholderHeight = 72, compact, isExpanded, onToggleExpand, expandedContent }: SortableTaskCardProps) {
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

  const hidden = isDragging && hideWhileDragging

  const style: React.CSSProperties = {
    // Use Translate (not Transform) to avoid dnd-kit injecting scaleX/scaleY
    // that can cause visual glitches during reorder
    transform: CSS.Translate.toString(transform),
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
        <div
          className="rounded-xl border-2 border-dashed border-[var(--accent-solid)]/40 bg-[var(--accent-muted-bg)]/30 relative overflow-hidden"
          style={{ height: placeholderHeight }}
        >
          <div
            className="absolute inset-0 rounded-[10px]"
            style={{
              boxShadow: 'inset 0 0 16px -4px var(--accent-solid)',
              animation: 'glow-pulse 2s ease-in-out infinite',
              opacity: 0.3,
            }}
          />
        </div>
      ) : hidden ? null : (
        <TaskCard task={task} onClick={onClick} compact={compact} isExpanded={isExpanded} onToggleExpand={onToggleExpand} expandedContent={expandedContent} />
      )}
    </div>
  )
}
