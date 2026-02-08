import { formatDistanceToNow, parseISO } from 'date-fns'
import { Plus, Pencil, ArrowRight } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useTaskActivity } from '@/hooks/useActivity'
import type { ActivityLog } from '@/types'

interface TaskActivityProps {
  projectId: string
  taskId: string
}

const actionIcons: Record<string, typeof Plus> = {
  created: Plus,
  updated: Pencil,
  moved: ArrowRight,
}

function formatChanges(log: ActivityLog): string {
  if (log.action === 'created') {
    const title = typeof log.changes.title === 'string' ? log.changes.title : ''
    return title ? `created this task: "${title}"` : 'created this task'
  }

  if (log.action === 'moved') {
    const statusChange = log.changes.status_id
    if (statusChange && typeof statusChange === 'object') {
      const from = statusChange.old || '—'
      const to = statusChange.new || '—'
      return `moved task: ${from} → ${to}`
    }
    return 'moved task'
  }

  if (log.action === 'updated') {
    const fields = Object.keys(log.changes)
    const parts = fields.map((field) => {
      const change = log.changes[field]
      if (field === 'assignee_id') {
        if (typeof change === 'object' && change !== null) {
          if (!change.old && change.new) return `assigned to ${change.new}`
          if (change.old && !change.new) return `unassigned ${change.old}`
          if (change.old && change.new) return `reassigned from ${change.old} to ${change.new}`
        }
        return 'changed assignee'
      }
      const label = field.replace(/_id$/, '').replace(/_/g, ' ')
      if (typeof change === 'object' && change !== null) {
        const oldVal = change.old || '—'
        const newVal = change.new || '—'
        return `${label}: ${oldVal} → ${newVal}`
      }
      return label
    })
    return `${parts.join(', ')}`
  }

  return log.action
}

function ActionIcon({ action }: { action: string }) {
  const Icon = actionIcons[action] ?? Pencil
  const colors: Record<string, string> = {
    created: 'bg-emerald-500/15 text-emerald-500',
    updated: 'bg-blue-500/15 text-blue-500',
    moved: 'bg-amber-500/15 text-amber-500',
  }
  return (
    <div className={`size-6 rounded-full flex items-center justify-center shrink-0 ${colors[action] ?? 'bg-[var(--surface)] text-[var(--text-tertiary)]'}`}>
      <Icon className="size-3" />
    </div>
  )
}

export function TaskActivity({ projectId, taskId }: TaskActivityProps) {
  const { data, isLoading } = useTaskActivity(projectId, taskId)
  const logs = data?.data ?? []

  if (isLoading) {
    return (
      <p className="text-sm text-[var(--text-tertiary)] text-center py-4">
        Loading activity...
      </p>
    )
  }

  if (logs.length === 0) {
    return (
      <p className="text-sm text-[var(--text-tertiary)] text-center py-4">
        No activity yet
      </p>
    )
  }

  return (
    <div className="space-y-1">
      {logs.map((log, index) => (
        <div key={log.id}>
          <div className="flex gap-3 py-3">
            <Avatar className="size-7 shrink-0">
              <AvatarImage src={log.user.avatar_url ?? undefined} />
              <AvatarFallback className="text-[10px] bg-[var(--accent-muted-bg)] text-[var(--accent-solid)]">
                {(log.user.full_name ?? log.user.username).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {log.user.full_name ?? log.user.username}
                </span>
                <ActionIcon action={log.action} />
                <span className="text-xs text-[var(--text-tertiary)]">
                  {formatDistanceToNow(parseISO(log.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                {formatChanges(log)}
              </p>
            </div>
          </div>
          {index < logs.length - 1 && (
            <div className="border-b border-[var(--border-subtle)] ml-10" />
          )}
        </div>
      ))}
    </div>
  )
}
