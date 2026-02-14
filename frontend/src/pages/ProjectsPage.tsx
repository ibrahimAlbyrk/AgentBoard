import { useState, useMemo } from 'react'
import { FolderKanban, Plus, Search, SlidersHorizontal, Archive, ArchiveRestore } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useProjects, useDeleteProject } from '@/hooks/useProjects'
import { api } from '@/lib/api-client'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import type { Project } from '@/types'
import { useQueryClient } from '@tanstack/react-query'

type SortKey = 'recent' | 'name' | 'tasks'

const SORT_LABELS: Record<SortKey, string> = {
  recent: 'Recent',
  name: 'Name',
  tasks: 'Tasks',
}

export function ProjectsPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('recent')

  const { data: projectsRes, isLoading } = useProjects({ include_archived: showArchived })
  const projects = projectsRes?.data ?? []
  const deleteProject = useDeleteProject()
  const qc = useQueryClient()

  const filtered = useMemo(() => {
    let list = projects

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      )
    }

    switch (sort) {
      case 'name':
        list = [...list].sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'tasks':
        list = [...list].sort((a, b) => b.task_count - a.task_count)
        break
      case 'recent':
      default:
        list = [...list].sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )
    }

    return list
  }, [projects, showArchived, search, sort])

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

  if (isLoading) return <LoadingSpinner text="Loading projects..." />

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">Projects</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-0.5">
            Manage and organize your team's work
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-[var(--accent-solid)] text-white hover:bg-[var(--accent-solid-hover)] shadow-[0_0_16px_-4px_var(--glow)] transition-all"
        >
          <Plus className="size-4" />
          New Project
        </Button>
      </div>

      {/* Toolbar: search + filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--text-tertiary)]" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-[var(--surface)] border-[var(--border-subtle)] text-[13px]"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-[13px] text-[var(--text-secondary)]">
              <SlidersHorizontal className="size-3.5" />
              {SORT_LABELS[sort]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-36">
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <DropdownMenuItem key={key} onClick={() => setSort(key)}>
                {SORT_LABELS[key]}
                {sort === key && <span className="ml-auto text-[var(--accent-solid)]">•</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant={showArchived ? 'secondary' : 'ghost'}
          size="sm"
          className="h-9 gap-1.5 text-[13px] text-[var(--text-secondary)]"
          onClick={() => setShowArchived(!showArchived)}
        >
          {showArchived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
          {showArchived ? 'Hide archived' : 'Show archived'}
        </Button>

        <span className="text-[12px] text-[var(--text-tertiary)] ml-auto tabular-nums">
          {filtered.length} project{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={search ? 'No matching projects' : 'No projects yet'}
          description={
            search
              ? 'Try a different search term'
              : 'Create your first project to get started'
          }
          action={
            search
              ? undefined
              : { label: 'New Project', onClick: () => setShowCreate(true) }
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onEdit={(proj) => setEditProject(proj)}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

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
              Delete "{deleteTarget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
