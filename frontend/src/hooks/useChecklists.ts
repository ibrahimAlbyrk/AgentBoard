import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { ChecklistItemCreate, ChecklistItemUpdate } from '@/types'

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
    },
  })
}

export function useToggleChecklistItem(projectId: string, boardId: string, taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ checklistId, itemId }: { checklistId: string; itemId: string }) =>
      api.toggleChecklistItem(projectId, boardId, taskId, checklistId, itemId),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: checklistKey(projectId, boardId, taskId) })
      qc.invalidateQueries({ queryKey: ['tasks', projectId, boardId] })
    },
  })
}

export function useReorderChecklistItem(projectId: string, boardId: string, taskId: string) {
  const qc = useQueryClient()
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: checklistKey(projectId, boardId, taskId) })
    },
  })
}
