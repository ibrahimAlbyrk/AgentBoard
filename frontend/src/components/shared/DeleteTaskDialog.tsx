import { usePanelLayer } from '@/contexts/PanelStackContext'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { TaskDeleteMode } from '@/types'

interface DeleteTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskTitle: string
  childrenCount: number
  onDelete: (mode: TaskDeleteMode) => void
}

export function DeleteTaskDialog({
  open,
  onOpenChange,
  taskTitle,
  childrenCount,
  onDelete,
}: DeleteTaskDialogProps) {
  usePanelLayer('delete-task-dialog', open)

  const hasChildren = childrenCount > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete &ldquo;{taskTitle}&rdquo;?</DialogTitle>
          <DialogDescription>
            {hasChildren
              ? `This task has ${childrenCount} subtask${childrenCount !== 1 ? 's' : ''}. Choose how to handle them:`
              : 'This action cannot be undone.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className={hasChildren ? 'flex-col sm:flex-row gap-2' : ''}>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {hasChildren ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  onDelete('orphan')
                  onOpenChange(false)
                }}
              >
                Keep Subtasks
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  onDelete('cascade')
                  onOpenChange(false)
                }}
              >
                Delete All
              </Button>
            </>
          ) : (
            <Button
              variant="destructive"
              onClick={() => {
                onDelete('orphan')
                onOpenChange(false)
              }}
            >
              Delete
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
