import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, LayoutGrid, ListTodo, Users, Trash2, Pencil, MoreHorizontal, ArrowRight, Bot, Settings } from 'lucide-react'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { hexToRgb } from '@/lib/utils'
import { useProject } from '@/hooks/useProjects'
import { useCreateBoard, useUpdateBoard, useDeleteBoard } from '@/hooks/useBoards'
import { AgentManager } from '@/components/agents/AgentManager'
import { ColorPicker } from '@/components/shared/ColorPicker'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import type { Board } from '@/types'

export function BoardListPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { data: projectRes, isLoading } = useProject(projectId!)
  const createBoard = useCreateBoard(projectId!)
  const updateBoard = useUpdateBoard(projectId!)
  const deleteBoard = useDeleteBoard(projectId!)

  const [showCreate, setShowCreate] = useState(false)
  const [boardName, setBoardName] = useState('')
  const [boardColor, setBoardColor] = useState('#3B82F6')
  const [editingBoard, setEditingBoard] = useState<Board | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('#3B82F6')
  const [showAgents, setShowAgents] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Board | null>(null)

  if (isLoading) return <LoadingSpinner text="Loading project..." />

  const project = projectRes?.data
  if (!project) {
    return <div className="text-center py-16 text-[var(--text-secondary)]">Project not found</div>
  }

  const boards = project.boards ?? []

  const handleCreate = async () => {
    if (!boardName.trim()) return
    try {
      await createBoard.mutateAsync({ name: boardName, color: boardColor })
      toast.success('Board created')
      setBoardName('')
      setShowCreate(false)
    } catch (err) {
      toast.error(err)
    }
  }

  const openEdit = (board: Board) => {
    setEditingBoard(board)
    setEditName(board.name)
    setEditColor(board.color || '#3B82F6')
  }

  const handleEdit = async () => {
    if (!editingBoard || !editName.trim()) return
    try {
      await updateBoard.mutateAsync({ boardId: editingBoard.id, data: { name: editName, color: editColor } })
      toast.success('Board updated')
      setEditingBoard(null)
    } catch (err) {
      toast.error(err)
    }
  }

  const handleDelete = (board: Board) => {
    setDeleteTarget(board)
  }

  const handleConfirmedDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteBoard.mutateAsync(deleteTarget.id)
      toast.success('Board deleted')
    } catch (err) {
      toast.error(err)
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{project.icon || '📋'}</span>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-[var(--text-secondary)]">{project.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowAgents(true)}
            className="border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-foreground hover:bg-[var(--surface)]"
          >
            <Bot className="size-4" />
            Agents
          </Button>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-[var(--accent-solid)] text-white hover:bg-[var(--accent-solid-hover)]"
          >
            <Plus className="size-4" />
            New Board
          </Button>
        </div>
      </div>

      {/* Agents Strip */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="size-3.5 text-[var(--text-tertiary)]" />
            <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
              Agents
            </span>
            {(project.agents ?? []).length > 0 && (
              <span className="text-[10px] text-[var(--text-tertiary)] bg-[var(--overlay)] px-1.5 py-0.5 rounded-full font-medium">
                {(project.agents ?? []).filter((a) => a.is_active).length} active
              </span>
            )}
          </div>
          <button
            onClick={() => setShowAgents(true)}
            className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] hover:text-foreground transition-colors"
          >
            <Settings className="size-3" />
            Manage
          </button>
        </div>
        {(project.agents ?? []).filter((a) => a.is_active).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {(project.agents ?? []).map((agent) => (
              <div
                key={agent.id}
                className="group/agent flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all duration-200 cursor-default"
              >
                <span
                  className="size-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 transition-transform duration-200 group-hover/agent:scale-110"
                  style={{ backgroundColor: agent.is_active ? agent.color : 'var(--text-tertiary)' }}
                >
                  {agent.name.charAt(0).toUpperCase()}
                </span>
                <span className="text-[13px] font-medium text-foreground">
                  {agent.name}
                </span>
                {!agent.is_active && (
                  <span className="text-[10px] text-[var(--text-tertiary)] bg-[var(--overlay)] px-1.5 py-0.5 rounded-full">
                    inactive
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface)]">
            <Bot className="size-4 text-[var(--text-tertiary)]" />
            <span className="text-sm text-[var(--text-tertiary)]">No active agents</span>
            <button
              onClick={() => setShowAgents(true)}
              className="text-sm text-[var(--accent-solid)] hover:underline ml-auto"
            >
              Add Agent
            </button>
          </div>
        )}
      </div>

      {boards.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No boards yet"
          description="Create your first board to start organizing tasks"
          action={{ label: 'Create Board', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((board) => {
            const color = board.color || '#3B82F6'
            const rgb = hexToRgb(color)
            return (
              <div
                key={board.id}
                className="group relative bg-card rounded-2xl cursor-pointer overflow-hidden transition-all duration-300 border border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
                onClick={() => navigate(`/projects/${projectId}/boards/${board.id}`)}
              >
                <div className="h-1.5 w-full" style={{ background: `linear-gradient(135deg, ${color}, ${color}88, ${color}44)` }} />

                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                  style={{ boxShadow: `inset 0 0 60px -20px rgb(${rgb} / 0.06), 0 8px 32px -8px rgb(${rgb} / 0.12)` }}
                />

                <div className="p-5 relative">
                  <div className="flex items-start gap-3.5">
                    <div
                      className="size-11 rounded-xl flex items-center justify-center shrink-0 text-2xl transition-transform duration-300 group-hover:scale-110"
                      style={{ backgroundColor: `rgb(${rgb} / 0.1)` }}
                    >
                      {board.icon || <LayoutGrid className="size-5" style={{ color }} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[16px] text-foreground truncate leading-tight">{board.name}</h3>
                      {board.description && (
                        <p className="text-[13px] text-[var(--text-secondary)] line-clamp-2 mt-1">{board.description}</p>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="size-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--overlay)] shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="size-4 text-[var(--text-secondary)]" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onSelect={() => openEdit(board)}>
                          <Pencil className="size-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={() => handleDelete(board)}>
                          <Trash2 className="size-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <span className="inline-flex items-center gap-1.5 bg-[var(--overlay)] text-[var(--text-secondary)] text-[11px] font-medium px-2.5 py-1 rounded-full">
                      <ListTodo className="size-3" />
                      {board.task_count}
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-[var(--overlay)] text-[var(--text-secondary)] text-[11px] font-medium px-2.5 py-1 rounded-full">
                      <Users className="size-3" />
                      {board.member_count}
                    </span>
                  </div>

                  <div className="flex items-center justify-end mt-4 pt-3.5 border-t border-[var(--border-subtle)]">
                    <div className="size-7 rounded-lg flex items-center justify-center bg-[var(--overlay)] opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <ArrowRight className="size-3.5 text-[var(--text-secondary)]" />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={!!editingBoard} onOpenChange={(v) => !v && setEditingBoard(null)}>
        <DialogContent className="bg-[var(--elevated)] border-[var(--border-subtle)] sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Edit Board</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <span className="text-xs text-[var(--text-tertiary)] font-medium">Name</span>
              <Input
                placeholder="Board name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-[var(--surface)] border-[var(--border-subtle)]"
                onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs text-[var(--text-tertiary)] font-medium">Color</span>
              <ColorPicker value={editColor} onChange={setEditColor} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBoard(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={updateBoard.isPending || !editName.trim()}>
              {updateBoard.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AgentManager
        projectId={projectId!}
        open={showAgents}
        onClose={() => setShowAgents(false)}
      />

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-[var(--elevated)] border-[var(--border-subtle)] sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>New Board</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <span className="text-xs text-[var(--text-tertiary)] font-medium">Name</span>
              <Input
                placeholder="e.g. Development, Design, Marketing..."
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                className="bg-[var(--surface)] border-[var(--border-subtle)]"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs text-[var(--text-tertiary)] font-medium">Color</span>
              <ColorPicker value={boardColor} onChange={setBoardColor} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createBoard.isPending || !boardName.trim()}>
              {createBoard.isPending ? 'Creating...' : 'Create Board'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{deleteTarget?.name}"? All tasks in this board will be lost. This action cannot be undone.
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
