import { create } from 'zustand'
import type { Task } from '@/types'

export type DueDatePreset = 'overdue' | 'today' | 'this_week' | 'next_week' | 'no_date'

export interface FilterState {
  search: string
  priorities: string[]
  assigneeUserIds: string[]
  assigneeAgentIds: string[]
  unassigned: boolean
  labelIds: string[]
  dueDatePresets: DueDatePreset[]
}

interface BoardState {
  tasksByStatus: Record<string, Task[]>
  filters: FilterState

  setTasksForStatus: (statusId: string, tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (taskId: string, data: Partial<Task>) => void
  moveTask: (
    taskId: string,
    fromStatusId: string,
    toStatusId: string,
    position: number,
  ) => void
  relocateTask: (taskId: string, newTask: Task) => void
  removeTask: (taskId: string) => void
  setFilters: (filters: Partial<FilterState>) => void
  clearFilters: () => void
  hasActiveFilters: () => boolean
  getFilteredTasks: (statusId: string) => Task[]
  clearBoard: () => void
}

const defaultFilters: FilterState = {
  search: '',
  priorities: [],
  assigneeUserIds: [],
  assigneeAgentIds: [],
  unassigned: false,
  labelIds: [],
  dueDatePresets: [],
}

export const useBoardStore = create<BoardState>((set, get) => ({
  tasksByStatus: {},
  filters: { ...defaultFilters },

  setTasksForStatus: (statusId, tasks) =>
    set((state) => ({
      tasksByStatus: {
        ...state.tasksByStatus,
        [statusId]: tasks.sort((a, b) => a.position - b.position),
      },
    })),

  addTask: (task) =>
    set((state) => {
      const statusId = task.status.id
      const current = state.tasksByStatus[statusId] ?? []
      return {
        tasksByStatus: {
          ...state.tasksByStatus,
          [statusId]: [...current, task].sort((a, b) => a.position - b.position),
        },
      }
    }),

  updateTask: (taskId, data) =>
    set((state) => {
      const updated: Record<string, Task[]> = {}
      for (const [statusId, tasks] of Object.entries(state.tasksByStatus)) {
        updated[statusId] = tasks.map((t) =>
          t.id === taskId ? { ...t, ...data } : t,
        )
      }
      return { tasksByStatus: updated }
    }),

  moveTask: (taskId, fromStatusId, toStatusId, position) => {
    const state = get()
    const fromTasks = [...(state.tasksByStatus[fromStatusId] ?? [])]
    const taskIndex = fromTasks.findIndex((t) => t.id === taskId)
    if (taskIndex === -1) return

    const [task] = fromTasks.splice(taskIndex, 1)
    const movedTask = { ...task, position, status: { ...task.status, id: toStatusId } }

    const toTasks =
      fromStatusId === toStatusId
        ? fromTasks
        : [...(state.tasksByStatus[toStatusId] ?? [])]
    toTasks.push(movedTask)
    toTasks.sort((a, b) => a.position - b.position)

    set({
      tasksByStatus: {
        ...state.tasksByStatus,
        [fromStatusId]: fromTasks,
        [toStatusId]: toTasks,
      },
    })
  },

  relocateTask: (taskId, newTask) =>
    set((state) => {
      const targetStatusId = newTask.status.id
      const updated: Record<string, Task[]> = {}
      for (const [statusId, tasks] of Object.entries(state.tasksByStatus)) {
        updated[statusId] = tasks.filter((t) => t.id !== taskId)
      }
      updated[targetStatusId] = [...(updated[targetStatusId] ?? []), newTask]
        .sort((a, b) => a.position - b.position)
      return { tasksByStatus: updated }
    }),

  removeTask: (taskId) =>
    set((state) => {
      const updated: Record<string, Task[]> = {}
      for (const [statusId, tasks] of Object.entries(state.tasksByStatus)) {
        updated[statusId] = tasks.filter((t) => t.id !== taskId)
      }
      return { tasksByStatus: updated }
    }),

  setFilters: (newFilters) =>
    set((state) => ({ filters: { ...state.filters, ...newFilters } })),

  clearFilters: () => set({ filters: { ...defaultFilters } }),

  hasActiveFilters: () => {
    const f = get().filters
    return !!(
      f.search ||
      f.priorities.length ||
      f.assigneeUserIds.length ||
      f.assigneeAgentIds.length ||
      f.unassigned ||
      f.labelIds.length ||
      f.dueDatePresets.length
    )
  },

  getFilteredTasks: (statusId) => {
    const state = get()
    const tasks = state.tasksByStatus[statusId] ?? []
    const f = state.filters
    return tasks.filter((t) => {
      // Text search
      if (f.search && !t.title.toLowerCase().includes(f.search.toLowerCase())) return false

      // Priority
      if (f.priorities.length && !f.priorities.includes(t.priority)) return false

      // Assignee (users + agents + unassigned) — OR among selections
      const hasAssigneeFilter = f.assigneeUserIds.length > 0 || f.assigneeAgentIds.length > 0 || f.unassigned
      if (hasAssigneeFilter) {
        const matchesUser = f.assigneeUserIds.length > 0 && t.assignees.some((a) => a.user && f.assigneeUserIds.includes(a.user.id))
        const matchesAgent = f.assigneeAgentIds.length > 0 && t.assignees.some((a) => a.agent && f.assigneeAgentIds.includes(a.agent.id))
        const matchesUnassigned = f.unassigned && t.assignees.length === 0
        if (!matchesUser && !matchesAgent && !matchesUnassigned) return false
      }

      // Labels — OR logic (task has ANY of the selected labels)
      if (f.labelIds.length && !t.labels.some((l) => f.labelIds.includes(l.id))) return false

      // Due date presets — OR logic among presets
      if (f.dueDatePresets.length) {
        const now = new Date()
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const endOfDay = new Date(startOfDay.getTime() + 86400000 - 1)
        const endOfWeek = new Date(startOfDay)
        endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()))
        const endOfNextWeek = new Date(endOfWeek.getTime() + 7 * 86400000)

        const matchesAny = f.dueDatePresets.some((preset) => {
          if (preset === 'no_date') return !t.due_date
          if (!t.due_date) return false
          const due = new Date(t.due_date)
          switch (preset) {
            case 'overdue': return due < startOfDay
            case 'today': return due >= startOfDay && due <= endOfDay
            case 'this_week': return due >= startOfDay && due <= endOfWeek
            case 'next_week': return due > endOfWeek && due <= endOfNextWeek
            default: return true
          }
        })
        if (!matchesAny) return false
      }

      return true
    })
  },

  clearBoard: () => set({ tasksByStatus: {}, filters: { ...defaultFilters } }),
}))
