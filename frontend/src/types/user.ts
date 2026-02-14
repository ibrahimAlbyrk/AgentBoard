export interface NotificationPreferences {
  task_assigned: boolean
  task_updated: boolean
  task_moved: boolean
  task_deleted: boolean
  task_comment: boolean
  task_reaction: boolean
  mentioned: boolean
  subtask_created: boolean
  subtask_deleted: boolean
  watcher_added: boolean
  watcher_removed: boolean
  assignee_added: boolean
  assignee_removed: boolean
  comment_deleted: boolean
  self_notifications: boolean
  desktop_enabled: boolean
  muted_projects: string[]
  email_enabled: boolean
  email_digest: 'off' | 'instant' | 'daily'
}

export interface User {
  id: string
  email: string
  username: string
  full_name: string | null
  avatar_url: string | null
  role: string
  notification_preferences: NotificationPreferences | null
  created_at: string
  last_login_at: string | null
}

export interface UserBrief {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  username: string
  password: string
  full_name?: string
}
