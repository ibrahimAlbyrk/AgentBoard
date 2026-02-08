import { Fragment } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { SortableTaskCard } from './SortableTaskCard'
import type { Status, Task } from '@/types'

interface BoardColumnProps {
  status: Status
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onAddTask: () => void
  placeholderIdx?: number
  hideDragSourceId?: string
}

const dropPlaceholder = (
  <div className="h-[72px] rounded-xl border-2 border-dashed border-[var(--accent-solid)]/30 bg-[var(--accent-muted-bg)]/50" />
)

export function BoardColumn({ status, tasks, onTaskClick, onAddTask, placeholderIdx = -1, hideDragSourceId }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${status.id}` })

  return (
    <div className="w-[300px] flex-shrink-0 flex flex-col max-h-full">
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
        className={`flex-1 overflow-y-auto rounded-xl p-2 space-y-2 min-h-[120px] transition-all duration-200 ${
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
              {idx === placeholderIdx && dropPlaceholder}
              <SortableTaskCard
                task={task}
                onClick={() => onTaskClick(task)}
                hideWhileDragging={task.id === hideDragSourceId}
              />
            </Fragment>
          ))}
          {placeholderIdx >= 0 && placeholderIdx >= tasks.length && dropPlaceholder}
        </SortableContext>

        {tasks.length === 0 && placeholderIdx < 0 && (
          <div className="flex items-center justify-center h-20 border border-dashed border-[var(--border-subtle)] rounded-lg text-[13px] text-[var(--text-tertiary)]">
            No tasks
          </div>
        )}
      </div>
    </div>
  )
}
