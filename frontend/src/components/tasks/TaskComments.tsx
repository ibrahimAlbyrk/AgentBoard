import { useState, useRef, useCallback, useEffect } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { Send, Paperclip, X, File, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useComments, useCreateComment } from '@/hooks/useComments'
import { useUploadAttachment } from '@/hooks/useAttachments'
import { ReactionBar } from '@/components/reactions/ReactionBar'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { RichTextRenderer } from '@/components/editor/RichTextRenderer'
import type { Attachment, TiptapDoc } from '@/types'
import { toast } from '@/lib/toast'

const MAX_FILE_SIZE = 10 * 1024 * 1024

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface TaskCommentsProps {
  projectId: string
  boardId: string
  taskId: string
}

export function TaskComments({ projectId, boardId, taskId }: TaskCommentsProps) {
  const { data: commentsRes, isLoading } = useComments(projectId, boardId, taskId)
  const createComment = useCreateComment(projectId, boardId, taskId)
  const uploadAttachment = useUploadAttachment(projectId, boardId, taskId)
  const [content, setContent] = useState<TiptapDoc | null>(null)
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const comments = commentsRes?.data ?? []

  const handleUploadFile = useCallback((file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`"${file.name}" is too large. Maximum size is 10MB.`)
      return
    }
    setUploading(true)
    uploadAttachment.mutate(file, {
      onSuccess: (res) => {
        setPendingAttachments((prev) => [...prev, res.data])
      },
      onError: () => {
        toast.error(`Failed to upload "${file.name}"`)
      },
      onSettled: () => {
        setUploading(false)
      },
    })
  }, [uploadAttachment])

  const removePending = (id: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  const hasContent = content && content.content && content.content.length > 0
  const handleSubmit = () => {
    if (!hasContent && pendingAttachments.length === 0) return
    createComment.mutate(
      {
        content: content || ' ',
        attachment_ids: pendingAttachments.length > 0
          ? pendingAttachments.map((a) => a.id)
          : undefined,
      },
      {
        onSuccess: () => {
          setContent(null)
          setPendingAttachments([])
        },
      },
    )
  }

  useEffect(() => {
    if (!lightboxSrc) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        e.preventDefault()
        setLightboxSrc(null)
      }
    }
    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [lightboxSrc])

  const isImage = (mime: string) => mime.startsWith('image/')

  return (
    <div className="space-y-4">
      {/* Comment input */}
      <div className="space-y-2">
        <RichTextEditor
          projectId={projectId}
          value={content}
          onChange={(doc) => setContent(doc)}
          onSubmit={handleSubmit}
          variant="compact"
          placeholder="Write a comment... (Cmd+Enter to send)"
        />

        {/* Pending attachments */}
        {pendingAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 pb-1">
            {pendingAttachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg bg-[var(--elevated)] border border-[var(--border-subtle)] text-xs"
              >
                {isImage(att.mime_type) ? (
                  <img
                    src={`/api/v1/attachments/${att.id}/download`}
                    alt={att.filename}
                    className="size-5 rounded object-cover"
                  />
                ) : (
                  <File className="size-3.5 text-[var(--accent-solid)]" />
                )}
                <span className="max-w-[120px] truncate text-foreground">{att.filename}</span>
                <button
                  onClick={() => removePending(att.id)}
                  className="size-5 rounded flex items-center justify-center hover:bg-[var(--surface)] transition-colors"
                >
                  <X className="size-3 text-[var(--text-tertiary)]" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="size-7 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-foreground hover:bg-[var(--elevated)] transition-all"
              title="Attach file"
            >
              {uploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Paperclip className="size-3.5" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  for (const file of e.target.files) handleUploadFile(file)
                }
                e.target.value = ''
              }}
            />
          </div>
          <Button
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleSubmit}
            disabled={(!hasContent && pendingAttachments.length === 0) || createComment.isPending}
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
              {comment.agent_creator ? (
                <span
                  className="size-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                  style={{ backgroundColor: comment.agent_creator.color }}
                >
                  {comment.agent_creator.name.charAt(0).toUpperCase()}
                </span>
              ) : (
                <Avatar className="size-7 shrink-0">
                  <AvatarImage src={comment.user.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px] bg-[var(--accent-muted-bg)] text-[var(--accent-solid)]">
                    {(comment.user.full_name ?? comment.user.username)
                      .charAt(0)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {comment.agent_creator
                      ? comment.agent_creator.name
                      : (comment.user.full_name ?? comment.user.username)}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)]">
                    {formatDistanceToNow(parseISO(comment.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                  {comment.is_edited && (
                    <span className="text-[10px] text-[var(--text-tertiary)]">(edited)</span>
                  )}
                </div>
                <div className="mt-1">
                  <RichTextRenderer content={comment.content} className="text-sm" />
                </div>

                {/* Comment attachments */}
                {comment.attachments?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {comment.attachments.map((att) =>
                      isImage(att.mime_type) ? (
                        <button
                          key={att.id}
                          onClick={() => setLightboxSrc(`/api/v1/attachments/${att.id}/download`)}
                          className="rounded-lg overflow-hidden border border-[var(--border-subtle)] hover:opacity-80 transition-opacity"
                        >
                          <img
                            src={`/api/v1/attachments/${att.id}/download`}
                            alt={att.filename}
                            className="max-w-[200px] max-h-[150px] object-cover"
                          />
                        </button>
                      ) : (
                        <a
                          key={att.id}
                          href={`/api/v1/attachments/${att.id}/download`}
                          download={att.filename}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors text-xs"
                        >
                          <File className="size-3.5 text-[var(--accent-solid)]" />
                          <span className="max-w-[140px] truncate">{att.filename}</span>
                          <span className="text-[var(--text-tertiary)]">{formatFileSize(att.file_size)}</span>
                          <Download className="size-3 text-[var(--text-tertiary)]" />
                        </a>
                      ),
                    )}
                  </div>
                )}

                {/* Comment reactions */}
                <div className="mt-2">
                  <ReactionBar
                    entityType="comment"
                    projectId={projectId}
                    boardId={boardId}
                    taskId={taskId}
                    commentId={comment.id}
                    compact
                  />
                </div>
              </div>
            </div>
            {index < comments.length - 1 && (
              <div className="border-b border-[var(--border-subtle)] ml-10" />
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            className="absolute top-4 right-4 size-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            onClick={() => setLightboxSrc(null)}
          >
            <X className="size-5" />
          </button>
          <img
            src={lightboxSrc}
            alt="Preview"
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
