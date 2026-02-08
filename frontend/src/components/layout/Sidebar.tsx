import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, FolderKanban, Settings, Search, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProjects } from '@/hooks/useProjects'
import { useAuthStore } from '@/stores/authStore'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation()
  const { data: projectsRes } = useProjects()
  const projects = projectsRes?.data ?? []
  const user = useAuthStore((s) => s.user)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <aside className="w-[248px] h-full border-r border-[var(--sidebar-border)] bg-sidebar flex flex-col">
      {/* Brand */}
      <div className="h-14 flex items-center gap-2.5 px-5 border-b border-[var(--sidebar-border)]">
        <div className="size-7 rounded-lg bg-gradient-to-br from-[var(--accent-solid)] to-[#3B82F6] flex items-center justify-center shadow-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </div>
        <span className="font-bold text-[15px] text-foreground tracking-tight">AgentBoard</span>
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-1">
        <div className="flex items-center gap-2 px-3 h-8 rounded-lg bg-[var(--surface)] border border-[var(--border-subtle)] text-sm focus-within:border-[var(--accent-solid)] hover:border-[var(--border-strong)] transition-colors">
          <Search className="size-3.5 text-[var(--text-tertiary)] flex-shrink-0" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="flex-1 bg-transparent text-foreground placeholder:text-[var(--text-tertiary)] outline-none text-sm min-w-0"
          />
          {search ? (
            <button
              onClick={() => { setSearch(''); searchRef.current?.focus() }}
              className="text-[var(--text-tertiary)] hover:text-foreground transition-colors flex-shrink-0"
            >
              <X className="size-3" />
            </button>
          ) : (
            <kbd className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--overlay)] border border-[var(--border-subtle)] text-[var(--text-tertiary)] flex-shrink-0">
              /
            </kbd>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-3 space-y-4 overflow-y-auto">
        <div className="space-y-0.5">
          <p className="px-3 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">
            Workspace
          </p>
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to || (to === '/projects' && location.pathname.startsWith('/projects'))
            return (
              <Link
                key={to}
                to={to}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2.5 px-3 h-8 rounded-lg text-[13px] font-medium transition-all duration-150',
                  active
                    ? 'bg-[var(--accent-muted-bg)] text-[var(--accent-solid)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-foreground hover:bg-[var(--sidebar-hover)]'
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            )
          })}
        </div>

        {projects && projects.length > 0 && (
          <div className="space-y-0.5">
            <div className="flex items-center justify-between px-3 mb-1.5">
              <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                Projects
              </p>
              <Link
                to="/projects"
                onClick={onClose}
                className="size-5 inline-flex items-center justify-center rounded text-[var(--text-tertiary)] hover:text-foreground hover:bg-[var(--sidebar-hover)] transition-colors"
              >
                <Plus className="size-3" />
              </Link>
            </div>
            {filteredProjects.slice(0, 8).map((p) => (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2.5 px-3 h-8 rounded-lg text-[13px] transition-all duration-150',
                  location.pathname === `/projects/${p.id}`
                    ? 'bg-[var(--accent-muted-bg)] text-[var(--accent-solid)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-foreground hover:bg-[var(--sidebar-hover)]'
                )}
              >
                <span
                  className="size-2.5 rounded flex-shrink-0"
                  style={{ backgroundColor: p.color || '#3B82F6' }}
                />
                <span className="truncate">{p.name}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* User */}
      {user && (
        <div className="border-t border-[var(--sidebar-border)] p-3">
          <Link
            to="/settings"
            onClick={onClose}
            className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[var(--sidebar-hover)] transition-colors"
          >
            <Avatar className="size-7">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback className="text-xs bg-[var(--accent-muted-bg)] text-[var(--accent-solid)]">
                {(user.full_name || user.username).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate">
                {user.full_name || user.username}
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)] truncate">{user.email}</p>
            </div>
          </Link>
        </div>
      )}
    </aside>
  )
}
