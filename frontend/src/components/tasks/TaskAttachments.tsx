import { useState, useRef, useCallback, useEffect } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { Upload, File, Trash2, Download, X, Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAttachments, useUploadAttachment, useDeleteAttachment } from '@/hooks/useAttachments'
import { useAuthStore } from '@/stores/authStore'
import type { Attachment } from '@/types'
import { toast } from '@/lib/toast'

const MAX_FILE_SIZE = 10 * 1024 * 1024

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface TaskAttachmentsProps {
  projectId: string
  boardId: string
  taskId: string
}

export function TaskAttachments({ projectId, boardId, taskId }: TaskAttachmentsProps) {
  const { data: attachmentsRes, isLoading } = useAttachments(projectId, boardId, taskId)
  const uploadAttachment = useUploadAttachment(projectId, boardId, taskId)
  const deleteAttachment = useDeleteAttachment(projectId, boardId, taskId)
  const user = useAuthStore((s) => s.user)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const attachments = attachmentsRes?.data ?? []

  const handleFiles = useCallback((files: FileList | File[]) => {
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" is too large. Maximum size is 10MB.`)
        continue
      }
      uploadAttachment.mutate(file, {
        onError: () => toast.error(`Failed to upload "${file.name}"`),
      })
    }
  }, [uploadAttachment])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleDelete = (attachment: Attachment) => {
    deleteAttachment.mutate(attachment.id, {
      onError: (err: unknown) => toast.error(err),
    })
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
      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragEnter={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200
          ${dragOver
            ? 'border-[var(--accent-solid)] bg-[var(--accent-muted-bg)] scale-[1.01]'
            : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)]'
          }
        `}
      >
        {uploadAttachment.isPending ? (
          <Loader2 className="size-5 text-[var(--accent-solid)] animate-spin" />
        ) : (
          <Upload className="size-5 text-[var(--text-tertiary)]" />
        )}
        <span className="text-xs text-[var(--text-tertiary)]">
          {dragOver ? 'Drop files here' : 'Click or drag files to upload'}
        </span>
        <span className="text-[10px] text-[var(--text-tertiary)]">Max 10MB per file</span>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {isLoading && (
        <p className="text-sm text-[var(--text-tertiary)] text-center py-4">Loading attachments...</p>
      )}

      {attachments.length === 0 && !isLoading && (
        <p className="text-sm text-[var(--text-tertiary)] text-center py-4">No attachments yet</p>
      )}

      {/* File list */}
      <div className="space-y-1">
        {attachments.map((att) => (
          <div
            key={att.id}
            className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] hover:border-[var(--border-strong)] transition-colors group"
          >
            {/* Thumbnail or icon */}
            {isImage(att.mime_type) ? (
              <button
                onClick={() => setLightboxSrc(`/api/v1/attachments/${att.id}/download`)}
                className="size-10 rounded-lg overflow-hidden shrink-0 border border-[var(--border-subtle)] hover:opacity-80 transition-opacity"
              >
                <img
                  src={`/api/v1/attachments/${att.id}/download`}
                  alt={att.filename}
                  className="size-full object-cover"
                />
              </button>
            ) : (
              <div className="size-10 rounded-lg bg-[var(--accent-muted-bg)] flex items-center justify-center shrink-0">
                <File className="size-4 text-[var(--accent-solid)]" />
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{att.filename}</p>
              <div className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)]">
                <span>{formatFileSize(att.file_size)}</span>
                <span>&middot;</span>
                <Avatar className="size-3.5">
                  <AvatarImage src={att.user.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[6px] bg-[var(--accent-muted-bg)] text-[var(--accent-solid)]">
                    {(att.user.full_name ?? att.user.username).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>{att.user.full_name ?? att.user.username}</span>
                <span>&middot;</span>
                <span>{formatDistanceToNow(parseISO(att.created_at), { addSuffix: true })}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <a
                href={`/api/v1/attachments/${att.id}/download`}
                download={att.filename}
                className="size-7 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-foreground hover:bg-[var(--elevated)] transition-all"
              >
                <Download className="size-3.5" />
              </a>
              {user?.id === att.user.id && (
                <button
                  onClick={() => handleDelete(att)}
                  disabled={deleteAttachment.isPending}
                  className="size-7 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
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
