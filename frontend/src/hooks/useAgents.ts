import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { AgentCreate, AgentUpdate } from '@/types'

export function useAgents(projectId: string, includeInactive = true) {
  return useQuery({
    queryKey: ['agents', projectId, includeInactive],
    queryFn: () => api.listAgents(projectId, includeInactive),
    enabled: !!projectId,
  })
}

export function useMyAgents(includeDeleted = false) {
  return useQuery({
    queryKey: ['agents', 'mine', includeDeleted],
    queryFn: () => api.listMyAgents(includeDeleted),
  })
}

export function useCreateAgent(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AgentCreate) => api.createAgent(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents', projectId] })
      qc.invalidateQueries({ queryKey: ['project', projectId] })
    },
  })
}

export function useUpdateAgent(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ agentId, data }: { agentId: string; data: AgentUpdate }) =>
      api.updateAgent(projectId, agentId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents', projectId] })
      qc.invalidateQueries({ queryKey: ['project', projectId] })
    },
  })
}

export function useDeleteAgent(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (agentId: string) => api.deleteAgent(projectId, agentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents', projectId] })
      qc.invalidateQueries({ queryKey: ['project', projectId] })
    },
  })
}

export function useLinkAgent(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (agentId: string) => api.linkAgentToProject(projectId, agentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents', projectId] })
      qc.invalidateQueries({ queryKey: ['agents', 'mine'] })
      qc.invalidateQueries({ queryKey: ['project', projectId] })
    },
  })
}
