import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, User, Menu, Check, CheckCheck, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useAuthStore } from '@/stores/authStore'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { useNotifications, useUnreadCount, useMarkRead, useClearNotifications } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'

interface HeaderProps {
  onMenuClick?: () => void
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { data: notifications } = useNotifications()
  const { data: unreadData } = useUnreadCount()
  const markRead = useMarkRead()
  const clearAll = useClearNotifications()

  const unreadCount = unreadData?.count ?? 0
  const items = notifications?.data ?? []

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="h-12 border-b border-[var(--border-subtle)] bg-background/80 backdrop-blur-xl flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="md:hidden size-8" onClick={onMenuClick}>
          <Menu className="size-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1.5">
        <ThemeToggle />

        <Popover>
          <PopoverTrigger asChild>
            <button className="relative size-8 inline-flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-foreground hover:bg-foreground/[0.08] active:bg-foreground/[0.12] active:scale-95 transition-all duration-150 cursor-pointer">
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 size-2 rounded-full bg-[var(--accent-solid)] ring-2 ring-background" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
              <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markRead.mutate({ all: true })}
                    className="flex items-center gap-1 text-xs text-[var(--accent-solid)] hover:underline cursor-pointer"
                  >
                    <CheckCheck className="size-3" />
                    Mark all read
                  </button>
                )}
                {items.length > 0 && (
                  <button
                    onClick={() => clearAll.mutate()}
                    className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-destructive hover:underline cursor-pointer"
                  >
                    <Trash2 className="size-3" />
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-[var(--text-tertiary)]">
                  <Bell className="size-8 mb-2 opacity-30" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                items.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      'flex gap-3 px-4 py-3 border-b border-[var(--border-subtle)] last:border-0 transition-colors',
                      !n.is_read && 'bg-[var(--accent-muted-bg)]/30'
                    )}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {!n.is_read ? (
                        <span className="block size-2 rounded-full bg-[var(--accent-solid)]" />
                      ) : (
                        <span className="block size-2 rounded-full bg-transparent" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm truncate', !n.is_read ? 'font-medium text-foreground' : 'text-[var(--text-secondary)]')}>
                        {n.title}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                    {!n.is_read && (
                      <button
                        onClick={() => markRead.mutate({ ids: [n.id] })}
                        className="mt-0.5 flex-shrink-0 text-[var(--text-tertiary)] hover:text-foreground transition-colors"
                        title="Mark as read"
                      >
                        <Check className="size-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative size-8 inline-flex items-center justify-center rounded-full hover:ring-2 hover:ring-foreground/[0.12] active:ring-foreground/[0.2] active:scale-95 transition-all duration-150 cursor-pointer">
              <Avatar size="sm">
                <AvatarImage src={user?.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-[var(--accent-muted-bg)] text-[var(--accent-solid)]">
                  {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <User className="size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} variant="destructive">
              <LogOut className="size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
