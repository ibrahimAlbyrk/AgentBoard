import { useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Project } from '@/types'

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate()

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <div
        className="h-2 rounded-t-xl"
        style={{ backgroundColor: project.color || '#6366f1' }}
      />
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{project.icon || '📋'}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{project.name}</h3>
            {project.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {project.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <Badge variant="secondary" className="gap-1">
            <Users className="size-3" />
            {project.member_count}
          </Badge>
          <Badge variant="secondary">
            {project.task_count} tasks
          </Badge>
        </div>

        {project.task_count > 0 && (
          <div className="mt-3">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: '0%' }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
