import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { usePanelLayer } from '@/contexts/PanelStackContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useBoardStore } from '@/stores/boardStore'
import type { Task } from '@/types'

interface TaskPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (task: Task) => void
  excludeTaskIds: string[]
  title?: string
}

export function TaskPickerDialog({
  open,
  onOpenChange,
  onSelect,
  excludeTaskIds,
  title = 'Select Parent Task',
}: TaskPickerDialogProps) {
  usePanelLayer('task-picker', open)
  const [search, setSearch] = useState('')
  const { tasksByStatus } = useBoardStore()

  const allTasks = useMemo(() => {
    const tasks: Task[] = []
    for (const statusTasks of Object.values(tasksByStatus)) {
      tasks.push(...statusTasks)
    }
    return tasks.filter((t) => !excludeTaskIds.includes(t.id))
  }, [tasksByStatus, excludeTaskIds])

  const filtered = useMemo(() => {
    if (!search.trim()) return allTasks
    const q = search.toLowerCase()
    return allTasks.filter((t) => t.title.toLowerCase().includes(q))
  }, [allTasks, search])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--text-tertiary)]" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-[300px] overflow-y-auto space-y-0.5 mt-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-[var(--text-tertiary)] text-center py-4">
              No tasks found
            </p>
          ) : (
            filtered.map((task) => (
              <button
                key={task.id}
                onClick={() => {
                  onSelect(task)
                  onOpenChange(false)
                  setSearch('')
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-[var(--overlay)] transition-colors"
              >
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: task.status.color ?? 'var(--text-tertiary)' }}
                />
                <span className="text-sm truncate flex-1">{task.title}</span>
                <span className="text-[10px] text-[var(--text-tertiary)] shrink-0">
                  {task.status.name}
                </span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
