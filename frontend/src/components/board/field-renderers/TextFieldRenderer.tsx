import { useState } from 'react'
import { Input } from '@/components/ui/input'
import type { CustomFieldDefinition, CustomFieldValue, CustomFieldValueSet } from '@/types'

interface FieldRendererProps {
  definition: CustomFieldDefinition
  value: CustomFieldValue | null
  onUpdate: (value: CustomFieldValueSet) => void
  onClear: () => void
}

export function TextFieldRenderer({ definition, value, onUpdate, onClear }: FieldRendererProps) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')

  const handleStart = () => {
    setText(value?.value_text ?? '')
    setEditing(true)
  }

  const handleSave = () => {
    const trimmed = text.trim()
    if (trimmed) {
      onUpdate({
        field_definition_id: definition.id,
        value_text: trimmed,
      })
    } else if (value) {
      onClear()
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <Input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
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
      {value?.value_text ? (
        <span className="font-medium text-foreground truncate">{value.value_text}</span>
      ) : (
        <span className="text-[var(--text-tertiary)]">Add text...</span>
      )}
    </button>
  )
}
