import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { ReactionSummary } from '@/types'

export function useTaskReactions(projectId: string, boardId: string, taskId: string) {
  return useQuery({
    queryKey: ['reactions', 'task', taskId],
    queryFn: () => api.getTaskReactions(projectId, boardId, taskId),
    enabled: !!projectId && !!boardId && !!taskId,
  })
}

export function useCommentReactions(
  projectId: string, boardId: string, taskId: string, commentId: string,
) {
  return useQuery({
    queryKey: ['reactions', 'comment', commentId],
    queryFn: () => api.getCommentReactions(projectId, boardId, taskId, commentId),
    enabled: !!commentId,
  })
}

function optimisticToggle(
  prev: { data: ReactionSummary } | undefined,
  emoji: string,
): { data: ReactionSummary } | undefined {
  if (!prev?.data) return prev
  const groups = [...prev.data.groups]
  const idx = groups.findIndex((g) => g.emoji === emoji)
  if (idx >= 0) {
    const g = { ...groups[idx] }
    if (g.reacted_by_me) {
      g.count -= 1
      g.reacted_by_me = false
      if (g.count <= 0) {
        groups.splice(idx, 1)
      } else {
        groups[idx] = g
      }
    } else {
      g.count += 1
      g.reacted_by_me = true
      groups[idx] = g
    }
  } else {
    groups.push({ emoji, count: 1, reacted_by_me: true, reactors: [] })
  }
  return {
    ...prev,
    data: {
      groups,
      total: groups.reduce((s, g) => s + g.count, 0),
    },
  }
}

export function useToggleTaskReaction(projectId: string, boardId: string, taskId: string) {
  const qc = useQueryClient()
  const queryKey = ['reactions', 'task', taskId]

  return useMutation({
    mutationFn: (emoji: string) =>
      api.toggleTaskReaction(projectId, boardId, taskId, { emoji }),

    onMutate: async (emoji: string) => {
      await qc.cancelQueries({ queryKey })
      const prev = qc.getQueryData<{ data: ReactionSummary }>(queryKey)
      qc.setQueryData(queryKey, optimisticToggle(prev, emoji))
      return { prev }
    },

    onError: (_err, _emoji, context) => {
      if (context?.prev) qc.setQueryData(queryKey, context.prev)
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey })
      qc.invalidateQueries({ queryKey: ['tasks', projectId, boardId] })
    },
  })
}

export function useToggleCommentReaction(
  projectId: string, boardId: string, taskId: string, commentId: string,
) {
  const qc = useQueryClient()
  const queryKey = ['reactions', 'comment', commentId]

  return useMutation({
    mutationFn: (emoji: string) =>
      api.toggleCommentReaction(projectId, boardId, taskId, commentId, { emoji }),

    onMutate: async (emoji: string) => {
      await qc.cancelQueries({ queryKey })
      const prev = qc.getQueryData<{ data: ReactionSummary }>(queryKey)
      qc.setQueryData(queryKey, optimisticToggle(prev, emoji))
      return { prev }
    },

    onError: (_err, _emoji, context) => {
      if (context?.prev) qc.setQueryData(queryKey, context.prev)
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey })
      qc.invalidateQueries({ queryKey: ['comments', projectId, boardId, taskId] })
    },
  })
}
