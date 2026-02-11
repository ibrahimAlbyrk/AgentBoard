import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'

export function useReferenceables(projectId: string, query: string) {
  return useQuery({
    queryKey: ['referenceables', projectId, query],
    queryFn: async () => {
      const res = await api.getReferenceables(projectId, query)
      return res.data
    },
    staleTime: 30_000,
    enabled: !!projectId,
  })
}
