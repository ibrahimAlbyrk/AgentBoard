import { useState, useEffect, useRef, useCallback } from 'react'
import { formatDistanceToNow, parseISO, isPast, isToday } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X,
  Calendar,
  Users,
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
  Eye,
  Plus,
  Check,
  ImageIcon,
  Trash2,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useProjectStore } from '@/stores/projectStore'
import { useUpdateTask } from '@/hooks/useTasks'
import { useCustomFieldDefinitions } from '@/hooks/useCustomFields'
import { CustomFieldsSection } from '@/components/board/CustomFieldsSection'
import { TaskComments } from '@/components/tasks/TaskComments'
import { TaskActivity } from '@/components/tasks/TaskActivity'
import { TaskAttachments } from '@/components/tasks/TaskAttachments'
import { ChecklistSection } from '@/components/tasks/ChecklistSection'
import { LabelManager } from '@/components/labels/LabelManager'
import { VoteButton } from '@/components/reactions/VoteButton'
import { ReactionBar } from '@/components/reactions/ReactionBar'
import { CoverPicker } from '@/components/tasks/CoverPicker'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { RichTextRenderer } from '@/components/editor/RichTextRenderer'
import { GRADIENT_PRESETS } from '@/lib/cover-presets'
import { usePanelEsc } from '@/contexts/PanelStackContext'
import type { Task, Priority, AssigneeBrief, WatcherBrief, ProjectMember, Agent, TiptapDoc } from '@/types'

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

type FloatingSection = 'comments' | 'attachments' | 'activity'

const floatingBarItems: { key: FloatingSection; icon: typeof MessageSquare; label: string }[] = [
  { key: 'comments', icon: MessageSquare, label: 'Comments' },
  { key: 'attachments', icon: Paperclip, label: 'Files' },
  { key: 'activity', icon: Activity, label: 'Activity' },
]

const barSlide = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, damping: 24, stiffness: 300, delay: 0.25 },
  },
  exit: { opacity: 0, y: 12, transition: { duration: 0.15 } },
}

const sidePanelVariants = {
  hidden: { opacity: 0, x: 40, scale: 0.96, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { type: 'spring' as const, damping: 34, stiffness: 260, mass: 0.7 },
  },
  exit: {
    opacity: 0,
    x: 30,
    scale: 0.97,
    filter: 'blur(4px)',
    transition: { duration: 0.3, ease: [0.32, 0, 0.67, 0] as const },
  },
}

const sectionLabels: Record<FloatingSection, string> = {
  comments: 'Comments',
  attachments: 'Files',
  activity: 'Activity',
}

const sectionIcons: Record<FloatingSection, typeof MessageSquare> = {
  comments: MessageSquare,
  attachments: Paperclip,
  activity: Activity,
}

export function TaskDetailPanel({ task, projectId, boardId, open, onClose }: TaskDetailPanelProps) {
  const { statuses, members, labels, agents } = useProjectStore()
  const activeAgents = agents.filter((a) => a.is_active)
  const updateTask = useUpdateTask(projectId, boardId)
  const { data: customFieldsRes } = useCustomFieldDefinitions(projectId, boardId)
  const customFieldDefinitions = customFieldsRes?.data ?? []
  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState('')
  const [editingDesc, setEditingDesc] = useState(false)
  const [descDoc, setDescDoc] = useState<TiptapDoc | null>(null)
  const [showLabelManager, setShowLabelManager] = useState(false)
  const [showCoverPicker, setShowCoverPicker] = useState(false)
  const [activeSection, setActiveSection] = useState<FloatingSection | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const lastTaskRef = useRef<Task | null>(null)
  if (task) lastTaskRef.current = task
  const displayTask = task ?? lastTaskRef.current

  useEffect(() => {
    if (!open) {
      setEditingTitle(false)
      setEditingDesc(false)
      setActiveSection(null)
    }
  }, [open])

  const toggleSection = useCallback((section: FloatingSection) => {
    setActiveSection((prev) => (prev === section ? null : section))
  }, [])

  const closeSidePanel = useCallback(() => {
    setActiveSection(null)
  }, [])

  // Close modal — do NOT clear activeSection here.
  // The side panel must stay in the tree during outer exit so its exit animation plays.
  // The useEffect above clears activeSection after unmount.
  const handleFullClose = useCallback(() => {
    onClose()
  }, [onClose])

  const stableOnClose = useCallback(() => {
    // ESC: close side panel first, then task panel
    if (activeSection) {
      closeSidePanel()
    } else {
      onClose()
    }
  }, [onClose, activeSection, closeSidePanel])
  usePanelEsc('task-detail', open, stableOnClose)

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
    if (descDoc) {
      updateTask.mutate({ taskId: displayTask.id, data: { description: descDoc } })
    }
    setEditingDesc(false)
  }

  const handleFieldUpdate = (data: Record<string, unknown>) => {
    if (!displayTask) return
    updateTask.mutate({ taskId: displayTask.id, data })
  }

  const handleRemoveCover = () => {
    if (!displayTask) return
    updateTask.mutate({
      taskId: displayTask.id,
      data: { cover_type: null, cover_value: null, cover_size: null },
    })
  }

  const currentPriority = priorities.find((p) => p.value === displayTask.priority) ?? priorities[0]
  const isOverdue = displayTask.due_date && isPast(parseISO(displayTask.due_date)) && !isToday(parseISO(displayTask.due_date))

  const ActiveSectionIcon = activeSection ? sectionIcons[activeSection] : null

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
            onClick={handleFullClose}
          />

          {/* Wrapper: vertical stack — panels row + floating bar */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Container — both panels in flex row, layout animation smoothly recenters */}
            <motion.div
              layout="position"
              transition={{ type: 'spring', damping: 36, stiffness: 280, mass: 0.8 }}
              exit={{ opacity: 0, scale: 0.97, y: 14, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
              className="flex items-start gap-3 max-h-[min(78vh,760px)]"
            >
              {/* Task Detail Island */}
              <div className="relative flex flex-col items-center">
              <motion.div
                ref={panelRef}
                className="relative w-[520px] max-h-[min(78vh,760px)] flex flex-col bg-[var(--elevated)] overflow-hidden"
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
                    borderRadius: displayTask.cover_type && displayTask.cover_value ? undefined : '20px 20px 0 0',
                  }}
                />

                {/* Cover area */}
                {displayTask.cover_type && displayTask.cover_value ? (
                  <div className="relative group shrink-0" style={{ height: 180 }}>
                    {displayTask.cover_type === 'image' && displayTask.cover_image_url && (
                      <img
                        src={displayTask.cover_image_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                    {displayTask.cover_type === 'color' && (
                      <div
                        className="w-full h-full"
                        style={{ backgroundColor: displayTask.cover_value }}
                      />
                    )}
                    {displayTask.cover_type === 'gradient' && (
                      <div
                        className="w-full h-full"
                        style={{ background: GRADIENT_PRESETS[displayTask.cover_value] }}
                      />
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-end justify-end gap-2 p-3 opacity-0 group-hover:opacity-100">
                      <CoverPicker
                        task={displayTask}
                        projectId={projectId}
                        boardId={boardId}
                        open={showCoverPicker}
                        onOpenChange={setShowCoverPicker}
                      >
                        <button className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white text-xs rounded-lg px-3 py-1.5 hover:bg-black/80 transition-colors">
                          <ImageIcon className="size-3.5" />
                          Change Cover
                        </button>
                      </CoverPicker>
                      <button
                        onClick={handleRemoveCover}
                        className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white text-xs rounded-lg px-3 py-1.5 hover:bg-black/80 transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ) : null}

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
                    onClick={handleFullClose}
                    className="size-8 rounded-xl flex items-center justify-center text-[var(--text-tertiary)] hover:text-foreground hover:bg-[var(--surface)] transition-all duration-150"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Scrollable content */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
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

                    {/* Vote + Reactions */}
                    <motion.div variants={fadeUp} className="flex items-center gap-3 mb-3">
                      <VoteButton projectId={projectId} boardId={boardId} taskId={displayTask.id} />
                    </motion.div>
                    <motion.div variants={fadeUp} className="mb-6">
                      <ReactionBar
                        entityType="task"
                        projectId={projectId}
                        boardId={boardId}
                        taskId={displayTask.id}
                      />
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

                      {/* Assignees */}
                      <PropertyRow icon={Users} label="Assignees">
                        <AssigneesPicker
                          assignees={displayTask.assignees ?? []}
                          members={members}
                          agents={activeAgents}
                          onUpdate={(userIds, agentIds) => {
                            handleFieldUpdate({
                              assignee_user_ids: userIds,
                              assignee_agent_ids: agentIds,
                            })
                          }}
                        />
                      </PropertyRow>

                      {/* Watchers */}
                      <PropertyRow icon={Eye} label="Watchers">
                        <WatchersPicker
                          watchers={displayTask.watchers ?? []}
                          members={members}
                          agents={activeAgents}
                          onUpdate={(userIds, agentIds) => {
                            handleFieldUpdate({
                              watcher_user_ids: userIds,
                              watcher_agent_ids: agentIds,
                            })
                          }}
                        />
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

                      {/* Cover (only show row when no cover) */}
                      {!displayTask.cover_type && (
                        <PropertyRow icon={ImageIcon} label="Cover">
                          <CoverPicker
                            task={displayTask}
                            projectId={projectId}
                            boardId={boardId}
                            open={showCoverPicker}
                            onOpenChange={setShowCoverPicker}
                          >
                            <button className="text-sm text-[var(--text-tertiary)] hover:text-[var(--accent-solid)] transition-colors">
                              Add cover...
                            </button>
                          </CoverPicker>
                        </PropertyRow>
                      )}

                      {/* Custom Fields */}
                      <CustomFieldsSection
                        task={displayTask}
                        projectId={projectId}
                        boardId={boardId}
                        definitions={customFieldDefinitions}
                      />
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
                        <div onBlur={handleDescSave}>
                          <RichTextEditor
                            projectId={projectId}
                            value={typeof displayTask.description === 'string' ? displayTask.description : (displayTask.description as TiptapDoc | null)}
                            onChange={(doc) => setDescDoc(doc)}
                            variant="full"
                            placeholder="Describe this task..."
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setDescDoc(null)
                            setEditingDesc(true)
                          }}
                          className="min-h-[60px] px-4 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] cursor-pointer hover:border-[var(--border-strong)] transition-colors text-sm leading-relaxed group"
                        >
                          {displayTask.description ? (
                            <RichTextRenderer content={displayTask.description} />
                          ) : (
                            <p className="text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors">
                              Click to add a description...
                            </p>
                          )}
                        </div>
                      )}
                    </motion.div>

                    {/* Checklists */}
                    <ChecklistSection
                      projectId={projectId}
                      boardId={boardId}
                      taskId={displayTask.id}
                    />
                  </motion.div>
                </div>

                {/* Footer timestamps */}
                <div className="px-6 py-3 border-t border-[var(--border-subtle)] flex items-center gap-4 text-[11px] text-[var(--text-tertiary)] shrink-0 bg-[var(--surface)] rounded-b-[20px]">
                  <div className="flex items-center gap-1.5">
                    {displayTask.agent_creator ? (
                      <>
                        <span className="size-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white shrink-0" style={{ backgroundColor: displayTask.agent_creator.color }}>
                          {displayTask.agent_creator.name.charAt(0).toUpperCase()}
                        </span>
                        <span>
                          Created by {displayTask.agent_creator.name}
                        </span>
                      </>
                    ) : (
                      <>
                        <Avatar className="size-4">
                          <AvatarImage src={displayTask.creator.avatar_url || undefined} />
                          <AvatarFallback className="text-[7px] bg-[var(--accent-muted-bg)] text-[var(--accent-solid)]">
                            {(displayTask.creator.full_name || displayTask.creator.username).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>
                          Created by {displayTask.creator.full_name || displayTask.creator.username}
                        </span>
                      </>
                    )}
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

            {/* Side Panel — popLayout: exiting panel leaves flow immediately so layout animates smoothly */}
            <AnimatePresence mode="popLayout">
              {activeSection && (
                <motion.div
                  key={activeSection}
                  layout
                  variants={sidePanelVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="w-[380px] max-h-[min(78vh,760px)] flex flex-col bg-[var(--elevated)] overflow-hidden shrink-0"
                  style={{
                    borderRadius: '20px',
                    boxShadow: [
                      '0 0 0 1px var(--border-subtle)',
                      '0 8px 40px -8px rgba(0,0,0,0.2)',
                      '0 24px 80px -16px rgba(0,0,0,0.14)',
                    ].join(', '),
                  }}
                >
                  {/* Side panel header */}
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-subtle)] shrink-0">
                    <div className="flex items-center gap-2">
                      {ActiveSectionIcon && (
                        <ActiveSectionIcon className="size-4 text-[var(--accent-solid)]" />
                      )}
                      <span className="text-sm font-semibold text-foreground">
                        {sectionLabels[activeSection]}
                      </span>
                      {activeSection === 'comments' && displayTask.comments_count > 0 && (
                        <span className="text-[10px] bg-[var(--accent-muted-bg)] text-[var(--accent-solid)] px-1.5 py-0.5 rounded-full font-semibold">
                          {displayTask.comments_count}
                        </span>
                      )}
                      {activeSection === 'attachments' && (displayTask.attachments?.length ?? 0) > 0 && (
                        <span className="text-[10px] bg-[var(--accent-muted-bg)] text-[var(--accent-solid)] px-1.5 py-0.5 rounded-full font-semibold">
                          {displayTask.attachments?.length}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={closeSidePanel}
                      className="size-7 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-foreground hover:bg-[var(--surface)] transition-all duration-150"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>

                  {/* Side panel content */}
                  <div className="flex-1 overflow-y-auto px-5 py-4">
                    <motion.div
                      key={activeSection}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: 0.05 }}
                    >
                      {activeSection === 'comments' && (
                        <TaskComments projectId={projectId} boardId={boardId} taskId={displayTask.id} />
                      )}
                      {activeSection === 'attachments' && (
                        <TaskAttachments projectId={projectId} boardId={boardId} taskId={displayTask.id} />
                      )}
                      {activeSection === 'activity' && (
                        <TaskActivity projectId={projectId} taskId={displayTask.id} />
                      )}
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

            {/* Floating Action Bar — OUTSIDE layout container, always centered */}
            <motion.div
              variants={barSlide}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="mt-2 flex justify-center"
            >
              <div
                className="inline-flex items-center gap-0.5 px-1 py-1 rounded-xl"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--elevated) 88%, transparent)',
                  backdropFilter: 'blur(20px) saturate(1.8)',
                  WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
                  boxShadow: [
                    '0 4px 24px -6px rgba(0,0,0,0.25)',
                    '0 0 0 1px color-mix(in srgb, var(--border-subtle) 60%, transparent)',
                    'inset 0 1px 0 0 rgba(255,255,255,0.06)',
                  ].join(', '),
                }}
              >
                {floatingBarItems.map((item) => {
                  const isActive = activeSection === item.key
                  const count =
                    item.key === 'comments'
                      ? displayTask.comments_count
                      : item.key === 'attachments'
                        ? (displayTask.attachments?.length ?? 0)
                        : 0
                  return (
                    <button
                      key={item.key}
                      onClick={() => toggleSection(item.key)}
                      className={`
                        relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                        transition-all duration-200 cursor-pointer select-none
                        ${isActive
                          ? 'text-[var(--accent-solid)] bg-[var(--accent-solid)]/10'
                          : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover,var(--surface))]'
                        }
                      `}
                    >
                      <item.icon className="size-3.5" strokeWidth={isActive ? 2.5 : 2} />
                      <span>{item.label}</span>
                      {count > 0 && (
                        <span
                          className={`
                            text-[10px] min-w-[18px] text-center px-1 py-0.5 rounded-md font-semibold leading-none
                            ${isActive
                              ? 'bg-[var(--accent-solid)] text-white'
                              : 'bg-[var(--surface)] text-[var(--text-tertiary)]'
                            }
                          `}
                        >
                          {count}
                        </span>
                      )}
                      {isActive && (
                        <motion.div
                          layoutId="floating-bar-indicator"
                          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-[2px] rounded-full bg-[var(--accent-solid)]"
                          transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </div>
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

/* -- Property Row -- */

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

/* -- Person Picker (shared by Assignees & Watchers) -- */

function PersonPicker({
  items,
  members,
  agents,
  onUpdate,
  label,
}: {
  items: (AssigneeBrief | WatcherBrief)[]
  members: ProjectMember[]
  agents: Agent[]
  onUpdate: (userIds: string[], agentIds: string[]) => void
  label: string
}) {
  const itemUserIds = new Set(items.filter((i) => i.user).map((i) => i.user!.id))
  const itemAgentIds = new Set(items.filter((i) => i.agent).map((i) => i.agent!.id))

  const toggle = (type: 'user' | 'agent', id: string) => {
    const newUserIds = new Set(itemUserIds)
    const newAgentIds = new Set(itemAgentIds)

    if (type === 'user') {
      if (newUserIds.has(id)) newUserIds.delete(id)
      else newUserIds.add(id)
    } else {
      if (newAgentIds.has(id)) newAgentIds.delete(id)
      else newAgentIds.add(id)
    }

    onUpdate([...newUserIds], [...newAgentIds])
  }

  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      {/* Avatars */}
      <div className="flex items-center -space-x-1.5 flex-wrap gap-y-1">
        {items.map((i) =>
          i.user ? (
            <Avatar key={i.id} className="size-6 border-2 border-[var(--elevated)] ring-0">
              <AvatarImage src={i.user.avatar_url || undefined} />
              <AvatarFallback className="text-[8px] bg-[var(--accent-muted-bg)] text-[var(--accent-solid)]">
                {(i.user.full_name || i.user.username).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : i.agent ? (
            <span
              key={i.id}
              className="size-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white border-2 border-[var(--elevated)] shrink-0"
              style={{ backgroundColor: i.agent.color }}
            >
              {i.agent.name.charAt(0).toUpperCase()}
            </span>
          ) : null,
        )}
      </div>

      {/* Add button with Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="size-6 rounded-full flex items-center justify-center border border-dashed border-[var(--border-strong)] text-[var(--text-tertiary)] hover:text-[var(--accent-solid)] hover:border-[var(--accent-solid)] hover:bg-[var(--accent-muted-bg)] transition-all duration-200"
          >
            <Plus className="size-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={8}
          className="w-64 p-0 bg-[var(--elevated)] border-[var(--border-subtle)] rounded-xl shadow-xl overflow-hidden"
        >
          <div className="px-3 py-2.5 border-b border-[var(--border-subtle)]">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">{label}</span>
          </div>
          <div className="max-h-56 overflow-y-auto py-1 px-1">
            {/* Members */}
            {members.map((m) => {
              const active = itemUserIds.has(m.user.id)
              return (
                <button
                  key={m.user.id}
                  onClick={() => toggle('user', m.user.id)}
                  className={`
                    flex items-center gap-2.5 w-full px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 text-left
                    ${active
                      ? 'bg-[var(--accent-muted-bg)] hover:bg-[var(--accent-solid)]/15 active:bg-[var(--accent-solid)]/20'
                      : 'hover:bg-[var(--overlay)] active:bg-[var(--border-subtle)]'
                    }
                  `}
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
                  {active && (
                    <Check className="size-3.5 text-[var(--accent-solid)] shrink-0" />
                  )}
                </button>
              )
            })}

            {/* Agents */}
            {agents.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Agents
                </div>
                {agents.map((a) => {
                  const active = itemAgentIds.has(a.id)
                  return (
                    <button
                      key={a.id}
                      onClick={() => toggle('agent', a.id)}
                      className={`
                        flex items-center gap-2.5 w-full px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 text-left
                        ${active
                          ? 'bg-[var(--accent-muted-bg)] hover:bg-[var(--accent-solid)]/15 active:bg-[var(--accent-solid)]/20'
                          : 'hover:bg-[var(--overlay)] active:bg-[var(--border-subtle)]'
                        }
                      `}
                    >
                      <span
                        className="size-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                        style={{ backgroundColor: a.color }}
                      >
                        {a.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-sm text-foreground flex-1 truncate">
                        {a.name}
                      </span>
                      {active && (
                        <Check className="size-3.5 text-[var(--accent-solid)] shrink-0" />
                      )}
                    </button>
                  )
                })}
              </>
            )}

            {members.length === 0 && agents.length === 0 && (
              <div className="px-3 py-4 text-xs text-[var(--text-tertiary)] text-center">
                No members or agents available
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {items.length === 0 && (
        <span className="text-sm text-[var(--text-tertiary)]">None</span>
      )}
    </div>
  )
}

/* -- Assignees Picker -- */

function AssigneesPicker({
  assignees,
  members,
  agents,
  onUpdate,
}: {
  assignees: AssigneeBrief[]
  members: ProjectMember[]
  agents: Agent[]
  onUpdate: (userIds: string[], agentIds: string[]) => void
}) {
  return (
    <PersonPicker
      items={assignees}
      members={members}
      agents={agents}
      onUpdate={onUpdate}
      label="Add Assignees"
    />
  )
}

/* -- Watchers Picker -- */

function WatchersPicker({
  watchers,
  members,
  agents,
  onUpdate,
}: {
  watchers: WatcherBrief[]
  members: ProjectMember[]
  agents: Agent[]
  onUpdate: (userIds: string[], agentIds: string[]) => void
}) {
  return (
    <PersonPicker
      items={watchers}
      members={members}
      agents={agents}
      onUpdate={onUpdate}
      label="Add Watchers"
    />
  )
}
