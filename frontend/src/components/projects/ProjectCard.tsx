import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow, parseISO } from 'date-fns'
import {
  Users,
  MoreHorizontal,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  ArrowRight,
  ListTodo,
} from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn, hexToRgb } from '@/lib/utils'
import type { Project } from '@/types'

interface ProjectCardProps {
  project: Project
  onEdit?: (project: Project) => void
  onArchive?: (project: Project) => void
  onDelete?: (project: Project) => void
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function ProjectCard({ project, onEdit, onArchive, onDelete }: ProjectCardProps) {
  const navigate = useNavigate()
  const color = project.color || '#3B82F6'
  const rgb = hexToRgb(color)

  const updatedAgo = formatDistanceToNow(parseISO(project.updated_at), { addSuffix: true })

  return (
    <div
      className={cn(
        'stagger-item group relative bg-card rounded-2xl cursor-pointer overflow-hidden transition-all duration-300 border border-[var(--border-subtle)] hover:border-[var(--border-strong)]',
        project.is_archived && 'opacity-60',
      )}
      onClick={() => navigate(`/projects/${project.id}`)}
      style={{
        '--project-color': color,
        '--project-rgb': rgb,
      } as React.CSSProperties}
    >
      {/* Gradient accent band */}
      <div
        className="h-1.5 w-full"
        style={{
          background: `linear-gradient(135deg, ${color}, ${color}88, ${color}44)`,
        }}
      />

      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
        style={{
          boxShadow: `inset 0 0 60px -20px rgb(${rgb} / 0.06), 0 8px 32px -8px rgb(${rgb} / 0.12)`,
        }}
      />

      <div className="p-5 relative">
        {/* Top row: icon + title + menu */}
        <div className="flex items-start gap-3.5">
          {/* Project icon — large, with tinted bg */}
          <div
            className="size-11 rounded-xl flex items-center justify-center shrink-0 text-2xl transition-transform duration-300 group-hover:scale-110"
            style={{
              backgroundColor: `rgb(${rgb} / 0.1)`,
            }}
          >
            {project.icon || '📋'}
          </div>

          <div className="flex-1 min-w-0">
            <h3 title={project.name} className="font-semibold text-[16px] text-foreground truncate leading-tight">
              {project.name}
            </h3>
            {project.description && (
              <p className="text-[13px] text-[var(--text-secondary)] line-clamp-2 mt-1 leading-relaxed">
                {project.description}
              </p>
            )}
          </div>

          {/* Context menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="size-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--overlay)] shrink-0 -mt-0.5 -mr-1"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="size-4 text-[var(--text-secondary)]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit?.(project)
                }}
              >
                <Pencil className="size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onArchive?.(project)
                }}
              >
                {project.is_archived ? (
                  <>
                    <ArchiveRestore className="size-4" />
                    Unarchive
                  </>
                ) : (
                  <>
                    <Archive className="size-4" />
                    Archive
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete?.(project)
                }}
              >
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-2 mt-4">
          <span className="inline-flex items-center gap-1.5 bg-[var(--overlay)] text-[var(--text-secondary)] text-[11px] font-medium px-2.5 py-1 rounded-full">
            <Users className="size-3" />
            {project.member_count}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-[var(--overlay)] text-[var(--text-secondary)] text-[11px] font-medium px-2.5 py-1 rounded-full">
            <ListTodo className="size-3" />
            {project.task_count}
          </span>
          {project.is_archived && (
            <span className="inline-flex items-center gap-1 bg-[var(--warning-muted)] text-[var(--warning)] text-[11px] font-medium px-2.5 py-1 rounded-full">
              <Archive className="size-3" />
              Archived
            </span>
          )}
        </div>

        {/* Footer: owner + updated time + arrow */}
        <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar size="sm">
              {project.owner.avatar_url && (
                <AvatarImage src={project.owner.avatar_url} alt={project.owner.full_name || project.owner.username} />
              )}
              <AvatarFallback className="text-[10px] font-medium">
                {getInitials(project.owner.full_name || project.owner.username)}
              </AvatarFallback>
            </Avatar>
            <span className="text-[12px] text-[var(--text-tertiary)] truncate">
              {updatedAgo}
            </span>
          </div>

          <div className="size-7 rounded-lg flex items-center justify-center bg-[var(--overlay)] opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0 -translate-x-1">
            <ArrowRight className="size-3.5 text-[var(--text-secondary)]" />
          </div>
        </div>
      </div>
    </div>
  )
}
