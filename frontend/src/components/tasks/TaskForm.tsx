import { useState, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from '@/lib/toast'
import { Tag, Paperclip, X, File as FileIcon, Loader2, Check, Users } from 'lucide-react'
import { usePanelLayer } from '@/contexts/PanelStackContext'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useProjectStore } from '@/stores/projectStore'
import { useCreateTask } from '@/hooks/useTasks'
import { api } from '@/lib/api-client'
import type { Priority } from '@/types'

const MAX_FILE_SIZE = 10 * 1024 * 1024

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  due_date: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface TaskFormProps {
  projectId: string
  boardId: string
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

export function TaskForm({ projectId, boardId, open, onClose, defaultStatusId }: TaskFormProps) {
  usePanelLayer('task-form', open)
  const { statuses, members, labels, agents } = useProjectStore()
  const activeAgents = agents.filter((a) => a.is_active)
  const createTask = useCreateTask(projectId, boardId)

  const firstStatusId = defaultStatusId || statuses[0]?.id || ''

  const [statusId, setStatusId] = useState(firstStatusId)
  const [priority, setPriority] = useState<Priority>('none')
  const [assigneeUserIds, setAssigneeUserIds] = useState<string[]>([])
  const [assigneeAgentIds, setAssigneeAgentIds] = useState<string[]>([])
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([])
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const addFiles = useCallback((files: FileList | File[]) => {
    const valid: File[] = []
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" is too large. Maximum size is 10MB.`)
        continue
      }
      valid.push(file)
    }
    if (valid.length) setPendingFiles((prev) => [...prev, ...valid])
  }, [])

  const removeFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const isImage = (file: File) => file.type.startsWith('image/')

  const toggleLabel = (labelId: string) => {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId]
    )
  }

  const toggleAssignee = (type: 'user' | 'agent', id: string) => {
    if (type === 'user') {
      setAssigneeUserIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      )
    } else {
      setAssigneeAgentIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      )
    }
  }

  const onSubmit = async (data: FormData) => {
    try {
      const res = await createTask.mutateAsync({
        title: data.title,
        description: data.description,
        status_id: statusId || firstStatusId,
        priority,
        due_date: data.due_date || undefined,
        assignee_user_ids: assigneeUserIds.length > 0 ? assigneeUserIds : undefined,
        assignee_agent_ids: assigneeAgentIds.length > 0 ? assigneeAgentIds : undefined,
        label_ids: selectedLabelIds.length > 0 ? selectedLabelIds : undefined,
      })

      if (pendingFiles.length > 0) {
        setUploading(true)
        const taskId = res.data.id
        const uploads = pendingFiles.map((file) =>
          api.uploadAttachment(projectId, boardId, taskId, file).catch(() => {
            toast.error(`Failed to upload "${file.name}"`)
          })
        )
        await Promise.allSettled(uploads)
        setUploading(false)
      }

      toast.success('Task created')
      reset()
      setStatusId(firstStatusId)
      setPriority('none')
      setAssigneeUserIds([])
      setAssigneeAgentIds([])
      setSelectedLabelIds([])
      setPendingFiles([])
      onClose()
    } catch (err) {
      setUploading(false)
      toast.error(err)
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
              <span className="text-xs text-[var(--text-tertiary)] font-medium">Assignees</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 h-9 px-3 rounded-md border border-[var(--border-subtle)] bg-[var(--surface)] hover:border-[var(--border-strong)] transition-colors text-sm text-left"
                  >
                    {assigneeUserIds.length + assigneeAgentIds.length > 0 ? (
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <div className="flex items-center -space-x-1">
                          {assigneeUserIds.slice(0, 3).map((uid) => {
                            const m = members.find((m) => m.user.id === uid)
                            return m ? (
                              <Avatar key={uid} className="size-5 border-2 border-[var(--surface)]">
                                <AvatarImage src={m.user.avatar_url || undefined} />
                                <AvatarFallback className="text-[8px] bg-[var(--accent-muted-bg)] text-[var(--accent-solid)]">
                                  {(m.user.full_name || m.user.username).charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            ) : null
                          })}
                          {assigneeAgentIds.slice(0, 3).map((aid) => {
                            const a = activeAgents.find((a) => a.id === aid)
                            return a ? (
                              <span key={aid} className="size-5 rounded-full border-2 border-[var(--surface)] flex items-center justify-center text-[8px] font-bold text-white shrink-0" style={{ backgroundColor: a.color }}>
                                {a.name.charAt(0).toUpperCase()}
                              </span>
                            ) : null
                          })}
                        </div>
                        <span className="text-[var(--text-secondary)] truncate">
                          {assigneeUserIds.length + assigneeAgentIds.length} selected
                        </span>
                      </div>
                    ) : (
                      <span className="text-[var(--text-tertiary)] flex items-center gap-1.5">
                        <Users className="size-3.5" />
                        Unassigned
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" sideOffset={4} className="w-64 p-0 bg-[var(--elevated)] border-[var(--border-subtle)] rounded-xl shadow-xl overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-[var(--border-subtle)]">
                    <span className="text-xs font-semibold text-[var(--text-secondary)]">Select Assignees</span>
                  </div>
                  <div className="max-h-56 overflow-y-auto py-1">
                    {members.map((m) => {
                      const active = assigneeUserIds.includes(m.user.id)
                      return (
                        <button
                          key={m.user.id}
                          type="button"
                          onClick={() => toggleAssignee('user', m.user.id)}
                          className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-[var(--surface)] transition-colors text-left"
                        >
                          <Avatar className="size-5">
                            <AvatarImage src={m.user.avatar_url || undefined} />
                            <AvatarFallback className="text-[9px] bg-[var(--accent-muted-bg)] text-[var(--accent-solid)]">
                              {(m.user.full_name || m.user.username).charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-foreground flex-1 truncate">
                            {m.user.full_name || m.user.username}
                          </span>
                          {active && <Check className="size-3.5 text-[var(--accent-solid)] shrink-0" />}
                        </button>
                      )
                    })}
                    {activeAgents.length > 0 && (
                      <>
                        <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Agents</div>
                        {activeAgents.map((a) => {
                          const active = assigneeAgentIds.includes(a.id)
                          return (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => toggleAssignee('agent', a.id)}
                              className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-[var(--surface)] transition-colors text-left"
                            >
                              <span className="size-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ backgroundColor: a.color }}>
                                {a.name.charAt(0).toUpperCase()}
                              </span>
                              <span className="text-sm text-foreground flex-1 truncate">{a.name}</span>
                              {active && <Check className="size-3.5 text-[var(--accent-solid)] shrink-0" />}
                            </button>
                          )
                        })}
                      </>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
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

          {/* Labels */}
          {labels.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs text-[var(--text-tertiary)] font-medium flex items-center gap-1.5">
                <Tag className="size-3" />
                Labels
              </span>
              <div className="flex flex-wrap gap-1.5">
                {labels.map((label) => {
                  const active = selectedLabelIds.includes(label.id)
                  return (
                    <button
                      key={label.id}
                      type="button"
                      onClick={() => toggleLabel(label.id)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium border transition-all duration-200 hover:scale-[1.04] active:scale-[0.97]"
                      style={
                        active
                          ? {
                              backgroundColor: label.color,
                              borderColor: label.color,
                              color: '#fff',
                              boxShadow: `0 2px 8px -2px ${label.color}60`,
                            }
                          : {
                              borderColor: `${label.color}40`,
                              color: label.color,
                              backgroundColor: `${label.color}08`,
                            }
                      }
                    >
                      {label.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Attachments */}
          <div className="space-y-1.5">
            <span className="text-xs text-[var(--text-tertiary)] font-medium flex items-center gap-1.5">
              <Paperclip className="size-3" />
              Attachments
            </span>

            {pendingFiles.length > 0 && (
              <div className="space-y-1.5">
                {pendingFiles.map((file, i) => (
                  <div
                    key={`${file.name}-${i}`}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border-subtle)] group"
                  >
                    {isImage(file) ? (
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="size-8 rounded object-cover shrink-0 border border-[var(--border-subtle)]"
                      />
                    ) : (
                      <div className="size-8 rounded bg-[var(--accent-muted-bg)] flex items-center justify-center shrink-0">
                        <FileIcon className="size-3.5 text-[var(--accent-solid)]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)]">{formatFileSize(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="size-6 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)] text-[var(--text-tertiary)] hover:text-foreground transition-all text-xs"
            >
              <Paperclip className="size-3.5" />
              {pendingFiles.length > 0 ? 'Add more files' : 'Attach files'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface)]">
              Cancel
            </Button>
            <Button type="submit" disabled={createTask.isPending || uploading} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {uploading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Uploading...
                </>
              ) : createTask.isPending ? 'Creating...' : pendingFiles.length > 0 ? `Create with ${pendingFiles.length} file${pendingFiles.length > 1 ? 's' : ''}` : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
