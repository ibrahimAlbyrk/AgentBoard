import { useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import LinkExt from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import ImageExt from '@tiptap/extension-image'
import Mention from '@tiptap/extension-mention'
import type { TiptapDoc } from '@/types'
import { cn } from '@/lib/utils'
import './styles/editor.css'

/** Reference extension with routing attrs so generateHTML emits data-* attributes */
const ReferenceForRenderer = Mention.extend({
  name: 'reference',
  addAttributes() {
    return {
      ...this.parent?.(),
      entityType: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-entity-type'),
        renderHTML: (attrs: Record<string, unknown>) => {
          if (!attrs.entityType) return {}
          return { 'data-entity-type': attrs.entityType }
        },
      },
      projectId: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-project-id'),
        renderHTML: (attrs: Record<string, unknown>) => {
          if (!attrs.projectId) return {}
          return { 'data-project-id': attrs.projectId }
        },
      },
      boardId: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-board-id'),
        renderHTML: (attrs: Record<string, unknown>) => {
          if (!attrs.boardId) return {}
          return { 'data-board-id': attrs.boardId }
        },
      },
    }
  },
}).configure({
  HTMLAttributes: { class: 'reference' },
})

const extensions = [
  StarterKit.configure({ codeBlock: false }),
  Underline,
  LinkExt.configure({
    openOnClick: false,
    HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
  }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Table,
  TableRow,
  TableCell,
  TableHeader,
  ImageExt,
  Mention.extend({ name: 'mention' }).configure({
    HTMLAttributes: { class: 'mention' },
  }),
  ReferenceForRenderer,
]

interface RichTextRendererProps {
  content: TiptapDoc | string | null | undefined
  className?: string
}

export function RichTextRenderer({ content, className }: RichTextRendererProps) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)

  const html = useMemo(() => {
    if (!content) return ''
    let raw: string
    if (typeof content === 'string') {
      raw = content
        .split('\n')
        .map((line) => `<p>${escapeHtml(line) || '<br>'}</p>`)
        .join('')
    } else {
      try {
        raw = generateHTML(content, extensions)
      } catch {
        return '<p>[Unable to render content]</p>'
      }
    }
    return linkifyHtml(raw)
  }, [content])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = (e.target as HTMLElement).closest?.('[data-type="reference"]')
      if (!target) return

      const entityType = target.getAttribute('data-entity-type')
      const projectId = target.getAttribute('data-project-id')
      const boardId = target.getAttribute('data-board-id')
      const entityId = target.getAttribute('data-id')

      if (!entityType || !projectId) return

      e.preventDefault()
      e.stopPropagation()

      switch (entityType) {
        case 'project':
          navigate(`/projects/${projectId}`)
          break
        case 'board':
          if (boardId) {
            navigate(`/projects/${projectId}/boards/${boardId}`)
          }
          break
        case 'task':
          if (boardId && entityId) {
            navigate(`/projects/${projectId}/boards/${boardId}?task=${entityId}`)
          }
          break
      }
    },
    [navigate],
  )

  if (!html) return null

  return (
    <div
      ref={containerRef}
      className={cn('rich-text-renderer', className)}
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={handleClick}
    />
  )
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Convert plain-text URLs (not already inside <a> tags) into clickable links */
function linkifyHtml(html: string): string {
  const urlRe = /(https?:\/\/[^\s<>"')+\]]+(?:[)\]][^\s<>"')*\]]*)*)/g
  const parts = html.split(/(<[^>]+>)/)
  let insideAnchor = false

  return parts
    .map((part) => {
      if (part.startsWith('<')) {
        if (/^<a[\s>]/i.test(part)) insideAnchor = true
        if (/^<\/a>/i.test(part)) insideAnchor = false
        return part
      }
      if (insideAnchor) return part
      return part.replace(
        urlRe,
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>',
      )
    })
    .join('')
}
