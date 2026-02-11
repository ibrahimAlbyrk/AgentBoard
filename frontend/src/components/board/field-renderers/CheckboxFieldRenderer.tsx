import { Switch } from '@/components/ui/switch'
import type { CustomFieldDefinition, CustomFieldValue, CustomFieldValueSet } from '@/types'

interface FieldRendererProps {
  definition: CustomFieldDefinition
  value: CustomFieldValue | null
  onUpdate: (value: CustomFieldValueSet) => void
  onClear: () => void
}

export function CheckboxFieldRenderer({ definition, value, onUpdate }: FieldRendererProps) {
  const checked = value?.value_number === 1.0

  const handleToggle = (val: boolean) => {
    onUpdate({
      field_definition_id: definition.id,
      value_number: val ? 1.0 : 0.0,
    })
  }

  return (
    <div className="flex items-center px-2 h-8">
      <Switch checked={checked} onCheckedChange={handleToggle} />
    </div>
  )
}
