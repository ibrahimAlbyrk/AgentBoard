import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useBoardStore } from '@/stores/boardStore'
import type { TaskCreate, TaskUpdate, TaskMove, TaskFilters } from '@/types'

export function useTasks(projectId: string, filters?: TaskFilters) {
  return useQuery({
    queryKey: ['tasks', projectId, filters],
    queryFn: () => api.listTasks(projectId, filters),
    enabled: !!projectId,
  })
}

export function useCreateTask(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TaskCreate) => api.createTask(projectId, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
  })
}

export function useUpdateTask(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: TaskUpdate }) =>
      api.updateTask(projectId, taskId, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
  })
}

export function useDeleteTask(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (taskId: string) => api.deleteTask(projectId, taskId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
  })
}

export function useMoveTask(projectId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({
      taskId,
      data,
    }: {
      taskId: string
      fromStatusId: string
      data: TaskMove
    }) => api.moveTask(projectId, taskId, data),

    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['tasks', projectId] })
      // Store already updated optimistically in KanbanBoard.handleDragEnd
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

    onSettled: () =>
      qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
  })
}
