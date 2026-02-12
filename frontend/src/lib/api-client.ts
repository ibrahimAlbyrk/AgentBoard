import type {
  Agent,
  AgentCreate,
  AgentUpdate,
  APIResponse,
  PaginatedResponse,
  TokenResponse,
  Project,
  ProjectDetail,
  ProjectCreate,
  Board,
  BoardDetail,
  BoardCreate,
  BoardUpdate,
  Status,
  Label,
  Task,
  TaskCreate,
  TaskUpdate,
  TaskMove,
  TaskFilters,
  Comment,
  Attachment,
  ActivityLog,
  User,
  LoginCredentials,
  RegisterData,
  MyTasksResponse,
  Checklist,
  ChecklistItem,
  ChecklistItemCreate,
  ChecklistItemUpdate,
  ReactionSummary,
  ToggleResult,
  CustomFieldDefinition,
  CustomFieldDefinitionCreate,
  CustomFieldDefinitionUpdate,
  CustomFieldValue,
  CustomFieldValueSet,
  MentionablesResponse,
  ReferenceablesResponse,
} from '@/types'

const BASE_URL = '/api/v1'

class APIClient {
  private getToken(): string | null {
    try {
      const stored = localStorage.getItem('agentboard-auth')
      if (!stored) return null
      const parsed = JSON.parse(stored)
      return parsed.state?.accessToken ?? null
    } catch {
      return null
    }
  }

  private getRefreshToken(): string | null {
    try {
      const stored = localStorage.getItem('agentboard-auth')
      if (!stored) return null
      const parsed = JSON.parse(stored)
      return parsed.state?.refreshToken ?? null
    } catch {
      return null
    }
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    retry = true,
  ): Promise<T> {
    const token = this.getToken()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    })

    if (response.status === 401 && retry) {
      const refreshed = await this.refreshToken()
      if (refreshed) return this.request<T>(path, options, false)
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { code: 'UNKNOWN', message: response.statusText },
      }))
      throw error
    }

    if (response.status === 204) return undefined as T

    return response.json()
  }

  private async upload<T>(path: string, file: File, retry = true): Promise<T> {
    const token = this.getToken()
    const formData = new FormData()
    formData.append('file', file)

    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    })

    if (response.status === 401 && retry) {
      const refreshed = await this.refreshToken()
      if (refreshed) return this.upload<T>(path, file, false)
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { code: 'UNKNOWN', message: response.statusText },
      }))
      throw error
    }

    return response.json()
  }

  private async refreshToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) return false

    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })

      if (!response.ok) return false

      const raw = await response.json()
      const data: TokenResponse = raw.data ?? raw

      const stored = localStorage.getItem('agentboard-auth')
      if (stored) {
        const parsed = JSON.parse(stored)
        parsed.state.accessToken = data.access_token
        if (data.refresh_token) {
          parsed.state.refreshToken = data.refresh_token
        }
        localStorage.setItem('agentboard-auth', JSON.stringify(parsed))
      }

      return true
    } catch {
      return false
    }
  }

  // Auth
  async login(credentials: LoginCredentials): Promise<TokenResponse> {
    const formData = new URLSearchParams()
    formData.append('username', credentials.email)
    formData.append('password', credentials.password)

    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { code: 'AUTH_FAILED', message: 'Login failed' },
      }))
      throw error
    }

    const raw = await response.json()
    return raw.data ?? raw
  }

  async register(data: RegisterData): Promise<TokenResponse> {
    const raw = await this.request<APIResponse<TokenResponse>>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return raw.data
  }

  async logout() {
    return this.request<void>('/auth/logout', { method: 'POST' })
  }

  // Projects
  async listProjects(params?: { page?: number; per_page?: number; search?: string; include_archived?: boolean }) {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.per_page) query.set('per_page', String(params.per_page))
    if (params?.search) query.set('search', params.search)
    if (params?.include_archived) query.set('include_archived', 'true')
    const qs = query.toString()
    return this.request<PaginatedResponse<Project>>(`/projects${qs ? `?${qs}` : ''}`)
  }

  async getProject(projectId: string) {
    return this.request<APIResponse<ProjectDetail>>(`/projects/${projectId}`)
  }

  async createProject(data: ProjectCreate) {
    return this.request<APIResponse<Project>>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateProject(projectId: string, data: Partial<ProjectCreate>) {
    return this.request<APIResponse<Project>>(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteProject(projectId: string) {
    return this.request<void>(`/projects/${projectId}`, { method: 'DELETE' })
  }

  async archiveProject(projectId: string) {
    return this.request<APIResponse<Project>>(`/projects/${projectId}/archive`, {
      method: 'POST',
    })
  }

  async unarchiveProject(projectId: string) {
    return this.request<APIResponse<Project>>(`/projects/${projectId}/unarchive`, {
      method: 'POST',
    })
  }

  // Boards
  async listBoards(projectId: string) {
    return this.request<APIResponse<Board[]>>(`/projects/${projectId}/boards`)
  }

  async getBoard(projectId: string, boardId: string) {
    return this.request<APIResponse<BoardDetail>>(`/projects/${projectId}/boards/${boardId}`)
  }

  async createBoard(projectId: string, data: BoardCreate) {
    return this.request<APIResponse<Board>>(`/projects/${projectId}/boards`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateBoard(projectId: string, boardId: string, data: BoardUpdate) {
    return this.request<APIResponse<Board>>(`/projects/${projectId}/boards/${boardId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteBoard(projectId: string, boardId: string) {
    return this.request<void>(`/projects/${projectId}/boards/${boardId}`, { method: 'DELETE' })
  }

  // Statuses (board-scoped)
  async listStatuses(projectId: string, boardId: string) {
    return this.request<APIResponse<Status[]>>(`/projects/${projectId}/boards/${boardId}/statuses`)
  }

  async createStatus(projectId: string, boardId: string, data: { name: string; color?: string }) {
    return this.request<APIResponse<Status>>(`/projects/${projectId}/boards/${boardId}/statuses`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateStatus(projectId: string, boardId: string, statusId: string, data: { name?: string; color?: string }) {
    return this.request<APIResponse<Status>>(`/projects/${projectId}/boards/${boardId}/statuses/${statusId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteStatus(projectId: string, boardId: string, statusId: string) {
    return this.request<void>(`/projects/${projectId}/boards/${boardId}/statuses/${statusId}`, {
      method: 'DELETE',
    })
  }

  async reorderStatuses(projectId: string, boardId: string, statusIds: string[]) {
    return this.request<APIResponse<Status[]>>(`/projects/${projectId}/boards/${boardId}/statuses/reorder`, {
      method: 'POST',
      body: JSON.stringify({ status_ids: statusIds }),
    })
  }

  // Labels (project-scoped)
  async listLabels(projectId: string) {
    return this.request<APIResponse<Label[]>>(`/projects/${projectId}/labels`)
  }

  async createLabel(projectId: string, data: { name: string; color: string; description?: string }) {
    return this.request<APIResponse<Label>>(`/projects/${projectId}/labels`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateLabel(projectId: string, labelId: string, data: { name?: string; color?: string; description?: string }) {
    return this.request<APIResponse<Label>>(`/projects/${projectId}/labels/${labelId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteLabel(projectId: string, labelId: string) {
    return this.request<void>(`/projects/${projectId}/labels/${labelId}`, {
      method: 'DELETE',
    })
  }

  // Agents
  async listAgents(projectId: string, includeInactive = false) {
    const qs = includeInactive ? '?include_inactive=true' : ''
    return this.request<APIResponse<Agent[]>>(`/projects/${projectId}/agents${qs}`)
  }

  async createAgent(projectId: string, data: AgentCreate) {
    return this.request<APIResponse<Agent>>(`/projects/${projectId}/agents`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateAgent(projectId: string, agentId: string, data: AgentUpdate) {
    return this.request<APIResponse<Agent>>(`/projects/${projectId}/agents/${agentId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteAgent(projectId: string, agentId: string) {
    return this.request<void>(`/projects/${projectId}/agents/${agentId}`, {
      method: 'DELETE',
    })
  }

  // Tasks (board-scoped)
  async listTasks(projectId: string, boardId: string, filters?: TaskFilters) {
    const query = new URLSearchParams()
    if (filters?.status_id) query.set('status_id', filters.status_id)
    if (filters?.priority) query.set('priority', filters.priority)
    if (filters?.assignee_id) query.set('assignee_id', filters.assignee_id)
    if (filters?.search) query.set('search', filters.search)
    if (filters?.page) query.set('page', String(filters.page))
    if (filters?.per_page) query.set('per_page', String(filters.per_page))
    const qs = query.toString()
    return this.request<PaginatedResponse<Task>>(`/projects/${projectId}/boards/${boardId}/tasks${qs ? `?${qs}` : ''}`)
  }

  async getTask(projectId: string, boardId: string, taskId: string) {
    return this.request<APIResponse<Task>>(`/projects/${projectId}/boards/${boardId}/tasks/${taskId}`)
  }

  async createTask(projectId: string, boardId: string, data: TaskCreate) {
    return this.request<APIResponse<Task>>(`/projects/${projectId}/boards/${boardId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateTask(projectId: string, boardId: string, taskId: string, data: TaskUpdate) {
    return this.request<APIResponse<Task>>(`/projects/${projectId}/boards/${boardId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteTask(projectId: string, boardId: string, taskId: string) {
    return this.request<void>(`/projects/${projectId}/boards/${boardId}/tasks/${taskId}`, {
      method: 'DELETE',
    })
  }

  async moveTask(projectId: string, boardId: string, taskId: string, data: TaskMove) {
    return this.request<APIResponse<Task>>(`/projects/${projectId}/boards/${boardId}/tasks/${taskId}/move`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async bulkUpdateTasks(projectId: string, boardId: string, taskIds: string[], data: TaskUpdate) {
    return this.request<APIResponse<Task[]>>(`/projects/${projectId}/boards/${boardId}/tasks/bulk-update`, {
      method: 'POST',
      body: JSON.stringify({ task_ids: taskIds, updates: data }),
    })
  }

  async bulkMoveTasks(projectId: string, boardId: string, taskIds: string[], data: TaskMove) {
    return this.request<APIResponse<Task[]>>(`/projects/${projectId}/boards/${boardId}/tasks/bulk-move`, {
      method: 'POST',
      body: JSON.stringify({ task_ids: taskIds, ...data }),
    })
  }

  async bulkDeleteTasks(projectId: string, boardId: string, taskIds: string[]) {
    return this.request<void>(`/projects/${projectId}/boards/${boardId}/tasks/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ task_ids: taskIds }),
    })
  }

  // Comments (board-scoped)
  async listComments(projectId: string, boardId: string, taskId: string) {
    return this.request<APIResponse<Comment[]>>(`/projects/${projectId}/boards/${boardId}/tasks/${taskId}/comments`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async createComment(projectId: string, boardId: string, taskId: string, data: { content: any; attachment_ids?: string[] }) {
    return this.request<APIResponse<Comment>>(`/projects/${projectId}/boards/${boardId}/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async updateComment(projectId: string, boardId: string, taskId: string, commentId: string, data: { content: any }) {
    return this.request<APIResponse<Comment>>(`/projects/${projectId}/boards/${boardId}/tasks/${taskId}/comments/${commentId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteComment(projectId: string, boardId: string, taskId: string, commentId: string) {
    return this.request<void>(`/projects/${projectId}/boards/${boardId}/tasks/${taskId}/comments/${commentId}`, {
      method: 'DELETE',
    })
  }

  // Attachments
  async uploadAttachment(projectId: string, boardId: string, taskId: string, file: File) {
    return this.upload<APIResponse<Attachment>>(
      `/projects/${projectId}/boards/${boardId}/tasks/${taskId}/attachments/`,
      file,
    )
  }

  async listAttachments(projectId: string, boardId: string, taskId: string) {
    return this.request<PaginatedResponse<Attachment>>(
      `/projects/${projectId}/boards/${boardId}/tasks/${taskId}/attachments`,
    )
  }

  async deleteAttachment(projectId: string, boardId: string, taskId: string, attachmentId: string) {
    return this.request<void>(
      `/projects/${projectId}/boards/${boardId}/tasks/${taskId}/attachments/${attachmentId}`,
      { method: 'DELETE' },
    )
  }

  // Activity
  async listTaskActivity(projectId: string, taskId: string) {
    return this.request<PaginatedResponse<ActivityLog>>(`/projects/${projectId}/activity/tasks/${taskId}`)
  }

  // Search
  async search(q: string, types?: string[], projectId?: string) {
    const query = new URLSearchParams({ q })
    if (types?.length) query.set('types', types.join(','))
    if (projectId) query.set('project_id', projectId)
    return this.request<APIResponse<unknown>>(`/search?${query.toString()}`)
  }

  // Stats
  async getProjectStats(projectId: string) {
    return this.request<APIResponse<Record<string, unknown>>>(`/projects/${projectId}/stats`)
  }

  async getDashboardStats() {
    return this.request<APIResponse<{ in_progress: number; overdue: number }>>('/dashboard/stats')
  }

  async getMyTasks() {
    return this.request<APIResponse<MyTasksResponse>>('/dashboard/my-tasks')
  }

  // API Keys
  async listApiKeys() {
    return this.request<APIResponse<Array<{ id: string; name: string; key_prefix: string; last_used: string | null; created_at: string }>>>('/api-keys')
  }

  async createApiKey(data: { name: string }) {
    return this.request<APIResponse<{ id: string; key: string; name: string }>>('/api-keys', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteApiKey(keyId: string) {
    return this.request<void>(`/api-keys/${keyId}`, { method: 'DELETE' })
  }

  // Notifications
  async listNotifications(params?: { page?: number; per_page?: number }) {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.per_page) query.set('per_page', String(params.per_page))
    const qs = query.toString()
    return this.request<PaginatedResponse<{
      id: string
      type: string
      title: string
      message: string
      is_read: boolean
      data: Record<string, unknown> | null
      project_id: string | null
      created_at: string
    }>>(`/notifications${qs ? `?${qs}` : ''}`)
  }

  async getUnreadCount() {
    return this.request<{ count: number }>('/notifications/unread-count')
  }

  async markNotificationsRead(notificationIds?: string[], markAll?: boolean) {
    return this.request<{ success: boolean }>('/notifications/read', {
      method: 'PUT',
      body: JSON.stringify({
        notification_ids: notificationIds ?? null,
        mark_all: markAll ?? false,
      }),
    })
  }

  async clearNotifications() {
    return this.request<{ deleted: number }>('/notifications/clear', {
      method: 'DELETE',
    })
  }

  async getNotificationPreferences() {
    return this.request<APIResponse<import('@/types/user').NotificationPreferences>>('/notifications/preferences')
  }

  async updateNotificationPreferences(prefs: import('@/types/user').NotificationPreferences) {
    return this.request<APIResponse<import('@/types/user').NotificationPreferences>>('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(prefs),
    })
  }

  // Users
  async getMe() {
    return this.request<APIResponse<User>>('/users/me')
  }

  async updateMe(data: { full_name?: string; avatar_url?: string }) {
    return this.request<APIResponse<User>>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  // Checklists
  async listChecklists(projectId: string, boardId: string, taskId: string) {
    return this.request<APIResponse<Checklist[]>>(
      `/projects/${projectId}/boards/${boardId}/tasks/${taskId}/checklists`
    )
  }

  async createChecklist(projectId: string, boardId: string, taskId: string, data: { title: string }) {
    return this.request<APIResponse<Checklist>>(
      `/projects/${projectId}/boards/${boardId}/tasks/${taskId}/checklists`,
      { method: 'POST', body: JSON.stringify(data) }
    )
  }

  async updateChecklist(projectId: string, boardId: string, taskId: string, checklistId: string, data: { title?: string }) {
    return this.request<APIResponse<Checklist>>(
      `/projects/${projectId}/boards/${boardId}/tasks/${taskId}/checklists/${checklistId}`,
      { method: 'PATCH', body: JSON.stringify(data) }
    )
  }

  async deleteChecklist(projectId: string, boardId: string, taskId: string, checklistId: string) {
    return this.request<void>(
      `/projects/${projectId}/boards/${boardId}/tasks/${taskId}/checklists/${checklistId}`,
      { method: 'DELETE' }
    )
  }

  async createChecklistItem(projectId: string, boardId: string, taskId: string, checklistId: string, data: ChecklistItemCreate) {
    return this.request<APIResponse<ChecklistItem>>(
      `/projects/${projectId}/boards/${boardId}/tasks/${taskId}/checklists/${checklistId}/items`,
      { method: 'POST', body: JSON.stringify(data) }
    )
  }

  async updateChecklistItem(projectId: string, boardId: string, taskId: string, checklistId: string, itemId: string, data: ChecklistItemUpdate) {
    return this.request<APIResponse<ChecklistItem>>(
      `/projects/${projectId}/boards/${boardId}/tasks/${taskId}/checklists/${checklistId}/items/${itemId}`,
      { method: 'PATCH', body: JSON.stringify(data) }
    )
  }

  async deleteChecklistItem(projectId: string, boardId: string, taskId: string, checklistId: string, itemId: string) {
    return this.request<void>(
      `/projects/${projectId}/boards/${boardId}/tasks/${taskId}/checklists/${checklistId}/items/${itemId}`,
      { method: 'DELETE' }
    )
  }

  async toggleChecklistItem(projectId: string, boardId: string, taskId: string, checklistId: string, itemId: string) {
    return this.request<APIResponse<ChecklistItem>>(
      `/projects/${projectId}/boards/${boardId}/tasks/${taskId}/checklists/${checklistId}/items/${itemId}/toggle`,
      { method: 'POST' }
    )
  }

  async reorderChecklistItem(projectId: string, boardId: string, taskId: string, checklistId: string, itemId: string, position: number) {
    return this.request<APIResponse<ChecklistItem>>(
      `/projects/${projectId}/boards/${boardId}/tasks/${taskId}/checklists/${checklistId}/items/${itemId}/reorder`,
      { method: 'PATCH', body: JSON.stringify({ position }) }
    )
  }

  // Reactions — Tasks
  async getTaskReactions(projectId: string, boardId: string, taskId: string) {
    return this.request<APIResponse<ReactionSummary>>(
      `/projects/${projectId}/boards/${boardId}/tasks/${taskId}/reactions`
    )
  }

  async toggleTaskReaction(projectId: string, boardId: string, taskId: string, data: { emoji: string; agent_id?: string }) {
    return this.request<APIResponse<ToggleResult>>(
      `/projects/${projectId}/boards/${boardId}/tasks/${taskId}/reactions/toggle`,
      { method: 'POST', body: JSON.stringify(data) }
    )
  }

  // Reactions — Comments
  async getCommentReactions(projectId: string, boardId: string, taskId: string, commentId: string) {
    return this.request<APIResponse<ReactionSummary>>(
      `/projects/${projectId}/boards/${boardId}/tasks/${taskId}/comments/${commentId}/reactions`
    )
  }

  async toggleCommentReaction(projectId: string, boardId: string, taskId: string, commentId: string, data: { emoji: string; agent_id?: string }) {
    return this.request<APIResponse<ToggleResult>>(
      `/projects/${projectId}/boards/${boardId}/tasks/${taskId}/comments/${commentId}/reactions/toggle`,
      { method: 'POST', body: JSON.stringify(data) }
    )
  }

  // Custom Fields
  async listCustomFields(projectId: string, boardId: string) {
    return this.request<APIResponse<CustomFieldDefinition[]>>(
      `/projects/${projectId}/boards/${boardId}/custom-fields`
    )
  }

  async createCustomField(projectId: string, boardId: string, data: CustomFieldDefinitionCreate) {
    return this.request<APIResponse<CustomFieldDefinition>>(
      `/projects/${projectId}/boards/${boardId}/custom-fields`,
      { method: 'POST', body: JSON.stringify(data) }
    )
  }

  async updateCustomField(projectId: string, boardId: string, fieldId: string, data: CustomFieldDefinitionUpdate) {
    return this.request<APIResponse<CustomFieldDefinition>>(
      `/projects/${projectId}/boards/${boardId}/custom-fields/${fieldId}`,
      { method: 'PATCH', body: JSON.stringify(data) }
    )
  }

  async deleteCustomField(projectId: string, boardId: string, fieldId: string) {
    return this.request<void>(
      `/projects/${projectId}/boards/${boardId}/custom-fields/${fieldId}`,
      { method: 'DELETE' }
    )
  }

  async reorderCustomFields(projectId: string, boardId: string, fieldIds: string[]) {
    return this.request<APIResponse<CustomFieldDefinition[]>>(
      `/projects/${projectId}/boards/${boardId}/custom-fields/reorder`,
      { method: 'POST', body: JSON.stringify({ field_ids: fieldIds }) }
    )
  }

  async setFieldValue(projectId: string, boardId: string, taskId: string, fieldId: string, data: CustomFieldValueSet) {
    return this.request<APIResponse<CustomFieldValue>>(
      `/projects/${projectId}/boards/${boardId}/tasks/${taskId}/field-values/${fieldId}`,
      { method: 'PUT', body: JSON.stringify(data) }
    )
  }

  async bulkSetFieldValues(projectId: string, boardId: string, taskId: string, values: CustomFieldValueSet[]) {
    return this.request<APIResponse<CustomFieldValue[]>>(
      `/projects/${projectId}/boards/${boardId}/tasks/${taskId}/field-values`,
      { method: 'PUT', body: JSON.stringify({ values }) }
    )
  }

  async clearFieldValue(projectId: string, boardId: string, taskId: string, fieldId: string) {
    return this.request<void>(
      `/projects/${projectId}/boards/${boardId}/tasks/${taskId}/field-values/${fieldId}`,
      { method: 'DELETE' }
    )
  }

  // Mentionables / Referenceables
  async getMentionables(projectId: string, q?: string) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    const qs = params.toString()
    return this.request<APIResponse<MentionablesResponse>>(
      `/projects/${projectId}/mentionables${qs ? `?${qs}` : ''}`
    )
  }

  async getReferenceables(projectId: string, q?: string) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    const qs = params.toString()
    return this.request<APIResponse<ReferenceablesResponse>>(
      `/projects/${projectId}/referenceables${qs ? `?${qs}` : ''}`
    )
  }
}

export const api = new APIClient()
