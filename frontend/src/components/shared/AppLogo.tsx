import { cn } from '@/lib/utils'

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: { container: 'size-7', icon: 14 },
  md: { container: 'size-10', icon: 20 },
  lg: { container: 'size-12', icon: 22 },
}

export function AppLogo({ size = 'md', className }: AppLogoProps) {
  const s = sizes[size]
  return (
    <div className={cn(
      s.container,
      'rounded-xl bg-gradient-to-br from-[var(--accent-solid)] to-[var(--accent-solid-hover)] flex items-center justify-center shrink-0',
      className
    )}>
      <svg width={s.icon} height={s.icon} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    </div>
  )
}
