import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'

export function useStatuses(projectId: string) {
  return useQuery({
    queryKey: ['statuses', projectId],
    queryFn: () => api.listStatuses(projectId),
    enabled: !!projectId,
  })
}

export function useCreateStatus(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; color?: string }) =>
      api.createStatus(projectId, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['statuses', projectId] }),
  })
}

export function useReorderStatuses(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (statusIds: string[]) =>
      api.reorderStatuses(projectId, statusIds),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['statuses', projectId] }),
  })
}
