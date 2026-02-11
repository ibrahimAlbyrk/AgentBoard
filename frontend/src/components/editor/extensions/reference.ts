import Mention from '@tiptap/extension-mention'

/**
 * Tiptap Mention extension configured for #references (projects, boards, tasks).
 * Trigger: '#'
 * Stores: { id, entityType: 'project'|'board'|'task', label }
 */
export const Reference = Mention.extend({ name: 'reference' }).configure({
  HTMLAttributes: {
    class: 'reference',
  },
  suggestion: {
    char: '#',
    allowSpaces: true,
  },
})
