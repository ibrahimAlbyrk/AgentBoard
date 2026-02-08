from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import check_board_access, get_current_user
from app.core.database import get_db
from app.crud import crud_attachment, crud_comment, crud_task
from app.models.board import Board
from app.models.comment import Comment
from app.models.user import User
from app.schemas.base import PaginatedResponse, PaginationMeta, ResponseBase
from app.schemas.comment import CommentCreate, CommentResponse, CommentUpdate
from app.services.notification_service import NotificationService
from app.services.websocket_manager import manager

router = APIRouter(
    prefix="/projects/{project_id}/boards/{board_id}/tasks/{task_id}/comments",
    tags=["Comments"],
)


async def _get_task_or_404(
    task_id: UUID, board: Board, db: AsyncSession
):
    task = await crud_task.get(db, task_id)
    if not task or task.board_id != board.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )
    return task


@router.get("/", response_model=PaginatedResponse[CommentResponse])
async def list_comments(
    task_id: UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
):
    await _get_task_or_404(task_id, board, db)
    skip = (page - 1) * per_page
    comments = await crud_comment.get_multi_by_task(db, task_id, skip=skip, limit=per_page)
    total = await crud_comment.count(db, filters={"task_id": task_id})
    return PaginatedResponse(
        data=[CommentResponse.model_validate(c) for c in comments],
        pagination=PaginationMeta(
            page=page,
            per_page=per_page,
            total=total,
            total_pages=(total + per_page - 1) // per_page if total else 0,
        ),
    )


@router.post("/", response_model=ResponseBase[CommentResponse], status_code=201)
async def create_comment(
    task_id: UUID,
    comment_in: CommentCreate,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    task = await _get_task_or_404(task_id, board, db)
    comment = Comment(
        task_id=task_id,
        user_id=current_user.id,
        content=comment_in.content,
    )
    db.add(comment)
    await db.flush()
    await db.refresh(comment)

    if comment_in.attachment_ids:
        unlinked = await crud_attachment.get_unlinked_by_ids(
            db, comment_in.attachment_ids, task_id, current_user.id
        )
        for att in unlinked:
            att.comment_id = comment.id
            db.add(att)
        await db.flush()
        await db.refresh(comment, ["attachments"])

    if task.assignee_id:
        commenter_name = current_user.full_name or current_user.username
        preview = comment_in.content[:80] + ("..." if len(comment_in.content) > 80 else "")
        notif = await NotificationService.create_notification(
            db,
            user_id=task.assignee_id,
            actor_id=current_user.id,
            project_id=board.project_id,
            type="task_comment",
            title="New Comment",
            message=f'{commenter_name} commented on "{task.title}": {preview}',
            data={"task_id": str(task_id), "board_id": str(board.id)},
        )
        if notif:
            await manager.broadcast_to_user(str(task.assignee_id), {
                "type": "notification.new",
            })

    return ResponseBase(data=CommentResponse.model_validate(comment))


@router.patch("/{comment_id}", response_model=ResponseBase[CommentResponse])
async def update_comment(
    task_id: UUID,
    comment_id: UUID,
    comment_in: CommentUpdate,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    comment = await crud_comment.get(db, comment_id)
    if not comment or comment.task_id != task_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found"
        )
    if comment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only edit own comments",
        )
    comment.content = comment_in.content
    comment.is_edited = True
    db.add(comment)
    await db.flush()
    await db.refresh(comment)
    return ResponseBase(data=CommentResponse.model_validate(comment))


@router.delete("/{comment_id}", status_code=204)
async def delete_comment(
    task_id: UUID,
    comment_id: UUID,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    comment = await crud_comment.get(db, comment_id)
    if not comment or comment.task_id != task_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found"
        )
    if comment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only delete own comments",
        )
    await crud_comment.remove(db, id=comment_id)
