import { create } from 'zustand'
import type { Task } from '@/types'

interface FilterState {
  search: string
  statuses: string[]
  priorities: string[]
  assignee: string | null
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
  getFilteredTasks: (statusId: string) => Task[]
  clearBoard: () => void
}

const defaultFilters: FilterState = { search: '', statuses: [], priorities: [], assignee: null }

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

  getFilteredTasks: (statusId) => {
    const state = get()
    const tasks = state.tasksByStatus[statusId] ?? []
    const f = state.filters
    return tasks.filter((t) => {
      if (f.search && !t.title.toLowerCase().includes(f.search.toLowerCase())) return false
      if (f.priorities.length && !f.priorities.includes(t.priority)) return false
      if (f.assignee && t.assignee?.id !== f.assignee) return false
      return true
    })
  },

  clearBoard: () => set({ tasksByStatus: {}, filters: { ...defaultFilters } }),
}))
