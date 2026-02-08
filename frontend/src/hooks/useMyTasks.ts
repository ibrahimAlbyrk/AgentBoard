import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'

export function useMyTasks() {
  return useQuery({
    queryKey: ['my-tasks'],
    queryFn: () => api.getMyTasks(),
  })
}
