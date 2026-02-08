import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'

export function useStatuses(projectId: string, boardId: string) {
  return useQuery({
    queryKey: ['statuses', projectId, boardId],
    queryFn: () => api.listStatuses(projectId, boardId),
    enabled: !!projectId && !!boardId,
  })
}

export function useCreateStatus(projectId: string, boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; color?: string }) =>
      api.createStatus(projectId, boardId, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['statuses', projectId, boardId] }),
  })
}

export function useReorderStatuses(projectId: string, boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (statusIds: string[]) =>
      api.reorderStatuses(projectId, boardId, statusIds),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['statuses', projectId, boardId] }),
  })
}
