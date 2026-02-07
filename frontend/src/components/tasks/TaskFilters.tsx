import { useState, useEffect, useCallback } from 'react'
import { X, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProjectStore } from '@/stores/projectStore'
import { useBoardStore } from '@/stores/boardStore'
import type { Priority } from '@/types'

const priorityOptions: { value: Priority; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export function TaskFilters() {
  const { members } = useProjectStore()
  const { setFilters, clearFilters, filters } = useBoardStore()
  const [search, setSearch] = useState(filters.search)

  const debouncedSearch = useCallback(
    (value: string) => {
      setFilters({ search: value })
    },
    [setFilters]
  )

  useEffect(() => {
    const timer = setTimeout(() => debouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search, debouncedSearch])

  const hasFilters =
    filters.search ||
    filters.statuses.length > 0 ||
    filters.priorities.length > 0 ||
    filters.assignee

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative w-56">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          placeholder="Filter tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      <Select
        value={filters.priorities[0] ?? 'all'}
        onValueChange={(v) =>
          setFilters({ priorities: v === 'all' ? [] : [v] })
        }
      >
        <SelectTrigger className="w-32 h-8 text-sm">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          {priorityOptions.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.assignee ?? 'all'}
        onValueChange={(v) =>
          setFilters({ assignee: v === 'all' ? null : v })
        }
      >
        <SelectTrigger className="w-36 h-8 text-sm">
          <SelectValue placeholder="Assignee" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Members</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.id} value={m.user.id}>
              {m.user.full_name || m.user.username}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="xs"
          onClick={() => {
            clearFilters()
            setSearch('')
          }}
        >
          <X className="size-3" />
          Clear
        </Button>
      )}
    </div>
  )
}
