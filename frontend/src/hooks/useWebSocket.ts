import { useEffect } from 'react'
import { wsManager } from '@/lib/websocket'
import { useAuthStore } from '@/stores/authStore'
import { useBoardStore } from '@/stores/boardStore'
import { getCardRect, startFlight } from '@/components/board/TaskAnimationLayer'
import { toast } from 'sonner'
import type { Task } from '@/types'

// Track tasks moved via local drag-drop to skip their WS echo
const localMoves = new Set<string>()
export function markLocalMove(taskId: string) {
  localMoves.add(taskId)
  setTimeout(() => localMoves.delete(taskId), 2000)
}

export function useWebSocket(projectId: string) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const { addTask, relocateTask, removeTask } = useBoardStore()

  useEffect(() => {
    if (!projectId || !accessToken) return

    wsManager.connect(projectId, accessToken)

    const handleCreated = (e: Record<string, unknown>) => {
      addTask(e.data as Task)
      const user = e.user as { username: string } | undefined
      const data = e.data as { title: string }
      if (user) toast.info(`${user.username} created "${data.title}"`)
    }

    const animatedRelocate = (data: Task) => {
      const fromRect = getCardRect(data.id)
      if (fromRect) startFlight(data.id, data, fromRect)
      relocateTask(data.id, data)
    }

    const handleUpdated = (e: Record<string, unknown>) => {
      animatedRelocate(e.data as Task)
    }
    const handleDeleted = (e: Record<string, unknown>) => {
      const data = e.data as { task_id: string }
      removeTask(data.task_id)
    }
    const handleMoved = (e: Record<string, unknown>) => {
      const data = e.data as Task
      if (localMoves.has(data.id)) {
        // Drag-drop echo: just sync server data, no animation
        relocateTask(data.id, data)
      } else {
        animatedRelocate(data)
        const user = e.user as { username: string } | undefined
        if (user) toast.info(`${user.username} moved a task`)
      }
    }

    wsManager.on('task.created', handleCreated)
    wsManager.on('task.updated', handleUpdated)
    wsManager.on('task.deleted', handleDeleted)
    wsManager.on('task.moved', handleMoved)

    return () => {
      wsManager.off('task.created', handleCreated)
      wsManager.off('task.updated', handleUpdated)
      wsManager.off('task.deleted', handleDeleted)
      wsManager.off('task.moved', handleMoved)
    }
  }, [projectId, accessToken, addTask, relocateTask, removeTask])
}
