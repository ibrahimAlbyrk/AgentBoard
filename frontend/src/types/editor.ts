/** Tiptap JSON document */
export interface TiptapDoc {
  type: 'doc'
  content: TiptapNode[]
}

export interface TiptapNode {
  type: string
  attrs?: Record<string, unknown>
  content?: TiptapNode[]
  marks?: TiptapMark[]
  text?: string
}

export interface TiptapMark {
  type: string
  attrs?: Record<string, unknown>
}

/** Mention node attrs */
export interface MentionAttrs {
  id: string
  entityType: 'user' | 'agent' | 'project' | 'board' | 'task'
  label: string
}

/** Mentionables API response */
export interface MentionableUser {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
}

export interface MentionableAgent {
  id: string
  name: string
  color: string
}

export interface MentionablesResponse {
  users: MentionableUser[]
  agents: MentionableAgent[]
}

/** Referenceables API response */
export interface ReferenceableProject {
  id: string
  name: string
  icon: string | null
  color: string | null
}

export interface ReferenceableBoard {
  id: string
  name: string
  icon: string | null
  color: string | null
}

export interface ReferenceableTask {
  id: string
  title: string
  board_id: string
  status_name: string
}

export interface ReferenceablesResponse {
  projects: ReferenceableProject[]
  boards: ReferenceableBoard[]
  tasks: ReferenceableTask[]
}
