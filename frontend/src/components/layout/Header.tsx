import { useNavigate } from 'react-router-dom'
import { Search, Bell, LogOut, User, Menu } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/stores/authStore'
import { ThemeToggle } from '@/components/shared/ThemeToggle'

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="h-14 border-b border-[var(--border-subtle)] bg-background/80 backdrop-blur-xl flex items-center justify-between px-6">
      <div className="flex-1 flex items-center gap-2">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
          <Menu className="size-5" />
        </Button>
      </div>

      <div className="hidden sm:block w-full max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-9 bg-[var(--surface)] border border-input rounded-lg"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 items-center gap-1 rounded border border-[var(--border-subtle)] bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
            Cmd+K
          </kbd>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-end gap-2">
        <ThemeToggle />

        <Button variant="ghost" size="icon" className="relative size-8 text-[var(--text-secondary)] hover:text-foreground transition-colors duration-150">
          <Bell className="size-4" />
          <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative size-8 rounded-full p-0">
              <Avatar size="sm">
                <AvatarImage src={user?.avatar_url || undefined} />
                <AvatarFallback>
                  {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
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
