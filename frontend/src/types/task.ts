import type { AgentBrief } from './agent'
import type { CustomFieldValue } from './custom-field'
import type { TiptapDoc } from './editor'
import type { Status, Label } from './project'
import type { ReactionSummary } from './reaction'
import type { UserBrief } from './user'

export type Priority = 'none' | 'low' | 'medium' | 'high' | 'urgent'
export type CoverType = 'image' | 'color' | 'gradient'
export type CoverSize = 'full' | 'half'

export interface Attachment {
  id: string
  filename: string
  file_size: number
  mime_type: string
  download_url: string
  user: UserBrief
  created_at: string
}

export interface AssigneeBrief {
  id: string
  user: UserBrief | null
  agent: AgentBrief | null
}

export interface WatcherBrief {
  id: string
  user: UserBrief | null
  agent: AgentBrief | null
}

export interface ChecklistItem {
  id: string
  checklist_id: string
  title: string
  is_completed: boolean
  position: number
  assignee: UserBrief | null
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface Checklist {
  id: string
  task_id: string
  title: string
  position: number
  items: ChecklistItem[]
  created_at: string
  updated_at: string
}

export interface ChecklistProgress {
  total: number
  completed: number
}

export interface ChecklistItemCreate {
  title: string
  assignee_id?: string
  due_date?: string
}

export interface ChecklistItemUpdate {
  title?: string
  is_completed?: boolean
  assignee_id?: string | null
  due_date?: string | null
}

export interface Task {
  id: string
  project_id: string
  board_id: string
  title: string
  description: TiptapDoc | string | null
  description_text: string | null
  status: Status
  priority: Priority
  assignees: AssigneeBrief[]
  creator: UserBrief
  agent_creator: AgentBrief | null
  labels: Label[]
  attachments: Attachment[]
  watchers: WatcherBrief[]
  due_date: string | null
  position: number
  parent_id: string | null
  comments_count: number
  checklist_progress: ChecklistProgress
  cover_type: CoverType | null
  cover_value: string | null
  cover_size: CoverSize | null
  cover_image_url: string | null
  custom_field_values: CustomFieldValue[]
  reactions?: ReactionSummary
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface TaskCreate {
  title: string
  description?: TiptapDoc | string
  status_id?: string
  priority?: Priority
  assignee_user_ids?: string[]
  assignee_agent_ids?: string[]
  label_ids?: string[]
  watcher_user_ids?: string[]
  watcher_agent_ids?: string[]
  due_date?: string
  parent_id?: string
}

export interface TaskUpdate {
  title?: string
  description?: TiptapDoc | string
  status_id?: string
  priority?: Priority
  assignee_user_ids?: string[]
  assignee_agent_ids?: string[]
  label_ids?: string[]
  watcher_user_ids?: string[]
  watcher_agent_ids?: string[]
  due_date?: string
  cover_type?: CoverType | null
  cover_value?: string | null
  cover_size?: CoverSize | null
}

export interface TaskMove {
  status_id: string
  position?: number
}

export interface Comment {
  id: string
  content: TiptapDoc | string
  content_text: string
  user: UserBrief
  agent_creator: AgentBrief | null
  attachments: Attachment[]
  reactions?: ReactionSummary
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
  agent: AgentBrief | null
  task_id: string | null
  created_at: string
}

export interface DashboardTask extends Task {
  project_name: string
}

export interface MyTasksSummary {
  overdue_count: number
  due_today_count: number
  due_this_week_count: number
  total_assigned: number
}

export interface MyTasksResponse {
  summary: MyTasksSummary
  tasks: DashboardTask[]
}
