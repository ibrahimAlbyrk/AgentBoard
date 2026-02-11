import type { ReactorBrief } from '@/types'

interface ReactorTooltipProps {
  reactors: ReactorBrief[]
  emoji: string
}

function reactorName(r: ReactorBrief): string {
  if (r.user) return r.user.full_name || r.user.username
  if (r.agent) return r.agent.name
  return 'Unknown'
}

export function ReactorTooltip({ reactors, emoji }: ReactorTooltipProps) {
  if (reactors.length === 0) return <span>{emoji}</span>

  const maxShow = 3
  const shown = reactors.slice(0, maxShow)
  const extra = reactors.length - maxShow

  const names = shown.map(reactorName)
  let text: string
  if (extra > 0) {
    text = `${names.join(', ')} and ${extra} more`
  } else if (names.length === 1) {
    text = names[0]
  } else if (names.length === 2) {
    text = `${names[0]} and ${names[1]}`
  } else {
    text = `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
  }

  return (
    <span className="text-xs">
      {text} reacted with {emoji}
    </span>
  )
}
