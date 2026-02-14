import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Plus, Tag, LayoutList, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useProject } from '@/hooks/useProjects'
import { useBoard } from '@/hooks/useBoards'
import { useTasks } from '@/hooks/useTasks'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useCardDisplayMode } from '@/hooks/useCardDisplayMode'
import { useProjectStore } from '@/stores/projectStore'
import { useBoardStore } from '@/stores/boardStore'
import { KanbanBoard } from '@/components/board/KanbanBoard'
import { TaskForm } from '@/components/tasks/TaskForm'
import { TaskDetailPanel } from '@/components/board/TaskDetailPanel'
import { TaskFilters } from '@/components/tasks/TaskFilters'
import { LabelManager } from '@/components/labels/LabelManager'
import { AgentCluster } from '@/components/agents/AgentCluster'
import { AgentManager } from '@/components/agents/AgentManager'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { Task } from '@/types'

export function BoardPage() {
  const { projectId, boardId } = useParams<{ projectId: string; boardId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: projectRes, isLoading: projectLoading } = useProject(projectId!)
  const { data: boardRes, isLoading: boardLoading } = useBoard(projectId!, boardId!)
  const { data: tasksRes, isLoading: tasksLoading } = useTasks(projectId!, boardId!)
  useWebSocket(projectId!, boardId!)

  const { setCurrentProject, setCurrentBoard, setStatuses, setLabels, setMembers, setAgents, clearProject, statuses } =
    useProjectStore()
  const { setTasksForStatus, clearBoard } = useBoardStore()

  const { mode: cardMode, setMode: setCardMode } = useCardDisplayMode()
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showLabelManager, setShowLabelManager] = useState(false)
  const [showAgentManager, setShowAgentManager] = useState(false)
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
      setAgents(project.agents ?? [])
    }
    return () => {
      clearProject()
      clearBoard()
    }
  }, [projectRes, setCurrentProject, setLabels, setMembers, setAgents, clearProject, clearBoard])

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

  // Auto-open task from ?task= query param
  const pendingTaskId = searchParams.get('task')
  useEffect(() => {
    if (pendingTaskId && tasksRes?.data) {
      const found = tasksRes.data.find((t) => t.id === pendingTaskId)
      if (found) {
        setSelectedTask(found)
        searchParams.delete('task')
        setSearchParams(searchParams, { replace: true })
      }
    }
  }, [pendingTaskId, tasksRes])

  // "N" keyboard shortcut to open task creation form
  const handleAddTaskRef = useRef<((statusId?: string) => void) | null>(null)
  handleAddTaskRef.current = (statusId?: string) => {
    setDefaultStatusId(statusId)
    setShowTaskForm(true)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        handleAddTaskRef.current?.()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

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

  const agents = project.agents ?? []

  return (
    <div className="flex flex-col -m-6" style={{ height: 'calc(100% + 3rem)' }}>
      {/* Board header */}
      <div className="shrink-0 px-6 py-4 border-b border-[var(--border-subtle)] bg-background">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">{project.icon || '📋'}</span>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">
                <Link to={`/projects/${projectId}`} className="hover:text-[var(--accent-solid)] transition-colors">{project.name}</Link>
                <span className="text-[var(--text-secondary)] font-normal"> / {board.name}</span>
              </h1>
              {board.description && (
                <p className="text-[13px] text-[var(--text-secondary)]">{board.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <AgentCluster
              agents={agents}
              onManageClick={() => setShowAgentManager(true)}
            />

            <div className="w-px h-6 bg-[var(--border-subtle)]" />

            <div className="flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-0.5">
              <button
                onClick={() => setCardMode('compact')}
                className={cn(
                  'size-7 rounded-md flex items-center justify-center transition-all duration-150',
                  cardMode === 'compact'
                    ? 'bg-[var(--accent-solid)] text-white shadow-sm'
                    : 'text-[var(--text-tertiary)] hover:text-foreground'
                )}
                title="Compact view"
              >
                <LayoutList className="size-3.5" />
              </button>
              <button
                onClick={() => setCardMode('detailed')}
                className={cn(
                  'size-7 rounded-md flex items-center justify-center transition-all duration-150',
                  cardMode === 'detailed'
                    ? 'bg-[var(--accent-solid)] text-white shadow-sm'
                    : 'text-[var(--text-tertiary)] hover:text-foreground'
                )}
                title="Detailed view"
              >
                <LayoutGrid className="size-3.5" />
              </button>
            </div>
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
              title="New Task (N)"
              className="bg-[var(--accent-solid)] text-white hover:bg-[var(--accent-solid-hover)] shadow-[0_0_16px_-4px_var(--glow)] transition-all"
            >
              <Plus className="size-4" />
              New Task
              <kbd className="ml-1.5 px-1.5 py-0.5 text-[10px] font-mono rounded bg-white/20 leading-none">N</kbd>
            </Button>
          </div>
        </div>
        <TaskFilters />
      </div>

      {/* Board area: fills remaining space, scrolls independently */}
      <div className="flex-1 min-h-0 overflow-auto">
        <KanbanBoard
          onTaskClick={setSelectedTask}
          onAddTask={handleAddTask}
          compact={cardMode === 'compact'}
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

      <AgentManager
        projectId={projectId!}
        open={showAgentManager}
        onClose={() => setShowAgentManager(false)}
      />
    </div>
  )
}
