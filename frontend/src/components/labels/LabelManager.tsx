import { useState } from 'react'
import { toast } from '@/lib/toast'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, X, Check, Tag, Palette } from 'lucide-react'
import { usePanelLayer } from '@/contexts/PanelStackContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  useLabels,
  useCreateLabel,
  useUpdateLabel,
  useDeleteLabel,
} from '@/hooks/useLabels'
import { useProjectStore } from '@/stores/projectStore'
import type { Label } from '@/types'

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308',
  '#84CC16', '#22C55E', '#14B8A6', '#06B6D4',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7',
  '#D946EF', '#EC4899', '#F43F5E', '#78716C',
]

interface LabelManagerProps {
  projectId: string
  open: boolean
  onClose: () => void
}

export function LabelManager({ projectId, open, onClose }: LabelManagerProps) {
  usePanelLayer('label-manager', open)
  const { data: labelsRes } = useLabels(projectId)
  const createLabel = useCreateLabel(projectId)
  const updateLabel = useUpdateLabel(projectId)
  const deleteLabel = useDeleteLabel(projectId)
  const { setLabels } = useProjectStore()

  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editingLabel, setEditingLabel] = useState<Label | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[8])
  const [description, setDescription] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const labels = labelsRes?.data ?? []

  const resetForm = () => {
    setName('')
    setColor(PRESET_COLORS[8])
    setDescription('')
    setEditingLabel(null)
    setMode('list')
  }

  const handleCreate = async () => {
    if (!name.trim()) return
    try {
      const res = await createLabel.mutateAsync({
        name: name.trim(),
        color,
        description: description.trim() || undefined,
      })
      if (res?.data) {
        setLabels([...labels, res.data])
      }
      toast.success('Label created')
      resetForm()
    } catch (err) {
      toast.error(err)
    }
  }

  const handleUpdate = async () => {
    if (!editingLabel || !name.trim()) return
    try {
      await updateLabel.mutateAsync({
        labelId: editingLabel.id,
        data: {
          name: name.trim(),
          color,
          description: description.trim() || undefined,
        },
      })
      setLabels(
        labels.map((l) =>
          l.id === editingLabel.id
            ? { ...l, name: name.trim(), color, description: description.trim() || null }
            : l
        )
      )
      toast.success('Label updated')
      resetForm()
    } catch (err) {
      toast.error(err)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteLabel.mutateAsync(id)
      setLabels(labels.filter((l) => l.id !== id))
      toast.success('Label deleted')
      setDeletingId(null)
    } catch (err) {
      toast.error(err)
    }
  }

  const startEdit = (label: Label) => {
    setEditingLabel(label)
    setName(label.name)
    setColor(label.color)
    setDescription(label.description ?? '')
    setMode('edit')
  }

  const startCreate = () => {
    resetForm()
    setMode('create')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); resetForm() } }}>
      <DialogContent className="bg-[var(--elevated)] border-[var(--border-subtle)] sm:max-w-[480px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2.5 text-base tracking-tight">
            <div
              className="size-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent-muted-bg)' }}
            >
              <Tag className="size-3.5 text-[var(--accent-solid)]" />
            </div>
            {mode === 'list' ? 'Manage Labels' : mode === 'create' ? 'New Label' : 'Edit Label'}
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
                  Create new label
                </button>
              </div>

              <div className="max-h-[340px] overflow-y-auto px-3 pb-4">
                {labels.length === 0 ? (
                  <div className="text-center py-10 px-4">
                    <div className="size-12 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto mb-3">
                      <Palette className="size-5 text-[var(--text-tertiary)]" />
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] font-medium">No labels yet</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">Create labels to categorize tasks</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {labels.map((label) => (
                      <div
                        key={label.id}
                        className="group flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-[var(--surface)] transition-colors duration-150"
                      >
                        <span
                          className="size-4 rounded-md shrink-0 ring-1 ring-black/10 dark:ring-white/10"
                          style={{ backgroundColor: label.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-foreground truncate block">
                            {label.name}
                          </span>
                          {label.description && (
                            <span className="text-xs text-[var(--text-tertiary)] truncate block">
                              {label.description}
                            </span>
                          )}
                        </div>
                        {label.task_count > 0 && (
                          <span className="text-[10px] font-semibold text-[var(--text-tertiary)] bg-[var(--overlay)] px-1.5 py-0.5 rounded-md">
                            {label.task_count}
                          </span>
                        )}

                        {deletingId === label.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(label.id)}
                              className="size-7 rounded-lg flex items-center justify-center text-white bg-destructive hover:bg-destructive/90 transition-colors"
                            >
                              <Check className="size-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="size-7 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--overlay)] transition-colors"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            <button
                              onClick={() => startEdit(label)}
                              className="size-7 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-foreground hover:bg-[var(--overlay)] transition-all"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingId(label.id)}
                              className="size-7 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-destructive hover:bg-destructive/10 transition-all"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
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
              {/* Preview */}
              <div className="flex items-center justify-center py-3">
                <span
                  className="px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all duration-200"
                  style={{
                    backgroundColor: color,
                    borderColor: color,
                    color: '#fff',
                    boxShadow: `0 4px 12px -3px ${color}50`,
                  }}
                >
                  {name || 'Label preview'}
                </span>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <span className="text-xs text-[var(--text-tertiary)] font-medium">Name</span>
                <Input
                  placeholder="e.g. Bug, Feature, Enhancement"
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

              {/* Color grid */}
              <div className="space-y-1.5">
                <span className="text-xs text-[var(--text-tertiary)] font-medium">Color</span>
                <div className="grid grid-cols-8 gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="size-8 rounded-lg transition-all duration-150 hover:scale-110 active:scale-95 relative"
                      style={{
                        backgroundColor: c,
                        boxShadow: color === c ? `0 0 0 2px var(--elevated), 0 0 0 4px ${c}` : undefined,
                      }}
                    >
                      {color === c && (
                        <Check className="size-3.5 text-white absolute inset-0 m-auto drop-shadow-sm" />
                      )}
                    </button>
                  ))}
                </div>
                {/* Custom color input */}
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="size-8 rounded-lg cursor-pointer border border-[var(--border-subtle)] bg-transparent p-0.5"
                  />
                  <Input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="flex-1 bg-[var(--surface)] border-[var(--border-subtle)] font-mono text-xs h-8"
                    placeholder="#000000"
                  />
                </div>
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
                  disabled={!name.trim() || createLabel.isPending || updateLabel.isPending}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {mode === 'create'
                    ? createLabel.isPending ? 'Creating...' : 'Create Label'
                    : updateLabel.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
