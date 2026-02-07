import { useState } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useComments, useCreateComment } from '@/hooks/useComments'

interface TaskCommentsProps {
  projectId: string
  taskId: string
}

export function TaskComments({ projectId, taskId }: TaskCommentsProps) {
  const { data: commentsRes, isLoading } = useComments(projectId, taskId)
  const createComment = useCreateComment(projectId, taskId)
  const [content, setContent] = useState('')

  const comments = commentsRes?.data ?? []

  const handleSubmit = () => {
    if (!content.trim()) return
    createComment.mutate(content.trim(), {
      onSuccess: () => setContent(''),
    })
  }

  return (
    <div className="space-y-4">
      {/* Comment input */}
      <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-xl p-3 focus-within:border-[var(--border-strong)] transition-colors">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a comment..."
          className="min-h-[60px] border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:shadow-none resize-none text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
          }}
        />
        <div className="flex justify-end pt-2">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!content.trim() || createComment.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-7 px-3 text-xs gap-1.5"
          >
            <Send className="size-3" />
            Send
          </Button>
        </div>
      </div>

      {isLoading && (
        <p className="text-sm text-[var(--text-tertiary)] text-center py-4">
          Loading comments...
        </p>
      )}

      {comments.length === 0 && !isLoading && (
        <p className="text-sm text-[var(--text-tertiary)] text-center py-4">
          No comments yet
        </p>
      )}

      <div className="space-y-1">
        {comments.map((comment, index) => (
          <div key={comment.id}>
            <div className="flex gap-3 py-3">
              <Avatar className="size-7 shrink-0">
                <AvatarImage src={comment.user.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px] bg-[var(--accent-muted-bg)] text-[var(--accent-solid)]">
                  {(comment.user.full_name ?? comment.user.username)
                    .charAt(0)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {comment.user.full_name ?? comment.user.username}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)]">
                    {formatDistanceToNow(parseISO(comment.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p className="text-sm text-foreground mt-1">{comment.content}</p>
              </div>
            </div>
            {index < comments.length - 1 && (
              <div className="border-b border-[var(--border-subtle)] ml-10" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
