import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { TaskCard } from './TaskCard'
import type { Task } from '@/types'

// --- Card ref registry ---
const cardRefs = new Map<string, HTMLDivElement>()

export function registerCardRef(taskId: string, el: HTMLDivElement | null) {
  if (el) cardRefs.set(taskId, el)
  else cardRefs.delete(taskId)
}

export function getCardRect(taskId: string): DOMRect | null {
  return cardRefs.get(taskId)?.getBoundingClientRect() ?? null
}

// --- Flying tasks state (module-level, lightweight) ---
interface FlyingTaskInfo {
  task: Task
  fromRect: DOMRect
  elevated?: boolean
}

const flyingMap = new Map<string, FlyingTaskInfo>()
const subs = new Set<() => void>()
function notify() { subs.forEach((fn) => fn()) }

export function startFlight(taskId: string, task: Task, fromRect: DOMRect, elevated?: boolean) {
  flyingMap.set(taskId, { task, fromRect, elevated })
  notify()
}

export function endFlight(taskId: string) {
  flyingMap.delete(taskId)
  notify()
}

export function clearAllFlights() {
  flyingMap.clear()
  notify()
}

export function isFlying(taskId: string) {
  return flyingMap.has(taskId)
}

export function useIsFlying(taskId: string) {
  return useSyncExternalStore(
    (cb) => { subs.add(cb); return () => { subs.delete(cb) } },
    () => flyingMap.has(taskId),
  )
}

function useFlyingTasks() {
  const [, bump] = useState(0)
  useEffect(() => {
    const fn = () => bump((n) => n + 1)
    subs.add(fn)
    return () => { subs.delete(fn) }
  }, [])
  return flyingMap
}

// --- Overlay ---
export function TaskAnimationLayer() {
  const flying = useFlyingTasks()

  if (flying.size === 0) return null

  return createPortal(
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 40 }}>
      {Array.from(flying.entries()).map(([taskId, info]) => (
        <FlyingCard key={taskId} taskId={taskId} info={info} />
      ))}
    </div>,
    document.body,
  )
}

function FlyingCard({ taskId, info }: { taskId: string; info: FlyingTaskInfo }) {
  const [toRect, setToRect] = useState<DOMRect | null>(null)
  const from = info.fromRect

  useLayoutEffect(() => {
    let cancelled = false
    // Double-RAF: wait two paint cycles so layout settles before measuring toRect
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return
        const rect = getCardRect(taskId)
        if (rect) setToRect(rect)
        else endFlight(taskId)
      })
    })
    return () => { cancelled = true }
  }, [taskId])

  const lifted = '0 25px 50px -12px rgba(0,0,0,0.4)'
  const flat = '0 1px 3px rgba(0,0,0,0.1)'

  const spring = { type: 'spring' as const, stiffness: 140, damping: 22 }

  // While waiting for target rect, show card at source position
  if (!toRect) {
    return (
      <div style={{
        position: 'fixed', left: from.x, top: from.y, width: from.width,
        boxShadow: lifted, transform: 'scale(1.03)', transformOrigin: 'top left',
        borderRadius: 12,
      }}>
        <TaskCard task={info.task} onClick={() => {}} />
      </div>
    )
  }

  return (
    <motion.div
      style={{ position: 'fixed', left: 0, top: 0, width: toRect.width, transformOrigin: 'top left', borderRadius: 12 }}
      initial={{
        x: from.x,
        y: from.y,
        scale: 1.03,
        boxShadow: lifted,
      }}
      animate={{
        x: toRect.x,
        y: toRect.y,
        scale: 1,
        boxShadow: flat,
      }}
      transition={{
        x: spring,
        y: spring,
        scale: { type: 'spring', stiffness: 200, damping: 25 },
        boxShadow: spring,
      }}
      onAnimationComplete={() => endFlight(taskId)}
    >
      <TaskCard task={info.task} onClick={() => {}} />
    </motion.div>
  )
}
