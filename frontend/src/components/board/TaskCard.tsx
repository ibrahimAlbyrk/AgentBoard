import { Calendar, MessageCircle } from 'lucide-react'
import { formatDistanceToNow, isPast, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Task } from '@/types'

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
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
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100 dark:border-gray-700',
        isDragging && 'cursor-grabbing',
        isDragOverlay && 'shadow-lg',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-snug line-clamp-2">
          {task.title}
        </span>
        {task.priority !== 'none' && (
          <span
            className={cn('size-2 rounded-full flex-shrink-0 mt-1.5', priorityColors[task.priority])}
          />
        )}
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5">
          {task.description}
        </p>
      )}

      {visibleLabels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {visibleLabels.map((label) => (
            <Badge
              key={label.id}
              variant="secondary"
              className="text-[10px] px-1.5 py-0"
              style={{
                backgroundColor: `${label.color}20`,
                color: label.color,
                borderColor: `${label.color}40`,
              }}
            >
              {label.name}
            </Badge>
          ))}
          {extraCount > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              +{extraCount}
            </Badge>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-2.5">
        <div className="flex items-center gap-3">
          {task.due_date && (
            <span
              className={cn(
                'flex items-center gap-1 text-xs',
                isOverdue ? 'text-red-500' : 'text-muted-foreground'
              )}
            >
              <Calendar className="size-3" />
              {formatDistanceToNow(parseISO(task.due_date), { addSuffix: true })}
            </span>
          )}
          {task.comments_count > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageCircle className="size-3" />
              {task.comments_count}
            </span>
          )}
        </div>

        {task.assignee && (
          <Avatar size="sm">
            <AvatarImage src={task.assignee.avatar_url || undefined} />
            <AvatarFallback className="text-[10px]">
              {(task.assignee.full_name || task.assignee.username).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  )
}
