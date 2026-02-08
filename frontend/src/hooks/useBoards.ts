import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { BoardCreate, BoardUpdate } from '@/types'

export function useBoards(projectId: string) {
  return useQuery({
    queryKey: ['boards', projectId],
    queryFn: () => api.listBoards(projectId),
    enabled: !!projectId,
  })
}

export function useBoard(projectId: string, boardId: string) {
  return useQuery({
    queryKey: ['boards', projectId, boardId],
    queryFn: () => api.getBoard(projectId, boardId),
    enabled: !!projectId && !!boardId,
  })
}

export function useCreateBoard(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: BoardCreate) => api.createBoard(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boards', projectId] })
      qc.invalidateQueries({ queryKey: ['projects', projectId] })
    },
  })
}

export function useUpdateBoard(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ boardId, data }: { boardId: string; data: BoardUpdate }) =>
      api.updateBoard(projectId, boardId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boards', projectId] })
      qc.invalidateQueries({ queryKey: ['projects', projectId] })
    },
  })
}

export function useDeleteBoard(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (boardId: string) => api.deleteBoard(projectId, boardId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boards', projectId] })
      qc.invalidateQueries({ queryKey: ['projects', projectId] })
    },
  })
}
