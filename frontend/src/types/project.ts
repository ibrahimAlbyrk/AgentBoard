import type { UserBrief } from './user'

export interface Project {
  id: string
  name: string
  description: string | null
  slug: string
  owner: UserBrief
  icon: string | null
  color: string | null
  is_archived: boolean
  member_count: number
  task_count: number
  created_at: string
  updated_at: string
}

export interface ProjectDetail extends Project {
  members: ProjectMember[]
  statuses: Status[]
  labels: Label[]
}

export interface ProjectMember {
  id: string
  user: UserBrief
  role: string
  joined_at: string
}

export interface ProjectCreate {
  name: string
  description?: string
  slug?: string
  icon?: string
  color?: string
  create_default_statuses?: boolean
}

export interface Status {
  id: string
  name: string
  slug: string
  color: string | null
  position: number
  is_default: boolean
  is_terminal: boolean
  task_count: number
  created_at: string
}

export interface Label {
  id: string
  name: string
  color: string
  description: string | null
  task_count: number
  created_at: string
}
