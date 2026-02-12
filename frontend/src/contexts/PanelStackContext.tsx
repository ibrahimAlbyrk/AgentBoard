import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

interface PanelStackAPI {
  push: (id: string) => void
  pop: (id: string) => void
  isTop: (id: string) => boolean
  subscribe: (cb: () => void) => () => void
}

function createPanelStack(): PanelStackAPI {
  const stack: string[] = []
  const listeners = new Set<() => void>()

  const notify = () => listeners.forEach((cb) => cb())

  return {
    push(id) {
      stack.push(id)
      notify()
    },
    pop(id) {
      const idx = stack.lastIndexOf(id)
      if (idx !== -1) {
        stack.splice(idx, 1)
        notify()
      }
    },
    isTop(id) {
      return stack.length > 0 && stack[stack.length - 1] === id
    },
    subscribe(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
  }
}

const PanelStackContext = createContext<PanelStackAPI | null>(null)

export function PanelStackProvider({ children }: { children: React.ReactNode }) {
  const apiRef = useRef<PanelStackAPI | null>(null)
  if (!apiRef.current) apiRef.current = createPanelStack()

  return (
    <PanelStackContext.Provider value={apiRef.current}>
      {children}
    </PanelStackContext.Provider>
  )
}

function usePanelStack() {
  const api = useContext(PanelStackContext)
  if (!api) throw new Error('usePanelStack must be used within PanelStackProvider')
  return api
}

/**
 * Register a panel/dialog/popover in the stack.
 * Returns `isTop` -- only the topmost panel should handle ESC.
 */
export function usePanelLayer(id: string, active: boolean) {
  const api = usePanelStack()
  const [isTop, setIsTop] = useState(false)

  useEffect(() => {
    if (!active) return

    api.push(id)

    const unsub = api.subscribe(() => {
      setIsTop(api.isTop(id))
    })

    // Initial check
    setIsTop(api.isTop(id))

    return () => {
      api.pop(id)
      unsub()
    }
  }, [api, id, active])

  // When not active, never top
  if (!active) return false

  return isTop
}

/**
 * Check if any Radix overlay (popover, select, dropdown) is currently open.
 * These render into portals with known wrapper selectors.
 */
function hasOpenRadixOverlay(): boolean {
  return !!document.querySelector(
    '[data-radix-popper-content-wrapper], [data-radix-select-viewport]'
  )
}

/**
 * Hook that handles ESC for a panel layer.
 * Only fires onClose when this panel is the topmost in the stack
 * and no Radix overlay (popover/select) is currently open.
 */
export function usePanelEsc(id: string, active: boolean, onClose: () => void) {
  const isTop = usePanelLayer(id, active)

  useEffect(() => {
    if (!active || !isTop) return

    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return

      // Skip if a Radix popover/select/dropdown is open --
      // those handle ESC internally and shouldn't cascade to the panel
      if (hasOpenRadixOverlay()) return

      e.stopPropagation()
      e.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [active, isTop, onClose])
}
