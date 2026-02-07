export interface User {
  id: string
  email: string
  username: string
  full_name: string | null
  avatar_url: string | null
  role: string
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
