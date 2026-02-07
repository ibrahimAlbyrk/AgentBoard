export interface APIResponse<T> {
  success: boolean
  data: T
  meta: {
    timestamp: string
    request_id?: string
  }
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
  meta: {
    timestamp: string
  }
}

export interface APIError {
  success: false
  error: {
    code: string
    message: string
    details?: Array<{
      field: string
      message: string
    }>
  }
  meta: {
    timestamp: string
  }
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: import('./user').User
}
