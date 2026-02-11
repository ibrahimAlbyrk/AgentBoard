import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import emojiData from '@/data/emojis.json'

const QUICK_REACTIONS = [
  { emoji: '\u{1F44D}', label: 'Thumbs Up' },
  { emoji: '\u{1F44E}', label: 'Thumbs Down' },
  { emoji: '\u{2764}\u{FE0F}', label: 'Heart' },
  { emoji: '\u{1F389}', label: 'Celebration' },
  { emoji: '\u{1F680}', label: 'Rocket' },
  { emoji: '\u{1F440}', label: 'Eyes' },
  { emoji: '\u{1F525}', label: 'Fire' },
  { emoji: '\u{1F615}', label: 'Confused' },
] as const

const STORAGE_KEY = 'agentboard-recent-emojis'
const MAX_RECENT = 16

function getRecent(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function addRecent(emoji: string) {
  const prev = getRecent().filter((e) => e !== emoji)
  const next = [emoji, ...prev].slice(0, MAX_RECENT)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
}

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(0)
  const [recent] = useState(getRecent)
  const gridRef = useRef<HTMLDivElement>(null)
  const categoryRefs = useRef<(HTMLDivElement | null)[]>([])
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Auto-focus search on mount
    searchRef.current?.focus()
  }, [])

  const handleSelect = useCallback((emoji: string) => {
    addRecent(emoji)
    onSelect(emoji)
  }, [onSelect])

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return emojiData.categories
    const q = search.toLowerCase()
    return emojiData.categories
      .map((cat) => ({
        ...cat,
        emojis: cat.emojis.filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.keywords.some((k) => k.toLowerCase().includes(q)),
        ),
      }))
      .filter((cat) => cat.emojis.length > 0)
  }, [search])

  const scrollToCategory = (idx: number) => {
    setActiveCategory(idx)
    categoryRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="w-80 select-none">
      {/* Quick reactions */}
      <div className="flex items-center gap-1 px-3 pt-3 pb-2">
        {QUICK_REACTIONS.map((r) => (
          <button
            key={r.emoji}
            onClick={() => handleSelect(r.emoji)}
            title={r.label}
            className="size-8 rounded-lg flex items-center justify-center text-lg hover:bg-[var(--surface)] active:scale-90 transition-all duration-150"
          >
            {r.emoji}
          </button>
        ))}
      </div>

      <div className="border-b border-[var(--border-subtle)]" />

      {/* Search */}
      <div className="px-3 py-2">
        <input
          ref={searchRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emojis..."
          className="w-full h-7 px-2.5 text-xs bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-[var(--border-strong)] transition-colors placeholder:text-[var(--text-tertiary)]"
        />
      </div>

      {/* Category tabs */}
      {!search && (
        <div className="flex items-center gap-0.5 px-3 pb-1">
          {emojiData.categories.map((cat, idx) => (
            <button
              key={cat.name}
              onClick={() => scrollToCategory(idx)}
              title={cat.name}
              className={`size-6 rounded-md flex items-center justify-center text-sm transition-all duration-150 ${
                activeCategory === idx
                  ? 'bg-[var(--accent-muted-bg)] scale-105'
                  : 'hover:bg-[var(--surface)] opacity-60 hover:opacity-100'
              }`}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div ref={gridRef} className="max-h-[240px] overflow-y-auto px-3 pb-2">
        {/* Recent */}
        {!search && recent.length > 0 && (
          <div className="mb-2">
            <div className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
              Recently Used
            </div>
            <div className="grid grid-cols-8 gap-0.5">
              {recent.map((emoji) => (
                <button
                  key={`recent-${emoji}`}
                  onClick={() => handleSelect(emoji)}
                  className="size-8 rounded-lg flex items-center justify-center text-lg hover:bg-[var(--surface)] active:scale-90 transition-all duration-150"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Categories */}
        {filteredCategories.map((cat, idx) => (
          <div
            key={cat.name}
            ref={(el) => { categoryRefs.current[idx] = el }}
            className="mb-2"
          >
            <div className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1 sticky top-0 bg-[var(--elevated)] z-10 py-0.5">
              {cat.name}
            </div>
            <div className="grid grid-cols-8 gap-0.5">
              {cat.emojis.map((e) => (
                <button
                  key={e.emoji}
                  onClick={() => handleSelect(e.emoji)}
                  title={e.name}
                  className="size-8 rounded-lg flex items-center justify-center text-lg hover:bg-[var(--surface)] active:scale-90 transition-all duration-150"
                >
                  {e.emoji}
                </button>
              ))}
            </div>
          </div>
        ))}

        {filteredCategories.length === 0 && (
          <div className="py-6 text-center text-xs text-[var(--text-tertiary)]">
            No emojis found
          </div>
        )}
      </div>
    </div>
  )
}
