import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { LayoutDashboard, FolderKanban, Settings, Search, Plus, X, ChevronRight, ChevronLeft, Kanban } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppLogo } from '@/components/shared/AppLogo'
import { useProjects } from '@/hooks/useProjects'
import { useBoards } from '@/hooks/useBoards'
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
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const [showAll, setShowAll] = useState(false)

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )
  const PROJECT_LIMIT = 10
  const displayedProjects = showAll || search ? filteredProjects : filteredProjects.slice(0, PROJECT_LIMIT)
  const hasMore = !search && filteredProjects.length > PROJECT_LIMIT && !showAll

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

        {/* Search — collapsed: icon opens command palette; expanded: filter input */}
        {collapsed ? (
          <div className="px-3 pt-3 pb-1 flex justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onOpenCommandPalette?.()}
                  className="size-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-foreground hover:bg-[var(--sidebar-hover)] transition-all"
                  aria-label="Open search"
                >
                  <Search className="size-4" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Search
              </TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <div className="px-3 pt-3 pb-1">
            <div className="flex items-center gap-2 px-3 h-8 rounded-lg bg-[var(--surface)] border border-[var(--border-subtle)] text-sm focus-within:border-[var(--accent-solid)] hover:border-[var(--border-strong)] transition-colors">
              <Search className="size-3.5 text-[var(--text-tertiary)] flex-shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter projects..."
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
              const active = to === '/projects'
                ? location.pathname === '/projects'
                : location.pathname === to

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
                  {displayedProjects.map((p) => (
                    <SidebarProjectItem key={p.id} project={p} onClose={onClose} collapsed />
                  ))}
                </div>
              ) : (
                <div className="max-h-[320px] overflow-y-auto space-y-0.5">
                  {displayedProjects.map((p) => (
                    <SidebarProjectItem key={p.id} project={p} onClose={onClose} />
                  ))}
                  {hasMore && (
                    <button
                      onClick={() => setShowAll(true)}
                      className="w-full px-3 py-1.5 text-[12px] text-[var(--accent-solid)] hover:underline text-left cursor-pointer"
                    >
                      Show all ({filteredProjects.length})
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Bottom area: collapse toggle */}
        <div className="border-t border-[var(--sidebar-border)] flex-shrink-0">
          {onToggleCollapse && (
            <div className={cn('px-3 py-2', collapsed && 'flex justify-center')}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onToggleCollapse}
                    className={cn(
                      'size-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-foreground hover:bg-[var(--sidebar-hover)] transition-all',
                      !collapsed && 'ml-auto'
                    )}
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  >
                    {collapsed ? (
                      <ChevronRight className="size-4" aria-hidden="true" />
                    ) : (
                      <ChevronLeft className="size-4" aria-hidden="true" />
                    )}
                    <span className="sr-only">{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side={collapsed ? 'right' : 'top'} sideOffset={8}>
                  {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}
