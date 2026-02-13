import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { TaskCreate } from '@/types'

const subtaskKey = (projectId: string, boardId: string, parentId: string) =>
  ['subtasks', projectId, boardId, parentId] as const

export function useSubtasks(projectId: string, boardId: string, parentId: string) {
  return useQuery({
    queryKey: subtaskKey(projectId, boardId, parentId),
    queryFn: () => api.listSubtasks(projectId, boardId, parentId),
    enabled: !!projectId && !!boardId && !!parentId,
  })
}

export function useCreateSubtask(projectId: string, boardId: string, parentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TaskCreate) => api.createSubtask(projectId, boardId, parentId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: subtaskKey(projectId, boardId, parentId) })
      qc.invalidateQueries({ queryKey: ['tasks', projectId, boardId] })
      qc.invalidateQueries({ queryKey: ['activity', projectId] })
    },
  })
}

export function useReorderSubtask(projectId: string, boardId: string, parentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ subtaskId, position }: { subtaskId: string; position: number }) =>
      api.reorderSubtask(projectId, boardId, parentId, subtaskId, position),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: subtaskKey(projectId, boardId, parentId) })
    },
  })
}

export function useConvertToSubtask(projectId: string, boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ parentId, taskId }: { parentId: string; taskId: string }) =>
      api.convertToSubtask(projectId, boardId, parentId, taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId, boardId] })
      qc.invalidateQueries({ queryKey: ['subtasks', projectId, boardId] })
      qc.invalidateQueries({ queryKey: ['activity', projectId] })
    },
  })
}

export function usePromoteSubtask(projectId: string, boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (taskId: string) => api.promoteSubtask(projectId, boardId, taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId, boardId] })
      qc.invalidateQueries({ queryKey: ['subtasks', projectId, boardId] })
      qc.invalidateQueries({ queryKey: ['activity', projectId] })
    },
  })
}
