import { useState, useCallback, useRef, useMemo, memo, Fragment } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, Filter, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { SortableTaskCard } from './SortableTaskCard'
import { useBoardStore } from '@/stores/boardStore'
import type { Status, Task } from '@/types'

interface BoardColumnProps {
  status: Status
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onAddTask: () => void
  placeholderIdx?: number
  placeholderHeight?: number
  hideDragSourceId?: string
  compact?: boolean
  isTaskExpanded?: (taskId: string) => boolean
  onToggleExpand?: (taskId: string) => void
  renderExpandedContent?: (task: Task) => React.ReactNode
}

function DropPlaceholder({ height }: { height: number }) {
  return (
    <div
      className="rounded-xl border-2 border-dashed border-[var(--accent-solid)]/70 bg-[var(--accent-muted-bg)]/50 relative overflow-hidden transition-all duration-200"
      style={{ height }}
    >
      {/* Animated shimmer */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, var(--accent-solid) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s ease-in-out infinite',
          opacity: 0.06,
        }}
      />
      {/* Pulsing inner glow */}
      <div
        className="absolute inset-0 rounded-lg"
        style={{
          boxShadow: 'inset 0 0 16px -4px var(--accent-solid)',
          animation: 'glow-pulse 2s ease-in-out infinite',
          opacity: 0.3,
        }}
      />
    </div>
  )
}

export const BoardColumn = memo(function BoardColumn({ status, tasks, onTaskClick, onAddTask, placeholderIdx = -1, placeholderHeight = 72, hideDragSourceId, compact, isTaskExpanded, onToggleExpand, renderExpandedContent }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${status.id}` })
  const filtersActive = useBoardStore((s) => s.hasActiveFilters())
  const [isCollapsed, setIsCollapsed] = useState(false)
  const columnRef = useRef<HTMLDivElement>(null)
  const itemIds = useMemo(() => tasks.map((t) => t.id), [tasks])

  const handleColumnKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const container = columnRef.current
    if (!container) return

    const focusable = Array.from(container.querySelectorAll<HTMLElement>('[role="button"][tabindex="0"]'))
    if (focusable.length === 0) return

    const currentIdx = focusable.indexOf(document.activeElement as HTMLElement)
    if (currentIdx === -1) return

    e.preventDefault()
    const nextIdx = e.key === 'ArrowDown'
      ? Math.min(currentIdx + 1, focusable.length - 1)
      : Math.max(currentIdx - 1, 0)
    focusable[nextIdx]?.focus()
  }, [])

  if (isCollapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              onClick={() => setIsCollapsed(false)}
              className="w-12 flex-shrink-0 bg-[var(--surface)]/60 rounded-xl border border-[var(--border-subtle)] flex flex-col items-center py-3 cursor-pointer hover:bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all duration-300 min-h-[120px]"
            >
              <ChevronsRight className="size-3.5 text-[var(--text-tertiary)] mb-2 flex-shrink-0" />
              <span className="text-xs font-medium text-[var(--text-secondary)] [writing-mode:vertical-lr] rotate-180">
                {status.name}
              </span>
              <span className="mt-2 text-xs text-[var(--text-tertiary)] bg-[var(--overlay)] rounded-full size-5 flex items-center justify-center">
                {tasks.length}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            {status.name} — {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className="min-w-[280px] flex-1 max-w-[360px] flex-shrink-0 flex flex-col transition-all duration-300">
      <div className="flex items-center justify-between px-1 py-2 mb-2">
        <div className="flex items-center gap-2">
          <span
            className="size-2.5 rounded-full flex-shrink-0 ring-2 ring-background"
            style={{ backgroundColor: status.color || 'var(--text-tertiary)' }}
          />
          <span className="text-[13px] font-semibold text-foreground">{status.name}</span>
          <span className="bg-[var(--overlay)] text-[var(--text-tertiary)] text-[11px] px-1.5 py-0.5 rounded-md font-medium tabular-nums">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setIsCollapsed(true)}
            className="size-7 inline-flex items-center justify-center rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--overlay)] transition-all duration-150"
            title="Collapse column"
          >
            <ChevronsLeft className="size-3.5" />
          </button>
          <button
            onClick={onAddTask}
            className="size-7 inline-flex items-center justify-center rounded-md text-[var(--text-tertiary)] hover:text-[var(--accent-solid)] hover:bg-[var(--accent-muted-bg)] transition-all duration-150"
            title="Add task"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={(el) => { setNodeRef(el); (columnRef as React.MutableRefObject<HTMLDivElement | null>).current = el }}
        onKeyDown={handleColumnKeyDown}
        role="listbox"
        aria-label={`${status.name} tasks`}
        className={`rounded-xl p-2 flex flex-col gap-2 min-h-[120px] transition-all duration-200 ${
          isOver
            ? 'border border-[var(--accent-solid)]/40 bg-[var(--accent-muted-bg)] shadow-[inset_0_0_20px_-8px_var(--glow)]'
            : 'bg-[var(--surface)]/60 border border-dashed border-[var(--border-subtle)]'
        }`}
      >
        <SortableContext
          items={itemIds}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task, index) => (
            <Fragment key={task.id}>
              {placeholderIdx === index && (
                <DropPlaceholder height={placeholderHeight} />
              )}
              <SortableTaskCard
                task={task}
                onClick={() => onTaskClick(task)}
                hideWhileDragging={task.id === hideDragSourceId}
                placeholderHeight={placeholderHeight}
                compact={compact}
                isExpanded={isTaskExpanded?.(task.id)}
                onToggleExpand={task.children_count > 0 ? () => onToggleExpand?.(task.id) : undefined}
                expandedContent={isTaskExpanded?.(task.id) ? renderExpandedContent?.(task) : undefined}
              />
            </Fragment>
          ))}
          {placeholderIdx >= 0 && placeholderIdx >= tasks.length && (
            <DropPlaceholder height={placeholderHeight} />
          )}
        </SortableContext>

        {tasks.length === 0 && placeholderIdx < 0 && (
          <div className="flex flex-col items-center justify-center h-20 border border-dashed border-[var(--border-subtle)] rounded-lg text-[13px] text-[var(--text-tertiary)] gap-1.5">
            {filtersActive ? (
              <>
                <Filter className="size-3.5 opacity-50" />
                <span>No matching tasks</span>
              </>
            ) : (
              <>
                <span>Drop tasks here or click + to create</span>
                <button
                  onClick={onAddTask}
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--accent-solid)] hover:text-[var(--accent-solid-hover)] transition-colors"
                >
                  <Plus className="size-3" />
                  Add task
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
})
