import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'

export function useLabels(projectId: string) {
  return useQuery({
    queryKey: ['labels', projectId],
    queryFn: () => api.listLabels(projectId),
    enabled: !!projectId,
  })
}

export function useCreateLabel(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; color: string; description?: string }) =>
      api.createLabel(projectId, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['labels', projectId] }),
  })
}

export function useUpdateLabel(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      labelId,
      data,
    }: {
      labelId: string
      data: { name?: string; color?: string; description?: string }
    }) => api.updateLabel(projectId, labelId, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['labels', projectId] }),
  })
}
