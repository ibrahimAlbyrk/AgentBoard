import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SmilePlus } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { EmojiPicker } from './EmojiPicker'
import { ReactorTooltip } from './ReactorTooltip'
import {
  useTaskReactions,
  useCommentReactions,
  useToggleTaskReaction,
  useToggleCommentReaction,
} from '@/hooks/useReactions'

interface ReactionBarProps {
  entityType: 'task' | 'comment'
  projectId: string
  boardId: string
  taskId: string
  commentId?: string
  compact?: boolean
}

export function ReactionBar({
  entityType,
  projectId,
  boardId,
  taskId,
  commentId,
  compact,
}: ReactionBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false)

  const taskReactionsQuery = useTaskReactions(
    entityType === 'task' ? projectId : '',
    entityType === 'task' ? boardId : '',
    entityType === 'task' ? taskId : '',
  )
  const commentReactionsQuery = useCommentReactions(
    entityType === 'comment' ? projectId : '',
    entityType === 'comment' ? boardId : '',
    entityType === 'comment' ? taskId : '',
    entityType === 'comment' ? commentId! : '',
  )
  const taskToggle = useToggleTaskReaction(
    entityType === 'task' ? projectId : '',
    entityType === 'task' ? boardId : '',
    entityType === 'task' ? taskId : '',
  )
  const commentToggle = useToggleCommentReaction(
    entityType === 'comment' ? projectId : '',
    entityType === 'comment' ? boardId : '',
    entityType === 'comment' ? taskId : '',
    entityType === 'comment' ? commentId! : '',
  )

  const reactionsQuery = entityType === 'task' ? taskReactionsQuery : commentReactionsQuery
  const toggle = entityType === 'task' ? taskToggle : commentToggle

  const summary = reactionsQuery.data?.data
  const groups = summary?.groups ?? []

  const handleToggle = (emoji: string) => {
    toggle.mutate(emoji)
  }

  return (
    <div className="flex items-center flex-wrap gap-1.5">
      <TooltipProvider delayDuration={300}>
        <AnimatePresence mode="popLayout">
          {groups.map((group) => (
            <motion.div
              key={group.emoji}
              layout
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleToggle(group.emoji)}
                    disabled={toggle.isPending}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border transition-all duration-200 hover:scale-105 active:scale-95',
                      compact ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5',
                      group.reacted_by_me
                        ? 'bg-[var(--accent-muted-bg)] border-[var(--accent-solid)] text-[var(--accent-solid)]'
                        : 'bg-[var(--surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]',
                    )}
                  >
                    <span>{group.emoji}</span>
                    <span className="font-medium tabular-nums">{group.count}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px]">
                  <ReactorTooltip reactors={group.reactors} emoji={group.emoji} />
                </TooltipContent>
              </Tooltip>
            </motion.div>
          ))}
        </AnimatePresence>
      </TooltipProvider>

      {/* Add reaction button */}
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'rounded-full flex items-center justify-center border border-dashed transition-all duration-200',
              compact ? 'size-5' : 'size-6',
              'border-[var(--border-strong)] text-[var(--text-tertiary)]',
              'hover:text-[var(--accent-solid)] hover:border-[var(--accent-solid)] hover:bg-[var(--accent-muted-bg)]',
            )}
          >
            <SmilePlus className={compact ? 'size-2.5' : 'size-3'} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={8}
          className="w-auto p-0 bg-[var(--elevated)] border-[var(--border-subtle)] rounded-xl shadow-xl overflow-hidden"
        >
          <EmojiPicker
            onSelect={(emoji) => {
              handleToggle(emoji)
              setPickerOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
