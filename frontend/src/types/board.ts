import type { UserBrief } from './user'

export interface Board {
  id: string
  project_id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string | null
  position: number
  member_count: number
  task_count: number
  status_count: number
  created_at: string
  updated_at: string
}

export interface BoardDetail extends Board {
  statuses: import('./project').Status[]
  members: BoardMember[]
}

export interface BoardMember {
  id: string
  user: UserBrief
  role: string
  joined_at: string
}

export interface BoardCreate {
  name: string
  description?: string
  icon?: string
  color?: string
  create_default_statuses?: boolean
}

export interface BoardUpdate {
  name?: string
  description?: string
  icon?: string
  color?: string
}
