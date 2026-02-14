import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from '@/lib/toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateProject, useUpdateProject } from '@/hooks/useProjects'
import type { Project } from '@/types'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface ProjectFormProps {
  open: boolean
  onClose: () => void
  project?: Project | null
}

export function ProjectForm({ open, onClose, project }: ProjectFormProps) {
  const navigate = useNavigate()
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const isEditing = !!project

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { color: '#6366f1' },
  })

  useEffect(() => {
    if (project) {
      reset({
        name: project.name,
        description: project.description || '',
        icon: project.icon || '',
        color: project.color || '#6366f1',
      })
    } else {
      reset({ name: '', description: '', icon: '', color: '#6366f1' })
    }
  }, [project, reset])

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing) {
        await updateProject.mutateAsync({ projectId: project.id, data })
        toast.success('Project updated')
      } else {
        const res = await createProject.mutateAsync(data)
        toast.success('Project created')
        if (res?.data?.id) {
          reset({ name: '', description: '', icon: '', color: '#6366f1' })
          onClose()
          navigate(`/projects/${res.data.id}`)
          return
        }
      }
      reset({ name: '', description: '', icon: '', color: '#6366f1' })
      onClose()
    } catch (err) {
      toast.error(err)
    }
  }

  const isPending = createProject.isPending || updateProject.isPending

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Project' : 'New Project'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="My Project"
              {...register('name')}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What is this project about?"
              {...register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="icon">Icon (emoji)</Label>
              <Input
                id="icon"
                placeholder="📋"
                {...register('icon')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                type="color"
                {...register('color')}
                className="h-9 p-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {isPending
                ? isEditing ? 'Saving...' : 'Creating...'
                : isEditing ? 'Save Changes' : 'Create Project'
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
