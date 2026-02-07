import { useNavigate } from 'react-router-dom'
import { FolderKanban, CheckSquare, Clock, AlertTriangle } from 'lucide-react'
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

  const stats = [
    { label: 'Total Projects', value: projects.length, icon: FolderKanban, color: 'text-primary', bg: 'bg-[var(--accent-muted-bg)]' },
    { label: 'Total Tasks', value: projects.reduce((sum, p) => sum + p.task_count, 0), icon: CheckSquare, color: 'text-[var(--success)]', bg: 'bg-[var(--success-muted)]' },
    { label: 'In Progress', value: '-', icon: Clock, color: 'text-[var(--warning)]', bg: 'bg-[var(--warning-muted)]' },
    { label: 'Overdue', value: '-', icon: AlertTriangle, color: 'text-destructive', bg: 'bg-[var(--destructive)]/10' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-semibold">
        Welcome back, {user?.full_name || user?.username}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card border border-[var(--border-subtle)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-medium text-muted-foreground">{s.label}</p>
              <div className={`size-7 rounded-lg flex items-center justify-center ${s.bg}`}>
                <s.icon className={`size-3.5 ${s.color}`} />
              </div>
            </div>
            <p className="text-[22px] font-semibold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Your Projects</h2>
        {projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Create your first project to get started"
            action={{ label: 'Create Project', onClick: () => navigate('/projects') }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
