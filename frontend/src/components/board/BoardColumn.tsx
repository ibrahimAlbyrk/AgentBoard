import { Fragment } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, Filter } from 'lucide-react'
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
}

function DropPlaceholder({ height }: { height: number }) {
  return (
    <div
      className="rounded-xl border-2 border-dashed border-[var(--accent-solid)]/40 bg-[var(--accent-muted-bg)]/30 relative overflow-hidden transition-all duration-200"
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
        className="absolute inset-0 rounded-[10px]"
        style={{
          boxShadow: 'inset 0 0 16px -4px var(--accent-solid)',
          animation: 'glow-pulse 2s ease-in-out infinite',
          opacity: 0.3,
        }}
      />
    </div>
  )
}

export function BoardColumn({ status, tasks, onTaskClick, onAddTask, placeholderIdx = -1, placeholderHeight = 72, hideDragSourceId, compact }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${status.id}` })
  const filtersActive = useBoardStore((s) => s.hasActiveFilters())

  return (
    <div className="w-[300px] flex-shrink-0 flex flex-col">
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
        <button
          onClick={onAddTask}
          className="size-6 inline-flex items-center justify-center rounded-md text-[var(--text-tertiary)] hover:text-[var(--accent-solid)] hover:bg-[var(--accent-muted-bg)] transition-all duration-150"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={`rounded-xl p-2 space-y-2 min-h-[120px] transition-all duration-200 ${
          isOver
            ? 'border border-[var(--accent-solid)]/40 bg-[var(--accent-muted-bg)] shadow-[inset_0_0_20px_-8px_var(--glow)]'
            : 'bg-[var(--surface)]/40 border border-dashed border-[var(--border-subtle)]'
        }`}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task, idx) => (
            <Fragment key={task.id}>
              {idx === placeholderIdx && <DropPlaceholder height={placeholderHeight} />}
              <SortableTaskCard
                task={task}
                onClick={() => onTaskClick(task)}
                hideWhileDragging={task.id === hideDragSourceId}
                placeholderHeight={placeholderHeight}
                compact={compact}
              />
            </Fragment>
          ))}
          {placeholderIdx >= 0 && placeholderIdx >= tasks.length && <DropPlaceholder height={placeholderHeight} />}
        </SortableContext>

        {tasks.length === 0 && placeholderIdx < 0 && (
          <div className="flex flex-col items-center justify-center h-20 border border-dashed border-[var(--border-subtle)] rounded-lg text-[13px] text-[var(--text-tertiary)] gap-1">
            {filtersActive ? (
              <>
                <Filter className="size-3.5 opacity-50" />
                <span>No matching tasks</span>
              </>
            ) : (
              <span>No tasks</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
