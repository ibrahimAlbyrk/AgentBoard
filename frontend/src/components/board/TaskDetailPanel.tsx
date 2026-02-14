import { useState, useEffect, useRef, useCallback } from 'react'
import { formatDistanceToNow, parseISO, isPast, isToday, format } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X,
  Calendar,
  Users,
  Flag,
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
  ListTree,
  ArrowUpFromLine,
  ArrowDownToLine,
  Pencil,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useProjectStore } from '@/stores/projectStore'
import { useUpdateTask, useDeleteTask } from '@/hooks/useTasks'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useCustomFieldDefinitions } from '@/hooks/useCustomFields'
import { CustomFieldsSection } from '@/components/board/CustomFieldsSection'
import { TaskComments } from '@/components/tasks/TaskComments'
import { TaskActivity } from '@/components/tasks/TaskActivity'
import { TaskAttachments } from '@/components/tasks/TaskAttachments'
import { ChecklistSection } from '@/components/tasks/ChecklistSection'
import { SubtasksSection } from '@/components/tasks/SubtasksSection'
import { LabelManager } from '@/components/labels/LabelManager'
import { VoteButton } from '@/components/reactions/VoteButton'
import { ReactionBar } from '@/components/reactions/ReactionBar'
import { CoverPicker } from '@/components/tasks/CoverPicker'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { RichTextRenderer } from '@/components/editor/RichTextRenderer'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { GRADIENT_PRESETS } from '@/lib/cover-presets'
import { usePanelEsc } from '@/contexts/PanelStackContext'
import { useConvertToSubtask, usePromoteSubtask } from '@/hooks/useSubtasks'
import { DeleteTaskDialog } from '@/components/shared/DeleteTaskDialog'
import { TaskPickerDialog } from '@/components/tasks/TaskPickerDialog'
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
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'details'>('overview')
  const [subtaskStack, setSubtaskStack] = useState<string[]>([])
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showTaskPicker, setShowTaskPicker] = useState(false)
  const deleteTask = useDeleteTask(projectId, boardId)
  const convertToSubtask = useConvertToSubtask(projectId, boardId)
  const promoteSubtask = usePromoteSubtask(projectId, boardId)
  const panelRef = useRef<HTMLDivElement>(null)
  const tabContentRef = useRef<HTMLDivElement>(null)

  const lastTaskRef = useRef<Task | null>(null)
  if (task) lastTaskRef.current = task

  // If navigating into subtask, fetch it
  const currentSubtaskId = subtaskStack.length > 0 ? subtaskStack[subtaskStack.length - 1] : null
  const { data: subtaskRes } = useQuery({
    queryKey: ['task', projectId, boardId, currentSubtaskId],
    queryFn: () => api.getTask(projectId, boardId, currentSubtaskId!),
    enabled: !!currentSubtaskId,
  })
  const subtaskData = subtaskRes?.data ?? null
  const displayTask = currentSubtaskId ? (subtaskData ?? lastTaskRef.current) : (task ?? lastTaskRef.current)

  useEffect(() => {
    if (!open) {
      setEditingTitle(false)
      setEditingDesc(false)
      setActiveSection(null)
      setActiveTab('overview')
      setSubtaskStack([])
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
                    {displayTask.parent_id && (
                      <span className="flex items-center gap-1 text-[var(--accent-solid)]">
                        <ListTree className="size-3" />
                        Subtask
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Convert to subtask (only for root tasks) */}
                    {!displayTask.parent_id && (
                      <button
                        onClick={() => setShowTaskPicker(true)}
                        title="Make subtask of..."
                        className="size-8 rounded-xl flex items-center justify-center text-[var(--text-tertiary)] hover:text-foreground hover:bg-[var(--surface)] transition-all duration-150"
                      >
                        <ArrowDownToLine className="size-4" />
                      </button>
                    )}
                    {/* Promote to root task (only for subtasks) */}
                    {displayTask.parent_id && (
                      <button
                        onClick={() => {
                          promoteSubtask.mutate(displayTask.id, {
                            onSuccess: () => {
                              setSubtaskStack([])
                            },
                          })
                        }}
                        title="Promote to task"
                        className="size-8 rounded-xl flex items-center justify-center text-[var(--text-tertiary)] hover:text-foreground hover:bg-[var(--surface)] transition-all duration-150"
                      >
                        <ArrowUpFromLine className="size-4" />
                      </button>
                    )}
                    {/* Delete */}
                    <button
                      onClick={() => setShowDeleteDialog(true)}
                      title="Delete task"
                      className="size-8 rounded-xl flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--priority-urgent)] hover:bg-[var(--surface)] transition-all duration-150"
                    >
                      <Trash2 className="size-4" />
                    </button>
                    {/* Close */}
                    <button
                      onClick={handleFullClose}
                      className="size-8 rounded-xl flex items-center justify-center text-[var(--text-tertiary)] hover:text-foreground hover:bg-[var(--surface)] transition-all duration-150"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Fixed header: Title + Chip Strip */}
                <div className="px-6 pt-4 pb-3 shrink-0">
                  <motion.div
                    variants={stagger}
                    initial="hidden"
                    animate="visible"
                  >
                    {/* Title */}
                    <motion.div variants={fadeUp} className="mb-4">
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
                        <div
                          className="group cursor-pointer"
                          onClick={() => {
                            setTitle(displayTask.title)
                            setEditingTitle(true)
                          }}
                        >
                          <h2 className="text-[22px] font-bold tracking-tight hover:text-[var(--accent-solid)] transition-colors duration-200 leading-snug">
                            {displayTask.title}
                            <Pencil className="size-3 ml-1.5 opacity-0 group-hover:opacity-40 inline-block transition-opacity" />
                          </h2>
                        </div>
                      )}
                    </motion.div>

                    {/* Property Chip Strip */}
                    <motion.div variants={fadeUp} className="flex items-center gap-2 flex-wrap">
                      <StatusChip
                        status={displayTask.status}
                        statuses={statuses}
                        onUpdate={(statusId) => handleFieldUpdate({ status_id: statusId })}
                      />
                      <PriorityChip
                        priority={displayTask.priority}
                        onUpdate={(priority) => handleFieldUpdate({ priority })}
                      />
                      <AssigneesChip
                        assignees={displayTask.assignees ?? []}
                        members={members}
                        agents={activeAgents}
                        onUpdate={(userIds, agentIds) => handleFieldUpdate({ assignee_user_ids: userIds, assignee_agent_ids: agentIds })}
                      />
                      <DueDateChip
                        dueDate={displayTask.due_date ?? null}
                        isOverdue={!!isOverdue}
                        onUpdate={(date) => handleFieldUpdate({ due_date: date || undefined })}
                      />
                      <LabelsChip
                        taskLabels={displayTask.labels}
                        allLabels={labels}
                        onUpdate={(labelIds) => handleFieldUpdate({ label_ids: labelIds })}
                        onManage={() => setShowLabelManager(true)}
                      />
                    </motion.div>
                  </motion.div>
                </div>

                {/* Tabs */}
                <Tabs
                  value={activeTab}
                  onValueChange={(v) => setActiveTab(v as typeof activeTab)}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <TabsList variant="line" className="px-6 shrink-0 border-b border-[var(--border-subtle)] w-full">
                    <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                    <TabsTrigger value="tasks" className="text-xs gap-1.5">
                      Tasks
                      {(displayTask.children_count ?? 0) > 0 && (
                        <span className="text-[10px] bg-[var(--accent-muted-bg)] text-[var(--accent-solid)] px-1.5 py-0.5 rounded-full font-semibold">
                          {displayTask.children_count}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
                  </TabsList>

                  <div ref={tabContentRef} className="flex-1 overflow-y-auto">
                    <TabsContent value="overview" forceMount className="px-6 py-5 mt-0 data-[state=inactive]:hidden">
                      <motion.div variants={stagger} initial="hidden" animate="visible">
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

                        {/* Description */}
                        <motion.div variants={fadeUp} className="mb-6">
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="size-3.5 text-[var(--text-tertiary)]" />
                            <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                              Description
                            </span>
                          </div>
                          {editingDesc ? (
                            <div>
                              <RichTextEditor
                                projectId={projectId}
                                value={typeof displayTask.description === 'string' ? displayTask.description : (displayTask.description as TiptapDoc | null)}
                                onChange={(doc) => setDescDoc(doc)}
                                variant="full"
                                placeholder="Describe this task..."
                                autoFocus
                              />
                              <div className="flex items-center justify-end gap-2 mt-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setDescDoc(null)
                                    setEditingDesc(false)
                                  }}
                                  className="h-7 text-xs"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    handleDescSave()
                                  }}
                                  className="h-7 text-xs"
                                >
                                  Save
                                </Button>
                              </div>
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
                      </motion.div>
                    </TabsContent>

                    <TabsContent value="tasks" forceMount className="px-6 py-5 mt-0 data-[state=inactive]:hidden">
                      {/* Subtask breadcrumb */}
                      {subtaskStack.length > 0 && (
                        <div className="mb-3">
                          <button
                            onClick={() => setSubtaskStack((prev) => prev.slice(0, -1))}
                            className="flex items-center gap-1 text-xs text-[var(--accent-solid)] hover:underline"
                          >
                            <ChevronRight className="size-3 rotate-180" />
                            Back to parent task
                          </button>
                        </div>
                      )}

                      {/* Subtasks */}
                      <SubtasksSection
                        projectId={projectId}
                        boardId={boardId}
                        taskId={displayTask.id}
                        onOpenSubtask={(subtask) => {
                          setSubtaskStack((prev) => [...prev, subtask.id])
                          setActiveTab('tasks')
                          tabContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                      />

                      {/* Checklists */}
                      <ChecklistSection
                        projectId={projectId}
                        boardId={boardId}
                        taskId={displayTask.id}
                      />
                    </TabsContent>

                    <TabsContent value="details" forceMount className="px-6 py-5 mt-0 data-[state=inactive]:hidden">
                      <div className="space-y-4">
                        {/* Watchers */}
                        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)]">
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
                        </div>

                        {/* Cover */}
                        {!displayTask.cover_type && (
                          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)]">
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
                          </div>
                        )}

                        {/* Custom Fields */}
                        {customFieldDefinitions.length > 0 && (
                          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] divide-y divide-[var(--border-subtle)]">
                            <CustomFieldsSection
                              task={displayTask}
                              projectId={projectId}
                              boardId={boardId}
                              definitions={customFieldDefinitions}
                            />
                          </div>
                        )}

                        {/* Labels */}
                        <div>
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
                        </div>
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>

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
    {displayTask && (
      <DeleteTaskDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        taskTitle={displayTask.title}
        childrenCount={displayTask.children_count}
        onDelete={(mode) => {
          deleteTask.mutate({ taskId: displayTask.id, mode }, {
            onSuccess: () => {
              if (subtaskStack.length > 0) {
                setSubtaskStack((prev) => prev.slice(0, -1))
              } else {
                onClose()
              }
            },
          })
        }}
      />
    )}
    {displayTask && (
      <TaskPickerDialog
        open={showTaskPicker}
        onOpenChange={setShowTaskPicker}
        excludeTaskIds={[displayTask.id]}
        onSelect={(parentTask) => {
          convertToSubtask.mutate(
            { parentId: parentTask.id, taskId: displayTask.id },
            { onSuccess: () => onClose() },
          )
        }}
      />
    )}
    </>
  )
}

/* -- Chip Sub-Components -- */

const chipBase = "inline-flex items-center gap-1.5 bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-xs font-medium hover:border-[var(--border-strong)] transition-colors cursor-pointer"

function StatusChip({
  status,
  statuses,
  onUpdate,
}: {
  status: { id: string; name: string; color: string | null }
  statuses: { id: string; name: string; color: string | null }[]
  onUpdate: (statusId: string) => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={chipBase}>
          <span
            className="size-2 rounded-full shrink-0"
            style={{ backgroundColor: status.color || 'var(--priority-none)' }}
          />
          {status.name}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-48 p-1 bg-[var(--elevated)] border-[var(--border-subtle)] rounded-xl shadow-xl overflow-hidden">
        {statuses.map((s) => (
          <button
            key={s.id}
            onClick={() => onUpdate(s.id)}
            className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors ${s.id === status.id ? 'bg-[var(--accent-muted-bg)]' : 'hover:bg-[var(--overlay)]'}`}
          >
            <span
              className="size-2.5 rounded-full shrink-0"
              style={{ backgroundColor: s.color || 'var(--priority-none)' }}
            />
            {s.name}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

function PriorityChip({
  priority,
  onUpdate,
}: {
  priority: Priority
  onUpdate: (priority: string) => void
}) {
  const current = priorities.find((p) => p.value === priority) ?? priorities[0]
  const PIcon = current.icon
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={chipBase}
          style={{ borderColor: current.color + '40' }}
        >
          <PIcon className="size-3" style={{ color: current.color }} />
          {current.label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-44 p-1 bg-[var(--elevated)] border-[var(--border-subtle)] rounded-xl shadow-xl overflow-hidden">
        {priorities.map((p) => (
          <button
            key={p.value}
            onClick={() => onUpdate(p.value)}
            className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors ${p.value === priority ? 'bg-[var(--accent-muted-bg)]' : 'hover:bg-[var(--overlay)]'}`}
          >
            <span className="size-2.5 rounded-full" style={{ backgroundColor: p.color }} />
            {p.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

function AssigneesChip({
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
  const MAX_AVATARS = 3
  const overflow = assignees.length - MAX_AVATARS
  const userIds = new Set(assignees.filter((i) => i.user).map((i) => i.user!.id))
  const agentIds = new Set(assignees.filter((i) => i.agent).map((i) => i.agent!.id))

  const toggle = (type: 'user' | 'agent', id: string) => {
    const newUserIds = new Set(userIds)
    const newAgentIds = new Set(agentIds)
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
    <Popover>
      <PopoverTrigger asChild>
        <button className={chipBase}>
          <Users className="size-3 text-[var(--text-tertiary)]" />
          {assignees.length > 0 ? (
            <div className="flex items-center -space-x-1">
              {assignees.slice(0, MAX_AVATARS).map((a) =>
                a.user ? (
                  <Avatar key={a.id} className="size-5 border-2 border-[var(--surface)] ring-0">
                    <AvatarImage src={a.user.avatar_url || undefined} />
                    <AvatarFallback className="text-[7px] bg-[var(--accent-muted-bg)] text-[var(--accent-solid)]">
                      {(a.user.full_name || a.user.username).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : a.agent ? (
                  <span
                    key={a.id}
                    className="size-5 rounded-full flex items-center justify-center text-[7px] font-bold text-white border-2 border-[var(--surface)] shrink-0"
                    style={{ backgroundColor: a.agent.color }}
                  >
                    {a.agent.name.charAt(0).toUpperCase()}
                  </span>
                ) : null,
              )}
              {overflow > 0 && (
                <span className="size-5 rounded-full flex items-center justify-center text-[8px] font-semibold bg-[var(--accent-muted-bg)] text-[var(--accent-solid)] border-2 border-[var(--surface)]">
                  +{overflow}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[var(--text-tertiary)]">None</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-64 p-0 bg-[var(--elevated)] border-[var(--border-subtle)] rounded-xl shadow-xl overflow-hidden">
        <div className="px-3 py-2.5 border-b border-[var(--border-subtle)]">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">Assignees</span>
        </div>
        <div className="max-h-56 overflow-y-auto py-1 px-1">
          {members.map((m) => {
            const active = userIds.has(m.user.id)
            return (
              <button
                key={m.user.id}
                onClick={() => toggle('user', m.user.id)}
                className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg transition-all duration-150 text-left ${active ? 'bg-[var(--accent-muted-bg)]' : 'hover:bg-[var(--overlay)]'}`}
              >
                <Avatar className="size-5">
                  <AvatarImage src={m.user.avatar_url || undefined} />
                  <AvatarFallback className="text-[9px] bg-[var(--accent-muted-bg)] text-[var(--accent-solid)]">
                    {(m.user.full_name || m.user.username).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm flex-1 truncate">{m.user.full_name || m.user.username}</span>
                {active && <Check className="size-3.5 text-[var(--accent-solid)] shrink-0" />}
              </button>
            )
          })}
          {agents.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Agents</div>
              {agents.map((a) => {
                const active = agentIds.has(a.id)
                return (
                  <button
                    key={a.id}
                    onClick={() => toggle('agent', a.id)}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg transition-all duration-150 text-left ${active ? 'bg-[var(--accent-muted-bg)]' : 'hover:bg-[var(--overlay)]'}`}
                  >
                    <span className="size-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ backgroundColor: a.color }}>
                      {a.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="text-sm flex-1 truncate">{a.name}</span>
                    {active && <Check className="size-3.5 text-[var(--accent-solid)] shrink-0" />}
                  </button>
                )
              })}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function DueDateChip({
  dueDate,
  isOverdue,
  onUpdate,
}: {
  dueDate: string | null
  isOverdue: boolean
  onUpdate: (date: string) => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={chipBase}
          style={isOverdue ? { borderColor: 'var(--priority-urgent)', color: 'var(--priority-urgent)' } : undefined}
        >
          <Calendar className="size-3" style={isOverdue ? { color: 'var(--priority-urgent)' } : { color: 'var(--text-tertiary)' }} />
          {dueDate ? format(parseISO(dueDate), 'MMM d') : 'No date'}
          {isOverdue && (
            <span className="text-[9px] font-bold uppercase">Overdue</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-auto p-3 bg-[var(--elevated)] border-[var(--border-subtle)] rounded-xl shadow-xl">
        <Input
          type="date"
          value={dueDate?.split('T')[0] ?? ''}
          onChange={(e) => onUpdate(e.target.value)}
          className="border-[var(--border-subtle)] bg-[var(--surface)] h-8 text-sm rounded-lg"
        />
      </PopoverContent>
    </Popover>
  )
}

function LabelsChip({
  taskLabels,
  allLabels,
  onUpdate,
  onManage,
}: {
  taskLabels: { id: string; name: string; color: string }[]
  allLabels: { id: string; name: string; color: string }[]
  onUpdate: (labelIds: string[]) => void
  onManage: () => void
}) {
  const MAX_DOTS = 4
  const activeIds = new Set(taskLabels.map((l) => l.id))
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={chipBase}>
          <Tag className="size-3 text-[var(--text-tertiary)]" />
          {taskLabels.length > 0 ? (
            <div className="flex items-center gap-1">
              {taskLabels.slice(0, MAX_DOTS).map((l) => (
                <span key={l.id} className="size-2 rounded-full" style={{ backgroundColor: l.color }} />
              ))}
              {taskLabels.length > MAX_DOTS && (
                <span className="text-[9px] text-[var(--text-tertiary)]">+{taskLabels.length - MAX_DOTS}</span>
              )}
            </div>
          ) : (
            <span className="text-[var(--text-tertiary)]">None</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-56 p-0 bg-[var(--elevated)] border-[var(--border-subtle)] rounded-xl shadow-xl overflow-hidden">
        <div className="px-3 py-2.5 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">Labels</span>
          <button onClick={onManage} className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--accent-solid)] transition-colors">
            <Settings2 className="size-3" />
          </button>
        </div>
        <div className="max-h-56 overflow-y-auto py-1 px-1">
          {allLabels.map((label) => {
            const active = activeIds.has(label.id)
            return (
              <button
                key={label.id}
                onClick={() => {
                  const newIds = active
                    ? taskLabels.filter((l) => l.id !== label.id).map((l) => l.id)
                    : [...taskLabels.map((l) => l.id), label.id]
                  onUpdate(newIds)
                }}
                className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg transition-all duration-150 text-left ${active ? 'bg-[var(--accent-muted-bg)]' : 'hover:bg-[var(--overlay)]'}`}
              >
                <span className="size-3 rounded-sm" style={{ backgroundColor: label.color }} />
                <span className="text-sm flex-1 truncate">{label.name}</span>
                {active && <Check className="size-3.5 text-[var(--accent-solid)] shrink-0" />}
              </button>
            )
          })}
          {allLabels.length === 0 && (
            <div className="px-3 py-4 text-xs text-[var(--text-tertiary)] text-center">
              No labels yet
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
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
