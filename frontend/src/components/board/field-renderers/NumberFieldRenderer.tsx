import { useState } from 'react'
import { Input } from '@/components/ui/input'
import type { CustomFieldDefinition, CustomFieldValue, CustomFieldValueSet } from '@/types'

interface FieldRendererProps {
  definition: CustomFieldDefinition
  value: CustomFieldValue | null
  onUpdate: (value: CustomFieldValueSet) => void
  onClear: () => void
}

export function NumberFieldRenderer({ definition, value, onUpdate, onClear }: FieldRendererProps) {
  const [editing, setEditing] = useState(false)
  const [num, setNum] = useState('')

  const handleStart = () => {
    setNum(value?.value_number != null ? String(value.value_number) : '')
    setEditing(true)
  }

  const handleSave = () => {
    const parsed = parseFloat(num)
    if (!isNaN(parsed)) {
      onUpdate({
        field_definition_id: definition.id,
        value_number: parsed,
      })
    } else if (num.trim() === '' && value) {
      onClear()
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <Input
        autoFocus
        type="number"
        value={num}
        onChange={(e) => setNum(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave()
          if (e.key === 'Escape') setEditing(false)
        }}
        className="h-8 border-0 bg-transparent px-2 text-sm font-medium shadow-none focus-visible:ring-0 focus-visible:shadow-none"
      />
    )
  }

  return (
    <button
      onClick={handleStart}
      className="w-full text-left px-2 h-8 flex items-center text-sm rounded-lg hover:bg-[var(--elevated)] transition-colors"
    >
      {value?.value_number != null ? (
        <span className="font-medium text-foreground">{value.value_number}</span>
      ) : (
        <span className="text-[var(--text-tertiary)]">Add number...</span>
      )}
    </button>
  )
}
