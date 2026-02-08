import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Copy, Plus, Trash2, Key, Bell, BellOff, Monitor, Mail, VolumeX } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api-client'
import { EmptyState } from '@/components/shared/EmptyState'
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/hooks/useNotifications'
import { useProjects } from '@/hooks/useProjects'
import type { NotificationPreferences } from '@/types/user'

interface ApiKeyEntry {
  id: string
  name: string
  key_prefix: string
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
  const [createdKey, setCreatedKey] = useState('')
  const [creatingKey, setCreatingKey] = useState(false)

  const loadKeys = async () => {
    if (keysLoaded) return
    try {
      const res = await api.listApiKeys()
      setApiKeys(res.data)
      setKeysLoaded(true)
    } catch {
      toast.error('Failed to load API keys')
    }
  }

  const handleProfileSave = async () => {
    setSaving(true)
    try {
      const res = await api.updateMe({ full_name: fullName, avatar_url: avatarUrl || undefined })
      setUser(res.data)
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return
    setCreatingKey(true)
    try {
      const res = await api.createApiKey({ name: newKeyName.trim() })
      setCreatedKey(res.data.key)
      setApiKeys((prev) => [...prev, { ...res.data, key_prefix: res.data.key.slice(0, 8), last_used: null, created_at: new Date().toISOString() }])
      setNewKeyName('')
    } catch {
      toast.error('Failed to create API key')
    } finally {
      setCreatingKey(false)
    }
  }

  const handleDeleteKey = async (id: string) => {
    try {
      await api.deleteApiKey(id)
      setApiKeys((prev) => prev.filter((k) => k.id !== id))
      toast.success('API key deleted')
    } catch {
      toast.error('Failed to delete API key')
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">Settings</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-0.5">Manage your account preferences</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="bg-[var(--surface)] border border-[var(--border-subtle)]">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="api-keys" onClick={loadKeys}>API Keys</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
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
                <Input
                  id="avatar_url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="bg-[var(--surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] focus:border-[var(--accent-solid)] transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px]">Email</Label>
                <Input value={user?.email ?? ''} disabled className="opacity-60" />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px]">Username</Label>
                <Input value={user?.username ?? ''} disabled className="opacity-60" />
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
                    <div>
                      <p className="font-medium text-[13px] text-foreground">{key.name}</p>
                      <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 font-mono">
                        {key.key_prefix}... | Last used:{' '}
                        {key.last_used ?? 'Never'}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleDeleteKey(key.id)}
                      className="hover:bg-[var(--destructive)]/10"
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
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateKey(false)}
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
      </Tabs>
    </div>
  )
}


const DEFAULT_PREFS: NotificationPreferences = {
  task_assigned: true,
  task_updated: true,
  task_moved: true,
  task_deleted: true,
  task_comment: true,
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

  const setDigest = useCallback(
    (value: string) => {
      const updated = { ...current, email_digest: value as NotificationPreferences['email_digest'] }
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
            description="Requires SMTP configuration on the server"
            checked={current.email_enabled}
            onToggle={() => toggle('email_enabled')}
          />
          {current.email_enabled && (
            <div className="flex items-center justify-between py-3 px-4 bg-[var(--surface)] rounded-lg border border-[var(--border-subtle)]">
              <div>
                <p className="text-[13px] font-medium text-foreground">Email Digest Frequency</p>
                <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">How often to receive email digests</p>
              </div>
              <Select value={current.email_digest} onValueChange={setDigest}>
                <SelectTrigger className="w-32 h-8 text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant">Instant</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
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
