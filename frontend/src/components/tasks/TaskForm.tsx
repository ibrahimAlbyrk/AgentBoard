import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useProjectStore } from '@/stores/projectStore'
import { useCreateTask } from '@/hooks/useTasks'
import type { Priority } from '@/types'

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  due_date: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface TaskFormProps {
  projectId: string
  open: boolean
  onClose: () => void
  defaultStatusId?: string
}

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: 'none', label: 'None', color: 'var(--priority-none)' },
  { value: 'low', label: 'Low', color: 'var(--priority-low)' },
  { value: 'medium', label: 'Medium', color: 'var(--priority-medium)' },
  { value: 'high', label: 'High', color: 'var(--priority-high)' },
  { value: 'urgent', label: 'Urgent', color: 'var(--priority-urgent)' },
]

export function TaskForm({ projectId, open, onClose, defaultStatusId }: TaskFormProps) {
  const { statuses, members } = useProjectStore()
  const createTask = useCreateTask(projectId)

  const firstStatusId = defaultStatusId || statuses[0]?.id || ''

  const [statusId, setStatusId] = useState(firstStatusId)
  const [priority, setPriority] = useState<Priority>('none')
  const [assigneeId, setAssigneeId] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      await createTask.mutateAsync({
        title: data.title,
        description: data.description,
        status_id: statusId || firstStatusId,
        priority,
        due_date: data.due_date || undefined,
        assignee_id: assigneeId || undefined,
      })
      toast.success('Task created')
      reset()
      setStatusId(firstStatusId)
      setPriority('none')
      setAssigneeId('')
      onClose()
    } catch {
      toast.error('Failed to create task')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[var(--elevated)] border-[var(--border-subtle)] sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle
            className="text-lg tracking-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', system-ui, sans-serif" }}
          >
            New Task
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <span className="text-xs text-[var(--text-tertiary)] font-medium">Title</span>
            <Input
              id="task-title"
              placeholder="Task title"
              {...register('title')}
              aria-invalid={!!errors.title}
              className="bg-[var(--surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors"
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <span className="text-xs text-[var(--text-tertiary)] font-medium">Description</span>
            <Textarea
              id="task-desc"
              placeholder="Describe the task..."
              {...register('description')}
              className="min-h-[80px] bg-[var(--surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] focus:ring-2 focus:ring-[var(--ring)] transition-colors rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <span className="text-xs text-[var(--text-tertiary)] font-medium">Status</span>
              <Select value={statusId || firstStatusId} onValueChange={setStatusId}>
                <SelectTrigger className="bg-[var(--surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors">
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
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger className="bg-[var(--surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((p) => (
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
              <Select value={assigneeId || 'none'} onValueChange={(v) => setAssigneeId(v === 'none' ? '' : v)}>
                <SelectTrigger className="bg-[var(--surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.user.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-5">
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
                id="task-due"
                type="date"
                {...register('due_date')}
                className="bg-[var(--surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface)]">
              Cancel
            </Button>
            <Button type="submit" disabled={createTask.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {createTask.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
