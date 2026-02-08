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
  isDragOverlay?: boolean
}

export function TaskCard({ task, onClick, isDragOverlay }: TaskCardProps) {
  const isOverdue = task.due_date && isPast(parseISO(task.due_date))
  const visibleLabels = task.labels.slice(0, 3)
  const extraCount = task.labels.length - 3

  return (
    <div
      onClick={onClick}
      style={{
        borderLeftColor: priorityBorderColors[task.priority] || 'transparent',
        ...(isDragOverlay && {
          borderColor: 'var(--accent-solid)',
        }),
      }}
      className={cn(
        'bg-card border border-[var(--border-subtle)] border-l-[3px] rounded-xl p-3.5 cursor-pointer',
        !isDragOverlay && 'hover:-translate-y-0.5 hover:shadow-[0_4px_12px_-4px_var(--glow)] hover:border-[var(--border-strong)] transition-all duration-200',
      )}
    >
      <span className="text-[13px] font-medium text-foreground leading-snug line-clamp-2 block">
        {task.title}
      </span>

      {task.description && (
        <p className="text-xs text-[var(--text-tertiary)] line-clamp-2 mt-1.5 leading-relaxed">
          {task.description}
        </p>
      )}

      {visibleLabels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {visibleLabels.map((label) => (
            <span
              key={label.id}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center"
              style={{
                backgroundColor: `${label.color}15`,
                color: label.color,
                borderColor: `${label.color}25`,
              }}
            >
              {label.name}
            </span>
          ))}
          {extraCount > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--overlay)] text-[var(--text-tertiary)] inline-flex items-center">
              +{extraCount}
            </span>
          )}
        </div>
      )}

      {(task.due_date || task.comments_count > 0 || task.assignee || task.agent_assignee) && (
        <>
          <div className="border-t border-[var(--border-subtle)] mt-3 mb-2.5" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {task.due_date && (
                <span
                  className={cn(
                    'flex items-center gap-1 text-[11px] font-medium',
                    isOverdue ? 'text-[var(--priority-urgent)]' : 'text-[var(--text-tertiary)]'
                  )}
                >
                  <Calendar className="size-3" />
                  {formatDistanceToNow(parseISO(task.due_date), { addSuffix: true })}
                </span>
              )}
              {task.comments_count > 0 && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-tertiary)]">
                  <MessageCircle className="size-3" />
                  {task.comments_count}
                </span>
              )}
            </div>

            {task.assignee ? (
              <Avatar className="size-5 ring-2 ring-card">
                <AvatarImage src={task.assignee.avatar_url || undefined} />
                <AvatarFallback className="text-[8px] bg-[var(--accent-muted-bg)] text-[var(--accent-solid)]">
                  {(task.assignee.full_name || task.assignee.username).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : task.agent_assignee ? (
              <span
                className="size-5 rounded-full ring-2 ring-card flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                style={{ backgroundColor: task.agent_assignee.color }}
              >
                {task.agent_assignee.name.charAt(0).toUpperCase()}
              </span>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}
