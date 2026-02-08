import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'

export function useAttachments(projectId: string, boardId: string, taskId: string) {
  return useQuery({
    queryKey: ['attachments', projectId, boardId, taskId],
    queryFn: () => api.listAttachments(projectId, boardId, taskId),
    enabled: !!projectId && !!boardId && !!taskId,
  })
}

export function useUploadAttachment(projectId: string, boardId: string, taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => api.uploadAttachment(projectId, boardId, taskId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attachments', projectId, boardId, taskId] })
      qc.invalidateQueries({ queryKey: ['tasks', projectId, boardId] })
    },
  })
}

export function useDeleteAttachment(projectId: string, boardId: string, taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (attachmentId: string) =>
      api.deleteAttachment(projectId, boardId, taskId, attachmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attachments', projectId, boardId, taskId] })
      qc.invalidateQueries({ queryKey: ['tasks', projectId, boardId] })
    },
  })
}
