import { useState, useCallback, useEffect, useRef } from 'react'

const STORAGE_PREFIX = 'agentboard-expanded-'
const EVENT_NAME = 'expanded-tasks-change'

function getKey(boardId: string) {
  return `${STORAGE_PREFIX}${boardId}`
}

function loadSet(boardId: string): Set<string> {
  try {
    const raw = localStorage.getItem(getKey(boardId))
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

export function useExpandedTasks(boardId: string) {
  const [expandedSet, setExpandedSet] = useState<Set<string>>(() => loadSet(boardId))
  const selfUpdate = useRef(false)

  // Sync from other tabs/components (skip self-triggered events)
  useEffect(() => {
    const handler = () => {
      if (selfUpdate.current) {
        selfUpdate.current = false
        return
      }
      setExpandedSet(loadSet(boardId))
    }
    window.addEventListener(EVENT_NAME, handler)
    return () => window.removeEventListener(EVENT_NAME, handler)
  }, [boardId])

  // Reset when board changes
  useEffect(() => {
    setExpandedSet(loadSet(boardId))
  }, [boardId])

  const isExpanded = useCallback(
    (taskId: string) => expandedSet.has(taskId),
    [expandedSet],
  )

  const toggle = useCallback(
    (taskId: string) => {
      setExpandedSet((prev) => {
        const next = new Set(prev)
        if (next.has(taskId)) {
          next.delete(taskId)
        } else {
          next.add(taskId)
        }
        // Persist to localStorage
        localStorage.setItem(getKey(boardId), JSON.stringify([...next]))
        // Mark self-triggered so our own listener ignores this event
        selfUpdate.current = true
        window.dispatchEvent(new Event(EVENT_NAME))
        return next
      })
    },
    [boardId],
  )

  return { expandedSet, isExpanded, toggle }
}
