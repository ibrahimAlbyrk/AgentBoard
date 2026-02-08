import type { Status, Label } from './project'
import type { UserBrief } from './user'

export type Priority = 'none' | 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id: string
  project_id: string
  board_id: string
  title: string
  description: string | null
  status: Status
  priority: Priority
  assignee: UserBrief | null
  creator: UserBrief
  labels: Label[]
  due_date: string | null
  position: number
  parent_id: string | null
  comments_count: number
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface TaskCreate {
  title: string
  description?: string
  status_id?: string
  priority?: Priority
  assignee_id?: string
  label_ids?: string[]
  due_date?: string
  parent_id?: string
}

export interface TaskUpdate {
  title?: string
  description?: string
  status_id?: string
  priority?: Priority
  assignee_id?: string
  label_ids?: string[]
  due_date?: string
}

export interface TaskMove {
  status_id: string
  position?: number
}

export interface Comment {
  id: string
  content: string
  user: UserBrief
  created_at: string
  updated_at: string
  is_edited: boolean
}

export interface TaskFilters {
  status_id?: string
  priority?: Priority
  assignee_id?: string
  search?: string
  page?: number
  per_page?: number
}

export interface ActivityLog {
  id: string
  action: string
  entity_type: string
  changes: Record<string, { old?: string; new?: string } | string>
  user: UserBrief
  task_id: string | null
  created_at: string
}
