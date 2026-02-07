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
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useProjectStore } from '@/stores/projectStore'
import { useUpdateTask } from '@/hooks/useTasks'
import { TaskComments } from '@/components/tasks/TaskComments'
import type { Task, Priority } from '@/types'

const priorities: { value: Priority; label: string; color: string }[] = [
  { value: 'none', label: 'None', color: '#6b7280' },
  { value: 'low', label: 'Low', color: '#3b82f6' },
  { value: 'medium', label: 'Medium', color: '#eab308' },
  { value: 'high', label: 'High', color: '#f97316' },
  { value: 'urgent', label: 'Urgent', color: '#ef4444' },
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
      <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="pb-4">
          {editingTitle ? (
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
              className="text-lg font-semibold"
            />
          ) : (
            <SheetTitle
              className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2"
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

        <div className="space-y-6 px-4 pb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select
                value={task.status.id}
                onValueChange={(v) => handleFieldUpdate({ status_id: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: s.color || '#6b7280' }}
                        />
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Priority</Label>
              <Select
                value={task.priority}
                onValueChange={(v) => handleFieldUpdate({ priority: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2 rounded-full"
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
              <Label className="text-xs text-muted-foreground">Assignee</Label>
              <Select
                value={task.assignee?.id ?? 'unassigned'}
                onValueChange={(v) =>
                  handleFieldUpdate({ assignee_id: v === 'unassigned' ? null : v })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.user.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6">
                          <AvatarImage src={m.user.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">
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
              <Label className="text-xs text-muted-foreground">Due Date</Label>
              <Input
                type="date"
                value={task.due_date?.split('T')[0] ?? ''}
                onChange={(e) =>
                  handleFieldUpdate({ due_date: e.target.value || undefined })
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea
              defaultValue={task.description ?? ''}
              placeholder="Add a description..."
              onBlur={(e) => {
                if (e.target.value !== (task.description ?? '')) {
                  handleFieldUpdate({ description: e.target.value || undefined })
                }
              }}
              className="min-h-[80px]"
            />
          </div>

          {labels.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Labels</Label>
              <div className="flex flex-wrap gap-1.5">
                {labels.map((label) => {
                  const active = task.labels.some((l) => l.id === label.id)
                  return (
                    <Badge
                      key={label.id}
                      variant={active ? 'default' : 'outline'}
                      className="cursor-pointer"
                      style={
                        active
                          ? { backgroundColor: label.color, borderColor: label.color }
                          : { borderColor: label.color, color: label.color }
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

          <Tabs defaultValue="comments">
            <TabsList>
              <TabsTrigger value="comments">Comments</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            <TabsContent value="comments" className="mt-4">
              <TaskComments projectId={projectId} taskId={task.id} />
            </TabsContent>
            <TabsContent value="activity" className="mt-4">
              <p className="text-sm text-muted-foreground text-center py-8">
                Activity log coming soon
              </p>
            </TabsContent>
          </Tabs>

          <div className="pt-4 border-t text-xs text-muted-foreground space-y-1">
            <p>Created {formatDistanceToNow(parseISO(task.created_at), { addSuffix: true })}</p>
            <p>Updated {formatDistanceToNow(parseISO(task.updated_at), { addSuffix: true })}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
