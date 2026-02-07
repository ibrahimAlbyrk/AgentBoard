import { Calendar, MessageCircle } from 'lucide-react'
import { formatDistanceToNow, isPast, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Task } from '@/types'

const priorityBorderColors: Record<string, string> = {
  urgent: 'var(--priority-urgent)',
  high: 'var(--priority-high)',
  medium: 'var(--priority-medium)',
  low: 'var(--priority-low)',
  none: 'transparent',
}

interface TaskCardProps {
  task: Task
  onClick: () => void
  isDragging?: boolean
  isDragOverlay?: boolean
}

export function TaskCard({ task, onClick, isDragging, isDragOverlay }: TaskCardProps) {
  const isOverdue = task.due_date && isPast(parseISO(task.due_date))
  const visibleLabels = task.labels.slice(0, 3)
  const extraCount = task.labels.length - 3

  return (
    <div
      onClick={isDragging ? undefined : onClick}
      style={{
        borderLeftColor: priorityBorderColors[task.priority] || 'transparent',
      }}
      className={cn(
        'bg-card border border-[var(--border-subtle)] border-l-[3px] rounded-xl p-3 cursor-pointer',
        'hover:-translate-y-0.5 hover:border-[var(--border)] transition-all duration-150',
        isDragging && 'opacity-50 cursor-grabbing',
        isDragOverlay && 'shadow-[0_8px_24px_oklch(0_0_0/0.3)] border-primary',
      )}
    >
      <span className="text-[13px] font-medium text-foreground leading-snug line-clamp-2 block">
        {task.title}
      </span>

      {task.description && (
        <p className="text-xs text-[var(--text-tertiary)] line-clamp-2 mt-1">
          {task.description}
        </p>
      )}

      {visibleLabels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {visibleLabels.map((label) => (
            <span
              key={label.id}
              className="text-[11px] font-medium px-1.5 py-0 rounded-md border inline-flex items-center"
              style={{
                backgroundColor: `${label.color}20`,
                color: label.color,
                borderColor: `${label.color}33`,
              }}
            >
              {label.name}
            </span>
          ))}
          {extraCount > 0 && (
            <span className="text-[11px] font-medium px-1.5 py-0 rounded-md bg-[var(--overlay)] text-[var(--text-tertiary)] inline-flex items-center">
              +{extraCount}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-2.5">
        <div className="flex items-center gap-3">
          {task.due_date && (
            <span
              className={cn(
                'flex items-center gap-1 text-xs',
                isOverdue ? 'text-[var(--priority-urgent)]' : 'text-[var(--text-tertiary)]'
              )}
            >
              <Calendar className="size-3" />
              {formatDistanceToNow(parseISO(task.due_date), { addSuffix: true })}
            </span>
          )}
          {task.comments_count > 0 && (
            <span className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
              <MessageCircle className="size-3" />
              {task.comments_count}
            </span>
          )}
        </div>

        {task.assignee && (
          <Avatar className="size-5">
            <AvatarImage src={task.assignee.avatar_url || undefined} />
            <AvatarFallback className="text-[9px]">
              {(task.assignee.full_name || task.assignee.username).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  )
}
