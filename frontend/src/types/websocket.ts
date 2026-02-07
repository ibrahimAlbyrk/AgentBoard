export interface WSEvent {
  type: string
  project_id: string
  data: Record<string, unknown>
  user?: { id: string; username: string }
  timestamp: string
}

export interface WSTaskEvent extends WSEvent {
  type: 'task.created' | 'task.updated' | 'task.deleted' | 'task.moved'
}
