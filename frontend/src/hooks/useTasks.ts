import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useBoardStore } from '@/stores/boardStore'
import type { TaskCreate, TaskUpdate, TaskMove, TaskFilters } from '@/types'

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId, boardId] })
      qc.invalidateQueries({ queryKey: ['activity', projectId] })
    },
  })
}

export function useDeleteTask(projectId: string, boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (taskId: string) => api.deleteTask(projectId, boardId, taskId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['tasks', projectId, boardId] }),
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
    }) => api.moveTask(projectId, boardId, taskId, data),

    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['tasks', projectId, boardId] })
      const prevBoard = { ...useBoardStore.getState().tasksByStatus }
      return { prevBoard }
    },

    onError: (_err, _vars, context) => {
      if (context?.prevBoard) {
        const store = useBoardStore.getState()
        for (const [statusId, tasks] of Object.entries(context.prevBoard)) {
          store.setTasksForStatus(statusId, tasks)
        }
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId, boardId] })
      qc.invalidateQueries({ queryKey: ['activity', projectId] })
    },
  })
}
