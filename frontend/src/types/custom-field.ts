export type CustomFieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'checkbox'
  | 'url'
  | 'person'

export interface SelectOption {
  id: string
  label: string
  color: string
}

export interface CustomFieldDefinition {
  id: string
  board_id: string
  name: string
  field_type: CustomFieldType
  description: string | null
  options: SelectOption[] | null
  is_required: boolean
  position: number
  created_at: string
  updated_at: string
}

export interface CustomFieldDefinitionCreate {
  name: string
  field_type: CustomFieldType
  description?: string
  options?: SelectOption[]
  is_required?: boolean
}

export interface CustomFieldDefinitionUpdate {
  name?: string
  description?: string
  options?: SelectOption[]
  is_required?: boolean
}

export interface CustomFieldValue {
  id: string
  field_definition_id: string
  value_text: string | null
  value_number: number | null
  value_json: unknown | null
  value_date: string | null
  created_at: string
  updated_at: string
}

export interface CustomFieldValueSet {
  field_definition_id: string
  value_text?: string | null
  value_number?: number | null
  value_json?: unknown | null
  value_date?: string | null
}

export interface FieldTypeConfig {
  type: CustomFieldType
  label: string
  icon: string
  description: string
}

export const FIELD_TYPE_CONFIGS: FieldTypeConfig[] = [
  { type: 'text',         label: 'Text',         icon: 'Type',          description: 'Short or long text' },
  { type: 'number',       label: 'Number',       icon: 'Hash',          description: 'Numeric value' },
  { type: 'select',       label: 'Select',       icon: 'ChevronDown',   description: 'Single choice from options' },
  { type: 'multi_select', label: 'Multi-Select', icon: 'ListChecks',    description: 'Multiple choices from options' },
  { type: 'date',         label: 'Date',         icon: 'Calendar',      description: 'Date picker' },
  { type: 'checkbox',     label: 'Checkbox',     icon: 'CheckSquare',   description: 'True/false toggle' },
  { type: 'url',          label: 'URL',          icon: 'Link',          description: 'Web address' },
  { type: 'person',       label: 'Person',       icon: 'UserCircle',    description: 'Team member or agent' },
]
