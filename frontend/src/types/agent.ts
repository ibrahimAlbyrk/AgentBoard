export interface Agent {
  id: string
  name: string
  color: string
  is_active: boolean
  created_at: string
  updated_at: string | null
  deleted_at: string | null
}

export interface AgentBrief {
  id: string
  name: string
  color: string
}

export interface AgentCreate {
  name: string
  color: string
}

export interface AgentUpdate {
  name?: string
  color?: string
  is_active?: boolean
}

export interface AgentWithProjects extends Agent {
  projects: { id: string; name: string }[]
}
