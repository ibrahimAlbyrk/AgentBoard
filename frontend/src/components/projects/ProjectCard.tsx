import { useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import type { Project } from '@/types'

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate()

  return (
    <div
      className="stagger-item bg-card border border-[var(--border-subtle)] rounded-xl cursor-pointer hover:-translate-y-0.5 transition-all duration-150"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <div
        className="h-1 rounded-t-xl"
        style={{ backgroundColor: project.color || '#6366f1' }}
      />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{project.icon || '📋'}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{project.name}</h3>
            {project.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {project.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <span className="inline-flex items-center gap-1 bg-[var(--surface)] border border-[var(--border-subtle)] text-muted-foreground text-xs px-2 py-0.5 rounded-md">
            <Users className="size-3" />
            {project.member_count}
          </span>
          <span className="inline-flex items-center bg-[var(--surface)] border border-[var(--border-subtle)] text-muted-foreground text-xs px-2 py-0.5 rounded-md">
            {project.task_count} tasks
          </span>
        </div>

        {project.task_count > 0 && (
          <div className="mt-3">
            <div className="h-1.5 bg-[var(--surface)] rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: '0%' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
