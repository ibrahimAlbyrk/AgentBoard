import Mention from '@tiptap/extension-mention'

/**
 * Tiptap Mention extension configured for #references (projects, boards, tasks).
 * Trigger: '#'
 * Stores: { id, entityType, label, projectId?, boardId? }
 *
 * Extra attrs (entityType, projectId, boardId) are persisted in the doc JSON
 * and rendered as data-entity-type, data-project-id, data-board-id on the
 * output <span> so the renderer can build navigation links.
 */
export const Reference = Mention.extend({
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
  HTMLAttributes: {
    class: 'reference',
  },
  suggestion: {
    char: '#',
    allowSpaces: true,
  },
})
