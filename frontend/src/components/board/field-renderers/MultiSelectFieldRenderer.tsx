import { Check } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { CustomFieldDefinition, CustomFieldValue, CustomFieldValueSet } from '@/types'

interface FieldRendererProps {
  definition: CustomFieldDefinition
  value: CustomFieldValue | null
  onUpdate: (value: CustomFieldValueSet) => void
  onClear: () => void
}

export function MultiSelectFieldRenderer({ definition, value, onUpdate, onClear }: FieldRendererProps) {
  const options = definition.options ?? []
  const selectedIds = (value?.value_json as string[] | undefined) ?? []

  const toggle = (optId: string) => {
    const newIds = selectedIds.includes(optId)
      ? selectedIds.filter((id) => id !== optId)
      : [...selectedIds, optId]

    if (newIds.length === 0) {
      onClear()
    } else {
      onUpdate({
        field_definition_id: definition.id,
        value_json: newIds,
      })
    }
  }

  const selectedOptions = selectedIds
    .map((id) => options.find((o) => o.id === id))
    .filter(Boolean)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="w-full text-left px-2 min-h-8 flex items-center flex-wrap gap-1 py-1 rounded-lg hover:bg-[var(--elevated)] transition-colors">
          {selectedOptions.length > 0 ? (
            selectedOptions.map((opt) =>
              opt ? (
                <span
                  key={opt.id}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold text-white"
                  style={{ backgroundColor: opt.color }}
                >
                  {opt.label}
                </span>
              ) : null
            )
          ) : (
            <span className="text-sm text-[var(--text-tertiary)]">Select options...</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-56 p-0 bg-[var(--elevated)] border-[var(--border-subtle)] rounded-xl shadow-xl overflow-hidden"
      >
        <div className="px-3 py-2.5 border-b border-[var(--border-subtle)]">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            {definition.name}
          </span>
        </div>
        <div className="max-h-56 overflow-y-auto py-1">
          {options.map((opt) => {
            const active = selectedIds.includes(opt.id)
            return (
              <button
                key={opt.id}
                onClick={() => toggle(opt.id)}
                className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-[var(--surface)] transition-colors text-left"
              >
                <span
                  className="size-3 rounded-sm shrink-0"
                  style={{ backgroundColor: opt.color }}
                />
                <span className="text-sm text-foreground flex-1 truncate">
                  {opt.label}
                </span>
                {active && (
                  <Check className="size-3.5 text-[var(--accent-solid)] shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
