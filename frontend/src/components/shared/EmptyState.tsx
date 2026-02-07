import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="size-14 rounded-2xl bg-[var(--accent-muted-bg)] flex items-center justify-center mb-5 animate-float">
        <Icon className="size-6 text-[var(--accent-solid)]" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-[13px] text-[var(--text-secondary)] mb-5 max-w-xs leading-relaxed">{description}</p>
      {action && (
        <Button
          onClick={action.onClick}
          className="bg-[var(--accent-solid)] text-white hover:bg-[var(--accent-solid-hover)] shadow-[0_0_16px_-4px_var(--glow)] transition-all"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
