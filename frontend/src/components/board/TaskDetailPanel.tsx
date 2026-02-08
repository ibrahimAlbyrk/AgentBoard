import { useState, useEffect, useRef } from 'react'
import { formatDistanceToNow, parseISO, isPast, isToday } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X,
  Calendar,
  User,
  Flag,
  CircleDot,
  Tag,
  MessageSquare,
  Activity,
  Paperclip,
  Clock,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Settings2,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useProjectStore } from '@/stores/projectStore'
import { useUpdateTask } from '@/hooks/useTasks'
import { TaskComments } from '@/components/tasks/TaskComments'
import { TaskActivity } from '@/components/tasks/TaskActivity'
import { TaskAttachments } from '@/components/tasks/TaskAttachments'
import { LabelManager } from '@/components/labels/LabelManager'
import type { Task, Priority } from '@/types'

const priorities: { value: Priority; label: string; color: string; icon: typeof Flag }[] = [
  { value: 'none', label: 'None', color: 'var(--priority-none)', icon: Flag },
  { value: 'low', label: 'Low', color: 'var(--priority-low)', icon: Flag },
  { value: 'medium', label: 'Medium', color: 'var(--priority-medium)', icon: Flag },
  { value: 'high', label: 'High', color: 'var(--priority-high)', icon: AlertTriangle },
  { value: 'urgent', label: 'Urgent', color: 'var(--priority-urgent)', icon: AlertTriangle },
]

const priorityBg: Record<Priority, string> = {
  none: 'var(--priority-none)',
  low: 'var(--priority-low)',
  medium: 'var(--priority-medium)',
  high: 'var(--priority-high)',
  urgent: 'var(--priority-urgent)',
}

interface TaskDetailPanelProps {
  task: Task | null
  projectId: string
  boardId: string
  open: boolean
  onClose: () => void
}

const overlay = {
  hidden: { opacity: 0, backdropFilter: 'blur(0px)' },
  visible: { opacity: 1, backdropFilter: 'blur(8px)' },
  exit: { opacity: 0, backdropFilter: 'blur(0px)' },
}

const island = {
  hidden: { scale: 0.92, opacity: 0, y: 24 },
  visible: {
    scale: 1,
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, damping: 28, stiffness: 360, mass: 0.7 },
  },
  exit: {
    scale: 0.95,
    opacity: 0,
    y: 16,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] as const },
  },
}

const stagger = {
  visible: { transition: { staggerChildren: 0.035, delayChildren: 0.1 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
}

export function TaskDetailPanel({ task, projectId, boardId, open, onClose }: TaskDetailPanelProps) {
  const { statuses, members, labels } = useProjectStore()
  const updateTask = useUpdateTask(projectId, boardId)
  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState('')
  const [editingDesc, setEditingDesc] = useState(false)
  const [desc, setDesc] = useState('')
  const [showLabelManager, setShowLabelManager] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Keep last task in memory so exit animation can render with stale data
  const lastTaskRef = useRef<Task | null>(null)
  if (task) lastTaskRef.current = task
  const displayTask = task ?? lastTaskRef.current

  useEffect(() => {
    if (!open) {
      setEditingTitle(false)
      setEditingDesc(false)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!displayTask) return null

  const handleTitleSave = () => {
    if (!displayTask) return
    if (title.trim() && title !== displayTask.title) {
      updateTask.mutate({ taskId: displayTask.id, data: { title: title.trim() } })
    }
    setEditingTitle(false)
  }

  const handleDescSave = () => {
    if (!displayTask) return
    const trimmed = desc.trim()
    if (trimmed !== (displayTask.description ?? '')) {
      updateTask.mutate({ taskId: displayTask.id, data: { description: trimmed || undefined } })
    }
    setEditingDesc(false)
  }

  const handleFieldUpdate = (data: Record<string, unknown>) => {
    if (!displayTask) return
    updateTask.mutate({ taskId: displayTask.id, data })
  }

  const currentPriority = priorities.find((p) => p.value === displayTask.priority) ?? priorities[0]
  const isOverdue = displayTask.due_date && isPast(parseISO(displayTask.due_date)) && !isToday(parseISO(displayTask.due_date))

  return (
    <>
    <AnimatePresence mode="wait">
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
          {/* Overlay */}
          <motion.div
            className="absolute inset-0 bg-black/30"
            variants={overlay}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />

          {/* Floating Island */}
          <motion.div
            ref={panelRef}
            className="relative z-10 w-full max-w-[640px] max-h-[min(88vh,860px)] flex flex-col bg-[var(--elevated)] overflow-hidden"
            style={{
              borderRadius: '20px',
              boxShadow: [
                `0 0 0 1px var(--border-subtle)`,
                `0 8px 40px -8px rgba(0,0,0,0.25)`,
                `0 24px 80px -16px rgba(0,0,0,0.18)`,
                `0 0 60px -12px ${priorityBg[displayTask.priority]}20`,
              ].join(', '),
            }}
            variants={island}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Priority accent bar */}
            <div
              className="h-[3px] w-full shrink-0 transition-colors duration-300"
              style={{
                backgroundColor: priorityBg[displayTask.priority],
                borderRadius: '20px 20px 0 0',
              }}
            />

            {/* Top bar */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                <span className="font-mono bg-[var(--surface)] px-2 py-0.5 rounded-md border border-[var(--border-subtle)]">
                  {displayTask.id.slice(0, 8).toUpperCase()}
                </span>
                <ChevronRight className="size-3" />
                <span>{displayTask.status.name}</span>
              </div>
              <button
                onClick={onClose}
                className="size-8 rounded-xl flex items-center justify-center text-[var(--text-tertiary)] hover:text-foreground hover:bg-[var(--surface)] transition-all duration-150"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="visible"
                className="px-6 py-5"
              >
                {/* Title */}
                <motion.div variants={fadeUp} className="mb-6">
                  {editingTitle ? (
                    <Input
                      autoFocus
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={handleTitleSave}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleTitleSave()
                        if (e.key === 'Escape') setEditingTitle(false)
                      }}
                      className="text-[22px] font-bold bg-transparent border-0 border-b-2 border-[var(--accent-solid)] rounded-none px-0 py-1 focus-visible:ring-0 focus-visible:shadow-none tracking-tight"
                    />
                  ) : (
                    <h2
                      className="text-[22px] font-bold tracking-tight cursor-pointer hover:text-[var(--accent-solid)] transition-colors duration-200 leading-snug"
                      onClick={() => {
                        setTitle(displayTask.title)
                        setEditingTitle(true)
                      }}
                    >
                      {displayTask.title}
                    </h2>
                  )}
                </motion.div>

                {/* Property rows */}
                <motion.div
                  variants={fadeUp}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] divide-y divide-[var(--border-subtle)] mb-6"
                >
                  {/* Status */}
                  <PropertyRow icon={CircleDot} label="Status">
                    <Select
                      value={displayTask.status.id}
                      onValueChange={(v) => handleFieldUpdate({ status_id: v })}
                    >
                      <SelectTrigger className="w-full border-0 bg-transparent h-8 px-2 text-sm font-medium shadow-none hover:bg-[var(--elevated)] rounded-lg transition-colors focus:ring-0 [&_[data-slot=select-value]]:overflow-visible">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            <div className="flex items-center gap-2">
                              <span
                                className="size-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: s.color || 'var(--priority-none)', boxShadow: `0 0 0 2px var(--popover), 0 0 0 3.5px ${s.color || 'var(--priority-none)'}` }}
                              />
                              {s.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </PropertyRow>

                  {/* Priority */}
                  <PropertyRow icon={Flag} label="Priority" iconColor={currentPriority.color}>
                    <Select
                      value={displayTask.priority}
                      onValueChange={(v) => handleFieldUpdate({ priority: v })}
                    >
                      <SelectTrigger className="w-full border-0 bg-transparent h-8 px-2 text-sm font-medium shadow-none hover:bg-[var(--elevated)] rounded-lg transition-colors focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorities.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            <div className="flex items-center gap-2">
                              <span
                                className="size-2.5 rounded-full"
                                style={{ backgroundColor: p.color }}
                              />
                              {p.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </PropertyRow>

                  {/* Assignee */}
                  <PropertyRow icon={User} label="Assignee">
                    <Select
                      value={displayTask.assignee?.id ?? 'unassigned'}
                      onValueChange={(v) =>
                        handleFieldUpdate({ assignee_id: v === 'unassigned' ? null : v })
                      }
                    >
                      <SelectTrigger className="w-full border-0 bg-transparent h-8 px-2 text-sm font-medium shadow-none hover:bg-[var(--elevated)] rounded-lg transition-colors focus:ring-0">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">
                          <span className="text-[var(--text-tertiary)]">Unassigned</span>
                        </SelectItem>
                        {members.map((m) => (
                          <SelectItem key={m.id} value={m.user.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="size-5">
                                <AvatarImage src={m.user.avatar_url || undefined} />
                                <AvatarFallback className="text-[9px] bg-[var(--accent-muted-bg)] text-[var(--accent-solid)]">
                                  {(m.user.full_name || m.user.username).charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              {m.user.full_name || m.user.username}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </PropertyRow>

                  {/* Due date */}
                  <PropertyRow
                    icon={Calendar}
                    label="Due date"
                    iconColor={isOverdue ? 'var(--priority-urgent)' : undefined}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="date"
                        value={displayTask.due_date?.split('T')[0] ?? ''}
                        onChange={(e) =>
                          handleFieldUpdate({ due_date: e.target.value || undefined })
                        }
                        className="border-0 bg-transparent h-8 px-2 text-sm font-medium shadow-none hover:bg-[var(--elevated)] rounded-lg transition-colors focus-visible:ring-0 focus-visible:shadow-none"
                      />
                      {isOverdue && (
                        <span className="text-[10px] font-semibold text-[var(--priority-urgent)] bg-[var(--priority-urgent)]/10 px-1.5 py-0.5 rounded-md">
                          OVERDUE
                        </span>
                      )}
                    </div>
                  </PropertyRow>
                </motion.div>

                {/* Labels */}
                <motion.div variants={fadeUp} className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Tag className="size-3.5 text-[var(--text-tertiary)]" />
                      <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                        Labels
                      </span>
                    </div>
                    <button
                      onClick={() => setShowLabelManager(true)}
                      className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] hover:text-[var(--accent-solid)] transition-colors"
                    >
                      <Settings2 className="size-3" />
                      Manage
                    </button>
                  </div>
                  {labels.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {labels.map((label) => {
                        const active = displayTask.labels.some((l) => l.id === label.id)
                        return (
                          <button
                            key={label.id}
                            onClick={() => {
                              const newIds = active
                                ? displayTask.labels.filter((l) => l.id !== label.id).map((l) => l.id)
                                : [...displayTask.labels.map((l) => l.id), label.id]
                              handleFieldUpdate({ label_ids: newIds })
                            }}
                            className="group relative px-2.5 py-1 rounded-lg text-xs font-medium border transition-all duration-200 hover:scale-[1.04] active:scale-[0.97]"
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
                  ) : (
                    <button
                      onClick={() => setShowLabelManager(true)}
                      className="w-full py-3 rounded-xl border border-dashed border-[var(--border-strong)] text-xs text-[var(--text-tertiary)] hover:text-[var(--accent-solid)] hover:border-[var(--accent-solid)] hover:bg-[var(--accent-muted-bg)] transition-all duration-200"
                    >
                      Create labels to categorize this task
                    </button>
                  )}
                </motion.div>

                {/* Description */}
                <motion.div variants={fadeUp} className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="size-3.5 text-[var(--text-tertiary)]" />
                    <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                      Description
                    </span>
                  </div>
                  {editingDesc ? (
                    <Textarea
                      autoFocus
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                      onBlur={handleDescSave}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setEditingDesc(false)
                        }
                      }}
                      placeholder="Describe this task..."
                      className="min-h-[120px] bg-[var(--surface)] border-[var(--border-subtle)] focus:border-[var(--accent-solid)] focus:ring-2 focus:ring-[var(--ring)] rounded-xl resize-y text-sm leading-relaxed transition-all"
                    />
                  ) : (
                    <div
                      onClick={() => {
                        setDesc(displayTask.description ?? '')
                        setEditingDesc(true)
                      }}
                      className="min-h-[60px] px-4 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] cursor-pointer hover:border-[var(--border-strong)] transition-colors text-sm leading-relaxed group"
                    >
                      {displayTask.description ? (
                        <p className="text-foreground whitespace-pre-wrap">{displayTask.description}</p>
                      ) : (
                        <p className="text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors">
                          Click to add a description...
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>

                {/* Tabs: Comments / Activity */}
                <motion.div variants={fadeUp}>
                  <Tabs defaultValue="comments">
                    <TabsList variant="line" className="mb-4">
                      <TabsTrigger value="comments" className="gap-1.5 text-sm">
                        <MessageSquare className="size-3.5" />
                        Comments
                        {displayTask.comments_count > 0 && (
                          <span className="ml-1 text-[10px] bg-[var(--accent-muted-bg)] text-[var(--accent-solid)] px-1.5 py-0.5 rounded-full font-semibold">
                            {displayTask.comments_count}
                          </span>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="attachments" className="gap-1.5 text-sm">
                        <Paperclip className="size-3.5" />
                        Files
                        {displayTask.attachments?.length > 0 && (
                          <span className="ml-1 text-[10px] bg-[var(--accent-muted-bg)] text-[var(--accent-solid)] px-1.5 py-0.5 rounded-full font-semibold">
                            {displayTask.attachments.length}
                          </span>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="activity" className="gap-1.5 text-sm">
                        <Activity className="size-3.5" />
                        Activity
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="comments" forceMount className="data-[state=inactive]:hidden">
                      <TaskComments projectId={projectId} boardId={boardId} taskId={displayTask.id} />
                    </TabsContent>
                    <TabsContent value="attachments" forceMount className="data-[state=inactive]:hidden">
                      <TaskAttachments projectId={projectId} boardId={boardId} taskId={displayTask.id} />
                    </TabsContent>
                    <TabsContent value="activity" forceMount className="data-[state=inactive]:hidden">
                      <TaskActivity projectId={projectId} taskId={displayTask.id} />
                    </TabsContent>
                  </Tabs>
                </motion.div>
              </motion.div>
            </div>

            {/* Footer timestamps */}
            <div className="px-6 py-3 border-t border-[var(--border-subtle)] flex items-center gap-4 text-[11px] text-[var(--text-tertiary)] shrink-0 bg-[var(--surface)] rounded-b-[20px]">
              <div className="flex items-center gap-1.5">
                <Avatar className="size-4">
                  <AvatarImage src={displayTask.creator.avatar_url || undefined} />
                  <AvatarFallback className="text-[7px] bg-[var(--accent-muted-bg)] text-[var(--accent-solid)]">
                    {(displayTask.creator.full_name || displayTask.creator.username).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>
                  Created by {displayTask.creator.full_name || displayTask.creator.username}
                </span>
                <span className="text-[var(--border-strong)]">&middot;</span>
                <span>{formatDistanceToNow(parseISO(displayTask.created_at), { addSuffix: true })}</span>
              </div>
              <span className="text-[var(--border-strong)]">&middot;</span>
              <div className="flex items-center gap-1.5">
                <Clock className="size-3" />
                Updated {formatDistanceToNow(parseISO(displayTask.updated_at), { addSuffix: true })}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    <LabelManager
      projectId={projectId}
      open={showLabelManager}
      onClose={() => setShowLabelManager(false)}
    />
    </>
  )
}

/* ── Property Row ── */

function PropertyRow({
  icon: Icon,
  label,
  iconColor,
  children,
}: {
  icon: typeof Flag
  label: string
  iconColor?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--elevated)] transition-colors duration-150 group">
      <div className="flex items-center gap-2.5 w-[110px] shrink-0">
        <Icon
          className="size-3.5 transition-colors duration-200"
          style={{ color: iconColor || 'var(--text-tertiary)' }}
        />
        <span className="text-xs text-[var(--text-tertiary)] font-medium">{label}</span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
