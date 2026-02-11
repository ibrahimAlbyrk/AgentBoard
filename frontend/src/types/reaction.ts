import type { UserBrief } from './user'
import type { AgentBrief } from './agent'

export interface ReactorBrief {
  user: UserBrief | null
  agent: AgentBrief | null
}

export interface ReactionGroup {
  emoji: string
  count: number
  reacted_by_me: boolean
  reactors: ReactorBrief[]
}

export interface ReactionSummary {
  groups: ReactionGroup[]
  total: number
}

export interface ToggleResult {
  action: 'added' | 'removed'
  emoji: string
  summary: ReactionSummary
}
