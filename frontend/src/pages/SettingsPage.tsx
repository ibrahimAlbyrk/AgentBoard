import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { toast } from '@/lib/toast'
import { Copy, Plus, Trash2, Key, Bell, BellOff, Monitor, Mail, VolumeX, Bot, Pencil, Check, X, Eye, EyeOff, User, Upload, Lock, Save, FolderPlus } from 'lucide-react'
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
import { PageHeader } from '@/components/shared/PageHeader'
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
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // m23: dirty state tracking
  const profileIsDirty = fullName !== (user?.full_name ?? '') || avatarUrl !== (user?.avatar_url ?? '')
  const [pendingTab, setPendingTab] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('profile')

  // B21: Change Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})

  const [apiKeys, setApiKeys] = useState<ApiKeyEntry[]>([])
  const [keysLoaded, setKeysLoaded] = useState(false)
  const [showCreateKey, setShowCreateKey] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyAgentId, setNewKeyAgentId] = useState<string>('')
  const [createdKey, setCreatedKey] = useState('')
  const [creatingKey, setCreatingKey] = useState(false)
  // m22: API key delete confirmation
  const [deleteKeyTarget, setDeleteKeyTarget] = useState<ApiKeyEntry | null>(null)
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
      setAvatarPreview(null)
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err)
    } finally {
      setSaving(false)
    }
  }

  // B22: Avatar file upload handler
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setAvatarPreview(dataUrl)
      setAvatarUrl(dataUrl)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // B21: Change Password handler
  const handleChangePassword = async () => {
    const errors: Record<string, string> = {}
    if (!currentPassword) errors.currentPassword = 'Current password is required'
    if (!newPassword) errors.newPassword = 'New password is required'
    else if (newPassword.length < 8) errors.newPassword = 'Must be at least 8 characters'
    if (newPassword !== confirmPassword) errors.confirmPassword = 'Passwords do not match'
    setPasswordErrors(errors)
    if (Object.keys(errors).length > 0) return

    setChangingPassword(true)
    try {
      await api.changePassword({ current_password: currentPassword, new_password: newPassword })
      toast.success('Password changed')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordErrors({})
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to change password'
      if (message.toLowerCase().includes('current') || message.toLowerCase().includes('incorrect')) {
        setPasswordErrors({ currentPassword: 'Current password is incorrect' })
      } else {
        toast.error(err)
      }
    } finally {
      setChangingPassword(false)
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

  // m22: Delete key with confirmation
  const handleDeleteKey = async () => {
    if (!deleteKeyTarget) return
    try {
      await api.deleteApiKey(deleteKeyTarget.id)
      setApiKeys((prev) => prev.filter((k) => k.id !== deleteKeyTarget.id))
      toast.success('API key deleted')
    } catch (err) {
      toast.error(err)
    } finally {
      setDeleteKeyTarget(null)
    }
  }

  // m23: Tab change with dirty check
  const handleTabChange = (value: string) => {
    if (profileIsDirty && activeTab === 'profile') {
      setPendingTab(value)
      return
    }
    setActiveTab(value)
    if (value === 'api-keys') loadKeys()
  }

  const handleDiscardChanges = () => {
    setFullName(user?.full_name ?? '')
    setAvatarUrl(user?.avatar_url ?? '')
    setAvatarPreview(null)
    if (pendingTab) {
      setActiveTab(pendingTab)
      if (pendingTab === 'api-keys') loadKeys()
      setPendingTab(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <PageHeader title="Settings" description="Manage your account preferences" />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="bg-[var(--surface)] border border-[var(--border-subtle)] sticky top-0 z-10">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6 space-y-6">
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

              {/* B22: Avatar upload + URL input */}
              <div className="space-y-2">
                <Label className="text-[13px]">Avatar</Label>
                <div className="flex items-center gap-4">
                  <div className="relative group shrink-0">
                    <div className="size-16 rounded-full bg-[var(--surface)] border border-[var(--border-subtle)] overflow-hidden flex items-center justify-center">
                      {(avatarPreview || avatarUrl) ? (
                        <img
                          src={avatarPreview || avatarUrl}
                          alt="Avatar preview"
                          className="size-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                          onLoad={(e) => { e.currentTarget.style.display = 'block' }}
                        />
                      ) : (
                        <User className="size-6 text-[var(--text-tertiary)]" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Upload className="size-4 text-white" />
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => avatarInputRef.current?.click()}
                      className="text-xs"
                    >
                      <Upload className="size-3.5" />
                      Upload Image
                    </Button>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[var(--text-tertiary)]">or paste URL</span>
                      <Input
                        value={avatarPreview ? '' : avatarUrl}
                        onChange={(e) => { setAvatarUrl(e.target.value); setAvatarPreview(null) }}
                        placeholder="https://..."
                        disabled={!!avatarPreview}
                        className="bg-[var(--surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] focus:border-[var(--accent-solid)] transition-colors h-8 text-xs flex-1"
                      />
                    </div>
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
                disabled={saving || !profileIsDirty}
                className="bg-[var(--accent-solid)] text-white hover:bg-[var(--accent-solid-hover)] shadow-[0_0_16px_-4px_var(--glow)] transition-all"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>

          {/* B21: Change Password */}
          <div className="bg-card border border-[var(--border-subtle)] rounded-xl p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Lock className="size-4" />
                Change Password
              </h2>
              <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">Update your account password</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current_password" className="text-[13px]">Current Password</Label>
                <Input
                  id="current_password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => { setCurrentPassword(e.target.value); setPasswordErrors((p) => ({ ...p, currentPassword: '' })) }}
                  placeholder="Enter current password"
                  className="bg-[var(--surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] focus:border-[var(--accent-solid)] transition-colors"
                />
                {passwordErrors.currentPassword && (
                  <p className="text-xs text-destructive">{passwordErrors.currentPassword}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_password" className="text-[13px]">New Password</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setPasswordErrors((p) => ({ ...p, newPassword: '' })) }}
                  placeholder="Enter new password"
                  className="bg-[var(--surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] focus:border-[var(--accent-solid)] transition-colors"
                />
                {passwordErrors.newPassword && (
                  <p className="text-xs text-destructive">{passwordErrors.newPassword}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password" className="text-[13px]">Confirm New Password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setPasswordErrors((p) => ({ ...p, confirmPassword: '' })) }}
                  placeholder="Confirm new password"
                  className="bg-[var(--surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] focus:border-[var(--accent-solid)] transition-colors"
                />
                {passwordErrors.confirmPassword && (
                  <p className="text-xs text-destructive">{passwordErrors.confirmPassword}</p>
                )}
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={changingPassword || (!currentPassword && !newPassword && !confirmPassword)}
                variant="outline"
              >
                {changingPassword ? 'Changing...' : 'Change Password'}
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
                    {/* m22: Delete via confirmation instead of immediate */}
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setDeleteKeyTarget(key)}
                      className="hover:bg-[var(--destructive)]/10 shrink-0"
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* m22: Delete API key confirmation dialog */}
          <AlertDialog open={!!deleteKeyTarget} onOpenChange={(open) => !open && setDeleteKeyTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                <AlertDialogDescription>
                  Delete "{deleteKeyTarget?.name}"? Any applications using this key will lose access immediately. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteKey} className="bg-destructive hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

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

      {/* m23: Unsaved changes warning dialog */}
      <AlertDialog open={!!pendingTab} onOpenChange={(open) => !open && setPendingTab(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in your profile. Discard them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscardChanges}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  const { data: agentsRes, isLoading } = useMyAgents(true)
  const createAgent = useCreateGlobalAgent()
  const updateAgent = useUpdateGlobalAgent()
  const deleteAgent = useDeleteGlobalAgent()
  const { data: projectsData } = useProjects({ per_page: 100 })
  const allProjects = projectsData?.data ?? []

  const agents = agentsRes?.data ?? []
  const activeAgents = agents.filter((a) => !a.deleted_at)
  const deletedAgents = agents.filter((a) => a.deleted_at)

  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [editingAgent, setEditingAgent] = useState<AgentWithProjects | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  // m25: project assignment state for edit dialog
  const [editProjectIds, setEditProjectIds] = useState<string[]>([])
  const [showProjectPicker, setShowProjectPicker] = useState(false)

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
    setEditProjectIds(agent.projects.map((p) => p.id))
    setShowProjectPicker(false)
  }

  const handleEdit = async () => {
    if (!editingAgent || !editName.trim()) return
    try {
      await updateAgent.mutateAsync({
        agentId: editingAgent.id,
        data: { name: editName.trim(), color: editColor },
      })

      // m25: Sync project assignments
      const currentIds = new Set(editingAgent.projects.map((p) => p.id))
      const targetIds = new Set(editProjectIds)
      const toLink = editProjectIds.filter((id) => !currentIds.has(id))
      const toUnlink = editingAgent.projects.filter((p) => !targetIds.has(p.id)).map((p) => p.id)

      for (const projectId of toLink) {
        try {
          await api.linkAgentToProject(projectId, editingAgent.id)
        } catch {
          // ignore if already linked
        }
      }
      for (const projectId of toUnlink) {
        try {
          await api.deleteAgent(projectId, editingAgent.id)
        } catch {
          // ignore if already removed
        }
      }

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

  const toggleProjectForEdit = (projectId: string) => {
    setEditProjectIds((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    )
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
                        ? 'bg-[var(--success)]/10 text-[var(--success)]'
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

      {/* Edit dialog — m25: includes project assignment */}
      {editingAgent && (
        <Dialog open={!!editingAgent} onOpenChange={(v) => !v && setEditingAgent(null)}>
          <DialogContent className="bg-[var(--elevated)] border-[var(--border-subtle)] sm:max-w-[420px]">
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

              {/* m25: Project assignment */}
              <div className="space-y-1.5">
                <span className="text-xs text-[var(--text-tertiary)] font-medium">Projects</span>
                <div className="flex flex-wrap gap-1.5">
                  {editProjectIds.map((pid) => {
                    const proj = allProjects.find((p) => p.id === pid)
                    return (
                      <span
                        key={pid}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-[var(--accent-muted-bg)] text-[var(--accent-solid)] font-medium"
                      >
                        {proj?.name ?? pid.slice(0, 8)}
                        <button
                          type="button"
                          onClick={() => toggleProjectForEdit(pid)}
                          className="hover:text-destructive transition-colors"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() => setShowProjectPicker(!showProjectPicker)}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-dashed border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:border-[var(--border-strong)] transition-colors"
                  >
                    <FolderPlus className="size-3" />
                    Add Project
                  </button>
                </div>
                {showProjectPicker && (
                  <div className="mt-1.5 max-h-36 overflow-y-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)]">
                    {allProjects.filter((p) => !editProjectIds.includes(p.id)).length === 0 ? (
                      <p className="text-[11px] text-[var(--text-tertiary)] px-3 py-2 text-center">
                        {allProjects.length === 0 ? 'No projects available' : 'All projects assigned'}
                      </p>
                    ) : (
                      allProjects
                        .filter((p) => !editProjectIds.includes(p.id))
                        .map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => { toggleProjectForEdit(p.id); setShowProjectPicker(false) }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-left text-[13px] hover:bg-foreground/[0.03] transition-colors"
                          >
                            <span className="size-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0" style={{ backgroundColor: p.color || '#6366F1', color: '#fff' }}>
                              {p.icon || p.name.charAt(0).toUpperCase()}
                            </span>
                            <span className="font-medium text-foreground truncate">{p.name}</span>
                          </button>
                        ))
                    )}
                  </div>
                )}
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
            <AlertDialogAction onClick={handleConfirmedDelete} className="bg-destructive hover:bg-destructive/90">
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

// m24: Batched notification preferences with "Save Preferences" button
function NotificationSettings() {
  const { data: prefs, isLoading } = useNotificationPreferences()
  const updatePrefs = useUpdateNotificationPreferences()
  const { data: projectsData } = useProjects({ per_page: 100 })
  const projects = projectsData?.data ?? []

  const server: NotificationPreferences = prefs ?? DEFAULT_PREFS
  const [local, setLocal] = useState<NotificationPreferences | null>(null)

  // Sync local state when server data loads/changes
  useEffect(() => {
    if (prefs) setLocal(prefs)
  }, [prefs])

  const current = local ?? server

  // Track dirty state by comparing serialized values
  const isDirty = useMemo(() => {
    if (!local || !prefs) return false
    return JSON.stringify(local) !== JSON.stringify(prefs)
  }, [local, prefs])

  const toggle = useCallback(
    (key: keyof NotificationPreferences) => {
      setLocal((prev) => {
        const base = prev ?? server
        return { ...base, [key]: !base[key] }
      })
    },
    [server],
  )

  const toggleMuteProject = useCallback(
    (projectId: string) => {
      setLocal((prev) => {
        const base = prev ?? server
        const muted = base.muted_projects.includes(projectId)
          ? base.muted_projects.filter((id) => id !== projectId)
          : [...base.muted_projects, projectId]
        return { ...base, muted_projects: muted }
      })
    },
    [server],
  )

  const handleSave = () => {
    updatePrefs.mutate(current, {
      onSuccess: () => toast.success('Preferences saved'),
      onError: () => toast.error('Failed to save'),
    })
  }

  const handleDiscard = () => {
    setLocal(prefs ?? DEFAULT_PREFS)
  }

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
      {/* m24: Sticky save bar when dirty */}
      {isDirty && (
        <div className="sticky top-12 z-20 flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[var(--accent-solid)]/30 bg-[var(--accent-muted-bg)] backdrop-blur-sm">
          <p className="text-[13px] font-medium text-[var(--accent-solid)]">You have unsaved changes</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDiscard}>
              Discard
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updatePrefs.isPending}
              className="bg-[var(--accent-solid)] text-white hover:bg-[var(--accent-solid-hover)]"
            >
              <Save className="size-3.5" />
              {updatePrefs.isPending ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </div>
      )}

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
              setLocal((prev) => {
                const base = prev ?? server
                return { ...base, email_enabled: !base.email_enabled, email_digest: !base.email_enabled ? 'instant' as const : 'off' as const }
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
                    setLocal((prev) => ({ ...(prev ?? server), email_digest: mode }))
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
