import { useState } from 'react'

type CardDisplayMode = 'compact' | 'detailed'

const STORAGE_KEY = 'agentboard-card-mode'

export function useCardDisplayMode() {
  const [mode, setModeState] = useState<CardDisplayMode>(() => {
    return (localStorage.getItem(STORAGE_KEY) as CardDisplayMode) || 'detailed'
  })

  const setMode = (m: CardDisplayMode) => {
    localStorage.setItem(STORAGE_KEY, m)
    setModeState(m)
  }

  return { mode, setMode }
}
