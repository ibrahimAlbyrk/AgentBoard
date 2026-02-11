import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useTaskReactions, useToggleTaskReaction } from '@/hooks/useReactions'

const THUMBS_UP = '\u{1F44D}'

interface VoteButtonProps {
  projectId: string
  boardId: string
  taskId: string
}

export function VoteButton({ projectId, boardId, taskId }: VoteButtonProps) {
  const { data } = useTaskReactions(projectId, boardId, taskId)
  const toggle = useToggleTaskReaction(projectId, boardId, taskId)

  const thumbsGroup = data?.data?.groups.find((g) => g.emoji === THUMBS_UP)
  const voted = thumbsGroup?.reacted_by_me ?? false
  const count = thumbsGroup?.count ?? 0

  return (
    <motion.button
      onClick={() => toggle.mutate(THUMBS_UP)}
      disabled={toggle.isPending}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200',
        voted
          ? 'bg-[var(--accent-muted-bg)] border-[var(--accent-solid)] text-[var(--accent-solid)]'
          : 'bg-[var(--surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-foreground',
      )}
      style={voted ? { boxShadow: '0 0 12px -4px var(--accent-solid)' } : undefined}
    >
      <span className="text-base">{THUMBS_UP}</span>
      <span>{voted ? 'Voted' : 'Vote'}</span>
      {count > 0 && (
        <span className="ml-0.5 bg-[var(--elevated)] px-1.5 py-0.5 rounded-md text-xs font-semibold tabular-nums">
          {count}
        </span>
      )}
    </motion.button>
  )
}
