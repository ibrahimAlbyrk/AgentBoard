import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'

export function useComments(projectId: string, boardId: string, taskId: string) {
  return useQuery({
    queryKey: ['comments', projectId, boardId, taskId],
    queryFn: () => api.listComments(projectId, boardId, taskId),
    enabled: !!projectId && !!boardId && !!taskId,
  })
}

export function useCreateComment(projectId: string, boardId: string, taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (data: { content: any; attachment_ids?: string[] }) =>
      api.createComment(projectId, boardId, taskId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', projectId, boardId, taskId] })
      qc.invalidateQueries({ queryKey: ['activity', projectId, taskId] })
    },
  })
}
