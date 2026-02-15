import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import LinkExt from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import ImageExt from '@tiptap/extension-image'
import Typography from '@tiptap/extension-typography'
import Mention from '@tiptap/extension-mention'
import tippy from 'tippy.js'
import { EditorToolbar } from './EditorToolbar'
import { MentionSuggestion } from './MentionSuggestion'
import { ReferenceSuggestion } from './ReferenceSuggestion'
import { useMentionables } from './hooks/useMentionables'
import { useReferenceables } from './hooks/useReferenceables'
import type { TiptapDoc, MentionableUser, MentionableAgent } from '@/types'
import { cn } from '@/lib/utils'
import './styles/editor.css'

/** Reference extension with routing attrs (entityType, projectId, boardId) */
const ReferenceExtension = Mention.extend({
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
})

interface RichTextEditorProps {
  id?: string
  projectId: string
  value?: TiptapDoc | string | null
  onChange?: (doc: TiptapDoc) => void
  onSubmit?: () => void
  variant?: 'full' | 'compact'
  placeholder?: string
  className?: string
  autoFocus?: boolean
  'aria-label'?: string
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function createSuggestionRenderer(SuggestionComponent: any) {
  return () => {
    let component: ReactRenderer | null = null
    let popup: any[] | null = null

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(SuggestionComponent, {
          props,
          editor: props.editor,
        })
        if (!props.clientRect) return
        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
          theme: 'mention-suggestion',
        })
      },
      onUpdate(props: any) {
        component?.updateProps(props)
        if (popup?.[0] && props.clientRect) {
          popup[0].setProps({ getReferenceClientRect: props.clientRect })
        }
      },
      onKeyDown(props: any) {
        if (props.event.key === 'Escape') {
          popup?.[0]?.hide()
          return true
        }
        return (component?.ref as any)?.onKeyDown(props) ?? false
      },
      onExit() {
        popup?.[0]?.destroy()
        component?.destroy()
      },
    }
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function RichTextEditor({
  id,
  projectId,
  value,
  onChange,
  onSubmit,
  variant = 'full',
  placeholder = 'Start writing...',
  className,
  autoFocus = false,
  'aria-label': ariaLabel,
}: RichTextEditorProps) {
  const navigate = useNavigate()
  const [focused, setFocused] = useState(false)
  const [refQuery, setRefQuery] = useState('')
  const { data: mentionables } = useMentionables(projectId)
  const { data: referenceables } = useReferenceables(projectId, refQuery)

  const mentionablesRef = useRef(mentionables)
  mentionablesRef.current = mentionables
  const referenceablesRef = useRef(referenceables)
  referenceablesRef.current = referenceables

  const filterMentionables = useCallback((query: string) => {
    const data = mentionablesRef.current
    if (!data) return []
    const q = query.toLowerCase()
    const users = (data.users || [])
      .filter(
        (u: MentionableUser) =>
          !q ||
          (u.full_name && u.full_name.toLowerCase().includes(q)) ||
          u.username.toLowerCase().includes(q),
      )
      .slice(0, 5)
      .map((u: MentionableUser) => ({ type: 'user' as const, data: u }))
    const agents = (data.agents || [])
      .filter((a: MentionableAgent) => !q || a.name.toLowerCase().includes(q))
      .slice(0, 3)
      .map((a: MentionableAgent) => ({ type: 'agent' as const, data: a }))
    return [...users, ...agents]
  }, [])

  const filterReferenceables = useCallback((query: string) => {
    setRefQuery(query)
    const data = referenceablesRef.current
    if (!data) return []
    const items: Array<{ type: 'project' | 'board' | 'task'; data: unknown }> = []
    for (const p of data.projects || []) items.push({ type: 'project', data: p })
    for (const b of data.boards || []) items.push({ type: 'board', data: b })
    for (const t of data.tasks || []) items.push({ type: 'task', data: t })
    return items
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        link: false,
        underline: false,
      }),
      Underline,
      LinkExt.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Placeholder.configure({ placeholder }),
      TaskList,
      TaskItem.configure({ nested: true }),
      ...(variant === 'full'
        ? [
            Table.configure({ resizable: false }),
            TableRow,
            TableCell,
            TableHeader,
            ImageExt,
          ]
        : []),
      Typography,
      Mention.extend({ name: 'mention' }).configure({
        HTMLAttributes: { class: 'mention' },
        suggestion: {
          char: '@',
          items: ({ query }: { query: string }) => filterMentionables(query),
          render: createSuggestionRenderer(MentionSuggestion),
        },
      }),
      ReferenceExtension.configure({
        HTMLAttributes: { class: 'reference' },
        suggestion: {
          char: '#',
          items: ({ query }: { query: string }) => filterReferenceables(query),
          render: createSuggestionRenderer(ReferenceSuggestion),
        },
      }),
    ],
    content: normalizeValue(value),
    autofocus: autoFocus,
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.getJSON() as TiptapDoc)
    },
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    editorProps: {
      handleKeyDown: (_view, event) => {
        if (variant === 'compact' && event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          onSubmit?.()
          return true
        }
        return false
      },
      handleClick: (_view, _pos, event) => {
        if (!(event.metaKey || event.ctrlKey)) return false
        const target = (event.target as HTMLElement).closest?.('[data-type="reference"]')
        if (!target) return false

        const entityType = target.getAttribute('data-entity-type')
        const pId = target.getAttribute('data-project-id')
        const bId = target.getAttribute('data-board-id')
        const entityId = target.getAttribute('data-id')
        if (!entityType || !pId) return false

        event.preventDefault()
        if (entityType === 'project') navigate(`/projects/${pId}`)
        else if (entityType === 'board' && bId) navigate(`/projects/${pId}/boards/${bId}`)
        else if (entityType === 'task' && bId && entityId) navigate(`/projects/${pId}/boards/${bId}?task=${entityId}`)
        return true
      },
    },
  })

  // Sync external value changes
  const prevValueRef = useRef(value)
  useEffect(() => {
    if (!editor) return
    if (value === prevValueRef.current) return
    prevValueRef.current = value
    const currentJson = JSON.stringify(editor.getJSON())
    const newJson = JSON.stringify(normalizeValue(value))
    if (currentJson !== newJson) {
      editor.commands.setContent(normalizeValue(value))
    }
  }, [value, editor])

  if (!editor) return null

  return (
    <div
      id={id}
      className={cn(
        'tiptap-editor rounded-xl border bg-[var(--surface)] transition-colors',
        focused
          ? 'border-[var(--accent-solid)] ring-2 ring-[var(--ring)]'
          : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)]',
        variant === 'compact' && 'compact',
        className,
      )}
      role="textbox"
      aria-label={ariaLabel}
      aria-multiline="true"
    >
      {(variant === 'full' || focused) && (
        <EditorToolbar editor={editor} variant={variant} />
      )}
      <EditorContent editor={editor} />
    </div>
  )
}

function normalizeValue(value: TiptapDoc | string | null | undefined): TiptapDoc | string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (value.type === 'doc') return value
  return ''
}
