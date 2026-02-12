import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Settings } from 'lucide-react'
import type { Agent } from '@/types'

interface AgentClusterProps {
  agents: Agent[]
  onManageClick: () => void
}

const MAX_VISIBLE = 4

export function AgentCluster({ agents, onManageClick }: AgentClusterProps) {
  const [expanded, setExpanded] = useState(false)

  const activeAgents = agents.filter((a) => a.is_active)

  if (activeAgents.length === 0) {
    return (
      <button
        onClick={onManageClick}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-[var(--text-tertiary)] hover:text-foreground hover:bg-[var(--surface)] border border-transparent hover:border-[var(--border-subtle)] transition-all duration-200"
      >
        <Bot className="size-3.5" />
        <span>Add Agents</span>
      </button>
    )
  }

  const visibleAgents = activeAgents.slice(0, MAX_VISIBLE)
  const overflowCount = activeAgents.length - MAX_VISIBLE

  return (
    <div
      className="relative"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Collapsed: overlapping avatar cluster */}
      <div className="flex items-center cursor-default">
        <div className="flex items-center -space-x-2">
          {visibleAgents.map((agent, idx) => (
            <motion.span
              key={agent.id}
              className="size-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ring-2 ring-background"
              style={{
                backgroundColor: agent.color,
                zIndex: MAX_VISIBLE - idx,
              }}
              whileHover={{ scale: 1.15, zIndex: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {agent.name.charAt(0).toUpperCase()}
            </motion.span>
          ))}
          {overflowCount > 0 && (
            <span
              className="size-7 rounded-full ring-2 ring-background bg-[var(--overlay)] flex items-center justify-center text-[10px] font-semibold text-[var(--text-secondary)] shrink-0"
              style={{ zIndex: 0 }}
            >
              +{overflowCount}
            </span>
          )}
        </div>
      </div>

      {/* Expanded: dropdown with agent list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full right-0 mt-2 z-50 min-w-[200px] max-w-[280px] py-2 px-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--elevated)] shadow-lg shadow-black/10"
          >
            <div className="flex items-center justify-between px-2.5 pb-1.5 mb-1 border-b border-[var(--border-subtle)]">
              <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                Agents
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)] bg-[var(--overlay)] px-1.5 py-0.5 rounded-full font-medium tabular-nums">
                {activeAgents.length}
              </span>
            </div>

            <div className="max-h-[240px] overflow-y-auto space-y-0.5">
              {activeAgents.map((agent, idx) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03, duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-[var(--surface)] transition-colors duration-150"
                >
                  <span
                    className="size-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                    style={{ backgroundColor: agent.color }}
                  >
                    {agent.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-[13px] font-medium text-foreground truncate">
                    {agent.name}
                  </span>
                </motion.div>
              ))}
            </div>

            <div className="mt-1 pt-1.5 border-t border-[var(--border-subtle)]">
              <button
                onClick={onManageClick}
                className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-[var(--text-tertiary)] hover:text-foreground hover:bg-[var(--surface)] transition-colors duration-150"
              >
                <Settings className="size-3.5" />
                Manage Agents
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
