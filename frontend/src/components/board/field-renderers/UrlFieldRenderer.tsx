import { useState } from 'react'
import { ExternalLink, Pencil } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { CustomFieldDefinition, CustomFieldValue, CustomFieldValueSet } from '@/types'

interface FieldRendererProps {
  definition: CustomFieldDefinition
  value: CustomFieldValue | null
  onUpdate: (value: CustomFieldValueSet) => void
  onClear: () => void
}

export function UrlFieldRenderer({ definition, value, onUpdate, onClear }: FieldRendererProps) {
  const [editing, setEditing] = useState(false)
  const [url, setUrl] = useState('')

  const handleStart = () => {
    setUrl(value?.value_text ?? '')
    setEditing(true)
  }

  const handleSave = () => {
    const trimmed = url.trim()
    if (trimmed) {
      const withProtocol =
        trimmed.startsWith('http://') || trimmed.startsWith('https://')
          ? trimmed
          : `https://${trimmed}`
      onUpdate({
        field_definition_id: definition.id,
        value_text: withProtocol,
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
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave()
          if (e.key === 'Escape') setEditing(false)
        }}
        placeholder="https://..."
        className="h-8 border-0 bg-transparent px-2 text-sm font-medium shadow-none focus-visible:ring-0 focus-visible:shadow-none"
      />
    )
  }

  if (value?.value_text) {
    return (
      <div className="flex items-center gap-1.5 px-2 h-8 group">
        <a
          href={value.value_text}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[var(--accent-solid)] hover:underline truncate flex-1 min-w-0"
        >
          {value.value_text.replace(/^https?:\/\//, '')}
        </a>
        <ExternalLink className="size-3 text-[var(--accent-solid)] shrink-0" />
        <button
          onClick={(e) => {
            e.preventDefault()
            handleStart()
          }}
          className="size-5 rounded flex items-center justify-center text-[var(--text-tertiary)] hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Pencil className="size-3" />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleStart}
      className="w-full text-left px-2 h-8 flex items-center text-sm rounded-lg hover:bg-[var(--elevated)] transition-colors"
    >
      <span className="text-[var(--text-tertiary)]">Add URL...</span>
    </button>
  )
}
