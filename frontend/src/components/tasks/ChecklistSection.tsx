import { useState, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ListChecks,
  Plus,
  ChevronDown,
  Trash2,
  GripVertical,
  X,
  Check,
  Calendar,
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  useChecklists,
  useCreateChecklist,
  useUpdateChecklist,
  useDeleteChecklist,
  useCreateChecklistItem,
  useUpdateChecklistItem,
  useDeleteChecklistItem,
  useToggleChecklistItem,
  useReorderChecklistItem,
} from '@/hooks/useChecklists'
import { useProjectStore } from '@/stores/projectStore'
import { isPast, parseISO, format } from 'date-fns'
import type { Checklist, ChecklistItem as ChecklistItemType, ProjectMember } from '@/types'

interface ChecklistSectionProps {
  projectId: string
  boardId: string
  taskId: string
}

export function ChecklistSection({ projectId, boardId, taskId }: ChecklistSectionProps) {
  const { data: checklistsRes } = useChecklists(projectId, boardId, taskId)
  const createChecklist = useCreateChecklist(projectId, boardId, taskId)
  const { members } = useProjectStore()
  const [addingChecklist, setAddingChecklist] = useState(false)
  const [newChecklistTitle, setNewChecklistTitle] = useState('')
  const addInputRef = useRef<HTMLInputElement>(null)

  const checklists = checklistsRes?.data ?? []

  const handleAddChecklist = () => {
    const title = newChecklistTitle.trim() || 'Checklist'
    createChecklist.mutate({ title }, {
      onSuccess: () => {
        setNewChecklistTitle('')
        setAddingChecklist(false)
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
          <ListChecks className="size-3.5 text-[var(--text-tertiary)]" />
          <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
            Checklists
          </span>
        </div>
        {!addingChecklist && (
          <button
            onClick={() => {
              setAddingChecklist(true)
              setTimeout(() => addInputRef.current?.focus(), 0)
            }}
            className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] hover:text-[var(--accent-solid)] transition-colors"
          >
            <Plus className="size-3" />
            Add checklist
          </button>
        )}
      </div>

      {/* Inline add checklist input */}
      <AnimatePresence>
        {addingChecklist && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 overflow-hidden"
          >
            <input
              ref={addInputRef}
              value={newChecklistTitle}
              onChange={(e) => setNewChecklistTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddChecklist()
                if (e.key === 'Escape') {
                  setAddingChecklist(false)
                  setNewChecklistTitle('')
                }
              }}
              onBlur={() => {
                if (newChecklistTitle.trim()) {
                  handleAddChecklist()
                } else {
                  setAddingChecklist(false)
                }
              }}
              placeholder="Checklist title..."
              className="w-full text-sm bg-[var(--surface)] border border-[var(--border-subtle)] focus:border-[var(--accent-solid)] rounded-lg px-3 py-2 outline-none transition-colors placeholder:text-[var(--text-tertiary)]"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checklists */}
      {checklists.length > 0 ? (
        <div className="space-y-3">
          {checklists.map((checklist) => (
            <ChecklistBlock
              key={checklist.id}
              checklist={checklist}
              projectId={projectId}
              boardId={boardId}
              taskId={taskId}
              members={members}
            />
          ))}
        </div>
      ) : !addingChecklist ? (
        <button
          onClick={() => {
            setAddingChecklist(true)
            setTimeout(() => addInputRef.current?.focus(), 0)
          }}
          className="w-full py-3 rounded-xl border border-dashed border-[var(--border-strong)] text-xs text-[var(--text-tertiary)] hover:text-[var(--accent-solid)] hover:border-[var(--accent-solid)] hover:bg-[var(--accent-muted-bg)] transition-all duration-200"
        >
          Add a checklist to track subtasks
        </button>
      ) : null}
    </motion.div>
  )
}


/* -- ChecklistBlock -- */

function ChecklistBlock({
  checklist,
  projectId,
  boardId,
  taskId,
  members,
}: {
  checklist: Checklist
  projectId: string
  boardId: string
  taskId: string
  members: ProjectMember[]
}) {
  const updateChecklist = useUpdateChecklist(projectId, boardId, taskId)
  const deleteChecklist = useDeleteChecklist(projectId, boardId, taskId)
  const createItem = useCreateChecklistItem(projectId, boardId, taskId)
  const reorderItem = useReorderChecklistItem(projectId, boardId, taskId)

  const [collapsed, setCollapsed] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState(checklist.title)
  const [newItemText, setNewItemText] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const addItemRef = useRef<HTMLInputElement>(null)

  const total = checklist.items.length
  const completed = checklist.items.filter((i) => i.is_completed).length
  const pct = total > 0 ? (completed / total) * 100 : 0
  const allDone = total > 0 && completed === total

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleTitleSave = () => {
    const trimmed = title.trim()
    if (trimmed && trimmed !== checklist.title) {
      updateChecklist.mutate({ checklistId: checklist.id, data: { title: trimmed } })
    } else {
      setTitle(checklist.title)
    }
    setEditingTitle(false)
  }

  const handleAddItem = () => {
    const text = newItemText.trim()
    if (!text) return
    createItem.mutate(
      { checklistId: checklist.id, data: { title: text } },
      { onSuccess: () => setNewItemText('') },
    )
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const items = [...checklist.items].sort((a, b) => a.position - b.position)
    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    let newPosition: number
    if (newIndex === 0) {
      newPosition = items[0].position / 2
    } else if (newIndex === items.length - 1) {
      newPosition = items[items.length - 1].position + 1024
    } else {
      const before = newIndex < oldIndex ? items[newIndex - 1] : items[newIndex]
      const after = newIndex < oldIndex ? items[newIndex] : items[newIndex + 1]
      newPosition = (before.position + after.position) / 2
    }

    reorderItem.mutate({
      checklistId: checklist.id,
      itemId: active.id as string,
      position: newPosition,
    })
  }

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
      return
    }
    deleteChecklist.mutate(checklist.id)
  }

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 group">
        {editingTitle ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSave()
              if (e.key === 'Escape') {
                setTitle(checklist.title)
                setEditingTitle(false)
              }
            }}
            className="flex-1 text-sm font-semibold bg-transparent border-0 border-b border-[var(--accent-solid)] outline-none px-0 py-0"
          />
        ) : (
          <span
            className="flex-1 text-sm font-semibold text-foreground cursor-pointer hover:text-[var(--accent-solid)] transition-colors truncate"
            onClick={() => {
              setTitle(checklist.title)
              setEditingTitle(true)
            }}
          >
            {checklist.title}
          </span>
        )}

        {total > 0 && (
          <span className={`text-[11px] font-medium tabular-nums shrink-0 ${allDone ? 'text-emerald-500' : 'text-[var(--text-tertiary)]'}`}>
            {completed}/{total}
          </span>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="size-6 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-foreground hover:bg-[var(--elevated)] transition-all shrink-0"
        >
          <ChevronDown
            className="size-3.5 transition-transform duration-200"
            style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
          />
        </button>

        <button
          onClick={handleDelete}
          className={`size-6 rounded-md flex items-center justify-center transition-all shrink-0 ${
            confirmDelete
              ? 'text-[var(--priority-urgent)] bg-[var(--priority-urgent)]/10'
              : 'text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 hover:text-[var(--priority-urgent)]'
          }`}
          title={confirmDelete ? 'Click again to confirm delete' : 'Delete checklist'}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="h-[3px] mx-4 mb-2 rounded-full bg-[var(--border-subtle)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${pct}%`,
              backgroundColor: allDone ? 'rgb(16, 185, 129)' : 'var(--accent-solid)',
              boxShadow: allDone ? '0 0 8px rgba(16, 185, 129, 0.4)' : 'none',
            }}
          />
        </div>
      )}

      {/* Items list + add input */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={checklist.items.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <AnimatePresence initial={false}>
                  {checklist.items.map((item) => (
                    <ChecklistItemRow
                      key={item.id}
                      item={item}
                      checklistId={checklist.id}
                      projectId={projectId}
                      boardId={boardId}
                      taskId={taskId}
                      members={members}
                      isOverlay={false}
                      isDragActive={activeId === item.id}
                    />
                  ))}
                </AnimatePresence>
              </SortableContext>
              <DragOverlay dropAnimation={null}>
                {activeId ? (() => {
                  const activeItem = checklist.items.find((i) => i.id === activeId)
                  if (!activeItem) return null
                  return (
                    <ChecklistItemRow
                      item={activeItem}
                      checklistId={checklist.id}
                      projectId={projectId}
                      boardId={boardId}
                      taskId={taskId}
                      members={members}
                      isOverlay
                      isDragActive={false}
                    />
                  )
                })() : null}
              </DragOverlay>
            </DndContext>

            {/* Add item input */}
            <div className="flex items-center gap-2 px-4 py-2 border-t border-[var(--border-subtle)]">
              <button
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleAddItem()
                }}
                className="shrink-0 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--accent-solid)] transition-colors"
                tabIndex={-1}
              >
                <Plus className="size-3.5" />
              </button>
              <input
                ref={addItemRef}
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddItem()
                  }
                  if (e.key === 'Escape') {
                    setNewItemText('')
                    addItemRef.current?.blur()
                  }
                }}
                placeholder="Add an item..."
                className="flex-1 text-sm bg-transparent border-0 outline-none placeholder:text-[var(--text-tertiary)]"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


/* -- ChecklistItemRow -- */

function ChecklistItemRow({
  item,
  checklistId,
  projectId,
  boardId,
  taskId,
  members,
  isOverlay = false,
  isDragActive = false,
}: {
  item: ChecklistItemType
  checklistId: string
  projectId: string
  boardId: string
  taskId: string
  members: ProjectMember[]
  isOverlay?: boolean
  isDragActive?: boolean
}) {
  const toggleItem = useToggleChecklistItem(projectId, boardId, taskId)
  const updateItem = useUpdateChecklistItem(projectId, boardId, taskId)
  const deleteItem = useDeleteChecklistItem(projectId, boardId, taskId)

  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState(item.title)
  const [optimisticChecked, setOptimisticChecked] = useState<boolean | null>(null)

  const isChecked = optimisticChecked ?? item.is_completed

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: _isDragging,
  } = useSortable({ id: item.id })

  const style: React.CSSProperties = isOverlay
    ? {
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        transform: 'scale(1.02)',
        borderLeft: '2px solid var(--accent-solid)',
        borderRadius: '8px',
        background: 'var(--surface)',
      }
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragActive ? 0.3 : 1,
      }

  const handleToggle = useCallback(() => {
    setOptimisticChecked(!isChecked)
    toggleItem.mutate(
      { checklistId, itemId: item.id },
      {
        onError: () => setOptimisticChecked(null),
        onSettled: () => setOptimisticChecked(null),
      },
    )
  }, [isChecked, toggleItem, checklistId, item.id])

  const handleTitleSave = () => {
    const trimmed = title.trim()
    if (trimmed && trimmed !== item.title) {
      updateItem.mutate({ checklistId, itemId: item.id, data: { title: trimmed } })
    } else {
      setTitle(item.title)
    }
    setEditingTitle(false)
  }

  const handleAssign = (userId: string | null) => {
    updateItem.mutate({ checklistId, itemId: item.id, data: { assignee_id: userId } })
  }

  const handleDueDateChange = (date: string | null) => {
    updateItem.mutate({ checklistId, itemId: item.id, data: { due_date: date } })
  }

  const isOverdue = item.due_date && !item.is_completed && isPast(parseISO(item.due_date))

  const content = (
    <>
      {/* Drag handle */}
      <div
        {...(isOverlay ? {} : { ...attributes, ...listeners })}
        className="hidden sm:flex size-4 items-center justify-center cursor-grab opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
      >
        <GripVertical className="size-3 text-[var(--text-tertiary)]" />
      </div>

      {/* Checkbox */}
      <button
        onClick={handleToggle}
        className="size-4 rounded-md border-2 flex items-center justify-center shrink-0"
        style={{
          borderColor: isChecked ? 'var(--accent-solid)' : 'var(--border-strong)',
          backgroundColor: isChecked ? 'var(--accent-solid)' : 'transparent',
          transition: 'border-color 0.2s ease, background-color 0.2s ease',
        }}
      >
        <Check
          className="size-2.5 text-white"
          strokeWidth={3}
          style={{
            transform: isChecked ? 'scale(1)' : 'scale(0)',
            opacity: isChecked ? 1 : 0,
            transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.15s ease',
          }}
        />
      </button>

      {/* Title */}
      {editingTitle ? (
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleTitleSave()
            if (e.key === 'Escape') {
              setTitle(item.title)
              setEditingTitle(false)
            }
          }}
          className="flex-1 text-sm bg-transparent border-0 border-b border-[var(--accent-solid)] outline-none min-w-0 px-0 py-0"
        />
      ) : (
        <span
          onClick={() => {
            setTitle(item.title)
            setEditingTitle(true)
          }}
          className={`flex-1 text-sm cursor-pointer min-w-0 truncate transition-all ${
            isChecked ? 'line-through text-[var(--text-tertiary)] opacity-60' : 'text-foreground'
          }`}
        >
          {item.title}
        </span>
      )}

      {/* Due date badge */}
      {item.due_date && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={`text-[10px] px-1.5 py-0.5 rounded-md shrink-0 ${
                isOverdue
                  ? 'text-[var(--priority-urgent)] bg-[var(--priority-urgent)]/10'
                  : 'text-[var(--text-tertiary)] bg-[var(--surface)]'
              }`}
            >
              <span className="flex items-center gap-1">
                <Calendar className="size-2.5" />
                {format(parseISO(item.due_date), 'MMM d')}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-2 bg-[var(--elevated)] border-[var(--border-subtle)] rounded-xl">
            <input
              type="date"
              defaultValue={item.due_date?.split('T')[0] ?? ''}
              onChange={(e) => handleDueDateChange(e.target.value || null)}
              className="text-sm bg-transparent border border-[var(--border-subtle)] rounded-lg px-2 py-1 outline-none"
            />
            <button
              onClick={() => handleDueDateChange(null)}
              className="block mt-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--priority-urgent)] transition-colors"
            >
              Remove date
            </button>
          </PopoverContent>
        </Popover>
      )}

      {/* Due date add button (when no date set) */}
      {!item.due_date && (
        <Popover>
          <PopoverTrigger asChild>
            <button className="size-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity shrink-0">
              <Calendar className="size-3 text-[var(--text-tertiary)]" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-2 bg-[var(--elevated)] border-[var(--border-subtle)] rounded-xl">
            <input
              type="date"
              onChange={(e) => handleDueDateChange(e.target.value || null)}
              className="text-sm bg-transparent border border-[var(--border-subtle)] rounded-lg px-2 py-1 outline-none"
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Assignee */}
      {item.assignee ? (
        <Popover>
          <PopoverTrigger asChild>
            <button className="shrink-0">
              <Avatar className="size-5">
                <AvatarImage src={item.assignee.avatar_url || undefined} />
                <AvatarFallback className="text-[8px] bg-[var(--accent-muted-bg)] text-[var(--accent-solid)]">
                  {(item.assignee.full_name || item.assignee.username).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={8} className="w-56 p-0 bg-[var(--elevated)] border-[var(--border-subtle)] rounded-xl shadow-xl overflow-hidden">
            <AssigneeList
              members={members}
              currentId={item.assignee.id}
              onSelect={handleAssign}
            />
          </PopoverContent>
        </Popover>
      ) : (
        <Popover>
          <PopoverTrigger asChild>
            <button className="size-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity shrink-0">
              <Plus className="size-3 text-[var(--text-tertiary)]" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={8} className="w-56 p-0 bg-[var(--elevated)] border-[var(--border-subtle)] rounded-xl shadow-xl overflow-hidden">
            <AssigneeList
              members={members}
              currentId={null}
              onSelect={handleAssign}
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Delete */}
      <button
        onClick={() => deleteItem.mutate({ checklistId, itemId: item.id })}
        className="size-4 flex items-center justify-center opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity shrink-0"
      >
        <X className="size-3 text-[var(--text-tertiary)] hover:text-[var(--priority-urgent)] transition-colors" />
      </button>
    </>
  )

  if (isOverlay) {
    return (
      <div
        style={style}
        className="flex items-center gap-2 px-4 py-1.5 group"
      >
        {content}
      </div>
    )
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-2 px-4 py-1.5 group hover:bg-[var(--elevated)] transition-colors"
    >
      {content}
    </motion.div>
  )
}


/* -- AssigneeList (for item assignment popover) -- */

function AssigneeList({
  members,
  currentId,
  onSelect,
}: {
  members: ProjectMember[]
  currentId: string | null
  onSelect: (userId: string | null) => void
}) {
  return (
    <div className="py-1 max-h-56 overflow-y-auto">
      <div className="px-3 py-2 border-b border-[var(--border-subtle)]">
        <span className="text-xs font-semibold text-[var(--text-secondary)]">Assign to</span>
      </div>
      {currentId && (
        <button
          onClick={() => onSelect(null)}
          className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-[var(--surface)] transition-colors text-left text-sm text-[var(--text-tertiary)]"
        >
          Unassign
        </button>
      )}
      {members.map((m) => (
        <button
          key={m.user.id}
          onClick={() => onSelect(m.user.id)}
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
          {currentId === m.user.id && (
            <Check className="size-3.5 text-[var(--accent-solid)] shrink-0" />
          )}
        </button>
      ))}
      {members.length === 0 && (
        <div className="px-3 py-4 text-xs text-[var(--text-tertiary)] text-center">
          No members available
        </div>
      )}
    </div>
  )
}
