import { useState } from 'react'
import { toast } from '@/lib/toast'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  GripVertical,
  Type,
  Hash,
  ChevronDown,
  ListChecks,
  Calendar,
  CheckSquare,
  Link,
  UserCircle,
  Settings2,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { usePanelLayer } from '@/contexts/PanelStackContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  useCustomFieldDefinitions,
  useCreateCustomField,
  useUpdateCustomField,
  useDeleteCustomField,
  useReorderCustomFields,
} from '@/hooks/useCustomFields'
import type {
  CustomFieldDefinition,
  CustomFieldType,
  SelectOption,
} from '@/types'

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308',
  '#84CC16', '#22C55E', '#14B8A6', '#06B6D4',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7',
  '#D946EF', '#EC4899', '#F43F5E', '#78716C',
]

const FIELD_TYPE_CONFIGS: {
  type: CustomFieldType
  label: string
  icon: typeof Type
  description: string
}[] = [
  { type: 'text',         label: 'Text',         icon: Type,        description: 'Short or long text' },
  { type: 'number',       label: 'Number',       icon: Hash,        description: 'Numeric value' },
  { type: 'select',       label: 'Select',       icon: ChevronDown, description: 'Single choice' },
  { type: 'multi_select', label: 'Multi-Select', icon: ListChecks,  description: 'Multiple choices' },
  { type: 'date',         label: 'Date',         icon: Calendar,    description: 'Date picker' },
  { type: 'checkbox',     label: 'Checkbox',     icon: CheckSquare, description: 'True/false toggle' },
  { type: 'url',          label: 'URL',          icon: Link,        description: 'Web address' },
  { type: 'person',       label: 'Person',       icon: UserCircle,  description: 'Team member' },
]

const ICON_MAP: Record<string, typeof Type> = {
  text: Type,
  number: Hash,
  select: ChevronDown,
  multi_select: ListChecks,
  date: Calendar,
  checkbox: CheckSquare,
  url: Link,
  person: UserCircle,
}

interface CustomFieldManagerProps {
  projectId: string
  boardId: string
  open: boolean
  onClose: () => void
}

export function CustomFieldManager({ projectId, boardId, open, onClose }: CustomFieldManagerProps) {
  usePanelLayer('custom-field-manager', open)
  const { data: fieldsRes } = useCustomFieldDefinitions(projectId, boardId)
  const createField = useCreateCustomField(projectId, boardId)
  const updateField = useUpdateCustomField(projectId, boardId)
  const deleteField = useDeleteCustomField(projectId, boardId)
  const reorderFields = useReorderCustomFields(projectId, boardId)

  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [fieldType, setFieldType] = useState<CustomFieldType>('text')
  const [isRequired, setIsRequired] = useState(false)
  const [options, setOptions] = useState<SelectOption[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const definitions = fieldsRes?.data ?? []

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const resetForm = () => {
    setName('')
    setDescription('')
    setFieldType('text')
    setIsRequired(false)
    setOptions([])
    setEditingField(null)
    setMode('list')
  }

  const needsOptions = fieldType === 'select' || fieldType === 'multi_select'

  const fillBlankOptionLabels = (opts: SelectOption[]): SelectOption[] => {
    let maxNum = 0
    for (const o of opts) {
      const m = o.label.match(/^Option\s+(\d+)$/i)
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10))
    }
    return opts.map((o) => {
      if (o.label.trim()) return o
      maxNum += 1
      return { ...o, label: `Option ${maxNum}` }
    })
  }

  const handleCreate = async () => {
    if (!name.trim()) return
    if (needsOptions && options.length === 0) {
      toast.error('Add at least one option')
      return
    }
    const finalOptions = needsOptions ? fillBlankOptionLabels(options) : undefined
    try {
      await createField.mutateAsync({
        name: name.trim(),
        field_type: fieldType,
        description: description.trim() || undefined,
        options: finalOptions,
        is_required: isRequired,
      })
      toast.success('Field created')
      resetForm()
    } catch (err) {
      toast.error(err)
    }
  }

  const handleUpdate = async () => {
    if (!editingField || !name.trim()) return
    if (needsOptions && options.length === 0) {
      toast.error('Add at least one option')
      return
    }
    const finalOptions = needsOptions ? fillBlankOptionLabels(options) : undefined
    try {
      await updateField.mutateAsync({
        fieldId: editingField.id,
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
          options: finalOptions,
          is_required: isRequired,
        },
      })
      toast.success('Field updated')
      resetForm()
    } catch (err) {
      toast.error(err)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteField.mutateAsync(id)
      toast.success('Field deleted')
      setDeletingId(null)
    } catch (err) {
      toast.error(err)
    }
  }

  const startEdit = (field: CustomFieldDefinition) => {
    setEditingField(field)
    setName(field.name)
    setDescription(field.description ?? '')
    setFieldType(field.field_type)
    setIsRequired(field.is_required)
    setOptions(field.options ?? [])
    setMode('edit')
  }

  const startCreate = () => {
    resetForm()
    setMode('create')
  }

  const getNextOptionName = () => {
    let maxNum = 0
    for (const opt of options) {
      const match = opt.label.match(/^Option\s+(\d+)$/i)
      if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10))
    }
    return `Option ${maxNum + 1}`
  }

  const addOption = () => {
    setOptions([
      ...options,
      {
        id: crypto.randomUUID(),
        label: getNextOptionName(),
        color: PRESET_COLORS[options.length % PRESET_COLORS.length],
      },
    ])
  }

  const updateOption = (index: number, update: Partial<SelectOption>) => {
    setOptions(options.map((o, i) => (i === index ? { ...o, ...update } : o)))
  }

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeId = String(active.id)
    const overId = String(over.id)
    const oldIndex = definitions.findIndex((d) => d.id === activeId)
    const newIndex = definitions.findIndex((d) => d.id === overId)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(definitions, oldIndex, newIndex)
    reorderFields.mutate(reordered.map((d) => d.id))
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onClose()
          resetForm()
        }
      }}
    >
      <DialogContent className="bg-[var(--elevated)] border-[var(--border-subtle)] sm:max-w-[520px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2.5 text-base tracking-tight">
            <div
              className="size-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent-muted-bg)' }}
            >
              <Settings2 className="size-3.5 text-[var(--accent-solid)]" />
            </div>
            {mode === 'list' ? 'Manage Custom Fields' : mode === 'create' ? 'New Field' : 'Edit Field'}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {mode === 'list' ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.15 }}
            >
              <div className="px-5 pb-2">
                <button
                  onClick={startCreate}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-dashed border-[var(--border-strong)] text-sm text-[var(--text-secondary)] hover:text-foreground hover:border-[var(--accent-solid)] hover:bg-[var(--accent-muted-bg)] transition-all duration-200 group"
                >
                  <Plus className="size-4 text-[var(--text-tertiary)] group-hover:text-[var(--accent-solid)] transition-colors" />
                  Create new field
                </button>
              </div>

              <div className="max-h-[340px] overflow-y-auto px-3 pb-4">
                {definitions.length === 0 ? (
                  <div className="text-center py-10 px-4">
                    <div className="size-12 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto mb-3">
                      <Settings2 className="size-5 text-[var(--text-tertiary)]" />
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] font-medium">No custom fields yet</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">
                      Create fields to track project-specific data
                    </p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={definitions.map((d) => d.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-1">
                        {definitions.map((field) => (
                          <SortableFieldRow
                            key={field.id}
                            field={field}
                            deletingId={deletingId}
                            onEdit={() => startEdit(field)}
                            onDeleteStart={() => setDeletingId(field.id)}
                            onDeleteConfirm={() => handleDelete(field.id)}
                            onDeleteCancel={() => setDeletingId(null)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.15 }}
              className="px-5 pb-5 space-y-4"
            >
              {/* Field Type picker */}
              <div className="space-y-1.5">
                <span className="text-xs text-[var(--text-tertiary)] font-medium">Field Type</span>
                {mode === 'edit' && (
                  <p className="text-[10px] text-[var(--text-tertiary)]">
                    Field type cannot be changed after creation.
                  </p>
                )}
                <div className="grid grid-cols-4 gap-2">
                  {FIELD_TYPE_CONFIGS.map((config) => {
                    const selected = fieldType === config.type
                    const disabled = mode === 'edit'
                    return (
                      <button
                        key={config.type}
                        type="button"
                        disabled={disabled}
                        onClick={() => setFieldType(config.type)}
                        className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-center transition-all duration-150 ${
                          selected
                            ? 'border-[var(--accent-solid)] bg-[var(--accent-muted-bg)]'
                            : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--surface)]'
                        } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <config.icon
                          className={`size-4 ${
                            selected ? 'text-[var(--accent-solid)]' : 'text-[var(--text-tertiary)]'
                          }`}
                        />
                        <span
                          className={`text-[11px] font-medium leading-tight ${
                            selected ? 'text-[var(--accent-solid)]' : 'text-[var(--text-secondary)]'
                          }`}
                        >
                          {config.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <span className="text-xs text-[var(--text-tertiary)] font-medium">Name</span>
                <Input
                  placeholder="e.g. Story Points, Sprint, PR Link"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      mode === 'create' ? handleCreate() : handleUpdate()
                    }
                  }}
                  autoFocus
                  className="bg-[var(--surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <span className="text-xs text-[var(--text-tertiary)] font-medium">
                  Description <span className="text-[var(--text-tertiary)]">(optional)</span>
                </span>
                <Input
                  placeholder="Short description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-[var(--surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors"
                />
              </div>

              {/* Required toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-tertiary)] font-medium">Required field</span>
                <Switch checked={isRequired} onCheckedChange={setIsRequired} />
              </div>

              {/* Options editor (select/multi_select) */}
              {needsOptions && (
                <div className="space-y-2">
                  <span className="text-xs text-[var(--text-tertiary)] font-medium">Options</span>
                  <div className="space-y-1.5">
                    {options.map((opt, i) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <input
                          type="color"
                          value={opt.color}
                          onChange={(e) => updateOption(i, { color: e.target.value })}
                          className="size-7 rounded-md cursor-pointer border border-[var(--border-subtle)] bg-transparent p-0.5 shrink-0"
                        />
                        <Input
                          value={opt.label}
                          onChange={(e) => updateOption(i, { label: e.target.value })}
                          placeholder={`Option ${i + 1}`}
                          className="flex-1 bg-[var(--surface)] border-[var(--border-subtle)] h-8 text-sm"
                        />
                        <button
                          onClick={() => removeOption(i)}
                          className="size-7 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addOption}
                    className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--accent-solid)] transition-colors"
                  >
                    <Plus className="size-3" />
                    Add option
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface)]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={mode === 'create' ? handleCreate : handleUpdate}
                  disabled={!name.trim() || createField.isPending || updateField.isPending}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {mode === 'create'
                    ? createField.isPending
                      ? 'Creating...'
                      : 'Create Field'
                    : updateField.isPending
                      ? 'Saving...'
                      : 'Save Changes'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}

/* ── Sortable Field Row ── */

function SortableFieldRow({
  field,
  deletingId,
  onEdit,
  onDeleteStart,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  field: CustomFieldDefinition
  deletingId: string | null
  onEdit: () => void
  onDeleteStart: () => void
  onDeleteConfirm: () => void
  onDeleteCancel: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const Icon = ICON_MAP[field.field_type] ?? Type

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-[var(--surface)] transition-colors duration-150"
    >
      <button
        {...attributes}
        {...listeners}
        className="size-6 rounded flex items-center justify-center text-[var(--text-tertiary)] hover:text-foreground cursor-grab active:cursor-grabbing shrink-0"
      >
        <GripVertical className="size-3.5" />
      </button>

      <Icon className="size-3.5 text-[var(--text-tertiary)] shrink-0" />

      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground truncate block">
          {field.name}
        </span>
      </div>

      <span className="text-[10px] font-semibold text-[var(--text-tertiary)] bg-[var(--overlay)] px-1.5 py-0.5 rounded-md shrink-0">
        {field.field_type.replace('_', '-')}
      </span>

      {deletingId === field.id ? (
        <div className="flex items-center gap-1">
          <button
            onClick={onDeleteConfirm}
            className="size-7 rounded-lg flex items-center justify-center text-white bg-destructive hover:bg-destructive/90 transition-colors"
          >
            <Check className="size-3.5" />
          </button>
          <button
            onClick={onDeleteCancel}
            className="size-7 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--overlay)] transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            onClick={onEdit}
            className="size-7 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-foreground hover:bg-[var(--overlay)] transition-all"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={onDeleteStart}
            className="size-7 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-destructive hover:bg-destructive/10 transition-all"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
