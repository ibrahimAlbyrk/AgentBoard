import { Input } from '@/components/ui/input'
import type { CustomFieldDefinition, CustomFieldValue, CustomFieldValueSet } from '@/types'

interface FieldRendererProps {
  definition: CustomFieldDefinition
  value: CustomFieldValue | null
  onUpdate: (value: CustomFieldValueSet) => void
  onClear: () => void
}

export function DateFieldRenderer({ definition, value, onUpdate, onClear }: FieldRendererProps) {
  const dateStr = value?.value_date?.split('T')[0] ?? ''

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val) {
      onUpdate({
        field_definition_id: definition.id,
        value_date: val,
      })
    } else if (value) {
      onClear()
    }
  }

  return (
    <Input
      type="date"
      value={dateStr}
      onChange={handleChange}
      className="border-0 bg-transparent h-8 px-2 text-sm font-medium shadow-none hover:bg-[var(--elevated)] rounded-lg transition-colors focus-visible:ring-0 focus-visible:shadow-none"
    />
  )
}
