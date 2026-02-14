import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { toast } from '@/lib/toast'
import { AppLogo } from '@/components/shared/AppLogo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/authStore'

const schema = z
  .object({
    email: z.string().email('Invalid email'),
    username: z.string().min(3, 'Username must be at least 3 characters'),
    full_name: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

type FormData = z.infer<typeof schema>

export function RegisterPage() {
  const navigate = useNavigate()
  const registerUser = useAuthStore((s) => s.register)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { register, handleSubmit, setError, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      await registerUser({
        email: data.email,
        username: data.username,
        full_name: data.full_name,
        password: data.password,
      })
      navigate('/dashboard')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      toast.error(err)
      setError('root', { message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[var(--background)] grain-overlay">
      {/* Animated gradient mesh */}
      <div className="absolute inset-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[var(--accent-solid)]/15 blur-[120px] animate-gradient" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--glow-pink)] blur-[120px] animate-gradient" style={{ animationDelay: '-4s' }} />
        <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] rounded-full bg-[var(--accent-solid)]/8 blur-[100px] animate-gradient" style={{ animationDelay: '-2s' }} />
      </div>

      <div className="relative z-10 w-full max-w-[420px] animate-fade-in">
        <div className="bg-[var(--elevated)]/80 backdrop-blur-2xl border border-[var(--border-subtle)] rounded-2xl p-8 shadow-[0_0_80px_-20px_var(--glow)]">
          <div className="text-center mb-8">
            <AppLogo size="lg" className="mb-4 shadow-[0_0_24px_-4px_var(--accent-solid)]" />
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Create account</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1.5">Get started with AgentBoard</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[var(--text-secondary)] text-xs font-medium uppercase tracking-wider">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="bg-[var(--background)] border-[var(--border-subtle)] h-11 text-foreground placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-solid)] transition-colors"
                {...register('email')}
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="text-[var(--text-secondary)] text-xs font-medium uppercase tracking-wider">Username</Label>
              <Input
                id="username"
                placeholder="johndoe"
                className="bg-[var(--background)] border-[var(--border-subtle)] h-11 text-foreground placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-solid)] transition-colors"
                {...register('username')}
                aria-invalid={!!errors.username}
              />
              {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-[var(--text-secondary)] text-xs font-medium uppercase tracking-wider">Full Name <span className="text-[var(--text-tertiary)] normal-case">(optional)</span></Label>
              <Input
                id="full_name"
                placeholder="John Doe"
                className="bg-[var(--background)] border-[var(--border-subtle)] h-11 text-foreground placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-solid)] transition-colors"
                {...register('full_name')}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[var(--text-secondary)] text-xs font-medium uppercase tracking-wider">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 8 chars"
                    className="bg-[var(--background)] border-[var(--border-subtle)] h-11 text-foreground placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-solid)] transition-colors pr-10"
                    {...register('password')}
                    aria-invalid={!!errors.password}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password" className="text-[var(--text-secondary)] text-xs font-medium uppercase tracking-wider">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirm_password"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter"
                    className="bg-[var(--background)] border-[var(--border-subtle)] h-11 text-foreground placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-solid)] transition-colors pr-10"
                    {...register('confirm_password')}
                    aria-invalid={!!errors.confirm_password}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {errors.confirm_password && <p className="text-sm text-destructive">{errors.confirm_password.message}</p>}
              </div>
            </div>

            {errors.root && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                {errors.root.message}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-[var(--accent-solid)] to-[var(--accent-solid-hover)] hover:from-[var(--accent-solid-hover)] hover:to-[var(--accent-solid)] text-white font-medium shadow-[0_0_20px_-4px_var(--glow)] hover:shadow-[0_0_28px_-4px_var(--glow)] transition-all duration-200"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="spinner size-4" />
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Create account
                  <ArrowRight className="size-4" />
                </span>
              )}
            </Button>

            <p className="text-center text-sm text-[var(--text-tertiary)]">
              Already have an account?{' '}
              <Link to="/login" className="text-[var(--accent-solid)] hover:text-[var(--accent-solid-hover)] transition-colors">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
