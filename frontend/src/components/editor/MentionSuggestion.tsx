import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react'
import type { MentionableUser, MentionableAgent } from '@/types'

type SuggestionItem =
  | { type: 'user'; data: MentionableUser }
  | { type: 'agent'; data: MentionableAgent }

interface MentionSuggestionProps {
  items: SuggestionItem[]
  command: (attrs: Record<string, unknown>) => void
}

export const MentionSuggestion = forwardRef<
  { onKeyDown: (props: { event: KeyboardEvent }) => boolean },
  MentionSuggestionProps
>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    setSelectedIndex(0)
  }, [items])

  const selectItem = (index: number) => {
    const item = items[index]
    if (!item) return

    if (item.type === 'user') {
      command({
        id: item.data.id,
        label: item.data.full_name || item.data.username,
        entityType: 'user',
      })
    } else {
      command({
        id: item.data.id,
        label: item.data.name,
        entityType: 'agent',
      })
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

  return (
    <div className="max-h-60 overflow-y-auto py-1">
      {items.map((item, index) => (
        <button
          key={item.type === 'user' ? `u-${item.data.id}` : `a-${item.data.id}`}
          onClick={() => selectItem(index)}
          className={`flex items-center gap-2.5 w-full px-3 py-1.5 text-left text-sm transition-colors ${
            index === selectedIndex
              ? 'bg-[var(--accent-muted-bg)] text-[var(--accent-solid)]'
              : 'text-foreground hover:bg-[var(--surface)]'
          }`}
        >
          {item.type === 'user' ? (
            <>
              <span className="size-6 rounded-full bg-[var(--accent-muted-bg)] text-[var(--accent-solid)] flex items-center justify-center text-[10px] font-bold shrink-0">
                {(item.data.full_name || item.data.username).charAt(0).toUpperCase()}
              </span>
              <span className="truncate">
                {item.data.full_name || item.data.username}
              </span>
              {item.data.full_name && (
                <span className="text-xs text-[var(--text-tertiary)] ml-auto">
                  @{item.data.username}
                </span>
              )}
            </>
          ) : (
            <>
              <span
                className="size-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ backgroundColor: item.data.color }}
              >
                {item.data.name.charAt(0).toUpperCase()}
              </span>
              <span className="truncate">{item.data.name}</span>
              <span className="text-[10px] text-[var(--text-tertiary)] ml-auto uppercase tracking-wider">
                Agent
              </span>
            </>
          )}
        </button>
      ))}
    </div>
  )
})

MentionSuggestion.displayName = 'MentionSuggestion'
