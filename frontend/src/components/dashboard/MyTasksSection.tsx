import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  ListChecks,
  MessageCircle,
} from 'lucide-react'
import { formatDistanceToNow, isPast, isToday, parseISO, addDays, isBefore } from 'date-fns'
import { cn } from '@/lib/utils'
import { useMyTasks } from '@/hooks/useMyTasks'
import type { DashboardTask, MyTasksSummary } from '@/types'

const priorityColors: Record<string, string> = {
  urgent: 'var(--priority-urgent)',
  high: 'var(--priority-high)',
  medium: 'var(--priority-medium)',
  low: 'var(--priority-low)',
  none: 'var(--priority-none)',
}

const priorityLabels: Record<string, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  none: '',
}

// --- Urgency Banner ---

function UrgencyBanner({ summary }: { summary: MyTasksSummary }) {
  const { overdue_count, due_today_count, due_this_week_count, total_assigned } = summary
  const hasUrgency = overdue_count > 0 || due_today_count > 0

  if (total_assigned === 0) return null

  const segments = [
    { count: overdue_count, label: 'overdue', color: 'var(--destructive)' },
    { count: due_today_count, label: 'due today', color: 'var(--warning)' },
    { count: due_this_week_count, label: 'this week', color: 'var(--accent-solid)' },
  ].filter((s) => s.count > 0)

  const barTotal = overdue_count + due_today_count + due_this_week_count
  const allClear = !hasUrgency && due_this_week_count === 0

  return (
    <div
      className={cn(
        'rounded-xl border px-5 py-4 transition-all duration-300',
        overdue_count > 0
          ? 'bg-[var(--destructive)]/[0.04] border-[var(--destructive)]/15'
          : allClear
            ? 'bg-[var(--success)]/[0.04] border-[var(--success)]/15'
            : 'bg-card border-[var(--border-subtle)]',
      )}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          {segments.map((seg) => (
            <div key={seg.label} className="flex items-center gap-1.5">
              {seg.label === 'overdue' && (
                <span className="relative flex size-2">
                  <span
                    className="animate-ping absolute inline-flex size-full rounded-full opacity-75"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span
                    className="relative inline-flex rounded-full size-2"
                    style={{ backgroundColor: seg.color }}
                  />
                </span>
              )}
              {seg.label !== 'overdue' && (
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: seg.color }}
                />
              )}
              <span className="text-[13px] font-semibold" style={{ color: seg.color }}>
                {seg.count}
              </span>
              <span className="text-[12px] text-[var(--text-secondary)]">{seg.label}</span>
            </div>
          ))}
          {allClear && (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-[var(--success)]" />
              <span className="text-[13px] font-medium text-[var(--success)]">All clear</span>
              <span className="text-[12px] text-[var(--text-secondary)]">
                — no urgent deadlines
              </span>
            </div>
          )}
        </div>

        <span className="text-[12px] text-[var(--text-tertiary)] tabular-nums font-medium">
          {total_assigned} assigned
        </span>
      </div>

      {/* Segmented progress bar */}
      {barTotal > 0 && (
        <div className="mt-3 h-1.5 rounded-full bg-[var(--overlay)] overflow-hidden flex">
          {segments.map((seg, i) => (
            <div
              key={seg.label}
              className="h-full transition-all duration-700 ease-out"
              style={{
                width: `${(seg.count / barTotal) * 100}%`,
                backgroundColor: seg.color,
                opacity: 0.8,
                borderRadius:
                  i === 0 && segments.length > 1
                    ? '9999px 0 0 9999px'
                    : i === segments.length - 1 && segments.length > 1
                      ? '0 9999px 9999px 0'
                      : segments.length === 1
                        ? '9999px'
                        : '0',
                animationDelay: `${i * 150}ms`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// --- Dashboard Task Row ---

function DashboardTaskRow({ task }: { task: DashboardTask }) {
  const navigate = useNavigate()
  const isOverdue = task.due_date && isPast(parseISO(task.due_date))
  const isDueToday = task.due_date && isToday(parseISO(task.due_date))
  const visibleLabels = task.labels.slice(0, 2)
  const extraCount = task.labels.length - 2

  const handleClick = () => {
    navigate(`/projects/${task.project_id}/boards/${task.board_id}?task=${task.id}`)
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all duration-200',
        'hover:bg-[var(--overlay)] hover:translate-x-1',
        isOverdue && 'bg-[var(--destructive)]/[0.03]',
      )}
    >
      {/* Priority bar */}
      <div
        className={cn('w-1 self-stretch rounded-full shrink-0', isOverdue && 'animate-pulse')}
        style={{ backgroundColor: priorityColors[task.priority] }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-foreground truncate">
            {task.title}
          </span>
          {task.priority !== 'none' && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0"
              style={{
                backgroundColor: `${priorityColors[task.priority]}15`,
                color: priorityColors[task.priority],
              }}
            >
              {priorityLabels[task.priority]}
            </span>
          )}
          {task.agent_creator && (
            <span
              className="shrink-0 size-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
              style={{ backgroundColor: task.agent_creator.color }}
              title={`Created by ${task.agent_creator.name}`}
            >
              {task.agent_creator.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1">
          {/* Project chip */}
          <span className="text-[11px] font-medium text-[var(--accent-solid)] bg-[var(--accent-muted-bg)] px-1.5 py-0.5 rounded truncate max-w-[120px]">
            {task.project_name}
          </span>

          {/* Status */}
          <span className="flex items-center gap-1">
            <span
              className="size-1.5 rounded-full shrink-0"
              style={{ backgroundColor: task.status.color || 'var(--text-tertiary)' }}
            />
            <span className="text-[11px] text-[var(--text-tertiary)] truncate">
              {task.status.name}
            </span>
          </span>

          {/* Labels */}
          {visibleLabels.map((label) => (
            <span
              key={label.id}
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border hidden sm:inline-flex"
              style={{
                backgroundColor: `${label.color}12`,
                color: label.color,
                borderColor: `${label.color}20`,
              }}
            >
              {label.name}
            </span>
          ))}
          {extraCount > 0 && (
            <span className="text-[10px] text-[var(--text-tertiary)] hidden sm:inline">
              +{extraCount}
            </span>
          )}
        </div>
      </div>

      {/* Right side: due date, comments, assignee */}
      <div className="flex items-center gap-3 shrink-0">
        {task.due_date && (
          <span
            className={cn(
              'flex items-center gap-1 text-[11px] font-medium whitespace-nowrap',
              isOverdue
                ? 'text-[var(--destructive)] font-semibold'
                : isDueToday
                  ? 'text-[var(--warning)] font-semibold'
                  : 'text-[var(--text-tertiary)]',
            )}
          >
            <Calendar className="size-3" />
            {formatDistanceToNow(parseISO(task.due_date), { addSuffix: true })}
          </span>
        )}

        {task.comments_count > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)]">
            <MessageCircle className="size-3" />
            {task.comments_count}
          </span>
        )}

        <ChevronRight className="size-3.5 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  )
}

// --- Task Group ---

function TaskGroup({
  title,
  icon: Icon,
  color,
  tasks,
}: {
  title: string
  icon: typeof AlertTriangle
  color: string
  tasks: DashboardTask[]
}) {
  if (tasks.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-1 px-4">
        <Icon className="size-3.5" style={{ color }} />
        <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color }}>
          {title}
        </span>
        <span className="text-[11px] text-[var(--text-tertiary)] tabular-nums">
          {tasks.length}
        </span>
      </div>
      <div className="space-y-0.5">
        {tasks.map((task, i) => (
          <div
            key={task.id}
            className="stagger-item"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <DashboardTaskRow task={task} />
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Main Section ---

export function MyTasksSection() {
  const { data, isLoading } = useMyTasks()

  const myTasks = data?.data
  const summary = myTasks?.summary
  const tasks = myTasks?.tasks ?? []

  const { overdue, dueSoon, active } = useMemo(() => {
    const now = new Date()
    const weekEnd = addDays(now, 7)

    const overdue: DashboardTask[] = []
    const dueSoon: DashboardTask[] = []
    const active: DashboardTask[] = []

    for (const t of tasks) {
      if (t.due_date && isPast(parseISO(t.due_date))) {
        overdue.push(t)
      } else if (t.due_date && isBefore(parseISO(t.due_date), weekEnd)) {
        dueSoon.push(t)
      } else {
        active.push(t)
      }
    }
    return { overdue, dueSoon, active }
  }, [tasks])

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-5 w-32 skeleton" />
        <div className="h-16 skeleton" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 skeleton" />
          ))}
        </div>
      </div>
    )
  }

  if (!summary || summary.total_assigned === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-4">My Tasks</h2>
        <div className="flex flex-col items-center justify-center py-14 text-center bg-card border border-[var(--border-subtle)] rounded-xl">
          <div className="size-12 rounded-xl bg-[var(--accent-muted-bg)] flex items-center justify-center mb-4 animate-float">
            <ListChecks className="size-5 text-[var(--accent-solid)]" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">No tasks assigned</h3>
          <p className="text-[12px] text-[var(--text-secondary)] max-w-xs leading-relaxed">
            Tasks assigned to you across all projects will appear here
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-lg font-semibold">My Tasks</h2>

      <UrgencyBanner summary={summary} />

      <div className="bg-card border border-[var(--border-subtle)] rounded-xl py-3 space-y-4">
        <TaskGroup
          title="Overdue"
          icon={AlertTriangle}
          color="var(--destructive)"
          tasks={overdue}
        />
        <TaskGroup
          title="Due Soon"
          icon={Clock}
          color="var(--warning)"
          tasks={dueSoon}
        />
        <TaskGroup
          title="Active"
          icon={ListChecks}
          color="var(--text-secondary)"
          tasks={active}
        />
      </div>
    </div>
  )
}
