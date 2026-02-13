import { formatDistanceToNow, parseISO } from 'date-fns'
import { Plus, Pencil, ArrowRight, Trash2, MessageSquare, Paperclip } from 'lucide-react'
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
  deleted: Trash2,
  commented: MessageSquare,
  attached: Paperclip,
}

function formatAssigneeOrWatcherChange(field: string, change: unknown): string {
  if (typeof change === 'string') return change
  if (typeof change !== 'object' || change === null) return `${field} updated`
  const c = change as { added?: { name: string; type: string }[]; removed?: { name: string; type: string }[] }
  const parts: string[] = []
  if (c.added?.length) {
    const names = c.added.map((a) => a.name).join(', ')
    parts.push(`added ${names}`)
  }
  if (c.removed?.length) {
    const names = c.removed.map((r) => r.name).join(', ')
    parts.push(`removed ${names}`)
  }
  return parts.length ? `${field}: ${parts.join('; ')}` : `${field} updated`
}

function formatLabelChange(change: unknown): string {
  if (typeof change === 'string') return change
  if (typeof change !== 'object' || change === null) return 'labels updated'
  const c = change as { added?: string[]; removed?: string[] }
  const parts: string[] = []
  if (c.added?.length) parts.push(`added ${c.added.join(', ')}`)
  if (c.removed?.length) parts.push(`removed ${c.removed.join(', ')}`)
  return parts.length ? `labels: ${parts.join('; ')}` : 'labels updated'
}

function formatChanges(log: ActivityLog): string {
  if (log.action === 'created') {
    const title = typeof log.changes.title === 'string' ? log.changes.title : ''
    const extras: string[] = []
    if (typeof log.changes.status === 'string') extras.push(`in ${log.changes.status}`)
    if (typeof log.changes.priority === 'string') extras.push(`priority: ${log.changes.priority}`)
    const suffix = extras.length ? ` (${extras.join(', ')})` : ''
    return title ? `created this task: "${title}"${suffix}` : 'created this task'
  }

  if (log.action === 'deleted') {
    if (log.entity_type === 'comment') return 'deleted a comment'
    if (log.entity_type === 'attachment') {
      const name = typeof log.changes.filename === 'string' ? log.changes.filename : 'a file'
      return `removed attachment "${name}"`
    }
    const title = typeof log.changes.title === 'string' ? log.changes.title : ''
    return title ? `deleted task "${title}"` : 'deleted this task'
  }

  if (log.action === 'commented') {
    const preview = typeof log.changes.preview === 'string' ? log.changes.preview : ''
    return preview ? `commented: "${preview}"` : 'added a comment'
  }

  if (log.action === 'attached') {
    const name = typeof log.changes.filename === 'string' ? log.changes.filename : 'a file'
    return `attached "${name}"`
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

      if (field === 'assignees' || field === 'watchers') {
        return formatAssigneeOrWatcherChange(field, change)
      }
      if (field === 'labels') {
        return formatLabelChange(change)
      }
      if (field === 'checklist' || field === 'checklist_item') {
        return typeof change === 'string' ? change : `${field} updated`
      }
      if (field === 'custom_field') {
        if (typeof change === 'object' && change !== null) {
          const cf = change as { field?: string; old?: string | null; new?: string | null }
          const name = cf.field || 'field'
          if (!cf.old && cf.new) return `set ${name} to "${cf.new}"`
          if (cf.old && !cf.new) return `cleared ${name} (was "${cf.old}")`
          if (cf.old && cf.new) return `${name}: ${cf.old} → ${cf.new}`
          return `updated ${name}`
        }
        return 'updated custom field'
      }

      const label = field.replace(/_id$/, '').replace(/_/g, ' ')
      if (typeof change === 'object' && change !== null) {
        const oldVal = change.old || '—'
        const newVal = change.new || '—'
        return `${label}: ${oldVal} → ${newVal}`
      }
      return typeof change === 'string' ? `${label}: ${change}` : label
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
    deleted: 'bg-red-500/15 text-red-500',
    commented: 'bg-violet-500/15 text-violet-500',
    attached: 'bg-cyan-500/15 text-cyan-500',
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
            {log.agent ? (
              <span
                className="size-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ backgroundColor: log.agent.color }}
              >
                {log.agent.name.charAt(0).toUpperCase()}
              </span>
            ) : (
              <Avatar className="size-7 shrink-0">
                <AvatarImage src={log.user.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px] bg-[var(--accent-muted-bg)] text-[var(--accent-solid)]">
                  {(log.user.full_name ?? log.user.username).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {log.agent?.name ?? log.user.full_name ?? log.user.username}
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
