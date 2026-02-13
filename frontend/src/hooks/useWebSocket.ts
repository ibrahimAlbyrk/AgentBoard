import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { wsManager } from '@/lib/websocket'
import { useAuthStore } from '@/stores/authStore'
import { useBoardStore } from '@/stores/boardStore'
import { getCardRect, startFlight } from '@/components/board/TaskAnimationLayer'
import { toast } from '@/lib/toast'
import type { Task } from '@/types'

// Track tasks moved via local drag-drop to skip their WS echo
const localMoves = new Set<string>()
export function markLocalMove(taskId: string) {
  localMoves.add(taskId)
  // Fallback cleanup — normally cleared by useMoveTask.onSettled
  setTimeout(() => localMoves.delete(taskId), 10000)
}
export function clearLocalMove(taskId: string) {
  localMoves.delete(taskId)
}

export function useWebSocket(projectId: string, boardId: string) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const { addTask, updateTask, relocateTask, removeTask } = useBoardStore()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!projectId || !boardId || !accessToken) return

    wsManager.connect(projectId, boardId, accessToken)

    const wsActorName = (user: { username: string; agent?: { name: string } }) =>
      user.agent?.name ?? user.username

    const invalidateActivity = () => {
      queryClient.invalidateQueries({ queryKey: ['activity'] })
    }

    const handleCreated = (e: Record<string, unknown>) => {
      addTask(e.data as Task)
      invalidateActivity()
      const user = e.user as { username: string; agent?: { name: string } } | undefined
      const data = e.data as { title: string }
      if (user) toast.info(`${wsActorName(user)} created "${data.title}"`)
    }

    const animatedRelocate = (data: Task) => {
      const fromRect = getCardRect(data.id)
      if (fromRect) startFlight(data.id, data, fromRect)
      relocateTask(data.id, data)
    }

    const handleUpdated = (e: Record<string, unknown>) => {
      const data = e.data as Task
      const current = useBoardStore.getState().tasksByStatus
      const currentStatusId = Object.entries(current).find(
        ([, tasks]) => tasks.some((t) => t.id === data.id),
      )?.[0]
      if (currentStatusId && currentStatusId !== data.status.id) {
        animatedRelocate(data)
      } else {
        updateTask(data.id, data)
      }
      invalidateActivity()
    }
    const handleDeleted = (e: Record<string, unknown>) => {
      const data = e.data as { task_id: string }
      removeTask(data.task_id)
      invalidateActivity()
    }
    const handleMoved = (e: Record<string, unknown>) => {
      const data = e.data as Task
      if (localMoves.has(data.id)) {
        relocateTask(data.id, data)
      } else {
        animatedRelocate(data)
        const user = e.user as { username: string; agent?: { name: string } } | undefined
        if (user) toast.info(`${wsActorName(user)} moved a task`)
      }
      invalidateActivity()
    }

    const handleNotification = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })

      if ('Notification' in window && Notification.permission === 'granted') {
        const prefs = queryClient.getQueryData<import('@/types/user').NotificationPreferences>(
          ['notification-preferences'],
        )
        if (prefs?.desktop_enabled) {
          new Notification('AgentBoard', { body: 'You have a new notification', icon: '/favicon.ico' })
        }
      }
    }

    const handleChecklistUpdated = (e: Record<string, unknown>) => {
      const taskId = (e.data as { task_id: string }).task_id
      queryClient.invalidateQueries({ queryKey: ['checklists', projectId, boardId, taskId] })
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId, boardId] })
      invalidateActivity()
    }

    const handleCustomFieldChanged = () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', projectId, boardId] })
    }

    const handleReactionUpdated = (e: Record<string, unknown>) => {
      const entityType = e.entity_type as string
      const entityId = e.entity_id as string
      const data = e.data
      queryClient.setQueryData(
        ['reactions', entityType, entityId],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (old: any) => old ? { ...old, data } : { data },
      )
      // Also refresh task list to update card reaction indicators
      if (entityType === 'task') {
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId, boardId] })
      }
    }

    const handleSubtaskChange = (e: Record<string, unknown>) => {
      const parentId = e.parent_id as string | undefined
      if (parentId) {
        queryClient.invalidateQueries({ queryKey: ['subtasks', projectId, boardId, parentId] })
      }
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId, boardId] })
    }

    wsManager.on('task.created', handleCreated)
    wsManager.on('task.updated', handleUpdated)
    wsManager.on('task.deleted', handleDeleted)
    wsManager.on('task.moved', handleMoved)
    wsManager.on('notification.new', handleNotification)
    wsManager.on('checklist.updated', handleChecklistUpdated)
    wsManager.on('reaction.updated', handleReactionUpdated)
    wsManager.on('custom_field.created', handleCustomFieldChanged)
    wsManager.on('custom_field.updated', handleCustomFieldChanged)
    wsManager.on('custom_field.deleted', handleCustomFieldChanged)
    wsManager.on('custom_field.reordered', handleCustomFieldChanged)
    wsManager.on('subtask.created', handleSubtaskChange)
    wsManager.on('subtask.updated', handleSubtaskChange)
    wsManager.on('subtask.deleted', handleSubtaskChange)
    wsManager.on('subtask.reordered', handleSubtaskChange)

    return () => {
      wsManager.off('task.created', handleCreated)
      wsManager.off('task.updated', handleUpdated)
      wsManager.off('task.deleted', handleDeleted)
      wsManager.off('task.moved', handleMoved)
      wsManager.off('notification.new', handleNotification)
      wsManager.off('checklist.updated', handleChecklistUpdated)
      wsManager.off('reaction.updated', handleReactionUpdated)
      wsManager.off('custom_field.created', handleCustomFieldChanged)
      wsManager.off('custom_field.updated', handleCustomFieldChanged)
      wsManager.off('custom_field.deleted', handleCustomFieldChanged)
      wsManager.off('custom_field.reordered', handleCustomFieldChanged)
      wsManager.off('subtask.created', handleSubtaskChange)
      wsManager.off('subtask.updated', handleSubtaskChange)
      wsManager.off('subtask.deleted', handleSubtaskChange)
      wsManager.off('subtask.reordered', handleSubtaskChange)
    }
  }, [projectId, boardId, accessToken, addTask, updateTask, relocateTask, removeTask, queryClient])
}
