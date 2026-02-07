import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, FolderKanban, Settings } from 'lucide-react'
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

  return (
    <aside className="w-64 h-full border-r bg-white dark:bg-gray-800 flex flex-col">
      <div className="h-16 flex items-center gap-2 px-5 border-b">
        <LayoutDashboard className="size-6 text-blue-600" />
        <span className="font-bold text-lg">AgentBoard</span>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = location.pathname.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          )
        })}

        {projects && projects.length > 0 && (
          <div className="pt-6">
            <h4 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Projects
            </h4>
            <div className="space-y-1">
              {projects.map((p) => (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}`}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    location.pathname === `/projects/${p.id}`
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  <span
                    className="size-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: p.color || '#6366f1' }}
                  />
                  <span className="truncate">{p.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {user && (
        <div className="border-t p-4 flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback>
              {(user.full_name || user.username).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium truncate">
            {user.full_name || user.username}
          </span>
        </div>
      )}
    </aside>
  )
}
