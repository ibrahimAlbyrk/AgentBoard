import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react'
import { Folder, Layout, CheckSquare } from 'lucide-react'
import type { ReferenceableProject, ReferenceableBoard, ReferenceableTask } from '@/types'

type SuggestionItem =
  | { type: 'project'; data: ReferenceableProject }
  | { type: 'board'; data: ReferenceableBoard }
  | { type: 'task'; data: ReferenceableTask }

interface ReferenceSuggestionProps {
  items: SuggestionItem[]
  command: (attrs: Record<string, unknown>) => void
}

export const ReferenceSuggestion = forwardRef<
  { onKeyDown: (props: { event: KeyboardEvent }) => boolean },
  ReferenceSuggestionProps
>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    setSelectedIndex(0)
  }, [items])

  const selectItem = (index: number) => {
    const item = items[index]
    if (!item) return

    if (item.type === 'project') {
      command({ id: item.data.id, label: item.data.name, entityType: 'project', projectId: item.data.id })
    } else if (item.type === 'board') {
      command({ id: item.data.id, label: item.data.name, entityType: 'board', projectId: item.data.project_id, boardId: item.data.id })
    } else {
      command({ id: item.data.id, label: item.data.title, entityType: 'task', projectId: item.data.project_id, boardId: item.data.board_id })
    }
  }

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((prev) => (prev + items.length - 1) % items.length)
        return true
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((prev) => (prev + 1) % items.length)
        return true
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex)
        return true
      }
      return false
    },
  }))

  if (items.length === 0) {
    return (
      <div className="px-3 py-2 text-xs text-[var(--text-tertiary)]">
        No matches
      </div>
    )
  }

  // Group items by type
  const projects = items.filter((i): i is { type: 'project'; data: ReferenceableProject } => i.type === 'project')
  const boards = items.filter((i): i is { type: 'board'; data: ReferenceableBoard } => i.type === 'board')
  const tasks = items.filter((i): i is { type: 'task'; data: ReferenceableTask } => i.type === 'task')

  let flatIndex = 0

  const renderGroup = (
    label: string,
    groupItems: SuggestionItem[],
    Icon: typeof Folder,
  ) => {
    if (groupItems.length === 0) return null
    const elements = groupItems.map((item) => {
      const idx = flatIndex++
      const displayName = 'name' in item.data ? item.data.name : (item.data as ReferenceableTask).title
      return (
        <button
          key={`${item.type}-${item.data.id}`}
          onClick={() => selectItem(idx)}
          className={`flex items-center gap-2.5 w-full px-3 py-1.5 text-left text-sm transition-colors ${
            idx === selectedIndex
              ? 'bg-[var(--accent-muted-bg)] text-[var(--accent-solid)]'
              : 'text-foreground hover:bg-[var(--surface)]'
          }`}
        >
          <Icon className="size-3.5 text-[var(--text-tertiary)] shrink-0" />
          <span className="truncate">{displayName}</span>
        </button>
      )
    })
    return (
      <div key={label}>
        <div className="px-3 py-1 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
          {label}
        </div>
        {elements}
      </div>
    )
  }

  return (
    <div className="max-h-60 overflow-y-auto py-1">
      {renderGroup('Projects', projects, Folder)}
      {renderGroup('Boards', boards, Layout)}
      {renderGroup('Tasks', tasks, CheckSquare)}
    </div>
  )
})

ReferenceSuggestion.displayName = 'ReferenceSuggestion'
