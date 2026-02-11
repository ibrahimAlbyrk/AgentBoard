import Mention from '@tiptap/extension-mention'

/**
 * Tiptap Mention extension configured for @user and @agent mentions.
 * Trigger: '@'
 * Stores: { id, entityType: 'user'|'agent', label }
 */
export const MentionUser = Mention.extend({ name: 'mention' }).configure({
  HTMLAttributes: {
    class: 'mention',
  },
  suggestion: {
    char: '@',
    allowSpaces: false,
  },
})
