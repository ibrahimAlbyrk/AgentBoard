import { useState } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useProjectStore } from '@/stores/projectStore'
import { useUpdateTask } from '@/hooks/useTasks'
import { TaskComments } from '@/components/tasks/TaskComments'
import type { Task, Priority } from '@/types'

const priorities: { value: Priority; label: string; color: string }[] = [
  { value: 'none', label: 'None', color: 'var(--priority-none)' },
  { value: 'low', label: 'Low', color: 'var(--priority-low)' },
  { value: 'medium', label: 'Medium', color: 'var(--priority-medium)' },
  { value: 'high', label: 'High', color: 'var(--priority-high)' },
  { value: 'urgent', label: 'Urgent', color: 'var(--priority-urgent)' },
]

interface TaskDetailPanelProps {
  task: Task | null
  projectId: string
  open: boolean
  onClose: () => void
}

export function TaskDetailPanel({ task, projectId, open, onClose }: TaskDetailPanelProps) {
  const { statuses, members, labels } = useProjectStore()
  const updateTask = useUpdateTask(projectId)
  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState('')

  if (!task) return null

  const handleTitleSave = () => {
    if (title.trim() && title !== task.title) {
      updateTask.mutate({ taskId: task.id, data: { title: title.trim() } })
    }
    setEditingTitle(false)
  }

  const handleFieldUpdate = (data: Record<string, unknown>) => {
    updateTask.mutate({ taskId: task.id, data })
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-[650px] overflow-y-auto bg-[var(--elevated)] border-l border-[var(--border-subtle)]">
        <SheetHeader className="pb-6 px-6 pt-6">
          {editingTitle ? (
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
              className="text-xl font-semibold bg-[var(--surface)] border-[var(--border-subtle)] rounded-lg px-3 py-2"
              style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', system-ui, sans-serif" }}
            />
          ) : (
            <SheetTitle
              className="cursor-pointer hover:bg-[var(--surface)] rounded-lg px-2 py-1 -mx-2 transition-colors text-xl tracking-tight"
              style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', system-ui, sans-serif" }}
              onClick={() => {
                setTitle(task.title)
                setEditingTitle(true)
              }}
            >
              {task.title}
            </SheetTitle>
          )}
          <SheetDescription className="sr-only">Task details for {task.title}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-6 pb-6">
          {/* Property grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <span className="text-xs text-[var(--text-tertiary)] font-medium">Status</span>
              <Select
                value={task.status.id}
                onValueChange={(v) => handleFieldUpdate({ status_id: v })}
              >
                <SelectTrigger className="w-full bg-[var(--surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: s.color || 'var(--priority-none)' }}
                        />
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs text-[var(--text-tertiary)] font-medium">Priority</span>
              <Select
                value={task.priority}
                onValueChange={(v) => handleFieldUpdate({ priority: v })}
              >
                <SelectTrigger className="w-full bg-[var(--surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: p.color }}
                        />
                        {p.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs text-[var(--text-tertiary)] font-medium">Assignee</span>
              <Select
                value={task.assignee?.id ?? 'unassigned'}
                onValueChange={(v) =>
                  handleFieldUpdate({ assignee_id: v === 'unassigned' ? null : v })
                }
              >
                <SelectTrigger className="w-full bg-[var(--surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.user.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6">
                          <AvatarImage src={m.user.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px] bg-[var(--accent-muted-bg)] text-[var(--accent-solid)]">
                            {(m.user.full_name || m.user.username).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {m.user.full_name || m.user.username}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs text-[var(--text-tertiary)] font-medium">Due Date</span>
              <Input
                type="date"
                value={task.due_date?.split('T')[0] ?? ''}
                onChange={(e) =>
                  handleFieldUpdate({ due_date: e.target.value || undefined })
                }
                className="bg-[var(--surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <span className="text-xs text-[var(--text-tertiary)] font-medium">Description</span>
            <Textarea
              defaultValue={task.description ?? ''}
              placeholder="Add a description..."
              onBlur={(e) => {
                if (e.target.value !== (task.description ?? '')) {
                  handleFieldUpdate({ description: e.target.value || undefined })
                }
              }}
              className="min-h-[100px] bg-[var(--surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] focus:ring-2 focus:ring-[var(--ring)] transition-colors rounded-lg resize-y"
            />
          </div>

          {/* Labels */}
          {labels.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs text-[var(--text-tertiary)] font-medium">Labels</span>
              <div className="flex flex-wrap gap-1.5">
                {labels.map((label) => {
                  const active = task.labels.some((l) => l.id === label.id)
                  return (
                    <Badge
                      key={label.id}
                      variant={active ? 'default' : 'outline'}
                      className="cursor-pointer transition-all duration-150 hover:scale-105"
                      style={
                        active
                          ? { backgroundColor: label.color, borderColor: label.color }
                          : { borderColor: label.color, color: label.color, opacity: 0.7 }
                      }
                      onClick={() => {
                        const newIds = active
                          ? task.labels.filter((l) => l.id !== label.id).map((l) => l.id)
                          : [...task.labels.map((l) => l.id), label.id]
                        handleFieldUpdate({ label_ids: newIds })
                      }}
                    >
                      {label.name}
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="comments">
            <TabsList className="bg-[var(--surface)] border border-[var(--border-subtle)] p-0.5 rounded-lg">
              <TabsTrigger
                value="comments"
                className="data-[state=active]:bg-[var(--elevated)] data-[state=active]:shadow-sm rounded-md text-sm"
              >
                Comments
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="data-[state=active]:bg-[var(--elevated)] data-[state=active]:shadow-sm rounded-md text-sm"
              >
                Activity
              </TabsTrigger>
            </TabsList>
            <TabsContent value="comments" className="mt-4">
              <TaskComments projectId={projectId} taskId={task.id} />
            </TabsContent>
            <TabsContent value="activity" className="mt-4">
              <p className="text-sm text-[var(--text-tertiary)] text-center py-8">
                Activity log coming soon
              </p>
            </TabsContent>
          </Tabs>

          {/* Timestamps */}
          <div className="pt-4 border-t border-[var(--border-subtle)] text-xs text-[var(--text-tertiary)] space-y-1">
            <p>Created {formatDistanceToNow(parseISO(task.created_at), { addSuffix: true })}</p>
            <p>Updated {formatDistanceToNow(parseISO(task.updated_at), { addSuffix: true })}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
