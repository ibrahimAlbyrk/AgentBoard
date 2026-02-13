import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useBoardStore } from '@/stores/boardStore'
import { clearLocalMove } from '@/hooks/useWebSocket'
import type { Task, TaskCreate, TaskUpdate, TaskMove, TaskFilters } from '@/types'

export function useTasks(projectId: string, boardId: string, filters?: TaskFilters) {
  return useQuery({
    queryKey: ['tasks', projectId, boardId, filters],
    queryFn: () => api.listTasks(projectId, boardId, filters),
    enabled: !!projectId && !!boardId,
  })
}

export function useCreateTask(projectId: string, boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TaskCreate) => api.createTask(projectId, boardId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId, boardId] })
      qc.invalidateQueries({ queryKey: ['activity', projectId] })
    },
  })
}

export function useUpdateTask(projectId: string, boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: TaskUpdate }) =>
      api.updateTask(projectId, boardId, taskId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId, boardId] })
      qc.invalidateQueries({ queryKey: ['task', projectId, boardId, variables.taskId] })
      qc.invalidateQueries({ queryKey: ['subtasks', projectId, boardId] })
      qc.invalidateQueries({ queryKey: ['activity', projectId] })
    },
  })
}

export function useDeleteTask(projectId: string, boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, mode }: { taskId: string; mode?: 'cascade' | 'orphan' }) =>
      api.deleteTask(projectId, boardId, taskId, mode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId, boardId] })
      qc.invalidateQueries({ queryKey: ['activity', projectId] })
    },
  })
}

export function useMoveTask(projectId: string, boardId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({
      taskId,
      data,
    }: {
      taskId: string
      fromStatusId: string
      data: TaskMove
      _prevSnapshot?: Record<string, Task[]>
    }) => api.moveTask(projectId, boardId, taskId, data),

    onMutate: async ({ _prevSnapshot }) => {
      await qc.cancelQueries({ queryKey: ['tasks', projectId, boardId] })
      return { prevBoard: _prevSnapshot }
    },

    onError: (_err, _vars, context) => {
      if (context?.prevBoard) {
        const store = useBoardStore.getState()
        for (const [statusId, tasks] of Object.entries(context.prevBoard)) {
          store.setTasksForStatus(statusId, tasks)
        }
      }
    },

    onSettled: (_data, _error, variables) => {
      clearLocalMove(variables.taskId)
      qc.invalidateQueries({ queryKey: ['tasks', projectId, boardId] })
      qc.invalidateQueries({ queryKey: ['activity', projectId] })
    },
  })
}
