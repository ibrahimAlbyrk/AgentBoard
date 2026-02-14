import { useState, useCallback } from 'react'
import { toast } from '@/lib/toast'
import { Copy, Plus, Trash2, Key, Bell, BellOff, Monitor, Mail, VolumeX, Bot, Pencil, Check, X, Eye, EyeOff, User } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api-client'
import { EmptyState } from '@/components/shared/EmptyState'
import { useMyAgents, useCreateGlobalAgent, useUpdateGlobalAgent, useDeleteGlobalAgent } from '@/hooks/useAgents'
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/hooks/useNotifications'
import { useProjects } from '@/hooks/useProjects'
import type { NotificationPreferences } from '@/types/user'
import type { AgentWithProjects } from '@/types/agent'

interface ApiKeyEntry {
  id: string
  name: string
  key_prefix: string
  agent_id: string | null
  agent_name: string | null
  last_used: string | null
  created_at: string
}

export function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? '')
  const [saving, setSaving] = useState(false)

  const [apiKeys, setApiKeys] = useState<ApiKeyEntry[]>([])
  const [keysLoaded, setKeysLoaded] = useState(false)
  const [showCreateKey, setShowCreateKey] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyAgentId, setNewKeyAgentId] = useState<string>('')
  const [createdKey, setCreatedKey] = useState('')
  const [creatingKey, setCreatingKey] = useState(false)
  const { data: myAgentsRes } = useMyAgents()
  const myAgents = myAgentsRes?.data ?? []

  const loadKeys = async () => {
    if (keysLoaded) return
    try {
      const res = await api.listApiKeys()
      setApiKeys(res.data)
      setKeysLoaded(true)
    } catch (err) {
      toast.error(err)
    }
  }

  const handleProfileSave = async () => {
    setSaving(true)
    try {
      const res = await api.updateMe({ full_name: fullName, avatar_url: avatarUrl || undefined })
      setUser(res.data)
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return
    setCreatingKey(true)
    try {
      const payload: { name: string; agent_id?: string } = { name: newKeyName.trim() }
      if (newKeyAgentId) payload.agent_id = newKeyAgentId
      const selectedAgent = myAgents.find((a) => a.id === newKeyAgentId)
      const res = await api.createApiKey(payload)
      setCreatedKey(res.data.key)
      setApiKeys((prev) => [...prev, {
        ...res.data,
        key_prefix: res.data.key.slice(0, 8),
        agent_id: newKeyAgentId || null,
        agent_name: selectedAgent?.name ?? null,
        last_used: null,
        created_at: new Date().toISOString(),
      }])
      setNewKeyName('')
      setNewKeyAgentId('')
    } catch (err) {
      toast.error(err)
    } finally {
      setCreatingKey(false)
    }
  }

  const handleDeleteKey = async (id: string) => {
    try {
      await api.deleteApiKey(id)
      setApiKeys((prev) => prev.filter((k) => k.id !== id))
      toast.success('API key deleted')
    } catch (err) {
      toast.error(err)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">Settings</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-0.5">Manage your account preferences</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="bg-[var(--surface)] border border-[var(--border-subtle)] sticky top-0 z-10">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="api-keys" onClick={loadKeys}>API Keys</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <div className="bg-card border border-[var(--border-subtle)] rounded-xl p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">Profile</h2>
              <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">Update your personal information</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-[13px]">Full Name</Label>
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="bg-[var(--surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] focus:border-[var(--accent-solid)] transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatar_url" className="text-[13px]">Avatar URL</Label>
                <div className="flex items-center gap-4">
                  <div className="size-16 rounded-full bg-[var(--surface)] border border-[var(--border-subtle)] overflow-hidden flex items-center justify-center shrink-0">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar preview"
                        className="size-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                        onLoad={(e) => { e.currentTarget.style.display = 'block' }}
                      />
                    ) : (
                      <User className="size-6 text-[var(--text-tertiary)]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      id="avatar_url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://..."
                      className="bg-[var(--surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] focus:border-[var(--accent-solid)] transition-colors"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[13px]">Email</Label>
                <Input value={user?.email ?? ''} disabled className="opacity-60" />
                <p className="text-xs text-[var(--text-tertiary)] mt-1">This field cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label className="text-[13px]">Username</Label>
                <Input value={user?.username ?? ''} disabled className="opacity-60" />
                <p className="text-xs text-[var(--text-tertiary)] mt-1">This field cannot be changed</p>
              </div>
              <Button
                onClick={handleProfileSave}
                disabled={saving}
                className="bg-[var(--accent-solid)] text-white hover:bg-[var(--accent-solid-hover)] shadow-[0_0_16px_-4px_var(--glow)] transition-all"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="api-keys" className="mt-6">
          <div className="bg-card border border-[var(--border-subtle)] rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-foreground">API Keys</h2>
                <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">Manage API keys for programmatic access</p>
              </div>
              <Button
                onClick={() => setShowCreateKey(true)}
                className="bg-[var(--accent-solid)] text-white hover:bg-[var(--accent-solid-hover)] shadow-[0_0_16px_-4px_var(--glow)] transition-all"
              >
                <Plus className="size-4" />
                Generate Key
              </Button>
            </div>

            {apiKeys.length === 0 ? (
              <EmptyState
                icon={Key}
                title="No API keys"
                description="Generate an API key to access the API programmatically"
                action={{ label: 'Generate Key', onClick: () => setShowCreateKey(true) }}
              />
            ) : (
              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between bg-[var(--surface)] border border-[var(--border-subtle)] rounded-xl p-4 card-hover"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {key.agent_name ? (
                        <span className="shrink-0 size-8 rounded-full bg-[var(--accent-muted-bg)] flex items-center justify-center">
                          <Bot className="size-4 text-[var(--accent-solid)]" />
                        </span>
                      ) : (
                        <span className="shrink-0 size-8 rounded-full bg-[var(--surface)] border border-[var(--border-subtle)] flex items-center justify-center">
                          <Key className="size-3.5 text-[var(--text-tertiary)]" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-[13px] text-foreground truncate">{key.name}</p>
                          {key.agent_name && (
                            <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--accent-muted-bg)] text-[var(--accent-solid)]">
                              {key.agent_name}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 font-mono">
                          {key.key_prefix}... | Last used:{' '}
                          {key.last_used ?? 'Never'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleDeleteKey(key.id)}
                      className="hover:bg-[var(--destructive)]/10 shrink-0"
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Dialog open={showCreateKey} onOpenChange={setShowCreateKey}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate API Key</DialogTitle>
              </DialogHeader>
              {createdKey ? (
                <div className="space-y-3">
                  <p className="text-[13px] text-[var(--text-secondary)]">
                    Copy your key now. You will not be able to see it again.
                  </p>
                  <div className="flex gap-2">
                    <Input value={createdKey} readOnly className="font-mono text-xs bg-[var(--surface)]" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(createdKey)
                        toast.success('Copied to clipboard')
                      }}
                    >
                      <Copy className="size-4" />
                    </Button>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => {
                        setCreatedKey('')
                        setShowCreateKey(false)
                      }}
                      className="bg-[var(--accent-solid)] text-white hover:bg-[var(--accent-solid-hover)]"
                    >
                      Done
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[13px]">Key Name</Label>
                    <Input
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="e.g., CI/CD Pipeline"
                      className="bg-[var(--surface)] border-[var(--border-subtle)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[13px]">Assign to Agent <span className="text-[var(--text-tertiary)]">(optional)</span></Label>
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => setNewKeyAgentId('')}
                        className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg border transition-colors text-left text-sm ${
                          !newKeyAgentId
                            ? 'border-[var(--accent-solid)] bg-[var(--accent-muted-bg)]'
                            : 'border-[var(--border-subtle)] bg-[var(--surface)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <Key className="size-4 text-[var(--text-tertiary)]" />
                        <span className="font-medium">User Key</span>
                        <span className="text-[var(--text-tertiary)] text-xs ml-auto">Standard API access</span>
                      </button>
                      {myAgents.filter(a => a.is_active).map((agent) => (
                        <button
                          key={agent.id}
                          type="button"
                          onClick={() => setNewKeyAgentId(agent.id)}
                          className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg border transition-colors text-left text-sm ${
                            newKeyAgentId === agent.id
                              ? 'border-[var(--accent-solid)] bg-[var(--accent-muted-bg)]'
                              : 'border-[var(--border-subtle)] bg-[var(--surface)] hover:border-[var(--border-strong)]'
                          }`}
                        >
                          <span
                            className="size-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                            style={{ backgroundColor: agent.color }}
                          >
                            {agent.name.charAt(0).toUpperCase()}
                          </span>
                          <span className="font-medium">{agent.name}</span>
                          <span className="text-[var(--text-tertiary)] text-xs ml-auto">Agent key</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => { setShowCreateKey(false); setNewKeyAgentId('') }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateKey}
                      disabled={!newKeyName.trim() || creatingKey}
                      className="bg-[var(--accent-solid)] text-white hover:bg-[var(--accent-solid-hover)]"
                    >
                      {creatingKey ? 'Generating...' : 'Generate'}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="agents" className="mt-6">
          <AgentsSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}


const PRESET_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B',
  '#22C55E', '#EF4444', '#06B6D4', '#6366F1',
]

function AgentsSettings() {
  const [deleteTarget, setDeleteTarget] = useState<AgentWithProjects | null>(null)
  const [showDeleted, setShowDeleted] = useState(false)
  // Always fetch with include_deleted=true so we can show the toggle count
  const { data: agentsRes, isLoading } = useMyAgents(true)
  const createAgent = useCreateGlobalAgent()
  const updateAgent = useUpdateGlobalAgent()
  const deleteAgent = useDeleteGlobalAgent()

  const agents = agentsRes?.data ?? []
  const activeAgents = agents.filter((a) => !a.deleted_at)
  const deletedAgents = agents.filter((a) => a.deleted_at)

  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [editingAgent, setEditingAgent] = useState<AgentWithProjects | null>(null)
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

  const openEdit = (agent: AgentWithProjects) => {
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

  const handleToggleActive = async (agent: AgentWithProjects) => {
    try {
      await updateAgent.mutateAsync({
        agentId: agent.id,
        data: { is_active: !agent.is_active },
      })
    } catch (err) {
      toast.error(err)
    }
  }

  const handleConfirmedDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteAgent.mutateAsync(deleteTarget.id)
      toast.success('Agent deleted')
    } catch (err) {
      toast.error(err)
    } finally {
      setDeleteTarget(null)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-card border border-[var(--border-subtle)] rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-40 bg-foreground/10 rounded" />
          <div className="h-4 w-64 bg-foreground/5 rounded" />
          <div className="space-y-3 mt-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-foreground/5 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border border-[var(--border-subtle)] rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Bot className="size-4" />
              Your Agents
            </h2>
            <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">Manage AI agents across all your projects</p>
          </div>
          {!showAdd && (
            <Button
              onClick={() => setShowAdd(true)}
              className="bg-[var(--accent-solid)] text-white hover:bg-[var(--accent-solid-hover)] shadow-[0_0_16px_-4px_var(--glow)] transition-all"
            >
              <Plus className="size-4" />
              New Agent
            </Button>
          )}
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="space-y-3 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] mb-4">
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
                {createAgent.isPending ? 'Creating...' : 'Create Agent'}
              </Button>
            </div>
          </div>
        )}

        {/* Agent list */}
        {activeAgents.length === 0 && !showAdd ? (
          <EmptyState
            icon={Bot}
            title="No agents"
            description="Create agents to assign tasks to AI assistants"
            action={{ label: 'New Agent', onClick: () => setShowAdd(true) }}
          />
        ) : (
          <div className="space-y-2">
            {activeAgents.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] group hover:border-[var(--border-strong)] transition-colors"
              >
                <span
                  className="size-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ backgroundColor: agent.color }}
                >
                  {agent.name.charAt(0).toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{agent.name}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      agent.is_active
                        ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                        : 'bg-foreground/5 text-[var(--text-tertiary)]'
                    }`}>
                      {agent.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {agent.projects.length > 0 ? (
                      agent.projects.map((p) => (
                        <span
                          key={p.id}
                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent-muted-bg)] text-[var(--accent-solid)] font-medium"
                        >
                          {p.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-[var(--text-tertiary)]">No projects</span>
                    )}
                  </div>
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
                  onClick={() => setDeleteTarget(agent)}
                  className="size-7 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deleted agents */}
      {(deletedAgents.length > 0 || showDeleted) && (
        <div className="bg-card border border-[var(--border-subtle)] rounded-xl p-6">
          <button
            onClick={() => setShowDeleted(!showDeleted)}
            className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors w-full"
          >
            {showDeleted ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            {showDeleted ? 'Hide deleted agents' : `Show deleted agents (${deletedAgents.length})`}
          </button>
          {showDeleted && (
            <div className="space-y-2 mt-3">
              {deletedAgents.map((agent) => {
                const displayName = agent.name.replace(/__del_[a-f0-9]{8}$/, '')
                return (
                  <div
                    key={agent.id}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] opacity-50"
                  >
                    <span
                      className="size-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 grayscale"
                      style={{ backgroundColor: agent.color }}
                    >
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate line-through">{displayName}</p>
                      <p className="text-[11px] text-[var(--text-tertiary)]">Deleted</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

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
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingAgent(null)}>Cancel</Button>
              <Button onClick={handleEdit} disabled={updateAgent.isPending || !editName.trim()}>
                {updateAgent.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{deleteTarget?.name}"? This will remove it from all projects. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}


const DEFAULT_PREFS: NotificationPreferences = {
  task_assigned: true,
  task_updated: true,
  task_moved: true,
  task_deleted: true,
  task_comment: true,
  task_reaction: true,
  mentioned: true,
  subtask_created: true,
  subtask_deleted: true,
  watcher_added: true,
  watcher_removed: true,
  assignee_added: true,
  assignee_removed: true,
  comment_deleted: true,
  self_notifications: true,
  desktop_enabled: false,
  muted_projects: [],
  email_enabled: false,
  email_digest: 'off',
}

function NotificationSettings() {
  const { data: prefs, isLoading } = useNotificationPreferences()
  const updatePrefs = useUpdateNotificationPreferences()
  const { data: projectsData } = useProjects({ per_page: 100 })
  const projects = projectsData?.data ?? []

  const current: NotificationPreferences = prefs ?? DEFAULT_PREFS

  const toggle = useCallback(
    (key: keyof NotificationPreferences) => {
      const updated = { ...current, [key]: !current[key] }
      updatePrefs.mutate(updated, {
        onSuccess: () => toast.success('Preferences saved'),
        onError: () => toast.error('Failed to save'),
      })
    },
    [current, updatePrefs],
  )


  const toggleMuteProject = useCallback(
    (projectId: string) => {
      const muted = current.muted_projects.includes(projectId)
        ? current.muted_projects.filter((id) => id !== projectId)
        : [...current.muted_projects, projectId]
      const updated = { ...current, muted_projects: muted }
      updatePrefs.mutate(updated, {
        onSuccess: () => toast.success('Preferences saved'),
        onError: () => toast.error('Failed to save'),
      })
    },
    [current, updatePrefs],
  )

  const requestDesktopPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast.error('Browser does not support desktop notifications')
      return
    }
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      toggle('desktop_enabled')
    } else {
      toast.error('Notification permission denied')
    }
  }, [toggle])

  if (isLoading) {
    return (
      <div className="bg-card border border-[var(--border-subtle)] rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-40 bg-foreground/10 rounded" />
          <div className="h-4 w-64 bg-foreground/5 rounded" />
          <div className="space-y-3 mt-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-foreground/5 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Event Toggles */}
      <div className="bg-card border border-[var(--border-subtle)] rounded-xl p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Bell className="size-4" />
            Event Notifications
          </h2>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">Choose which events trigger notifications</p>
        </div>
        <div className="space-y-1">
          <ToggleRow
            label="Task Assignments"
            description="When you are assigned to a task"
            checked={current.task_assigned}
            onToggle={() => toggle('task_assigned')}
          />
          <ToggleRow
            label="Task Updates"
            description="When a task you're assigned to is updated"
            checked={current.task_updated}
            onToggle={() => toggle('task_updated')}
          />
          <ToggleRow
            label="Status Changes"
            description="When a task you're assigned to is moved"
            checked={current.task_moved}
            onToggle={() => toggle('task_moved')}
          />
          <ToggleRow
            label="Task Deletions"
            description="When a task you're assigned to is deleted"
            checked={current.task_deleted}
            onToggle={() => toggle('task_deleted')}
          />
          <ToggleRow
            label="Comments"
            description="When someone comments on your task"
            checked={current.task_comment}
            onToggle={() => toggle('task_comment')}
          />
          <ToggleRow
            label="Reactions"
            description="When someone reacts to your task or comment"
            checked={current.task_reaction}
            onToggle={() => toggle('task_reaction')}
          />
          <ToggleRow
            label="Mentions"
            description="When someone @mentions you in a description or comment"
            checked={current.mentioned}
            onToggle={() => toggle('mentioned')}
          />
        </div>
      </div>

      {/* Self Notifications */}
      <div className="bg-card border border-[var(--border-subtle)] rounded-xl p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <BellOff className="size-4" />
            Self Notifications
          </h2>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">Control notifications for your own actions</p>
        </div>
        <ToggleRow
          label="Notify me about my own actions"
          description="Receive notifications when you make changes to tasks assigned to you"
          checked={current.self_notifications}
          onToggle={() => toggle('self_notifications')}
        />
      </div>

      {/* Desktop Notifications */}
      <div className="bg-card border border-[var(--border-subtle)] rounded-xl p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Monitor className="size-4" />
            Desktop Notifications
          </h2>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">Browser push notifications for real-time alerts</p>
        </div>
        <ToggleRow
          label="Enable desktop notifications"
          description={
            current.desktop_enabled
              ? 'You will receive browser push notifications'
              : 'Click to enable browser notifications'
          }
          checked={current.desktop_enabled}
          onToggle={() => {
            if (current.desktop_enabled) {
              toggle('desktop_enabled')
            } else {
              requestDesktopPermission()
            }
          }}
        />
      </div>

      {/* Project Muting */}
      <div className="bg-card border border-[var(--border-subtle)] rounded-xl p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <VolumeX className="size-4" />
            Muted Projects
          </h2>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">Mute notifications from specific projects</p>
        </div>
        {projects.length === 0 ? (
          <p className="text-[13px] text-[var(--text-tertiary)] text-center py-4">No projects found</p>
        ) : (
          <div className="space-y-1">
            {projects.map((project) => (
              <ToggleRow
                key={project.id}
                label={project.name}
                description={current.muted_projects.includes(project.id) ? 'Muted — no notifications' : 'Receiving notifications'}
                checked={!current.muted_projects.includes(project.id)}
                onToggle={() => toggleMuteProject(project.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Email Notifications */}
      <div className="bg-card border border-[var(--border-subtle)] rounded-xl p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Mail className="size-4" />
            Email Notifications
          </h2>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">Receive notifications via email</p>
        </div>
        <div className="space-y-4">
          <ToggleRow
            label="Enable email notifications"
            description="Receive emails for notifications"
            checked={current.email_enabled}
            onToggle={() => {
              const updated = { ...current, email_enabled: !current.email_enabled, email_digest: !current.email_enabled ? 'instant' as const : 'off' as const }
              updatePrefs.mutate(updated, {
                onSuccess: () => toast.success('Preferences saved'),
                onError: () => toast.error('Failed to save'),
              })
            }}
          />
          {current.email_enabled && (
            <div className="ml-4 mt-2 flex items-center gap-2 text-sm">
              <span className="text-[var(--text-secondary)]">Delivery:</span>
              {(['instant', 'daily'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => {
                    updatePrefs.mutate({ ...current, email_digest: mode }, {
                      onSuccess: () => toast.success('Preferences saved'),
                      onError: () => toast.error('Failed to save'),
                    })
                  }}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    current.email_digest === mode
                      ? 'bg-[var(--accent-solid)] text-white'
                      : 'bg-foreground/5 text-[var(--text-secondary)] hover:bg-foreground/10'
                  }`}
                >
                  {mode === 'instant' ? 'Instant' : 'Daily Digest'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onToggle,
}: {
  label: string
  description: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-foreground/[0.03] transition-colors">
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-[13px] font-medium text-foreground">{label}</p>
        <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onToggle} />
    </div>
  )
}
