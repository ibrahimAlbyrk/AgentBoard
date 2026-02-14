import { useState, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  FileText,
  ArrowRight,
  Loader2,
  CornerDownLeft,
} from 'lucide-react'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import { useProjects } from '@/hooks/useProjects'
import { useSearch } from '@/hooks/useSearch'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', keywords: ['home', 'overview', 'stats'] },
  { label: 'Projects', icon: FolderKanban, path: '/projects', keywords: ['boards', 'kanban'] },
  { label: 'Settings', icon: Settings, path: '/settings', keywords: ['profile', 'preferences', 'account'] },
]

interface SearchResult {
  type: 'project' | 'task'
  id: string
  title: string
  project_id?: string
  board_id?: string
  slug?: string
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const { data: projectsRes } = useProjects()
  const projects = projectsRes?.data ?? []
  const { data: searchRes, isLoading: searchLoading } = useSearch(query)

  const searchResults: SearchResult[] = (searchRes as { data?: SearchResult[] })?.data ?? []

  const { taskResults, projectSearchResults } = useMemo(() => ({
    taskResults: searchResults.filter((r) => r.type === 'task'),
    projectSearchResults: searchResults.filter((r) => r.type === 'project'),
  }), [searchResults])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const handleSelect = useCallback(
    (path: string) => {
      navigate(path)
      onOpenChange(false)
    },
    [navigate, onOpenChange]
  )

  const showSearchHint = query.length > 0 && query.length < 2

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command Palette"
      description="Search commands, projects, and tasks"
      showCloseButton={false}
    >
      <div className="relative">
        <CommandInput
          placeholder="Search or type a command..."
          value={query}
          onValueChange={setQuery}
        />
        {searchLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="size-4 text-[var(--text-tertiary)] animate-spin" />
          </div>
        )}
      </div>

      <CommandList>
        <CommandEmpty>
          {searchLoading
            ? 'Searching...'
            : showSearchHint
              ? 'Type at least 2 characters to search...'
              : 'No results found.'
          }
        </CommandEmpty>

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          {NAV_ITEMS.map((item) => (
            <CommandItem
              key={item.path}
              value={`nav-${item.label} ${item.keywords.join(' ')}`}
              onSelect={() => handleSelect(item.path)}
            >
              <item.icon className="size-4 text-[var(--text-tertiary)]" />
              <span>{item.label}</span>
              <ArrowRight className="ml-auto size-3 text-[var(--text-tertiary)] opacity-0 group-data-[selected=true]:opacity-100 transition-opacity" />
            </CommandItem>
          ))}
        </CommandGroup>

        {/* Projects from cache */}
        {projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projects">
              {projects.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`project-${p.name}`}
                  onSelect={() => handleSelect(`/projects/${p.id}`)}
                >
                  <span
                    className="size-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: p.color || 'var(--accent-solid)' }}
                  />
                  <span className="truncate">{p.name}</span>
                  <span className="ml-auto text-[11px] tabular-nums text-[var(--text-tertiary)]">
                    {p.task_count ?? 0}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* API search: tasks */}
        {taskResults.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Tasks">
              {taskResults.map((t) => (
                <CommandItem
                  key={t.id}
                  value={`task-${t.title}-${t.id}`}
                  onSelect={() =>
                    handleSelect(
                      t.project_id && t.board_id
                        ? `/projects/${t.project_id}/boards/${t.board_id}?task=${t.id}`
                        : `/projects/${t.project_id}`
                    )
                  }
                >
                  <FileText className="size-4 text-[var(--text-tertiary)]" />
                  <span className="truncate">{t.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* API search: projects (only when querying, avoid duplicating cached list) */}
        {query.length >= 2 && projectSearchResults.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Search Results">
              {projectSearchResults.map((p) => (
                <CommandItem
                  key={`search-${p.id}`}
                  value={`search-project-${p.title}-${p.id}`}
                  onSelect={() => handleSelect(`/projects/${p.id}`)}
                >
                  <FolderKanban className="size-4 text-[var(--text-tertiary)]" />
                  <span className="truncate">{p.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>

      {/* Footer with keyboard hints */}
      <div className="flex items-center gap-4 border-t border-[var(--border-subtle)] px-3 py-2">
        <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-tertiary)]">
          <kbd className="inline-flex items-center justify-center size-[18px] rounded bg-[var(--overlay)] border border-[var(--border-subtle)] text-[10px] font-medium">
            <CornerDownLeft className="size-2.5" />
          </kbd>
          select
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-tertiary)]">
          <span className="flex gap-0.5">
            <kbd className="inline-flex items-center justify-center size-[18px] rounded bg-[var(--overlay)] border border-[var(--border-subtle)] text-[10px] font-medium">
              &uarr;
            </kbd>
            <kbd className="inline-flex items-center justify-center size-[18px] rounded bg-[var(--overlay)] border border-[var(--border-subtle)] text-[10px] font-medium">
              &darr;
            </kbd>
          </span>
          navigate
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-tertiary)] ml-auto">
          <kbd className="inline-flex items-center justify-center h-[18px] px-1.5 rounded bg-[var(--overlay)] border border-[var(--border-subtle)] text-[10px] font-medium">
            esc
          </kbd>
          close
        </span>
      </div>
    </CommandDialog>
  )
}
