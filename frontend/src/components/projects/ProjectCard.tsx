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
      className="stagger-item bg-card border border-[var(--border-subtle)] rounded-xl cursor-pointer card-hover overflow-hidden"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      {/* Color accent bar */}
      <div
        className="h-1"
        style={{ backgroundColor: project.color || '#6C5CE7' }}
      />

      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl">{project.icon || '📋'}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[14px] text-foreground truncate">{project.name}</h3>
            {project.description && (
              <p className="text-[13px] text-[var(--text-secondary)] line-clamp-2 mt-0.5 leading-relaxed">
                {project.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <span className="inline-flex items-center gap-1.5 bg-[var(--surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] text-[11px] font-medium px-2.5 py-1 rounded-full">
            <Users className="size-3" />
            {project.member_count}
          </span>
          <span className="inline-flex items-center bg-[var(--surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] text-[11px] font-medium px-2.5 py-1 rounded-full">
            {project.task_count} tasks
          </span>
        </div>

        {project.task_count > 0 && (
          <div className="mt-3">
            <div className="h-1 bg-[var(--overlay)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all bg-gradient-to-r from-[var(--accent-solid)] to-[var(--accent-solid)]/60"
                style={{ width: '0%' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
