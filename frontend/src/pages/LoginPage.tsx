import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/authStore'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FormData = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      await login({ email: data.email, password: data.password })
      navigate('/dashboard')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0B0B0E] grain-overlay">
      {/* Animated gradient mesh */}
      <div className="absolute inset-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#6C5CE7]/20 blur-[120px] animate-gradient" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#F0ABFC]/15 blur-[120px] animate-gradient" style={{ animationDelay: '-4s' }} />
        <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] rounded-full bg-[#60A5FA]/10 blur-[100px] animate-gradient" style={{ animationDelay: '-2s' }} />
      </div>

      <div className="relative z-10 w-full max-w-[420px] animate-fade-in">
        <div className="bg-[#18181E]/80 backdrop-blur-2xl border border-[#ffffff08] rounded-2xl p-8 shadow-[0_0_80px_-20px_#6C5CE720]">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center size-12 rounded-xl bg-gradient-to-br from-[#6C5CE7] to-[#7C6AEF] mb-4 shadow-[0_0_24px_-4px_#6C5CE780]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Welcome back</h1>
            <p className="text-sm text-[#8B8AA0] mt-1.5">Sign in to continue to AgentBoard</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#8B8AA0] text-xs font-medium uppercase tracking-wider">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="bg-[#0F0F12] border-[#2A2A35] h-11 text-white placeholder:text-[#5C5B72] focus:border-[#6C5CE7] transition-colors"
                {...register('email')}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-sm text-[#F87171]">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#8B8AA0] text-xs font-medium uppercase tracking-wider">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                className="bg-[#0F0F12] border-[#2A2A35] h-11 text-white placeholder:text-[#5C5B72] focus:border-[#6C5CE7] transition-colors"
                {...register('password')}
                aria-invalid={!!errors.password}
              />
              {errors.password && (
                <p className="text-sm text-[#F87171]">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-[#6C5CE7] to-[#7C6AEF] hover:from-[#5B4BD6] hover:to-[#6C5CE7] text-white font-medium shadow-[0_0_20px_-4px_#6C5CE750] hover:shadow-[0_0_28px_-4px_#6C5CE780] transition-all duration-200"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="spinner size-4" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign in
                  <ArrowRight className="size-4" />
                </span>
              )}
            </Button>

            <p className="text-center text-sm text-[#5C5B72]">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="text-[#7C6AEF] hover:text-[#9B8AFF] transition-colors">
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
