import { useState } from 'react'
import {
  Type,
  Hash,
  ChevronDown,
  ListChecks,
  Calendar,
  CheckSquare,
  Link,
  UserCircle,
  Settings2,
  Plus,
} from 'lucide-react'
import { useSetFieldValue, useClearFieldValue } from '@/hooks/useCustomFields'
import {
  TextFieldRenderer,
  NumberFieldRenderer,
  SelectFieldRenderer,
  MultiSelectFieldRenderer,
  DateFieldRenderer,
  CheckboxFieldRenderer,
  UrlFieldRenderer,
  PersonFieldRenderer,
} from '@/components/board/field-renderers'
import { CustomFieldManager } from '@/components/board/CustomFieldManager'
import type { Task, CustomFieldDefinition, CustomFieldValue, CustomFieldValueSet, CustomFieldType } from '@/types'

interface CustomFieldsSectionProps {
  task: Task
  projectId: string
  boardId: string
  definitions: CustomFieldDefinition[]
}

const FIELD_ICONS: Record<CustomFieldType, typeof Type> = {
  text: Type,
  number: Hash,
  select: ChevronDown,
  multi_select: ListChecks,
  date: Calendar,
  checkbox: CheckSquare,
  url: Link,
  person: UserCircle,
}

const FIELD_RENDERERS: Record<
  CustomFieldType,
  React.ComponentType<{
    definition: CustomFieldDefinition
    value: CustomFieldValue | null
    onUpdate: (value: CustomFieldValueSet) => void
    onClear: () => void
  }>
> = {
  text: TextFieldRenderer,
  number: NumberFieldRenderer,
  select: SelectFieldRenderer,
  multi_select: MultiSelectFieldRenderer,
  date: DateFieldRenderer,
  checkbox: CheckboxFieldRenderer,
  url: UrlFieldRenderer,
  person: PersonFieldRenderer,
}

export function CustomFieldsSection({
  task,
  projectId,
  boardId,
  definitions,
}: CustomFieldsSectionProps) {
  const [showManager, setShowManager] = useState(false)
  const setFieldValue = useSetFieldValue(projectId, boardId, task.id)
  const clearFieldValue = useClearFieldValue(projectId, boardId, task.id)

  const getFieldValue = (defId: string): CustomFieldValue | null => {
    return task.custom_field_values?.find((v) => v.field_definition_id === defId) ?? null
  }

  const handleUpdate = (valueSet: CustomFieldValueSet) => {
    setFieldValue.mutate(valueSet)
  }

  const handleClear = (defId: string) => {
    clearFieldValue.mutate(defId)
  }

  return (
    <>
      {/* Divider */}
      <div className="relative flex items-center px-4 py-1.5">
        <div className="flex-1 border-t border-[var(--border-subtle)]" />
        <span className="px-2 text-[10px] text-[var(--text-tertiary)] uppercase tracking-widest font-medium">
          Custom Fields
        </span>
        <div className="flex-1 border-t border-[var(--border-subtle)]" />
      </div>

      {definitions.length > 0 ? (
        <>
          {definitions.map((def) => {
            const Icon = FIELD_ICONS[def.field_type] ?? Type
            const Renderer = FIELD_RENDERERS[def.field_type]
            const fieldValue = getFieldValue(def.id)
            const isRequired = def.is_required && !fieldValue

            return (
              <div
                key={def.id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--elevated)] transition-colors duration-150 group"
              >
                <div className="flex items-center gap-2.5 w-[110px] shrink-0">
                  <Icon className="size-3.5 text-[var(--text-tertiary)]" />
                  <span className="text-xs text-[var(--text-tertiary)] font-medium truncate">
                    {def.name}
                  </span>
                  {isRequired && (
                    <span className="size-1.5 rounded-full bg-orange-400 shrink-0" title="Required" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {Renderer && (
                    <Renderer
                      definition={def}
                      value={fieldValue}
                      onUpdate={handleUpdate}
                      onClear={() => handleClear(def.id)}
                    />
                  )}
                </div>
              </div>
            )
          })}

          {/* Manage Fields link */}
          <div className="flex items-center justify-end px-4 py-2">
            <button
              onClick={() => setShowManager(true)}
              className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] hover:text-[var(--accent-solid)] transition-colors"
            >
              <Settings2 className="size-3" />
              Manage Fields
            </button>
          </div>
        </>
      ) : (
        <div className="px-4 py-4 text-center">
          <p className="text-xs text-[var(--text-tertiary)] mb-2">
            No custom fields defined
          </p>
          <button
            onClick={() => setShowManager(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[var(--border-strong)] text-xs text-[var(--text-secondary)] hover:text-[var(--accent-solid)] hover:border-[var(--accent-solid)] hover:bg-[var(--accent-muted-bg)] transition-all duration-200"
          >
            <Plus className="size-3" />
            Add Field
          </button>
        </div>
      )}

      <CustomFieldManager
        projectId={projectId}
        boardId={boardId}
        open={showManager}
        onClose={() => setShowManager(false)}
      />
    </>
  )
}
