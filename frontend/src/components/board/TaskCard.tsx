import { useState } from 'react'
import { Calendar, MessageCircle, ListTree, ChevronRight, ChevronDown } from 'lucide-react'
import { formatDistanceToNow, isPast, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import { GRADIENT_PRESETS } from '@/lib/cover-presets'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Task } from '@/types'

const priorityBorderColors: Record<string, string> = {
  urgent: 'var(--priority-urgent)',
  high: 'var(--priority-high)',
  medium: 'var(--priority-medium)',
  low: 'var(--priority-low)',
  none: 'var(--border-subtle)',
}

interface TaskCardProps {
  task: Task
  onClick: () => void
  isDragOverlay?: boolean
  compact?: boolean
  isExpanded?: boolean
  onToggleExpand?: () => void
  expandedContent?: React.ReactNode
}

export function TaskCard({ task, onClick, isDragOverlay, compact, isExpanded, onToggleExpand, expandedContent }: TaskCardProps) {
  const isOverdue = task.due_date && isPast(parseISO(task.due_date))
  const visibleLabels = task.labels.slice(0, 3)
  const extraCount = task.labels.length - 3

  const visibleAssignees = task.assignees.slice(0, 3)
  const extraAssignees = task.assignees.length - 3

  const hasCover = !compact && task.cover_type && task.cover_value
  const coverHeight = task.cover_size === 'half' ? 56 : 120

  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)

  const showCover = hasCover && !(task.cover_type === 'image' && imgError)

  return (
    <div
      onClick={onClick}
      style={{
        borderLeftColor: priorityBorderColors[task.priority] || 'var(--border-subtle)',
        ...(isDragOverlay && {
          borderColor: 'var(--accent-solid)',
        }),
      }}
      className={cn(
        'bg-card border border-[var(--border-subtle)] border-l-[3px] rounded-xl cursor-pointer',
        compact ? 'p-2.5' : 'p-3.5',
        !isDragOverlay && 'hover:-translate-y-0.5 hover:shadow-[0_4px_12px_-4px_var(--glow)] hover:border-[var(--border-strong)] transition-[box-shadow,border-color,translate] duration-200',
      )}
    >
      {/* Cover */}
      {showCover && (
        <div
          className="rounded-t-[9px] -mx-3.5 -mt-3.5 mb-3 overflow-hidden bg-[var(--overlay)]"
          style={{
            height: coverHeight,
            boxShadow: task.cover_type !== 'image' ? 'inset 0 -1px 0 0 rgba(0,0,0,0.06)' : undefined,
          }}
        >
          {task.cover_type === 'image' && task.cover_image_url && (
            <>
              {!imgLoaded && <div className="w-full h-full skeleton" />}
              <img
                src={task.cover_image_url}
                alt=""
                className={cn('w-full h-full object-cover', !imgLoaded && 'hidden')}
                loading="lazy"
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
              />
            </>
          )}
          {task.cover_type === 'color' && (
            <div className="w-full h-full" style={{ backgroundColor: task.cover_value! }} />
          )}
          {task.cover_type === 'gradient' && (
            <div
              className="w-full h-full"
              style={{ background: GRADIENT_PRESETS[task.cover_value!] }}
            />
          )}
        </div>
      )}

      {/* Title */}
      <span className={cn(
        'text-sm font-medium text-foreground leading-snug block',
        compact ? 'line-clamp-1' : 'line-clamp-2',
      )}>
        {task.title}
      </span>

      {compact ? (
        /* Compact: inline label dots + avatars */
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex gap-1">
            {task.labels.slice(0, 5).map((l) => (
              <span
                key={l.id}
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: l.color }}
              />
            ))}
          </div>
          {visibleAssignees.length > 0 && (
            <div className="flex items-center -space-x-1.5">
              {visibleAssignees.map((a) =>
                a.user ? (
                  <Avatar key={a.id} className="size-5 ring-2 ring-card">
                    <AvatarImage src={a.user.avatar_url || undefined} />
                    <AvatarFallback className="text-[8px] bg-[var(--accent-muted-bg)] text-[var(--accent-solid)]">
                      {(a.user.full_name || a.user.username).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : a.agent ? (
                  <span
                    key={a.id}
                    className="size-5 rounded-full ring-2 ring-card flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                    style={{ backgroundColor: a.agent.color }}
                  >
                    {a.agent.name.charAt(0).toUpperCase()}
                  </span>
                ) : null
              )}
              {extraAssignees > 0 && (
                <span className="size-5 rounded-full ring-2 ring-card bg-[var(--overlay)] flex items-center justify-center text-[8px] font-semibold text-[var(--text-tertiary)] shrink-0">
                  +{extraAssignees}
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Detailed: full existing layout */
        <>
          {(task.description_text || task.description) && (
            <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mt-1.5 leading-relaxed">
              {task.description_text || (typeof task.description === 'string' ? task.description : '')}
            </p>
          )}

          {visibleLabels.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {visibleLabels.map((label) => (
                <span
                  key={label.id}
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center"
                  style={{
                    backgroundColor: `${label.color}15`,
                    color: label.color,
                    borderColor: `${label.color}25`,
                  }}
                >
                  {label.name}
                </span>
              ))}
              {extraCount > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--overlay)] text-[var(--text-tertiary)] inline-flex items-center">
                  +{extraCount}
                </span>
              )}
            </div>
          )}

          {/* Checklist progress bar */}
          {task.checklist_progress && task.checklist_progress.total > 0 && (() => {
            const { total, completed } = task.checklist_progress
            const pct = (completed / total) * 100
            const allDone = completed === total
            return (
              <div className="mt-2.5 flex items-center gap-2">
                <div className="flex-1 h-[3px] rounded-full bg-[var(--border-subtle)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: allDone ? 'rgb(16, 185, 129)' : 'var(--accent-solid)',
                    }}
                  />
                </div>
                <span className={`text-[10px] font-medium tabular-nums ${allDone ? 'text-emerald-500' : 'text-[var(--text-tertiary)]'}`}>
                  {completed}/{total}
                </span>
              </div>
            )
          })()}

          {/* Subtask progress bar */}
          {task.subtask_progress && task.subtask_progress.total > 0 && (() => {
            const { total, completed } = task.subtask_progress
            const pct = (completed / total) * 100
            const allDone = completed === total
            return (
              <div className="mt-2.5 flex items-center gap-2">
                <ListTree className="size-3 shrink-0 text-[var(--text-tertiary)]" />
                <div className="flex-1 h-[3px] rounded-full bg-[var(--border-subtle)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: allDone ? 'rgb(16, 185, 129)' : 'var(--accent-solid)',
                    }}
                  />
                </div>
                <span className={`text-[10px] font-medium tabular-nums ${allDone ? 'text-emerald-500' : 'text-[var(--text-tertiary)]'}`}>
                  {completed}/{total}
                </span>
              </div>
            )
          })()}

          {/* Expand/Collapse subtasks */}
          {task.children_count > 0 && onToggleExpand && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleExpand() }}
              className="mt-2 flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] hover:text-[var(--accent-solid)] transition-colors w-full"
            >
              {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
              <span>{isExpanded ? 'Hide' : 'Show'} {task.children_count} subtask{task.children_count !== 1 ? 's' : ''}</span>
            </button>
          )}

          {/* Expanded subtask list */}
          {isExpanded && expandedContent}

          {(task.due_date || task.comments_count > 0 || task.assignees.length > 0) && (
            <>
              <div className="border-t border-[var(--border-subtle)] mt-3 mb-2.5" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {task.due_date && (
                    <span
                      className={cn(
                        'flex items-center gap-1 text-[11px] font-medium',
                        isOverdue ? 'text-[var(--priority-urgent)]' : 'text-[var(--text-tertiary)]'
                      )}
                    >
                      <Calendar className="size-3" />
                      {formatDistanceToNow(parseISO(task.due_date), { addSuffix: true })}
                    </span>
                  )}
                  {task.comments_count > 0 && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-tertiary)]">
                      <MessageCircle className="size-3" />
                      {task.comments_count}
                    </span>
                  )}
                  {task.reactions && task.reactions.total > 0 && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-tertiary)]">
                      {task.reactions.groups.slice(0, 2).map((g) => (
                        <span key={g.emoji} className="flex items-center gap-0.5">
                          <span className="text-xs">{g.emoji}</span>
                          <span>{g.count}</span>
                        </span>
                      ))}
                      {task.reactions.groups.length > 2 && (
                        <span className="text-[10px]">+{task.reactions.groups.length - 2}</span>
                      )}
                    </span>
                  )}
                </div>

                {visibleAssignees.length > 0 && (
                  <div className="flex items-center -space-x-1.5">
                    {visibleAssignees.map((a) =>
                      a.user ? (
                        <Avatar key={a.id} className="size-5 ring-2 ring-card">
                          <AvatarImage src={a.user.avatar_url || undefined} />
                          <AvatarFallback className="text-[8px] bg-[var(--accent-muted-bg)] text-[var(--accent-solid)]">
                            {(a.user.full_name || a.user.username).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ) : a.agent ? (
                        <span
                          key={a.id}
                          className="size-5 rounded-full ring-2 ring-card flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                          style={{ backgroundColor: a.agent.color }}
                        >
                          {a.agent.name.charAt(0).toUpperCase()}
                        </span>
                      ) : null
                    )}
                    {extraAssignees > 0 && (
                      <span className="size-5 rounded-full ring-2 ring-card bg-[var(--overlay)] flex items-center justify-center text-[8px] font-semibold text-[var(--text-tertiary)] shrink-0">
                        +{extraAssignees}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
