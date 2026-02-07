import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProject } from '@/hooks/useProjects'
import { useTasks } from '@/hooks/useTasks'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useProjectStore } from '@/stores/projectStore'
import { useBoardStore } from '@/stores/boardStore'
import { KanbanBoard } from '@/components/board/KanbanBoard'
import { TaskForm } from '@/components/tasks/TaskForm'
import { TaskDetailPanel } from '@/components/board/TaskDetailPanel'
import { TaskFilters } from '@/components/tasks/TaskFilters'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { Task } from '@/types'

export function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: projectRes, isLoading: projectLoading } = useProject(projectId!)
  const { data: tasksRes, isLoading: tasksLoading } = useTasks(projectId!)
  useWebSocket(projectId!)

  const { setCurrentProject, setStatuses, setLabels, setMembers, clearProject, statuses } =
    useProjectStore()
  const { setTasksForStatus, clearBoard } = useBoardStore()

  const [showTaskForm, setShowTaskForm] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const selectedTaskRef = useRef(selectedTask)
  selectedTaskRef.current = selectedTask
  const [defaultStatusId, setDefaultStatusId] = useState<string>()

  useEffect(() => {
    if (projectRes?.data) {
      const project = projectRes.data
      setCurrentProject(project)
      setStatuses(project.statuses)
      setLabels(project.labels)
      setMembers(project.members)
    }
    return () => {
      clearProject()
      clearBoard()
    }
  }, [projectRes, setCurrentProject, setStatuses, setLabels, setMembers, clearProject, clearBoard])

  useEffect(() => {
    if (tasksRes?.data && statuses.length > 0) {
      const tasks = tasksRes.data
      for (const status of statuses) {
        setTasksForStatus(
          status.id,
          tasks.filter((t) => t.status.id === status.id)
        )
      }
      // Sync selected task with fresh data
      if (selectedTaskRef.current) {
        const updated = tasks.find((t) => t.id === selectedTaskRef.current!.id)
        if (updated) setSelectedTask(updated)
        else setSelectedTask(null)
      }
    }
  }, [tasksRes, statuses, setTasksForStatus])

  if (projectLoading || tasksLoading) {
    return <LoadingSpinner text="Loading project..." />
  }

  const project = projectRes?.data
  if (!project) {
    return <div className="text-center py-16 text-[var(--text-secondary)]">Project not found</div>
  }

  const handleAddTask = (statusId?: string) => {
    setDefaultStatusId(statusId)
    setShowTaskForm(true)
  }

  return (
    <div className="flex flex-col h-full -m-6">
      <div className="px-6 py-4 border-b border-[var(--border-subtle)] bg-background/60 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">{project.icon || '📋'}</span>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">{project.name}</h1>
              {project.description && (
                <p className="text-[13px] text-[var(--text-secondary)]">{project.description}</p>
              )}
            </div>
          </div>
          <Button
            onClick={() => handleAddTask()}
            className="bg-[var(--accent-solid)] text-white hover:bg-[var(--accent-solid-hover)] shadow-[0_0_16px_-4px_var(--glow)] transition-all"
          >
            <Plus className="size-4" />
            New Task
          </Button>
        </div>
        <TaskFilters />
      </div>

      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          onTaskClick={setSelectedTask}
          onAddTask={handleAddTask}
        />
      </div>

      <TaskForm
        projectId={projectId!}
        open={showTaskForm}
        onClose={() => setShowTaskForm(false)}
        defaultStatusId={defaultStatusId}
      />

      <TaskDetailPanel
        task={selectedTask}
        projectId={projectId!}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  )
}
