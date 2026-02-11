import { Check, Plus } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useProjectStore } from '@/stores/projectStore'
import type { CustomFieldDefinition, CustomFieldValue, CustomFieldValueSet } from '@/types'

interface FieldRendererProps {
  definition: CustomFieldDefinition
  value: CustomFieldValue | null
  onUpdate: (value: CustomFieldValueSet) => void
  onClear: () => void
}

interface PersonEntry {
  user_id?: string
  agent_id?: string
}

export function PersonFieldRenderer({ definition, value, onUpdate, onClear }: FieldRendererProps) {
  const { members, agents } = useProjectStore()
  const activeAgents = agents.filter((a) => a.is_active)

  const persons = (value?.value_json as PersonEntry[] | undefined) ?? []

  const personUserIds = new Set(persons.filter((p) => p.user_id).map((p) => p.user_id!))
  const personAgentIds = new Set(persons.filter((p) => p.agent_id).map((p) => p.agent_id!))

  const toggle = (type: 'user' | 'agent', id: string) => {
    let newPersons: PersonEntry[]

    if (type === 'user') {
      if (personUserIds.has(id)) {
        newPersons = persons.filter((p) => p.user_id !== id)
      } else {
        newPersons = [...persons, { user_id: id }]
      }
    } else {
      if (personAgentIds.has(id)) {
        newPersons = persons.filter((p) => p.agent_id !== id)
      } else {
        newPersons = [...persons, { agent_id: id }]
      }
    }

    if (newPersons.length === 0) {
      onClear()
    } else {
      onUpdate({
        field_definition_id: definition.id,
        value_json: newPersons,
      })
    }
  }

  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0 px-2 h-8">
      <div className="flex items-center -space-x-1.5 flex-wrap gap-y-1">
        {persons.map((p, i) => {
          if (p.user_id) {
            const member = members.find((m) => m.user.id === p.user_id)
            if (!member) return null
            return (
              <Avatar key={i} className="size-6 border-2 border-[var(--elevated)] ring-0">
                <AvatarImage src={member.user.avatar_url || undefined} />
                <AvatarFallback className="text-[8px] bg-[var(--accent-muted-bg)] text-[var(--accent-solid)]">
                  {(member.user.full_name || member.user.username).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )
          }
          if (p.agent_id) {
            const agent = agents.find((a) => a.id === p.agent_id)
            if (!agent) return null
            return (
              <span
                key={i}
                className="size-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white border-2 border-[var(--elevated)] shrink-0"
                style={{ backgroundColor: agent.color }}
              >
                {agent.name.charAt(0).toUpperCase()}
              </span>
            )
          }
          return null
        })}
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <button className="size-6 rounded-full flex items-center justify-center border border-dashed border-[var(--border-strong)] text-[var(--text-tertiary)] hover:text-[var(--accent-solid)] hover:border-[var(--accent-solid)] hover:bg-[var(--accent-muted-bg)] transition-all duration-200">
            <Plus className="size-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={8}
          className="w-64 p-0 bg-[var(--elevated)] border-[var(--border-subtle)] rounded-xl shadow-xl overflow-hidden"
        >
          <div className="px-3 py-2.5 border-b border-[var(--border-subtle)]">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              {definition.name}
            </span>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {members.map((m) => {
              const active = personUserIds.has(m.user.id)
              return (
                <button
                  key={m.user.id}
                  onClick={() => toggle('user', m.user.id)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-[var(--surface)] transition-colors text-left"
                >
                  <Avatar className="size-5">
                    <AvatarImage src={m.user.avatar_url || undefined} />
                    <AvatarFallback className="text-[9px] bg-[var(--accent-muted-bg)] text-[var(--accent-solid)]">
                      {(m.user.full_name || m.user.username).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-foreground flex-1 truncate">
                    {m.user.full_name || m.user.username}
                  </span>
                  {active && <Check className="size-3.5 text-[var(--accent-solid)] shrink-0" />}
                </button>
              )
            })}

            {activeAgents.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Agents
                </div>
                {activeAgents.map((a) => {
                  const active = personAgentIds.has(a.id)
                  return (
                    <button
                      key={a.id}
                      onClick={() => toggle('agent', a.id)}
                      className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-[var(--surface)] transition-colors text-left"
                    >
                      <span
                        className="size-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                        style={{ backgroundColor: a.color }}
                      >
                        {a.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-sm text-foreground flex-1 truncate">{a.name}</span>
                      {active && <Check className="size-3.5 text-[var(--accent-solid)] shrink-0" />}
                    </button>
                  )
                })}
              </>
            )}

            {members.length === 0 && activeAgents.length === 0 && (
              <div className="px-3 py-4 text-xs text-[var(--text-tertiary)] text-center">
                No members or agents available
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {persons.length === 0 && (
        <span className="text-sm text-[var(--text-tertiary)]">Add person...</span>
      )}
    </div>
  )
}
