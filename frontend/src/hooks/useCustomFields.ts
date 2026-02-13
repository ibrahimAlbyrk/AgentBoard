import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type {
  CustomFieldDefinitionCreate,
  CustomFieldDefinitionUpdate,
  CustomFieldValueSet,
} from '@/types'

// ── Definitions ──

export function useCustomFieldDefinitions(projectId: string, boardId: string) {
  return useQuery({
    queryKey: ['custom-fields', projectId, boardId],
    queryFn: () => api.listCustomFields(projectId, boardId),
    enabled: !!projectId && !!boardId,
  })
}

export function useCreateCustomField(projectId: string, boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CustomFieldDefinitionCreate) =>
      api.createCustomField(projectId, boardId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-fields', projectId, boardId] })
    },
  })
}

export function useUpdateCustomField(projectId: string, boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ fieldId, data }: { fieldId: string; data: CustomFieldDefinitionUpdate }) =>
      api.updateCustomField(projectId, boardId, fieldId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-fields', projectId, boardId] })
    },
  })
}

export function useDeleteCustomField(projectId: string, boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fieldId: string) =>
      api.deleteCustomField(projectId, boardId, fieldId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-fields', projectId, boardId] })
      qc.invalidateQueries({ queryKey: ['tasks', projectId, boardId] })
    },
  })
}

export function useReorderCustomFields(projectId: string, boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fieldIds: string[]) =>
      api.reorderCustomFields(projectId, boardId, fieldIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-fields', projectId, boardId] })
    },
  })
}

// ── Values ──

export function useSetFieldValue(projectId: string, boardId: string, taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CustomFieldValueSet) =>
      api.setFieldValue(projectId, boardId, taskId, data.field_definition_id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId, boardId] })
      qc.invalidateQueries({ queryKey: ['activity', projectId, taskId] })
    },
  })
}

export function useBulkSetFieldValues(projectId: string, boardId: string, taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (values: CustomFieldValueSet[]) =>
      api.bulkSetFieldValues(projectId, boardId, taskId, values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId, boardId] })
      qc.invalidateQueries({ queryKey: ['activity', projectId, taskId] })
    },
  })
}

export function useClearFieldValue(projectId: string, boardId: string, taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fieldId: string) =>
      api.clearFieldValue(projectId, boardId, taskId, fieldId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId, boardId] })
      qc.invalidateQueries({ queryKey: ['activity', projectId, taskId] })
    },
  })
}
