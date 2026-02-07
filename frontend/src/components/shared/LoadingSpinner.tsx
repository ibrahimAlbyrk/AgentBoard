import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  text?: string
  className?: string
}

export function LoadingSpinner({ text, className }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16', className)}>
      <div className="spinner size-8" />
      {text && <p className="mt-3 text-sm text-muted-foreground">{text}</p>}
    </div>
  )
}
