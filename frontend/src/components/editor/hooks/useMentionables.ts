import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'

export function useMentionables(projectId: string) {
  return useQuery({
    queryKey: ['mentionables', projectId],
    queryFn: async () => {
      const res = await api.getMentionables(projectId)
      return res.data
    },
    staleTime: 60_000,
    enabled: !!projectId,
  })
}
