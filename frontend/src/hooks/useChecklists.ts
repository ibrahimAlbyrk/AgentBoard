import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { Checklist, ChecklistItemCreate, ChecklistItemUpdate } from '@/types'
import type { APIResponse } from '@/types/api'

const checklistKey = (projectId: string, boardId: string, taskId: string) =>
  ['checklists', projectId, boardId, taskId] as const

export function useChecklists(projectId: string, boardId: string, taskId: string) {
  return useQuery({
    queryKey: checklistKey(projectId, boardId, taskId),
    queryFn: () => api.listChecklists(projectId, boardId, taskId),
    enabled: !!projectId && !!boardId && !!taskId,
  })
}

export function useCreateChecklist(projectId: string, boardId: string, taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string }) =>
      api.createChecklist(projectId, boardId, taskId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: checklistKey(projectId, boardId, taskId) })
      qc.invalidateQueries({ queryKey: ['tasks', projectId, boardId] })
      qc.invalidateQueries({ queryKey: ['activity', projectId, taskId] })
    },
  })
}

export function useUpdateChecklist(projectId: string, boardId: string, taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ checklistId, data }: { checklistId: string; data: { title?: string } }) =>
      api.updateChecklist(projectId, boardId, taskId, checklistId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: checklistKey(projectId, boardId, taskId) })
      qc.invalidateQueries({ queryKey: ['activity', projectId, taskId] })
    },
  })
}

export function useDeleteChecklist(projectId: string, boardId: string, taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (checklistId: string) =>
      api.deleteChecklist(projectId, boardId, taskId, checklistId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: checklistKey(projectId, boardId, taskId) })
      qc.invalidateQueries({ queryKey: ['tasks', projectId, boardId] })
      qc.invalidateQueries({ queryKey: ['activity', projectId, taskId] })
    },
  })
}

export function useCreateChecklistItem(projectId: string, boardId: string, taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ checklistId, data }: { checklistId: string; data: ChecklistItemCreate }) =>
      api.createChecklistItem(projectId, boardId, taskId, checklistId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: checklistKey(projectId, boardId, taskId) })
      qc.invalidateQueries({ queryKey: ['tasks', projectId, boardId] })
      qc.invalidateQueries({ queryKey: ['activity', projectId, taskId] })
    },
  })
}

export function useUpdateChecklistItem(projectId: string, boardId: string, taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      checklistId,
      itemId,
      data,
    }: {
      checklistId: string
      itemId: string
      data: ChecklistItemUpdate
    }) => api.updateChecklistItem(projectId, boardId, taskId, checklistId, itemId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: checklistKey(projectId, boardId, taskId) })
      qc.invalidateQueries({ queryKey: ['tasks', projectId, boardId] })
      qc.invalidateQueries({ queryKey: ['activity', projectId, taskId] })
    },
  })
}

export function useDeleteChecklistItem(projectId: string, boardId: string, taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ checklistId, itemId }: { checklistId: string; itemId: string }) =>
      api.deleteChecklistItem(projectId, boardId, taskId, checklistId, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: checklistKey(projectId, boardId, taskId) })
      qc.invalidateQueries({ queryKey: ['tasks', projectId, boardId] })
      qc.invalidateQueries({ queryKey: ['activity', projectId, taskId] })
    },
  })
}

export function useToggleChecklistItem(projectId: string, boardId: string, taskId: string) {
  const qc = useQueryClient()
  const key = checklistKey(projectId, boardId, taskId)
  return useMutation({
    mutationFn: ({ checklistId, itemId }: { checklistId: string; itemId: string }) =>
      api.toggleChecklistItem(projectId, boardId, taskId, checklistId, itemId),
    onMutate: async ({ checklistId, itemId }) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<APIResponse<Checklist[]>>(key)
      if (prev) {
        qc.setQueryData<APIResponse<Checklist[]>>(key, {
          ...prev,
          data: prev.data.map((cl) =>
            cl.id === checklistId
              ? {
                  ...cl,
                  items: cl.items.map((it) =>
                    it.id === itemId ? { ...it, is_completed: !it.is_completed } : it
                  ),
                }
              : cl
          ),
        })
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key })
      qc.invalidateQueries({ queryKey: ['tasks', projectId, boardId] })
      qc.invalidateQueries({ queryKey: ['activity', projectId, taskId] })
    },
  })
}

export function useReorderChecklistItem(projectId: string, boardId: string, taskId: string) {
  const qc = useQueryClient()
  const key = checklistKey(projectId, boardId, taskId)
  return useMutation({
    mutationFn: ({
      checklistId,
      itemId,
      position,
    }: {
      checklistId: string
      itemId: string
      position: number
    }) => api.reorderChecklistItem(projectId, boardId, taskId, checklistId, itemId, position),
    onMutate: async ({ checklistId, itemId, position }) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<APIResponse<Checklist[]>>(key)
      if (prev) {
        qc.setQueryData<APIResponse<Checklist[]>>(key, {
          ...prev,
          data: prev.data.map((cl) => {
            if (cl.id !== checklistId) return cl
            return {
              ...cl,
              items: cl.items
                .map((it) => it.id === itemId ? { ...it, position } : it)
                .sort((a, b) => a.position - b.position),
            }
          }),
        })
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key })
    },
  })
}
