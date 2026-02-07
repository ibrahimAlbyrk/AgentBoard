import { useState } from 'react'
import { toast } from 'sonner'
import { Copy, Plus, Trash2, Key } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="api-keys" onClick={loadKeys}>API Keys</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <div className="bg-card border border-[var(--border-subtle)] rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Profile</h2>
              <p className="text-sm text-muted-foreground">Update your personal information</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatar_url">Avatar URL</Label>
                <Input
                  id="avatar_url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email ?? ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={user?.username ?? ''} disabled />
              </div>
              <Button onClick={handleProfileSave} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="api-keys" className="mt-6">
          <div className="bg-card border border-[var(--border-subtle)] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">API Keys</h2>
                <p className="text-sm text-muted-foreground">Manage API keys for programmatic access</p>
              </div>
              <Button onClick={() => setShowCreateKey(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
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
                    className="flex items-center justify-between bg-[var(--surface)] border border-[var(--border-subtle)] rounded-xl p-4"
                  >
                    <div>
                      <p className="font-medium text-sm text-foreground">{key.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {key.key_prefix}... | Last used:{' '}
                        {key.last_used ?? 'Never'}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleDeleteKey(key.id)}
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
                  <p className="text-sm text-muted-foreground">
                    Copy your key now. You will not be able to see it again.
                  </p>
                  <div className="flex gap-2">
                    <Input value={createdKey} readOnly className="font-mono text-xs" />
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
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Done
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Key Name</Label>
                    <Input
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="e.g., CI/CD Pipeline"
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
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
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
          <div className="bg-card border border-[var(--border-subtle)] rounded-xl p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
              <p className="text-sm text-muted-foreground">Configure your notification preferences</p>
            </div>
            <p className="text-sm text-muted-foreground text-center py-8">
              Notification preferences coming soon
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
