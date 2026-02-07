import { useEffect } from 'react'
import { wsManager } from '@/lib/websocket'
import { useAuthStore } from '@/stores/authStore'
import { useBoardStore } from '@/stores/boardStore'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Task } from '@/types'

export function useWebSocket(projectId: string) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const { addTask, updateTask, removeTask } = useBoardStore()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!projectId || !accessToken) return

    wsManager.connect(projectId, accessToken)

    const handleCreated = (e: Record<string, unknown>) => {
      addTask(e.data as Task)
      const user = e.user as { username: string } | undefined
      const data = e.data as { title: string }
      if (user) toast.info(`${user.username} created "${data.title}"`)
    }
    const handleUpdated = (e: Record<string, unknown>) => {
      const data = e.data as Task
      updateTask(data.id, data)
    }
    const handleDeleted = (e: Record<string, unknown>) => {
      const data = e.data as { task_id: string }
      removeTask(data.task_id)
    }
    const handleMoved = (e: Record<string, unknown>) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
      const user = e.user as { username: string } | undefined
      if (user) toast.info(`${user.username} moved a task`)
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
      wsManager.disconnect()
    }
  }, [projectId, accessToken, addTask, updateTask, removeTask, queryClient])
}
