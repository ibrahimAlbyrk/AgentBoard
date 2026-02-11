import { useMemo } from 'react'
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

const extensions = [
  StarterKit.configure({ codeBlock: false }),
  Underline,
  LinkExt.configure({ openOnClick: false }),
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
  Mention.extend({ name: 'reference' }).configure({
    HTMLAttributes: { class: 'reference' },
  }),
]

interface RichTextRendererProps {
  content: TiptapDoc | string | null | undefined
  className?: string
}

export function RichTextRenderer({ content, className }: RichTextRendererProps) {
  const html = useMemo(() => {
    if (!content) return ''
    if (typeof content === 'string') {
      // Legacy plain text - render as paragraphs
      return content
        .split('\n')
        .map((line) => `<p>${escapeHtml(line) || '<br>'}</p>`)
        .join('')
    }
    try {
      return generateHTML(content, extensions)
    } catch {
      return '<p>[Unable to render content]</p>'
    }
  }, [content])

  if (!html) return null

  return (
    <div
      className={cn('rich-text-renderer', className)}
      dangerouslySetInnerHTML={{ __html: html }}
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
