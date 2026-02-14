import { useState, useMemo } from 'react'
import { useNavigate, useLocation, useParams, Link } from 'react-router-dom'
import { formatDistanceToNow, parseISO } from 'date-fns'
import {
  Bell, LogOut, User, Menu, Check, CheckCheck, Trash2,
  UserPlus, UserMinus, RefreshCw, ArrowRight, MessageSquare,
  Heart, AtSign, ListPlus, ListMinus, Eye, EyeOff, ChevronDown, ChevronRight,
  Filter, type LucideIcon,
} from 'lucide-react'
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
import { useProjectStore } from '@/stores/projectStore'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { useNotifications, useUnreadCount, useMarkRead, useClearNotifications } from '@/hooks/useNotifications'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// ── Breadcrumb builder ──

interface BreadcrumbSegment {
  label: string
  path: string
}

function useBreadcrumbs(): BreadcrumbSegment[] {
  const location = useLocation()
  const { projectId, boardId } = useParams()
  const currentProject = useProjectStore((s) => s.currentProject)
  const currentBoard = useProjectStore((s) => s.currentBoard)

  return useMemo(() => {
    const path = location.pathname
    const segments: BreadcrumbSegment[] = []

    if (path === '/dashboard' || path === '/') {
      segments.push({ label: 'Dashboard', path: '/dashboard' })
    } else if (path === '/settings') {
      segments.push({ label: 'Settings', path: '/settings' })
    } else if (path.startsWith('/projects')) {
      segments.push({ label: 'Projects', path: '/projects' })

      if (projectId) {
        const projectName = currentProject?.id === projectId
          ? currentProject.name
          : 'Project'
        segments.push({ label: projectName, path: `/projects/${projectId}` })

        if (boardId) {
          const boardName = currentBoard?.id === boardId
            ? currentBoard.name
            : 'Board'
          segments.push({ label: boardName, path: `/projects/${projectId}/boards/${boardId}` })
        }
      }
    }

    return segments
  }, [location.pathname, projectId, boardId, currentProject, currentBoard])
}

// ── Notification type → icon + color mapping ──

type NotifMeta = { icon: LucideIcon; color: string; bg: string; label: string; category: string }

const NOTIF_TYPE_MAP: Record<string, NotifMeta> = {
  task_assigned:    { icon: UserPlus,       color: 'text-[var(--info)]',         bg: 'bg-[var(--info-muted)]',       label: 'Assigned',       category: 'assignments' },
  assignee_added:   { icon: UserPlus,       color: 'text-[var(--info)]',         bg: 'bg-[var(--info-muted)]',       label: 'Assigned',       category: 'assignments' },
  assignee_removed: { icon: UserMinus,      color: 'text-destructive',           bg: 'bg-destructive/10',            label: 'Unassigned',     category: 'assignments' },
  task_updated:     { icon: RefreshCw,      color: 'text-[var(--warning)]',      bg: 'bg-[var(--warning-muted)]',    label: 'Updated',        category: 'updates' },
  task_moved:       { icon: ArrowRight,     color: 'text-[var(--accent-solid)]', bg: 'bg-[var(--accent-solid)]/10',  label: 'Moved',          category: 'updates' },
  task_deleted:     { icon: Trash2,         color: 'text-destructive',           bg: 'bg-destructive/10',            label: 'Deleted',        category: 'updates' },
  task_comment:     { icon: MessageSquare,  color: 'text-[var(--success)]',      bg: 'bg-[var(--success-muted)]',    label: 'Comment',        category: 'comments' },
  comment_deleted:  { icon: Trash2,         color: 'text-destructive',           bg: 'bg-destructive/10',            label: 'Comment Deleted', category: 'comments' },
  task_reaction:    { icon: Heart,          color: 'text-pink-500',              bg: 'bg-pink-500/10',               label: 'Reaction',       category: 'reactions' },
  mentioned:        { icon: AtSign,         color: 'text-[var(--warning)]',      bg: 'bg-[var(--warning-muted)]',    label: 'Mention',        category: 'mentions' },
  subtask_created:  { icon: ListPlus,       color: 'text-[var(--success)]',      bg: 'bg-[var(--success-muted)]',    label: 'Subtask Added',  category: 'updates' },
  subtask_deleted:  { icon: ListMinus,      color: 'text-destructive',           bg: 'bg-destructive/10',            label: 'Subtask Removed', category: 'updates' },
  watcher_added:    { icon: Eye,            color: 'text-[var(--info)]',         bg: 'bg-[var(--info-muted)]',       label: 'Watching',       category: 'watching' },
  watcher_removed:  { icon: EyeOff,         color: 'text-muted-foreground',      bg: 'bg-muted/10',                  label: 'Unwatched',      category: 'watching' },
}

const FALLBACK_META: NotifMeta = { icon: Bell, color: 'text-[var(--text-tertiary)]', bg: 'bg-foreground/5', label: 'Notification', category: 'other' }

function getNotifMeta(type: string): NotifMeta {
  return NOTIF_TYPE_MAP[type] ?? FALLBACK_META
}

const FILTER_CATEGORIES = [
  { key: 'all',         label: 'All' },
  { key: 'assignments', label: 'Assignments' },
  { key: 'comments',    label: 'Comments' },
  { key: 'mentions',    label: 'Mentions' },
  { key: 'updates',     label: 'Updates' },
  { key: 'reactions',   label: 'Reactions' },
  { key: 'watching',    label: 'Watching' },
] as const

type FilterKey = (typeof FILTER_CATEGORIES)[number]['key']

// ── Notification item type ──

interface NotifItem {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  data: Record<string, unknown> | null
  project_id: string | null
  created_at: string
}

// ── Grouping ──

interface NotifGroup {
  key: string
  taskId: string | null
  boardId: string | null
  projectId: string | null
  items: NotifItem[]
  latestAt: string
  hasUnread: boolean
}

function groupNotifications(items: NotifItem[]): NotifGroup[] {
  const groups: NotifGroup[] = []
  let current: NotifGroup | null = null

  for (const item of items) {
    const taskId: string | null = (item.data?.task_id as string) ?? null
    if (taskId !== null && current !== null && current.taskId === taskId) {
      current.items.push(item)
      if (!item.is_read) current.hasUnread = true
    } else {
      current = {
        key: item.id,
        taskId,
        boardId: (item.data?.board_id as string) ?? null,
        projectId: item.project_id,
        items: [item],
        latestAt: item.created_at,
        hasUnread: !item.is_read,
      }
      groups.push(current)
    }
  }
  return groups
}

// ── Helpers ──

function timeAgo(dateStr: string): string {
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true })
}

// ── Header Props ──

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { data: notifications } = useNotifications()
  const { data: unreadData } = useUnreadCount()
  const markRead = useMarkRead()
  const clearAll = useClearNotifications()
  const breadcrumbs = useBreadcrumbs()

  const [tab, setTab] = useState<'all' | 'unread'>('all')
  const [category, setCategory] = useState<FilterKey>('all')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const unreadCount = unreadData?.count ?? 0
  const allItems: NotifItem[] = notifications?.data ?? []

  // Filter
  const filtered = useMemo(() => {
    let items = allItems
    if (tab === 'unread') items = items.filter(n => !n.is_read)
    if (category !== 'all') items = items.filter(n => getNotifMeta(n.type).category === category)
    return items
  }, [allItems, tab, category])

  // Group
  const groups = useMemo(() => groupNotifications(filtered), [filtered])

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleNotifClick = (n: NotifItem) => {
    const taskId = n.data?.task_id as string | undefined
    const boardId = n.data?.board_id as string | undefined
    if (!(taskId && boardId && n.project_id)) return
    if (!n.is_read) markRead.mutate({ ids: [n.id] })
    navigate(`/projects/${n.project_id}/boards/${boardId}?task=${taskId}`)
  }

  const handleGroupClick = (g: NotifGroup) => {
    if (!(g.taskId && g.boardId && g.projectId)) return
    const unreadIds = g.items.filter(i => !i.is_read).map(i => i.id)
    if (unreadIds.length) markRead.mutate({ ids: unreadIds })
    navigate(`/projects/${g.projectId}/boards/${g.boardId}?task=${g.taskId}`)
  }

  return (
    <header className="relative z-30 h-14 border-b border-[var(--border-subtle)] bg-background/80 backdrop-blur-xl flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="md:hidden size-10 md:size-8" onClick={onMenuClick} aria-label="Open sidebar menu">
          <Menu className="size-4" />
          <span className="sr-only">Open sidebar menu</span>
        </Button>

        {/* Breadcrumb — mobile: show only last item; sm+: show full */}
        {breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
            {/* Mobile: just current page */}
            <span className="sm:hidden text-[var(--text-primary)] font-medium truncate max-w-[180px]">
              {breadcrumbs[breadcrumbs.length - 1].label}
            </span>
            {/* Desktop: full breadcrumb */}
            {breadcrumbs.map((seg, i) => (
              <div key={seg.path} className="hidden sm:flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="size-3.5 text-[var(--text-tertiary)]" aria-hidden="true" />}
                {i < breadcrumbs.length - 1 ? (
                  <Link
                    to={seg.path}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {seg.label}
                  </Link>
                ) : (
                  <span className="text-[var(--text-primary)] font-medium">{seg.label}</span>
                )}
              </div>
            ))}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <ThemeToggle />

        <Popover>
          <PopoverTrigger asChild>
            <button
              className="relative size-10 md:size-8 inline-flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-foreground hover:bg-foreground/[0.08] active:bg-foreground/[0.12] active:scale-95 transition-all duration-150 cursor-pointer"
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            >
              <Bell className="size-4" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--accent-solid)] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-background">
                  <span aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</span>
                  <span className="sr-only">{unreadCount} unread notifications</span>
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[min(380px,calc(100vw-2rem))] p-0">
            {/* Header */}
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-sm font-semibold text-foreground tracking-tight">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markRead.mutate({ all: true })}
                      className="flex items-center gap-1 text-[11px] text-[var(--accent-solid)] hover:underline cursor-pointer font-medium"
                    >
                      <CheckCheck className="size-3" />
                      Read all
                    </button>
                  )}
                  {allItems.length > 0 && (
                    <button
                      onClick={() => clearAll.mutate()}
                      className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] hover:text-destructive cursor-pointer"
                    >
                      <Trash2 className="size-3" />
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Tab bar: All | Unread + Category filter */}
              <div className="flex items-center gap-1.5">
                <div className="flex bg-foreground/[0.05] rounded-md p-0.5 gap-0.5">
                  {(['all', 'unread'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={cn(
                        'px-2.5 py-1 rounded text-[11px] font-medium transition-all cursor-pointer',
                        tab === t
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                      )}
                    >
                      {t === 'all' ? 'All' : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
                    </button>
                  ))}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all cursor-pointer',
                      category !== 'all'
                        ? 'bg-[var(--accent-solid)]/10 text-[var(--accent-solid)]'
                        : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-foreground/[0.05]'
                    )}>
                      <Filter className="size-3" />
                      {FILTER_CATEGORIES.find(c => c.key === category)?.label ?? 'Filter'}
                      <ChevronDown className="size-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[140px]">
                    {FILTER_CATEGORIES.map(c => (
                      <DropdownMenuItem
                        key={c.key}
                        onClick={() => setCategory(c.key)}
                        className={cn(category === c.key && 'font-semibold')}
                      >
                        {c.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="border-t border-[var(--border-subtle)]" />

            {/* Notification list */}
            <TooltipProvider delayDuration={400}>
            <div className="max-h-[420px] overflow-y-auto">
              {groups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-[var(--text-tertiary)]">
                  <div className="size-10 rounded-full bg-foreground/[0.04] flex items-center justify-center mb-3">
                    <Bell className="size-5 opacity-30" />
                  </div>
                  <p className="text-sm font-medium">No notifications</p>
                  <p className="text-xs mt-0.5 opacity-60">
                    {tab === 'unread' ? 'All caught up!' : "You're all clear"}
                  </p>
                </div>
              ) : (
                groups.map(group => {
                  const isMulti = group.items.length > 1
                  const isExpanded = expandedGroups.has(group.key)
                  const displayItems = isMulti && !isExpanded ? [group.items[0]] : group.items

                  return (
                    <div key={group.key} className="border-b border-[var(--border-subtle)] last:border-0">
                      {/* Group header for multi-item groups */}
                      {isMulti && (
                        <button
                          onClick={() => toggleGroup(group.key)}
                          className="w-full flex items-center gap-2 px-4 py-1.5 text-[10px] font-medium text-[var(--text-tertiary)] hover:bg-foreground/[0.03] cursor-pointer transition-colors"
                        >
                          <ChevronDown className={cn('size-3 transition-transform', isExpanded && 'rotate-180')} />
                          <span>{group.items.length} updates on this task</span>
                          {group.hasUnread && (
                            <span className="ml-auto size-1.5 rounded-full bg-[var(--accent-solid)]" />
                          )}
                          <span
                            onClick={(e) => { e.stopPropagation(); handleGroupClick(group) }}
                            className="ml-1 text-[var(--accent-solid)] hover:underline"
                          >
                            View task
                          </span>
                        </button>
                      )}

                      {displayItems.map(n => {
                        const meta = getNotifMeta(n.type)
                        const Icon = meta.icon
                        const taskId = n.data?.task_id as string | undefined
                        const boardId = n.data?.board_id as string | undefined
                        const isClickable = !!(taskId && boardId && n.project_id)

                        const notifContent = (
                          <>
                            {/* Type icon */}
                            <div className={cn('mt-0.5 flex-shrink-0 size-7 rounded-lg flex items-center justify-center', meta.bg)} aria-hidden="true">
                              <Icon className={cn('size-3.5', meta.color)} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 text-left">
                              <div className="flex items-center gap-1.5">
                                <span className={cn(
                                  'text-[10px] font-semibold uppercase tracking-wider',
                                  meta.color
                                )}>
                                  {meta.label}
                                </span>
                                <span className="text-[10px] text-[var(--text-tertiary)]">
                                  {timeAgo(n.created_at)}
                                </span>
                                {!n.is_read && (
                                  <span className="size-1.5 rounded-full bg-[var(--accent-solid)] flex-shrink-0" aria-hidden="true" />
                                )}
                              </div>
                              <p className={cn(
                                'text-[13px] leading-snug mt-0.5',
                                !n.is_read ? 'text-foreground font-medium' : 'text-[var(--text-secondary)]'
                              )}>
                                {n.title}
                              </p>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5 line-clamp-2 leading-relaxed">
                                    {n.message}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-[300px]">
                                  {n.message}
                                </TooltipContent>
                              </Tooltip>
                            </div>

                            {/* Mark read */}
                            {!n.is_read && (
                              <button
                                onClick={(e) => { e.stopPropagation(); markRead.mutate({ ids: [n.id] }) }}
                                className="mt-1 flex-shrink-0 opacity-0 group-hover:opacity-100 text-[var(--text-tertiary)] hover:text-foreground transition-all"
                                aria-label="Mark as read"
                              >
                                <Check className="size-3.5" aria-hidden="true" />
                              </button>
                            )}
                          </>
                        )

                        if (isClickable) {
                          return (
                            <button
                              key={n.id}
                              onClick={() => handleNotifClick(n)}
                              className={cn(
                                'group w-full flex gap-3 px-4 py-2.5 transition-colors cursor-pointer hover:bg-foreground/[0.04] focus-visible:outline-2 focus-visible:outline-[var(--accent-solid)] focus-visible:outline-offset-[-2px]',
                                !n.is_read && 'bg-[var(--accent-solid)]/[0.03]',
                                isMulti && 'pl-8',
                              )}
                              aria-label={`${meta.label}: ${n.title}`}
                            >
                              {notifContent}
                            </button>
                          )
                        }

                        return (
                          <div
                            key={n.id}
                            className={cn(
                              'group flex gap-3 px-4 py-2.5 transition-colors',
                              !n.is_read && 'bg-[var(--accent-solid)]/[0.03]',
                              isMulti && 'pl-8',
                            )}
                          >
                            {notifContent}
                          </div>
                        )
                      })}
                    </div>
                  )
                })
              )}
            </div>
            </TooltipProvider>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative size-10 md:size-8 inline-flex items-center justify-center rounded-full hover:ring-2 hover:ring-foreground/[0.12] active:ring-foreground/[0.2] active:scale-95 transition-all duration-150 cursor-pointer" aria-label="User menu">
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
