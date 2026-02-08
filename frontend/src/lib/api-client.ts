import type {
  APIResponse,
  PaginatedResponse,
  TokenResponse,
  Project,
  ProjectDetail,
  ProjectCreate,
  Status,
  Label,
  Task,
  TaskCreate,
  TaskUpdate,
  TaskMove,
  TaskFilters,
  Comment,
  User,
  LoginCredentials,
  RegisterData,
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
        parsed.state.refreshToken = data.refresh_token
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
        error: { code: 'UNKNOWN', message: response.statusText },
      }))
      throw new Error(error.error?.message || 'Login failed')
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

  // Statuses
  async listStatuses(projectId: string) {
    return this.request<APIResponse<Status[]>>(`/projects/${projectId}/statuses`)
  }

  async createStatus(projectId: string, data: { name: string; color?: string }) {
    return this.request<APIResponse<Status>>(`/projects/${projectId}/statuses`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateStatus(projectId: string, statusId: string, data: { name?: string; color?: string }) {
    return this.request<APIResponse<Status>>(`/projects/${projectId}/statuses/${statusId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteStatus(projectId: string, statusId: string) {
    return this.request<void>(`/projects/${projectId}/statuses/${statusId}`, {
      method: 'DELETE',
    })
  }

  async reorderStatuses(projectId: string, statusIds: string[]) {
    return this.request<APIResponse<Status[]>>(`/projects/${projectId}/statuses/reorder`, {
      method: 'POST',
      body: JSON.stringify({ status_ids: statusIds }),
    })
  }

  // Labels
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

  // Tasks
  async listTasks(projectId: string, filters?: TaskFilters) {
    const query = new URLSearchParams()
    if (filters?.status_id) query.set('status_id', filters.status_id)
    if (filters?.priority) query.set('priority', filters.priority)
    if (filters?.assignee_id) query.set('assignee_id', filters.assignee_id)
    if (filters?.search) query.set('search', filters.search)
    if (filters?.page) query.set('page', String(filters.page))
    if (filters?.per_page) query.set('per_page', String(filters.per_page))
    const qs = query.toString()
    return this.request<PaginatedResponse<Task>>(`/projects/${projectId}/tasks${qs ? `?${qs}` : ''}`)
  }

  async getTask(projectId: string, taskId: string) {
    return this.request<APIResponse<Task>>(`/projects/${projectId}/tasks/${taskId}`)
  }

  async createTask(projectId: string, data: TaskCreate) {
    return this.request<APIResponse<Task>>(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateTask(projectId: string, taskId: string, data: TaskUpdate) {
    return this.request<APIResponse<Task>>(`/projects/${projectId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteTask(projectId: string, taskId: string) {
    return this.request<void>(`/projects/${projectId}/tasks/${taskId}`, {
      method: 'DELETE',
    })
  }

  async moveTask(projectId: string, taskId: string, data: TaskMove) {
    return this.request<APIResponse<Task>>(`/projects/${projectId}/tasks/${taskId}/move`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async bulkUpdateTasks(projectId: string, taskIds: string[], data: TaskUpdate) {
    return this.request<APIResponse<Task[]>>(`/projects/${projectId}/tasks/bulk/update`, {
      method: 'POST',
      body: JSON.stringify({ task_ids: taskIds, ...data }),
    })
  }

  async bulkMoveTasks(projectId: string, taskIds: string[], data: TaskMove) {
    return this.request<APIResponse<Task[]>>(`/projects/${projectId}/tasks/bulk/move`, {
      method: 'POST',
      body: JSON.stringify({ task_ids: taskIds, ...data }),
    })
  }

  async bulkDeleteTasks(projectId: string, taskIds: string[]) {
    return this.request<void>(`/projects/${projectId}/tasks/bulk/delete`, {
      method: 'POST',
      body: JSON.stringify({ task_ids: taskIds }),
    })
  }

  // Comments
  async listComments(projectId: string, taskId: string) {
    return this.request<APIResponse<Comment[]>>(`/projects/${projectId}/tasks/${taskId}/comments`)
  }

  async createComment(projectId: string, taskId: string, data: { content: string }) {
    return this.request<APIResponse<Comment>>(`/projects/${projectId}/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateComment(projectId: string, taskId: string, commentId: string, data: { content: string }) {
    return this.request<APIResponse<Comment>>(`/projects/${projectId}/tasks/${taskId}/comments/${commentId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteComment(projectId: string, taskId: string, commentId: string) {
    return this.request<void>(`/projects/${projectId}/tasks/${taskId}/comments/${commentId}`, {
      method: 'DELETE',
    })
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
}

export const api = new APIClient()
