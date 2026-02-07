import { useNavigate } from 'react-router-dom'
import { FolderKanban, CheckSquare, Clock, AlertTriangle, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useProjects } from '@/hooks/useProjects'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'

export function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { data: projectsRes, isLoading } = useProjects()
  const projects = projectsRes?.data ?? []

  if (isLoading) return <LoadingSpinner text="Loading dashboard..." />

  const totalTasks = projects.reduce((sum, p) => sum + p.task_count, 0)

  const stats = [
    {
      label: 'Total Projects',
      value: projects.length,
      icon: FolderKanban,
      color: 'text-[var(--accent-solid)]',
      bg: 'bg-[var(--accent-muted-bg)]',
      ring: 'ring-[var(--accent-solid)]/10',
    },
    {
      label: 'Total Tasks',
      value: totalTasks,
      icon: CheckSquare,
      color: 'text-[var(--success)]',
      bg: 'bg-[var(--success-muted)]',
      ring: 'ring-[var(--success)]/10',
    },
    {
      label: 'In Progress',
      value: '-',
      icon: Clock,
      color: 'text-[var(--warning)]',
      bg: 'bg-[var(--warning-muted)]',
      ring: 'ring-[var(--warning)]/10',
    },
    {
      label: 'Overdue',
      value: '-',
      icon: AlertTriangle,
      color: 'text-[var(--destructive)]',
      bg: 'bg-[var(--destructive)]/8',
      ring: 'ring-[var(--destructive)]/10',
    },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Greeting */}
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">
          Welcome back, {user?.full_name || user?.username}
        </h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">
          Here&apos;s what&apos;s happening across your projects
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="bg-card border border-[var(--border-subtle)] rounded-xl p-5 card-hover"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] font-medium text-[var(--text-secondary)]">{s.label}</p>
              <div className={`size-8 rounded-lg flex items-center justify-center ${s.bg} ring-1 ${s.ring}`}>
                <s.icon className={`size-4 ${s.color}`} />
              </div>
            </div>
            <p className="text-[28px] font-bold text-foreground leading-none tracking-tight">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Your Projects</h2>
          {projects.length > 0 && (
            <button
              onClick={() => navigate('/projects')}
              className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--accent-solid)] hover:text-[var(--accent-solid-hover)] transition-colors"
            >
              View all
              <ArrowRight className="size-3.5" />
            </button>
          )}
        </div>
        {projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Create your first project to get started"
            action={{ label: 'Create Project', onClick: () => navigate('/projects') }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 6).map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
