import type {
  User, Project, Task, Comment, Status, Label,
  ProjectCreate, TaskCreate, TaskUpdate, ProjectMember, TaskMove,
} from '@/types'

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  last_used?: string
  created_at: string
}

interface ProjectUpdate {
  name?: string
  description?: string
  icon?: string
  color?: string
  is_archived?: boolean
}

const BASE = '/api/v1'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Request failed: ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ access_token: string; token_type: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (data: { email: string; username: string; full_name?: string; password: string }) =>
      request<User>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    me: () => request<User>('/auth/me'),
  },
  projects: {
    list: () => request<Project[]>('/projects'),
    get: (id: string) => request<Project>(`/projects/${id}`),
    create: (data: ProjectCreate) =>
      request<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: ProjectUpdate) =>
      request<Project>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/projects/${id}`, { method: 'DELETE' }),
    members: (id: string) => request<ProjectMember[]>(`/projects/${id}/members`),
    statuses: (id: string) => request<Status[]>(`/projects/${id}/statuses`),
    labels: (id: string) => request<Label[]>(`/projects/${id}/labels`),
  },
  tasks: {
    list: (projectId: string) => request<Task[]>(`/projects/${projectId}/tasks`),
    get: (projectId: string, taskId: string) =>
      request<Task>(`/projects/${projectId}/tasks/${taskId}`),
    create: (projectId: string, data: TaskCreate) =>
      request<Task>(`/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
    update: (projectId: string, taskId: string, data: TaskUpdate) =>
      request<Task>(`/projects/${projectId}/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (projectId: string, taskId: string) =>
      request<void>(`/projects/${projectId}/tasks/${taskId}`, { method: 'DELETE' }),
    move: (projectId: string, taskId: string, data: TaskMove) =>
      request<Task>(`/projects/${projectId}/tasks/${taskId}/move`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  comments: {
    list: (projectId: string, taskId: string) =>
      request<Comment[]>(`/projects/${projectId}/tasks/${taskId}/comments`),
    create: (projectId: string, taskId: string, content: string) =>
      request<Comment>(`/projects/${projectId}/tasks/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    delete: (projectId: string, taskId: string, commentId: string) =>
      request<void>(`/projects/${projectId}/tasks/${taskId}/comments/${commentId}`, {
        method: 'DELETE',
      }),
  },
  apiKeys: {
    list: () => request<ApiKey[]>('/api-keys'),
    create: (name: string) =>
      request<{ key: string } & ApiKey>('/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    delete: (id: string) => request<void>(`/api-keys/${id}`, { method: 'DELETE' }),
  },
  users: {
    update: (data: { full_name?: string; avatar_url?: string }) =>
      request<User>('/auth/me', { method: 'PATCH', body: JSON.stringify(data) }),
  },
}
