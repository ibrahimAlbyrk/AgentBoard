import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import type { LoginCredentials, RegisterData } from '@/types'

export function useLogin() {
  const login = useAuthStore((s) => s.login)
  return useMutation({
    mutationFn: (credentials: LoginCredentials) => login(credentials),
  })
}

export function useRegister() {
  const register = useAuthStore((s) => s.register)
  return useMutation({
    mutationFn: (data: RegisterData) => register(data),
  })
}
