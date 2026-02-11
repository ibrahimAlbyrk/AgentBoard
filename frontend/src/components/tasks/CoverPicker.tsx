import { useState, useRef, useCallback } from 'react'
import { Upload, Loader2, ImageIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { GRADIENT_PRESETS, COLOR_PRESETS } from '@/lib/cover-presets'
import { useUploadAttachment } from '@/hooks/useAttachments'
import { useUpdateTask } from '@/hooks/useTasks'
import { toast } from 'sonner'
import type { Task, Attachment, CoverType, CoverSize } from '@/types'

const MAX_FILE_SIZE = 10 * 1024 * 1024

interface CoverPickerProps {
  task: Task
  projectId: string
  boardId: string
  children: React.ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CoverPicker({ task, projectId, boardId, children, open, onOpenChange }: CoverPickerProps) {
  const uploadAttachment = useUploadAttachment(projectId, boardId, task.id)
  const updateTask = useUpdateTask(projectId, boardId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [customHex, setCustomHex] = useState('')

  const imageAttachments = (task.attachments ?? []).filter(
    (a: Attachment) => a.mime_type.startsWith('image/')
  )

  const setCover = useCallback((type: CoverType, value: string, size?: CoverSize) => {
    updateTask.mutate({
      taskId: task.id,
      data: {
        cover_type: type,
        cover_value: value,
        cover_size: size ?? task.cover_size ?? 'full',
      },
    })
  }, [updateTask, task.id, task.cover_size])

  const removeCover = useCallback(() => {
    updateTask.mutate({
      taskId: task.id,
      data: { cover_type: null, cover_value: null, cover_size: null },
    })
  }, [updateTask, task.id])

  const setCoverSize = useCallback((size: CoverSize) => {
    if (!task.cover_type || !task.cover_value) return
    updateTask.mutate({
      taskId: task.id,
      data: { cover_size: size },
    })
  }, [updateTask, task.id, task.cover_type, task.cover_value])

  const handleFiles = useCallback((files: FileList | File[]) => {
    const file = files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files can be used as covers')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File is too large. Maximum size is 10MB.')
      return
    }
    uploadAttachment.mutate(file, {
      onSuccess: (res) => {
        const attachmentId = res.data.id
        updateTask.mutate({
          taskId: task.id,
          data: {
            cover_type: 'image',
            cover_value: attachmentId,
            cover_size: task.cover_size ?? 'full',
          },
        })
      },
      onError: () => toast.error('Failed to upload image'),
    })
  }, [uploadAttachment, updateTask, task.id, task.cover_size])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const selectAttachmentAsCover = (attachmentId: string) => {
    setCover('image', attachmentId)
  }

  const selectColor = (hex: string) => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      toast.error('Invalid hex color')
      return
    }
    setCover('color', hex)
  }

  const selectGradient = (key: string) => {
    setCover('gradient', key)
  }

  const currentSize = task.cover_size ?? 'full'
  const hasCover = task.cover_type && task.cover_value

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[360px] p-0 bg-[var(--elevated)] border-[var(--border-subtle)] rounded-xl overflow-hidden"
        style={{ boxShadow: '0 8px 40px -8px rgba(0,0,0,0.25)' }}
      >
        <Tabs defaultValue="upload" className="w-full">
          <TabsList variant="line" className="px-3 pt-2">
            <TabsTrigger value="upload" className="text-xs">Upload</TabsTrigger>
            <TabsTrigger value="attachments" className="text-xs">Attachments</TabsTrigger>
            <TabsTrigger value="colors" className="text-xs">Colors</TabsTrigger>
            <TabsTrigger value="gradients" className="text-xs">Gradients</TabsTrigger>
          </TabsList>

          <div className="max-h-[300px] overflow-y-auto">
            {/* Upload */}
            <TabsContent value="upload" className="p-3 mt-0">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragEnter={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200',
                  dragOver
                    ? 'border-[var(--accent-solid)] bg-[var(--accent-muted-bg)] scale-[1.01]'
                    : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)]'
                )}
              >
                {uploadAttachment.isPending ? (
                  <Loader2 className="size-6 text-[var(--accent-solid)] animate-spin" />
                ) : (
                  <Upload className="size-6 text-[var(--text-tertiary)]" />
                )}
                <p className="text-sm text-[var(--text-tertiary)]">
                  {dragOver ? 'Drop image here' : 'Click or drag an image'}
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">JPG, PNG, GIF, WebP -- max 10MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) handleFiles(e.target.files)
                    e.target.value = ''
                  }}
                />
              </div>
            </TabsContent>

            {/* Attachments */}
            <TabsContent value="attachments" className="p-3 mt-0">
              {imageAttachments.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {imageAttachments.map((att) => (
                    <button
                      key={att.id}
                      onClick={() => selectAttachmentAsCover(att.id)}
                      className={cn(
                        'aspect-video rounded-lg overflow-hidden border-2 transition-all hover:scale-[1.03]',
                        att.id === task.cover_value && task.cover_type === 'image'
                          ? 'border-[var(--accent-solid)] ring-2 ring-[var(--ring)]'
                          : 'border-transparent'
                      )}
                    >
                      <img
                        src={`/api/v1/attachments/${att.id}/download`}
                        alt={att.filename}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <ImageIcon className="size-6 text-[var(--text-tertiary)]" />
                  <p className="text-sm text-[var(--text-tertiary)]">No images attached</p>
                  <p className="text-xs text-[var(--text-tertiary)]">Upload one or use a color</p>
                </div>
              )}
            </TabsContent>

            {/* Colors */}
            <TabsContent value="colors" className="p-3 mt-0">
              <div className="grid grid-cols-8 gap-2">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    onClick={() => selectColor(color)}
                    className={cn(
                      'size-9 rounded-lg transition-all hover:scale-110',
                      color.toUpperCase() === task.cover_value?.toUpperCase() && task.cover_type === 'color'
                        ? 'ring-2 ring-[var(--accent-solid)] ring-offset-2 ring-offset-[var(--elevated)]'
                        : ''
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <Input
                  placeholder="#000000"
                  value={customHex}
                  onChange={(e) => setCustomHex(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') selectColor(customHex)
                  }}
                  className="flex-1 h-8 text-sm font-mono"
                  maxLength={7}
                />
                <button
                  onClick={() => selectColor(customHex)}
                  className="h-8 px-3 rounded-lg text-xs font-medium bg-[var(--accent-solid)] text-white hover:bg-[var(--accent-solid-hover)] transition-colors"
                >
                  Apply
                </button>
              </div>
            </TabsContent>

            {/* Gradients */}
            <TabsContent value="gradients" className="p-3 mt-0">
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(GRADIENT_PRESETS).map(([key, css]) => (
                  <button
                    key={key}
                    onClick={() => selectGradient(key)}
                    className={cn(
                      'aspect-[3/2] rounded-lg transition-all hover:scale-105',
                      key === task.cover_value && task.cover_type === 'gradient'
                        ? 'ring-2 ring-[var(--accent-solid)] ring-offset-2 ring-offset-[var(--elevated)]'
                        : ''
                    )}
                    style={{ background: css }}
                  />
                ))}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer: Size toggle + Remove */}
        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-tertiary)]">Size:</span>
            <button
              onClick={() => setCoverSize('full')}
              className={cn(
                'text-xs px-2 py-0.5 rounded-md transition-colors',
                currentSize === 'full'
                  ? 'bg-[var(--accent-muted-bg)] text-[var(--accent-solid)]'
                  : 'text-[var(--text-tertiary)] hover:text-foreground'
              )}
            >
              Full
            </button>
            <button
              onClick={() => setCoverSize('half')}
              className={cn(
                'text-xs px-2 py-0.5 rounded-md transition-colors',
                currentSize === 'half'
                  ? 'bg-[var(--accent-muted-bg)] text-[var(--accent-solid)]'
                  : 'text-[var(--text-tertiary)] hover:text-foreground'
              )}
            >
              Half
            </button>
          </div>
          {hasCover && (
            <button
              onClick={removeCover}
              className="text-xs text-[var(--text-tertiary)] hover:text-destructive transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
