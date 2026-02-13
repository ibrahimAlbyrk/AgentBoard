import { useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ListTree,
  Plus,
  GripVertical,
  Trash2,
  X,
  Check,
} from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useSubtasks, useCreateSubtask, useReorderSubtask } from '@/hooks/useSubtasks'
import { useDeleteTask } from '@/hooks/useTasks'
import type { Task } from '@/types'

interface SubtasksSectionProps {
  projectId: string
  boardId: string
  taskId: string
  onOpenSubtask?: (subtask: Task) => void
}

export function SubtasksSection({ projectId, boardId, taskId, onOpenSubtask }: SubtasksSectionProps) {
  const { data: subtasksRes } = useSubtasks(projectId, boardId, taskId)
  const createSubtask = useCreateSubtask(projectId, boardId, taskId)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const addInputRef = useRef<HTMLInputElement>(null)

  const subtasks = subtasksRes?.data ?? []
  const total = subtasks.length
  const completed = subtasks.filter((s) => s.completed_at !== null).length

  const handleAdd = () => {
    const title = newTitle.trim()
    if (!title) return
    createSubtask.mutate({ title }, {
      onSuccess: () => {
        setNewTitle('')
        addInputRef.current?.focus()
      },
    })
  }

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } } }}
      className="mb-6"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListTree className="size-3.5 text-[var(--text-tertiary)]" />
          <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
            Subtasks
          </span>
          {total > 0 && (
            <span className={`text-[10px] font-medium tabular-nums ml-1 ${completed === total ? 'text-emerald-500' : 'text-[var(--text-tertiary)]'}`}>
              {completed}/{total}
            </span>
          )}
        </div>
        {!adding && (
          <button
            onClick={() => {
              setAdding(true)
              setTimeout(() => addInputRef.current?.focus(), 0)
            }}
            className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] hover:text-[var(--accent-solid)] transition-colors"
          >
            <Plus className="size-3" />
            Add subtask
          </button>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-1 rounded-full bg-[var(--border-subtle)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${(completed / total) * 100}%`,
                backgroundColor: completed === total ? 'rgb(16, 185, 129)' : 'var(--accent-solid)',
              }}
            />
          </div>
        </div>
      )}

      {/* Subtask list */}
      <SubtaskList
        subtasks={subtasks}
        projectId={projectId}
        boardId={boardId}
        parentId={taskId}
        onOpenSubtask={onOpenSubtask}
      />

      {/* Inline add input */}
      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 mt-2">
              <input
                ref={addInputRef}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd()
                  if (e.key === 'Escape') { setAdding(false); setNewTitle('') }
                }}
                placeholder="Subtask title..."
                className="flex-1 text-sm bg-transparent border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[var(--accent-solid)] placeholder:text-[var(--text-tertiary)]"
              />
              <button
                onClick={handleAdd}
                disabled={!newTitle.trim() || createSubtask.isPending}
                className="size-7 rounded-md bg-[var(--accent-solid)] text-white flex items-center justify-center hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <Check className="size-3.5" />
              </button>
              <button
                onClick={() => { setAdding(false); setNewTitle('') }}
                className="size-7 rounded-md bg-[var(--overlay)] text-[var(--text-tertiary)] flex items-center justify-center hover:bg-[var(--border-subtle)] transition-colors"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {total === 0 && !adding && (
        <p className="text-xs text-[var(--text-tertiary)] italic">
          No subtasks yet. Break this task into smaller pieces.
        </p>
      )}
    </motion.div>
  )
}

// ─── Subtask List with DnD ──────────────────────────────────────

interface SubtaskListProps {
  subtasks: Task[]
  projectId: string
  boardId: string
  parentId: string
  onOpenSubtask?: (subtask: Task) => void
}

function SubtaskList({ subtasks, projectId, boardId, parentId, onOpenSubtask }: SubtaskListProps) {
  const reorder = useReorderSubtask(projectId, boardId, parentId)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const sorted = [...subtasks].sort((a, b) => a.position - b.position)
  const activeItem = sorted.find((s) => s.id === activeId)

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (!over || active.id === over.id) return

    const oldIndex = sorted.findIndex((s) => s.id === active.id)
    const newIndex = sorted.findIndex((s) => s.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    let newPosition: number
    if (newIndex === 0) {
      newPosition = sorted[0].position / 2
    } else if (newIndex === sorted.length - 1) {
      newPosition = sorted[sorted.length - 1].position + 1024
    } else {
      const before = newIndex < oldIndex ? sorted[newIndex - 1] : sorted[newIndex]
      const after = newIndex < oldIndex ? sorted[newIndex] : sorted[newIndex + 1]
      newPosition = (before.position + after.position) / 2
    }

    reorder.mutate({ subtaskId: String(active.id), position: newPosition })
  }

  if (sorted.length === 0) return null

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <SortableContext items={sorted.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          <AnimatePresence initial={false}>
            {sorted.map((subtask) => (
              <SubtaskRow
                key={subtask.id}
                subtask={subtask}
                projectId={projectId}
                boardId={boardId}
                onOpen={() => onOpenSubtask?.(subtask)}
              />
            ))}
          </AnimatePresence>
        </div>
      </SortableContext>
      <DragOverlay>
        {activeItem && <SubtaskRowContent subtask={activeItem} isDragOverlay />}
      </DragOverlay>
    </DndContext>
  )
}

// ─── Sortable Subtask Row ────────────────────────────────────────

interface SubtaskRowProps {
  subtask: Task
  projectId: string
  boardId: string
  onOpen: () => void
}

function SubtaskRow({ subtask, projectId, boardId, onOpen }: SubtaskRowProps) {
  const deleteTask = useDeleteTask(projectId, boardId)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: subtask.id })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: isDragging ? 0.3 : 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div className="group flex items-center gap-1.5 py-1.5 px-1 rounded-lg hover:bg-[var(--overlay)] transition-colors">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-[var(--text-tertiary)] transition-opacity"
        >
          <GripVertical className="size-3" />
        </button>

        {/* Status dot */}
        <span
          className="size-2.5 rounded-full shrink-0 border"
          style={{
            backgroundColor: subtask.completed_at ? 'rgb(16, 185, 129)' : `${subtask.status.color ?? 'var(--text-tertiary)'}30`,
            borderColor: subtask.completed_at ? 'rgb(16, 185, 129)' : subtask.status.color ?? 'var(--text-tertiary)',
          }}
        />

        {/* Title */}
        <button
          onClick={onOpen}
          className="flex-1 text-left text-[13px] leading-snug truncate hover:text-[var(--accent-solid)] transition-colors"
          style={{
            textDecoration: subtask.completed_at ? 'line-through' : undefined,
            color: subtask.completed_at ? 'var(--text-tertiary)' : undefined,
          }}
        >
          {subtask.title}
        </button>

        {/* Assignees */}
        {subtask.assignees.length > 0 && (
          <div className="flex -space-x-1 shrink-0">
            {subtask.assignees.slice(0, 2).map((a) =>
              a.user ? (
                <Avatar key={a.id} className="size-4 ring-1 ring-[var(--card)]">
                  <AvatarImage src={a.user.avatar_url || undefined} />
                  <AvatarFallback className="text-[7px] bg-[var(--accent-muted-bg)] text-[var(--accent-solid)]">
                    {(a.user.full_name || a.user.username).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ) : a.agent ? (
                <span
                  key={a.id}
                  className="size-4 rounded-full ring-1 ring-[var(--card)] flex items-center justify-center text-[7px] font-bold text-white shrink-0"
                  style={{ backgroundColor: a.agent.color }}
                >
                  {a.agent.name.charAt(0).toUpperCase()}
                </span>
              ) : null
            )}
          </div>
        )}

        {/* Subtask count badge if this subtask also has children */}
        {subtask.children_count > 0 && (
          <span className="text-[9px] text-[var(--text-tertiary)] tabular-nums shrink-0">
            <ListTree className="size-2.5 inline mr-0.5" />
            {subtask.subtask_progress.completed}/{subtask.subtask_progress.total}
          </span>
        )}

        {/* Delete */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            deleteTask.mutate({ taskId: subtask.id, mode: subtask.children_count > 0 ? undefined : 'orphan' })
          }}
          className="shrink-0 opacity-0 group-hover:opacity-100 text-[var(--text-tertiary)] hover:text-[var(--priority-urgent)] transition-all"
        >
          <Trash2 className="size-3" />
        </button>
      </div>
    </motion.div>
  )
}

// ─── Static row content for drag overlay ─────────────────────────

function SubtaskRowContent({ subtask, isDragOverlay }: { subtask: Task; isDragOverlay?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 py-1.5 px-1 rounded-lg ${isDragOverlay ? 'bg-card shadow-lg border border-[var(--accent-solid)]' : ''}`}>
      <GripVertical className="size-3 text-[var(--text-tertiary)]" />
      <span
        className="size-2.5 rounded-full shrink-0 border"
        style={{
          backgroundColor: subtask.completed_at ? 'rgb(16, 185, 129)' : `${subtask.status.color ?? 'var(--text-tertiary)'}30`,
          borderColor: subtask.completed_at ? 'rgb(16, 185, 129)' : subtask.status.color ?? 'var(--text-tertiary)',
        }}
      />
      <span className="text-[13px] truncate">{subtask.title}</span>
    </div>
  )
}
