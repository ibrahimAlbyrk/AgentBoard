import { useState, useEffect, useCallback, useMemo } from 'react'
import { X, Search, User, Users, Bot, Tag, Calendar, AlertTriangle, Check, ChevronDown, SlidersHorizontal, Clock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useProjectStore } from '@/stores/projectStore'
import { useBoardStore, type DueDatePreset } from '@/stores/boardStore'
import type { Priority } from '@/types'

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: 'urgent', label: 'Urgent', color: 'var(--priority-urgent)' },
  { value: 'high', label: 'High', color: 'var(--priority-high)' },
  { value: 'medium', label: 'Medium', color: 'var(--priority-medium)' },
  { value: 'low', label: 'Low', color: 'var(--priority-low)' },
  { value: 'none', label: 'None', color: 'var(--priority-none)' },
]

const dueDateOptions: { value: DueDatePreset; label: string; icon: typeof Clock }[] = [
  { value: 'overdue', label: 'Overdue', icon: AlertTriangle },
  { value: 'today', label: 'Due today', icon: Clock },
  { value: 'this_week', label: 'Due this week', icon: Calendar },
  { value: 'next_week', label: 'Due next week', icon: Calendar },
  { value: 'no_date', label: 'No due date', icon: Calendar },
]

function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function FilterPill({
  label,
  icon: Icon,
  count,
  active,
  onClick,
  children,
  align = 'start',
}: {
  label: string
  icon: React.ElementType
  count?: number
  active?: boolean
  onClick?: () => void
  children?: React.ReactNode
  align?: 'start' | 'center' | 'end'
}) {
  if (children) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] font-medium transition-all duration-150 border select-none',
              active
                ? 'bg-[var(--accent-muted-bg)] text-[var(--accent-solid)] border-[var(--accent-solid)]/25 shadow-[0_0_8px_-3px_var(--glow)]'
                : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:text-foreground'
            )}
          >
            <Icon className="size-3.5" />
            <span>{label}</span>
            {!!count && count > 0 && (
              <span className="inline-flex items-center justify-center size-4 rounded-full bg-[var(--accent-solid)] text-white text-[10px] font-bold leading-none">
                {count}
              </span>
            )}
            <ChevronDown className="size-3 opacity-50 -mr-0.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align={align}
          className="p-0 w-64 border-[var(--border-subtle)] bg-[var(--elevated)] shadow-lg"
        >
          {children}
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] font-medium transition-all duration-150 border select-none',
        active
          ? 'bg-[var(--accent-muted-bg)] text-[var(--accent-solid)] border-[var(--accent-solid)]/25 shadow-[0_0_8px_-3px_var(--glow)]'
          : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:text-foreground'
      )}
    >
      <Icon className="size-3.5" />
      <span>{label}</span>
    </button>
  )
}

function CheckItem({
  checked,
  onClick,
  children,
}: {
  checked: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 w-full px-2.5 py-1.5 text-[13px] rounded-md transition-colors text-left',
        checked
          ? 'text-foreground bg-[var(--accent-muted-bg)]'
          : 'text-[var(--text-secondary)] hover:text-foreground hover:bg-[var(--overlay)]'
      )}
    >
      <span
        className={cn(
          'inline-flex items-center justify-center size-4 rounded border transition-all duration-150 shrink-0',
          checked
            ? 'bg-[var(--accent-solid)] border-[var(--accent-solid)] text-white'
            : 'border-[var(--border-strong)] bg-transparent'
        )}
      >
        {checked && <Check className="size-2.5" strokeWidth={3} />}
      </span>
      <span className="flex-1 truncate">{children}</span>
    </button>
  )
}

function ActiveFilterChip({ label, onRemove }: { label: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-md bg-[var(--accent-muted-bg)] text-[var(--accent-solid)] text-[11px] font-medium border border-[var(--accent-solid)]/15 animate-fade-in-scale">
      {label}
      <button
        onClick={onRemove}
        className="inline-flex items-center justify-center size-4 rounded hover:bg-[var(--accent-solid)]/15 transition-colors"
      >
        <X className="size-2.5" />
      </button>
    </span>
  )
}

function toggleInArray<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]
}

export function TaskFilters() {
  const { members, labels, agents } = useProjectStore()
  const { setFilters, clearFilters, filters, hasActiveFilters } = useBoardStore()
  const [search, setSearch] = useState(filters.search)

  const debouncedSearch = useCallback(
    (value: string) => {
      setFilters({ search: value })
    },
    [setFilters]
  )

  useEffect(() => {
    const timer = setTimeout(() => debouncedSearch(search), 250)
    return () => clearTimeout(timer)
  }, [search, debouncedSearch])

  const filtersActive = hasActiveFilters()

  const assigneeCount = filters.assigneeUserIds.length + filters.assigneeAgentIds.length + (filters.unassigned ? 1 : 0)

  // Build active chip descriptors
  const activeChips = useMemo(() => {
    const chips: { key: string; label: React.ReactNode; onRemove: () => void }[] = []

    // Assignee chips
    for (const uid of filters.assigneeUserIds) {
      const m = members.find((m) => m.user.id === uid)
      if (m) {
        chips.push({
          key: `user-${uid}`,
          label: <><User className="size-2.5 inline mr-0.5" />{m.user.full_name || m.user.username}</>,
          onRemove: () => setFilters({ assigneeUserIds: filters.assigneeUserIds.filter((id) => id !== uid) }),
        })
      }
    }
    for (const aid of filters.assigneeAgentIds) {
      const a = agents.find((a) => a.id === aid)
      if (a) {
        chips.push({
          key: `agent-${aid}`,
          label: (
            <>
              <span className="inline-block size-2 rounded-full mr-0.5" style={{ backgroundColor: a.color }} />
              {a.name}
            </>
          ),
          onRemove: () => setFilters({ assigneeAgentIds: filters.assigneeAgentIds.filter((id) => id !== aid) }),
        })
      }
    }
    if (filters.unassigned) {
      chips.push({
        key: 'unassigned',
        label: 'Unassigned',
        onRemove: () => setFilters({ unassigned: false }),
      })
    }

    // Label chips
    for (const lid of filters.labelIds) {
      const l = labels.find((l) => l.id === lid)
      if (l) {
        chips.push({
          key: `label-${lid}`,
          label: (
            <>
              <span className="inline-block size-2 rounded-full mr-0.5" style={{ backgroundColor: l.color }} />
              {l.name}
            </>
          ),
          onRemove: () => setFilters({ labelIds: filters.labelIds.filter((id) => id !== lid) }),
        })
      }
    }

    // Priority chips
    for (const p of filters.priorities) {
      const opt = priorityOptions.find((o) => o.value === p)
      if (opt) {
        chips.push({
          key: `priority-${p}`,
          label: (
            <>
              <span className="inline-block size-2 rounded-full mr-0.5" style={{ backgroundColor: opt.color }} />
              {opt.label}
            </>
          ),
          onRemove: () => setFilters({ priorities: filters.priorities.filter((v) => v !== p) }),
        })
      }
    }

    // Due date chips
    for (const d of filters.dueDatePresets) {
      const opt = dueDateOptions.find((o) => o.value === d)
      if (opt) {
        chips.push({
          key: `due-${d}`,
          label: <>{opt.label}</>,
          onRemove: () => setFilters({ dueDatePresets: filters.dueDatePresets.filter((v) => v !== d) }),
        })
      }
    }

    return chips
  }, [filters, members, agents, labels, setFilters])

  return (
    <div className="flex flex-col gap-2">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative w-48">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-[var(--text-tertiary)]" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-7 h-7 text-[12px] bg-[var(--surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] focus:border-[var(--accent-solid)] transition-colors rounded-md"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-foreground transition-colors"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        <div className="w-px h-5 bg-[var(--border-subtle)]" />

        {/* Assignee filter */}
        <FilterPill
          label="Assignee"
          icon={Users}
          count={assigneeCount}
          active={assigneeCount > 0}
        >
          <div className="py-1.5">
            {/* Unassigned option */}
            <div className="px-1.5 pb-1">
              <CheckItem
                checked={filters.unassigned}
                onClick={() => setFilters({ unassigned: !filters.unassigned })}
              >
                <span className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center size-5 rounded-full bg-[var(--overlay)] text-[var(--text-tertiary)]">
                    <User className="size-3" />
                  </span>
                  Unassigned
                </span>
              </CheckItem>
            </div>

            {/* Members section */}
            {members.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Members
                </div>
                <ScrollArea className="max-h-[180px] overflow-y-auto">
                  <div className="px-1.5 space-y-0.5">
                    {members.map((m) => (
                      <CheckItem
                        key={m.user.id}
                        checked={filters.assigneeUserIds.includes(m.user.id)}
                        onClick={() =>
                          setFilters({
                            assigneeUserIds: toggleInArray(filters.assigneeUserIds, m.user.id),
                          })
                        }
                      >
                        <span className="flex items-center gap-2">
                          <Avatar size="sm" className="size-5">
                            {m.user.avatar_url && <AvatarImage src={m.user.avatar_url} />}
                            <AvatarFallback className="text-[9px]">
                              {getInitials(m.user.full_name || m.user.username)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">{m.user.full_name || m.user.username}</span>
                        </span>
                      </CheckItem>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}

            {/* Agents section */}
            {agents.length > 0 && (
              <>
                <div className="mx-2.5 my-1.5 h-px bg-[var(--border-subtle)]" />
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Agents
                </div>
                <ScrollArea className="max-h-[140px] overflow-y-auto">
                  <div className="px-1.5 space-y-0.5 pb-1">
                    {agents.filter(a => a.is_active).map((a) => (
                      <CheckItem
                        key={a.id}
                        checked={filters.assigneeAgentIds.includes(a.id)}
                        onClick={() =>
                          setFilters({
                            assigneeAgentIds: toggleInArray(filters.assigneeAgentIds, a.id),
                          })
                        }
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-flex items-center justify-center size-5 rounded-full text-white text-[9px] font-bold shrink-0"
                            style={{ backgroundColor: a.color }}
                          >
                            <Bot className="size-3" />
                          </span>
                          <span className="truncate">{a.name}</span>
                        </span>
                      </CheckItem>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>
        </FilterPill>

        {/* Label filter */}
        <FilterPill
          label="Label"
          icon={Tag}
          count={filters.labelIds.length}
          active={filters.labelIds.length > 0}
        >
          <div className="py-1.5">
            {labels.length === 0 ? (
              <div className="px-3 py-4 text-center text-[13px] text-[var(--text-tertiary)]">
                No labels in this project
              </div>
            ) : (
              <ScrollArea className="max-h-[280px] overflow-y-auto">
                <div className="px-1.5 space-y-0.5">
                  {labels.map((l) => (
                    <CheckItem
                      key={l.id}
                      checked={filters.labelIds.includes(l.id)}
                      onClick={() =>
                        setFilters({ labelIds: toggleInArray(filters.labelIds, l.id) })
                      }
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="size-3 rounded-sm shrink-0"
                          style={{ backgroundColor: l.color }}
                        />
                        <span className="truncate">{l.name}</span>
                      </span>
                    </CheckItem>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </FilterPill>

        {/* Due date filter */}
        <FilterPill
          label="Due date"
          icon={Calendar}
          count={filters.dueDatePresets.length}
          active={filters.dueDatePresets.length > 0}
        >
          <div className="py-1.5 px-1.5 space-y-0.5">
            {dueDateOptions.map((opt) => {
              const Icon = opt.icon
              return (
                <CheckItem
                  key={opt.value}
                  checked={filters.dueDatePresets.includes(opt.value)}
                  onClick={() =>
                    setFilters({
                      dueDatePresets: toggleInArray(filters.dueDatePresets, opt.value),
                    })
                  }
                >
                  <span className="flex items-center gap-2">
                    <Icon className={cn(
                      'size-3.5',
                      opt.value === 'overdue' && 'text-[var(--priority-urgent)]'
                    )} />
                    <span>{opt.label}</span>
                  </span>
                </CheckItem>
              )
            })}
          </div>
        </FilterPill>

        {/* Priority filter */}
        <FilterPill
          label="Priority"
          icon={SlidersHorizontal}
          count={filters.priorities.length}
          active={filters.priorities.length > 0}
        >
          <div className="py-1.5 px-1.5 space-y-0.5">
            {priorityOptions.map((p) => (
              <CheckItem
                key={p.value}
                checked={filters.priorities.includes(p.value)}
                onClick={() =>
                  setFilters({ priorities: toggleInArray(filters.priorities, p.value) })
                }
              >
                <span className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  {p.label}
                </span>
              </CheckItem>
            ))}
          </div>
        </FilterPill>

        {/* Clear all */}
        {filtersActive && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              clearFilters()
              setSearch('')
            }}
            className="text-[var(--text-secondary)] hover:text-foreground hover:bg-[var(--surface)] transition-colors text-[12px] h-7 ml-0.5"
          >
            <X className="size-3" />
            Clear all
          </Button>
        )}
      </div>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-[var(--text-tertiary)] font-medium mr-0.5">Active:</span>
          {activeChips.map((chip) => (
            <ActiveFilterChip key={chip.key} label={chip.label} onRemove={chip.onRemove} />
          ))}
        </div>
      )}
    </div>
  )
}
