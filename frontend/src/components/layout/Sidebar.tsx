import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { LayoutDashboard, FolderKanban, Settings, Search, Plus, X, ChevronRight, ChevronLeft, Kanban } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppLogo } from '@/components/shared/AppLogo'
import { useProjects } from '@/hooks/useProjects'
import { useBoards } from '@/hooks/useBoards'
import { useAuthStore } from '@/stores/authStore'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Project } from '@/types'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

function SidebarProjectItem({
  project,
  onClose,
  collapsed,
}: {
  project: Project
  onClose?: () => void
  collapsed?: boolean
}) {
  const location = useLocation()
  const { projectId: routeProjectId, boardId: routeBoardId } = useParams()
  const isProjectRoute = routeProjectId === project.id
  const [expanded, setExpanded] = useState(isProjectRoute)
  const { data: boardsRes } = useBoards(project.id)
  const boards = boardsRes?.data ?? []

  useEffect(() => {
    if (isProjectRoute && !expanded) setExpanded(true)
  }, [isProjectRoute])

  const projectActive =
    location.pathname === `/projects/${project.id}` && !routeBoardId

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={`/projects/${project.id}`}
            onClick={onClose}
            className={cn(
              'size-8 rounded-lg flex items-center justify-center transition-all duration-150 mx-auto',
              projectActive
                ? 'bg-[var(--accent-muted-bg)]'
                : 'hover:bg-[var(--sidebar-hover)]'
            )}
          >
            <span
              className="size-3 rounded flex-shrink-0"
              style={{ backgroundColor: project.color || 'var(--accent-solid)' }}
            />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {project.name}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => setExpanded(!expanded)}
          className="size-5 inline-flex items-center justify-center rounded text-[var(--text-tertiary)] hover:text-foreground hover:bg-[var(--sidebar-hover)] transition-all flex-shrink-0"
        >
          <ChevronRight
            className={cn(
              'size-3 transition-transform duration-150',
              expanded && 'rotate-90'
            )}
          />
        </button>
        <Link
          to={`/projects/${project.id}`}
          onClick={onClose}
          className={cn(
            'flex-1 flex items-center gap-2 px-2 h-7 rounded-lg text-[13px] transition-all duration-150 min-w-0',
            projectActive
              ? 'bg-[var(--accent-muted-bg)] text-[var(--accent-solid)] font-semibold'
              : 'text-[var(--text-secondary)] hover:text-foreground hover:bg-[var(--sidebar-hover)]'
          )}
        >
          <span
            className="size-2.5 rounded flex-shrink-0"
            style={{ backgroundColor: project.color || 'var(--accent-solid)' }}
          />
          <span className="truncate">{project.name}</span>
        </Link>
      </div>

      {expanded && boards.length > 0 && (
        <div className="ml-3 pl-2.5 border-l border-[var(--border-subtle)] mt-0.5 space-y-0.5">
          {boards.map((b) => {
            const boardActive =
              routeProjectId === project.id && routeBoardId === b.id
            return (
              <Link
                key={b.id}
                to={`/projects/${project.id}/boards/${b.id}`}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2 px-2 h-7 rounded-lg text-[12px] transition-all duration-150',
                  boardActive
                    ? 'bg-[var(--accent-muted-bg)] text-[var(--accent-solid)] font-semibold'
                    : 'text-[var(--text-tertiary)] hover:text-foreground hover:bg-[var(--sidebar-hover)]'
                )}
              >
                <Kanban className="size-3 flex-shrink-0" />
                <span className="truncate">{b.name}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface SidebarProps {
  onClose?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
  onOpenCommandPalette?: () => void
}

export function Sidebar({ onClose, collapsed = false, onToggleCollapse, onOpenCommandPalette }: SidebarProps) {
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
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName) && !(e.target as HTMLElement).isContentEditable) {
        e.preventDefault()
        onOpenCommandPalette?.()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onOpenCommandPalette])

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className={cn(
          'h-full border-r border-[var(--sidebar-border)] bg-sidebar flex flex-col transition-all duration-300 overflow-hidden',
          collapsed ? 'w-16' : 'w-[248px]'
        )}
      >
        {/* Brand */}
        <div className={cn(
          'h-14 flex items-center border-b border-[var(--sidebar-border)] flex-shrink-0',
          collapsed ? 'justify-center px-0' : 'gap-2.5 px-5'
        )}>
          <AppLogo size="sm" className="shadow-sm" />
          {!collapsed && (
            <span className="font-bold text-[15px] text-foreground tracking-tight whitespace-nowrap">AgentBoard</span>
          )}
        </div>

        {/* Search — hidden when collapsed */}
        {!collapsed && (
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
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); onOpenCommandPalette?.() }}
                  className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--overlay)] border border-[var(--border-subtle)] text-[var(--text-tertiary)] flex-shrink-0 hover:text-foreground transition-colors cursor-pointer"
                >
                  {navigator.platform.toUpperCase().includes('MAC') ? '\u2318K' : 'Ctrl+K'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-3 px-3 space-y-4 overflow-y-auto">
          <div className="space-y-0.5">
            {!collapsed && (
              <p className="px-3 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">
                Workspace
              </p>
            )}
            {navItems.map(({ to, icon: Icon, label }) => {
              const active = location.pathname === to || (to === '/projects' && location.pathname.startsWith('/projects'))

              if (collapsed) {
                return (
                  <Tooltip key={to}>
                    <TooltipTrigger asChild>
                      <Link
                        to={to}
                        onClick={onClose}
                        className={cn(
                          'size-10 rounded-lg flex items-center justify-center mx-auto transition-all duration-150',
                          active
                            ? 'bg-[var(--accent-muted-bg)] text-[var(--accent-solid)]'
                            : 'text-[var(--text-secondary)] hover:text-foreground hover:bg-[var(--sidebar-hover)]'
                        )}
                      >
                        <Icon className="size-4" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {label}
                    </TooltipContent>
                  </Tooltip>
                )
              }

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

          {/* Projects section */}
          {projects && projects.length > 0 && (
            <div className="space-y-0.5">
              {!collapsed && (
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
              )}
              {collapsed ? (
                <div className="flex flex-col items-center gap-0.5">
                  {filteredProjects.map((p) => (
                    <SidebarProjectItem key={p.id} project={p} onClose={onClose} collapsed />
                  ))}
                </div>
              ) : (
                <div className="max-h-[320px] overflow-y-auto space-y-0.5">
                  {filteredProjects.map((p) => (
                    <SidebarProjectItem key={p.id} project={p} onClose={onClose} />
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Bottom area: collapse toggle + user */}
        <div className="border-t border-[var(--sidebar-border)] flex-shrink-0">
          {/* Collapse toggle — hidden on mobile overlay */}
          {onToggleCollapse && (
            <div className={cn('px-3 pt-2', collapsed && 'flex justify-center')}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onToggleCollapse}
                    className={cn(
                      'size-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-foreground hover:bg-[var(--sidebar-hover)] transition-all',
                      !collapsed && 'ml-auto'
                    )}
                  >
                    {collapsed ? (
                      <ChevronRight className="size-4" />
                    ) : (
                      <ChevronLeft className="size-4" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side={collapsed ? 'right' : 'top'} sideOffset={8}>
                  {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* User */}
          {user && (
            <div className="p-3">
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/settings"
                      onClick={onClose}
                      className="flex justify-center"
                    >
                      <Avatar className="size-8">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-[var(--accent-muted-bg)] text-[var(--accent-solid)]">
                          {(user.full_name || user.username).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {user.full_name || user.username}
                  </TooltipContent>
                </Tooltip>
              ) : (
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
              )}
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}
