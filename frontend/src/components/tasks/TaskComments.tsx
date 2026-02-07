import { useState } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'
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
      <div className="flex gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a comment..."
          className="min-h-[60px]"
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!content.trim() || createComment.isPending}
        >
          Send
        </Button>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Loading comments...
        </p>
      )}

      {comments.length === 0 && !isLoading && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No comments yet
        </p>
      )}

      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <Avatar className="size-7">
              <AvatarImage src={comment.user.avatar_url ?? undefined} />
              <AvatarFallback className="text-[10px]">
                {(comment.user.full_name ?? comment.user.username)
                  .charAt(0)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {comment.user.full_name ?? comment.user.username}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(parseISO(comment.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              <p className="text-sm mt-1">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
