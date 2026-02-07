import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useState, useEffect } from 'react'

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export function useSearch(query: string, types?: string[], projectId?: string) {
  const debouncedQuery = useDebouncedValue(query, 300)

  return useQuery({
    queryKey: ['search', debouncedQuery, types, projectId],
    queryFn: () => api.search(debouncedQuery, types, projectId),
    enabled: debouncedQuery.length >= 2,
  })
}
