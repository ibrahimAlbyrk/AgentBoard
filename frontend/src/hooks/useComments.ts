import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'

export function useComments(projectId: string, taskId: string) {
  return useQuery({
    queryKey: ['comments', projectId, taskId],
    queryFn: () => api.listComments(projectId, taskId),
    enabled: !!projectId && !!taskId,
  })
}

export function useCreateComment(projectId: string, taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (content: string) =>
      api.createComment(projectId, taskId, { content }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['comments', projectId, taskId] }),
  })
}
