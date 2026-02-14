import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FolderKanban, CheckSquare, Clock, AlertTriangle, ArrowRight, Plus,
  Circle, Rocket,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { useAuthStore } from '@/stores/authStore'
import { useProjects, useDeleteProject } from '@/hooks/useProjects'
import { api } from '@/lib/api-client'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { MyTasksSection } from '@/components/dashboard/MyTasksSection'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import type { Project } from '@/types'

const ONBOARDING_KEY = 'agentboard_onboarding_dismissed'

export function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const { data: projectsRes, isLoading } = useProjects()
  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.getDashboardStats(),
  })
  const deleteProject = useDeleteProject()
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    () => localStorage.getItem(ONBOARDING_KEY) === 'true'
  )
  const projects = projectsRes?.data ?? []

  const totalTasks = dashboardStats?.data?.total_tasks ?? 0

  useEffect(() => {
    if (onboardingDismissed) {
      localStorage.setItem(ONBOARDING_KEY, 'true')
    }
  }, [onboardingDismissed])

  const handleArchive = async (project: Project) => {
    try {
      if (project.is_archived) {
        await api.unarchiveProject(project.id)
        toast.success(`"${project.name}" unarchived`)
      } else {
        await api.archiveProject(project.id)
        toast.success(`"${project.name}" archived`)
      }
      qc.invalidateQueries({ queryKey: ['projects'] })
    } catch (err) {
      toast.error(err)
    }
  }

  const handleDelete = (project: Project) => {
    setDeleteTarget(project)
  }

  const handleConfirmedDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteProject.mutateAsync(deleteTarget.id)
      toast.success(`"${deleteTarget.name}" deleted`)
    } catch (err) {
      toast.error(err)
    } finally {
      setDeleteTarget(null)
    }
  }

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
      value: dashboardStats?.data?.in_progress ?? 0,
      icon: Clock,
      color: 'text-[var(--warning)]',
      bg: 'bg-[var(--warning-muted)]',
      ring: 'ring-[var(--warning)]/10',
    },
    {
      label: 'Overdue',
      value: dashboardStats?.data?.overdue ?? 0,
      icon: AlertTriangle,
      color: 'text-[var(--destructive)]',
      bg: 'bg-[var(--destructive)]/8',
      ring: 'ring-[var(--destructive)]/10',
    },
  ]

  const showOnboarding = projects.length === 0 && !onboardingDismissed && !isLoading

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <PageHeader
        title={`Welcome back, ${user?.full_name || user?.username}`}
        description="Here's what's happening across your projects"
      />

      {/* Stats — skeleton while loading */}
      {isLoading || statsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-[var(--border-subtle)] rounded-xl p-5 animate-pulse">
              <div className="flex items-center justify-between mb-2">
                <div className="h-3 w-20 bg-[var(--overlay)] rounded" />
                <div className="size-9 bg-[var(--overlay)] rounded-lg" />
              </div>
              <div className="h-8 w-16 bg-[var(--overlay)] rounded mt-1" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => {
            const isOverdue = s.label === 'Overdue' && s.value > 0
            return (
              <div
                key={s.label}
                className={cn(
                  'bg-card border rounded-xl p-5',
                  isOverdue
                    ? 'border-red-500/30 bg-red-500/[0.04]'
                    : 'border-[var(--border-subtle)]',
                )}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[13px] font-medium text-[var(--text-secondary)]">{s.label}</p>
                  <div className={cn(
                    'size-8 rounded-lg flex items-center justify-center ring-1',
                    s.bg, s.ring,
                    isOverdue && 'animate-pulse',
                  )}>
                    <s.icon className={`size-4 ${s.color}`} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground leading-none tracking-tight">{s.value}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Onboarding checklist for new users */}
      {showOnboarding && (
        <div className="bg-card border border-[var(--accent-solid)]/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-[var(--accent-muted-bg)] flex items-center justify-center">
                <Rocket className="size-5 text-[var(--accent-solid)]" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Get started with AgentBoard</h2>
                <p className="text-[13px] text-[var(--text-secondary)]">Follow these steps to set up your workspace</p>
              </div>
            </div>
            <button
              onClick={() => setOnboardingDismissed(true)}
              className="text-[12px] text-[var(--text-tertiary)] hover:text-foreground transition-colors"
            >
              Dismiss
            </button>
          </div>
          <div className="space-y-3">
            {[
              { step: 1, label: 'Create your first project', action: () => setShowCreate(true) },
              { step: 2, label: 'Add a board to your project' },
              { step: 3, label: 'Create your first task' },
            ].map((item) => (
              <div
                key={item.step}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)]',
                  item.action && 'cursor-pointer hover:border-[var(--accent-solid)]/30 transition-colors',
                )}
                onClick={item.action}
              >
                <Circle className="size-5 text-[var(--text-tertiary)] shrink-0" />
                <span className="text-sm font-medium text-foreground">
                  {item.step}. {item.label}
                </span>
                {item.action && (
                  <ArrowRight className="size-4 text-[var(--text-tertiary)] ml-auto" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Tasks */}
      <MyTasksSection />

      {/* Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Your Projects</h2>
            <button
              onClick={() => setShowCreate(true)}
              className="size-7 rounded-lg flex items-center justify-center bg-[var(--accent-muted-bg)] text-[var(--accent-solid)] hover:bg-[var(--accent-solid)] hover:text-white transition-all"
              title="Create project"
            >
              <Plus className="size-4" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            {projects.length > 6 && (
              <span className="text-[12px] text-[var(--text-tertiary)]">
                Showing 6 of {projects.length} projects
              </span>
            )}
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
        </div>
        {projects.length === 0 && !showOnboarding ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Create your first project to get started"
            action={{ label: 'Create Project', onClick: () => setShowCreate(true) }}
          />
        ) : projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 6).map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onEdit={(proj) => setEditProject(proj)}
                onArchive={handleArchive}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : null}
      </div>

      <ProjectForm
        open={showCreate || !!editProject}
        onClose={() => {
          setShowCreate(false)
          setEditProject(null)
        }}
        project={editProject}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &ldquo;{deleteTarget?.name}&rdquo;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
