import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CustomFieldDefinition, CustomFieldValue, CustomFieldValueSet } from '@/types'

interface FieldRendererProps {
  definition: CustomFieldDefinition
  value: CustomFieldValue | null
  onUpdate: (value: CustomFieldValueSet) => void
  onClear: () => void
}

export function SelectFieldRenderer({ definition, value, onUpdate, onClear }: FieldRendererProps) {
  const options = definition.options ?? []
  const selectedId = value?.value_json as string | undefined

  const selectedOption = selectedId
    ? options.find((o) => o.id === selectedId)
    : null

  const handleChange = (val: string) => {
    if (val === '__clear__') {
      onClear()
      return
    }
    onUpdate({
      field_definition_id: definition.id,
      value_json: val,
    })
  }

  return (
    <Select value={selectedId ?? ''} onValueChange={handleChange}>
      <SelectTrigger className="w-full border-0 bg-transparent h-8 px-2 text-sm font-medium shadow-none hover:bg-[var(--elevated)] rounded-lg transition-colors focus:ring-0 [&_[data-slot=select-value]]:overflow-visible">
        <SelectValue placeholder="Select...">
          {selectedOption ? (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold text-white"
              style={{ backgroundColor: selectedOption.color }}
            >
              {selectedOption.label}
            </span>
          ) : selectedId ? (
            <span className="text-[var(--text-tertiary)] italic text-xs">Unknown option</span>
          ) : undefined}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {selectedId && (
          <SelectItem value="__clear__">
            <span className="text-[var(--text-tertiary)]">Clear</span>
          </SelectItem>
        )}
        {options.map((opt) => (
          <SelectItem key={opt.id} value={opt.id}>
            <div className="flex items-center gap-2">
              <span
                className="size-2.5 rounded-full shrink-0"
                style={{ backgroundColor: opt.color }}
              />
              {opt.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
