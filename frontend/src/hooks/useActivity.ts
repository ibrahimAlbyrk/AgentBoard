import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'

export function useTaskActivity(projectId: string, taskId: string) {
  return useQuery({
    queryKey: ['activity', projectId, taskId],
    queryFn: () => api.listTaskActivity(projectId, taskId),
    enabled: !!projectId && !!taskId,
  })
}
