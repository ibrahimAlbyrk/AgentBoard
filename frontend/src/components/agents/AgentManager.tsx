import { useState } from 'react'
import { toast } from '@/lib/toast'
import { Plus, Pencil, Trash2, Check, X, Bot } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useAgents, useCreateAgent, useUpdateAgent, useDeleteAgent } from '@/hooks/useAgents'
import { EmptyState } from '@/components/shared/EmptyState'
import type { Agent } from '@/types'

const PRESET_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B',
  '#22C55E', '#EF4444', '#06B6D4', '#6366F1',
]

interface AgentManagerProps {
  projectId: string
  open: boolean
  onClose: () => void
}

export function AgentManager({ projectId, open, onClose }: AgentManagerProps) {
  const { data: agentsRes, isLoading } = useAgents(projectId)
  const createAgent = useCreateAgent(projectId)
  const updateAgent = useUpdateAgent(projectId)
  const deleteAgent = useDeleteAgent(projectId)

  const agents = agentsRes?.data ?? []

  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

  const resetAdd = () => {
    setShowAdd(false)
    setName('')
    setColor(PRESET_COLORS[0])
  }

  const handleCreate = async () => {
    if (!name.trim()) return
    try {
      await createAgent.mutateAsync({ name: name.trim(), color })
      toast.success('Agent created')
      resetAdd()
    } catch (err) {
      toast.error(err)
    }
  }

  const openEdit = (agent: Agent) => {
    setEditingAgent(agent)
    setEditName(agent.name)
    setEditColor(agent.color)
  }

  const handleEdit = async () => {
    if (!editingAgent || !editName.trim()) return
    try {
      await updateAgent.mutateAsync({
        agentId: editingAgent.id,
        data: { name: editName.trim(), color: editColor },
      })
      toast.success('Agent updated')
      setEditingAgent(null)
    } catch (err) {
      toast.error(err)
    }
  }

  const handleToggleActive = async (agent: Agent) => {
    try {
      await updateAgent.mutateAsync({
        agentId: agent.id,
        data: { is_active: !agent.is_active },
      })
    } catch (err) {
      toast.error(err)
    }
  }

  const handleDelete = async (agent: Agent) => {
    if (!confirm(`Delete agent "${agent.name}"?`)) return
    try {
      await deleteAgent.mutateAsync(agent.id)
      toast.success('Agent deleted')
    } catch (err) {
      toast.error(err)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[var(--elevated)] border-[var(--border-subtle)] sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="size-5" />
            Manage Agents
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-[var(--text-tertiary)] text-sm">Loading...</div>
          ) : agents.length === 0 && !showAdd ? (
            <EmptyState
              icon={Bot}
              title="No agents"
              description="Add agents to assign tasks to AI assistants"
              action={{ label: 'Add Agent', onClick: () => setShowAdd(true) }}
            />
          ) : (
            <>
              {/* Agent list */}
              <div className="space-y-2">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] group hover:border-[var(--border-strong)] transition-colors"
                  >
                    <span
                      className="size-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                      style={{ backgroundColor: agent.color }}
                    >
                      {agent.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{agent.name}</p>
                      <p className="text-[11px] text-[var(--text-tertiary)]">
                        {agent.is_active ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                    <Switch
                      checked={agent.is_active}
                      onCheckedChange={() => handleToggleActive(agent)}
                      className="shrink-0"
                    />
                    <button
                      onClick={() => openEdit(agent)}
                      className="size-7 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-foreground hover:bg-[var(--elevated)] transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(agent)}
                      className="size-7 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add form */}
              {showAdd ? (
                <div className="space-y-3 p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)]">
                  <Input
                    autoFocus
                    placeholder="Agent name (e.g. Claude Code)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    className="bg-[var(--elevated)] border-[var(--border-subtle)]"
                  />
                  <div className="space-y-1.5">
                    <span className="text-xs text-[var(--text-tertiary)] font-medium">Color</span>
                    <div className="flex gap-2">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          className="size-7 rounded-full transition-transform hover:scale-110"
                          style={{
                            backgroundColor: c,
                            outline: color === c ? '2px solid var(--foreground)' : 'none',
                            outlineOffset: '2px',
                          }}
                          onClick={() => setColor(c)}
                        />
                      ))}
                    </div>
                  </div>
                  {/* Preview */}
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[var(--elevated)]">
                    <span
                      className="size-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {(name || 'A').charAt(0).toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-foreground">{name || 'Agent name'}</span>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={resetAdd}>
                      <X className="size-3.5" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleCreate} disabled={!name.trim() || createAgent.isPending}>
                      <Check className="size-3.5" />
                      {createAgent.isPending ? 'Creating...' : 'Add Agent'}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowAdd(true)}
                  className="w-full border-dashed border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-foreground hover:border-[var(--border-strong)]"
                >
                  <Plus className="size-4" />
                  Add Agent
                </Button>
              )}
            </>
          )}
        </div>

        {/* Edit dialog */}
        {editingAgent && (
          <Dialog open={!!editingAgent} onOpenChange={(v) => !v && setEditingAgent(null)}>
            <DialogContent className="bg-[var(--elevated)] border-[var(--border-subtle)] sm:max-w-[380px]">
              <DialogHeader>
                <DialogTitle>Edit Agent</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <span className="text-xs text-[var(--text-tertiary)] font-medium">Name</span>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
                    className="bg-[var(--surface)] border-[var(--border-subtle)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs text-[var(--text-tertiary)] font-medium">Color</span>
                  <div className="flex gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        className="size-7 rounded-full transition-transform hover:scale-110"
                        style={{
                          backgroundColor: c,
                          outline: editColor === c ? '2px solid var(--foreground)' : 'none',
                          outlineOffset: '2px',
                        }}
                        onClick={() => setEditColor(c)}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingAgent(null)}>Cancel</Button>
                <Button onClick={handleEdit} disabled={updateAgent.isPending || !editName.trim()}>
                  {updateAgent.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  )
}
