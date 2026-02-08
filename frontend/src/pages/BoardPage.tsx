import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProject } from '@/hooks/useProjects'
import { useBoard } from '@/hooks/useBoards'
import { useTasks } from '@/hooks/useTasks'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useProjectStore } from '@/stores/projectStore'
import { useBoardStore } from '@/stores/boardStore'
import { KanbanBoard } from '@/components/board/KanbanBoard'
import { TaskForm } from '@/components/tasks/TaskForm'
import { TaskDetailPanel } from '@/components/board/TaskDetailPanel'
import { TaskFilters } from '@/components/tasks/TaskFilters'
import { LabelManager } from '@/components/labels/LabelManager'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { Task } from '@/types'

export function BoardPage() {
  const { projectId, boardId } = useParams<{ projectId: string; boardId: string }>()
  const { data: projectRes, isLoading: projectLoading } = useProject(projectId!)
  const { data: boardRes, isLoading: boardLoading } = useBoard(projectId!, boardId!)
  const { data: tasksRes, isLoading: tasksLoading } = useTasks(projectId!, boardId!)
  useWebSocket(projectId!, boardId!)

  const { setCurrentProject, setCurrentBoard, setStatuses, setLabels, setMembers, clearProject, statuses } =
    useProjectStore()
  const { setTasksForStatus, clearBoard } = useBoardStore()

  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showLabelManager, setShowLabelManager] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const selectedTaskRef = useRef(selectedTask)
  selectedTaskRef.current = selectedTask
  const [defaultStatusId, setDefaultStatusId] = useState<string>()

  useEffect(() => {
    if (projectRes?.data) {
      const project = projectRes.data
      setCurrentProject(project)
      setLabels(project.labels)
      setMembers(project.members)
    }
    return () => {
      clearProject()
      clearBoard()
    }
  }, [projectRes, setCurrentProject, setLabels, setMembers, clearProject, clearBoard])

  useEffect(() => {
    if (boardRes?.data) {
      const board = boardRes.data
      setCurrentBoard(board)
      setStatuses(board.statuses)
    }
  }, [boardRes, setCurrentBoard, setStatuses])

  useEffect(() => {
    if (tasksRes?.data && statuses.length > 0) {
      const tasks = tasksRes.data
      for (const status of statuses) {
        setTasksForStatus(
          status.id,
          tasks.filter((t) => t.status.id === status.id)
        )
      }
      if (selectedTaskRef.current) {
        const updated = tasks.find((t) => t.id === selectedTaskRef.current!.id)
        if (updated) setSelectedTask(updated)
        else setSelectedTask(null)
      }
    }
  }, [tasksRes, statuses, setTasksForStatus])

  if (projectLoading || boardLoading || tasksLoading) {
    return <LoadingSpinner text="Loading board..." />
  }

  const project = projectRes?.data
  const board = boardRes?.data
  if (!project || !board) {
    return <div className="text-center py-16 text-[var(--text-secondary)]">Board not found</div>
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
              <h1 className="text-lg font-bold text-foreground tracking-tight">
                {project.name} <span className="text-[var(--text-secondary)] font-normal">/ {board.name}</span>
              </h1>
              {board.description && (
                <p className="text-[13px] text-[var(--text-secondary)]">{board.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowLabelManager(true)}
              className="border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-foreground hover:bg-[var(--surface)]"
            >
              <Tag className="size-4" />
              Labels
            </Button>
            <Button
              onClick={() => handleAddTask()}
              className="bg-[var(--accent-solid)] text-white hover:bg-[var(--accent-solid-hover)] shadow-[0_0_16px_-4px_var(--glow)] transition-all"
            >
              <Plus className="size-4" />
              New Task
            </Button>
          </div>
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
        boardId={boardId!}
        open={showTaskForm}
        onClose={() => setShowTaskForm(false)}
        defaultStatusId={defaultStatusId}
      />

      <TaskDetailPanel
        task={selectedTask}
        projectId={projectId!}
        boardId={boardId!}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
      />

      <LabelManager
        projectId={projectId!}
        open={showLabelManager}
        onClose={() => setShowLabelManager(false)}
      />
    </div>
  )
}
