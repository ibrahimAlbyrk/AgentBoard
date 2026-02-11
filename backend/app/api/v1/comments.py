from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import check_board_access, get_current_user
from app.core.database import get_db
from app.crud import crud_agent, crud_attachment, crud_comment, crud_reaction, crud_task
from app.models.board import Board
from app.models.comment import Comment
from app.models.user import User
from app.schemas.base import PaginatedResponse, PaginationMeta, ResponseBase
from app.schemas.comment import CommentCreate, CommentResponse, CommentUpdate
from app.services.content_service import extract_mentions, extract_plain_text, normalize_content
from app.services.notification_service import NotificationService
from app.services.reaction_service import ReactionService
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
    current_user: User = Depends(get_current_user),
):
    await _get_task_or_404(task_id, board, db)
    skip = (page - 1) * per_page
    comments = await crud_comment.get_multi_by_task(db, task_id, skip=skip, limit=per_page)
    total = await crud_comment.count(db, filters={"task_id": task_id})

    comment_ids = [c.id for c in comments]
    reaction_summaries = await crud_reaction.get_summaries_batch(
        db, "comment", comment_ids, current_user_id=current_user.id
    )
    responses = []
    for c in comments:
        resp = CommentResponse.model_validate(c)
        resp.reactions = reaction_summaries.get(c.id)
        responses.append(resp)

    return PaginatedResponse(
        data=responses,
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
    task = await crud_task.get_with_relations(db, task_id)
    if not task or task.board_id != board.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )

    # Validate agent_creator_id if provided
    if comment_in.agent_creator_id:
        agent = await crud_agent.get(db, comment_in.agent_creator_id)
        if not agent or agent.project_id != board.project_id or not agent.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or inactive agent_creator_id",
            )

    # Normalize content to Tiptap JSON
    content_doc = normalize_content(comment_in.content)
    content_text = extract_plain_text(content_doc) if content_doc else ""

    comment = Comment(
        task_id=task_id,
        user_id=current_user.id,
        agent_creator_id=comment_in.agent_creator_id,
        content=content_doc or {"type": "doc", "content": [{"type": "paragraph"}]},
        content_text=content_text,
    )
    db.add(comment)
    await db.flush()
    await db.refresh(comment, ["user", "agent_creator", "attachments"])

    if comment_in.attachment_ids:
        unlinked = await crud_attachment.get_unlinked_by_ids(
            db, comment_in.attachment_ids, task_id, current_user.id
        )
        for att in unlinked:
            att.comment_id = comment.id
            db.add(att)
        await db.flush()
        await db.refresh(comment, ["attachments"])

    commenter_name = current_user.full_name or current_user.username
    preview = content_text[:80] + ("..." if len(content_text) > 80 else "")
    for assignee in task.assignees:
        if not assignee.user_id:
            continue
        notif = await NotificationService.create_notification(
            db,
            user_id=assignee.user_id,
            actor_id=current_user.id,
            project_id=board.project_id,
            type="task_comment",
            title="New Comment",
            message=f'{commenter_name} commented on "{task.title}": {preview}',
            data={"task_id": str(task_id), "board_id": str(board.id)},
        )
        if notif:
            await manager.broadcast_to_user(str(assignee.user_id), {
                "type": "notification.new",
            })

    # Notify @mentioned users in comment
    if content_doc:
        user_mentions = extract_mentions(content_doc, {"user"})
        notified_mention: set[str] = set()
        for m in user_mentions:
            uid_str = m["id"]
            if uid_str in notified_mention or uid_str == str(current_user.id):
                continue
            notified_mention.add(uid_str)
            notif = await NotificationService.create_notification(
                db,
                user_id=UUID(uid_str),
                actor_id=current_user.id,
                project_id=board.project_id,
                type="mentioned",
                title="Mentioned in Comment",
                message=f'{commenter_name} mentioned you in a comment on "{task.title}"',
                data={"task_id": str(task_id), "board_id": str(board.id)},
            )
            if notif:
                await manager.broadcast_to_user(uid_str, {"type": "notification.new"})

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
    # Normalize content
    content_doc = normalize_content(comment_in.content)
    content_text = extract_plain_text(content_doc) if content_doc else ""

    # Track mention diff
    old_mention_ids = {
        m["id"] for m in extract_mentions(comment.content, {"user"})
    } if isinstance(comment.content, dict) else set()

    comment.content = content_doc or {"type": "doc", "content": [{"type": "paragraph"}]}
    comment.content_text = content_text
    comment.is_edited = True

    new_mention_ids = {
        m["id"] for m in extract_mentions(comment.content, {"user"})
    } if content_doc else set()
    newly_mentioned = new_mention_ids - old_mention_ids
    db.add(comment)
    await db.flush()
    await db.refresh(comment)

    # Notify newly @mentioned users
    if newly_mentioned:
        task = await crud_task.get(db, task_id)
        commenter_name = current_user.full_name or current_user.username
        for uid_str in newly_mentioned:
            if uid_str == str(current_user.id):
                continue
            notif = await NotificationService.create_notification(
                db,
                user_id=UUID(uid_str),
                actor_id=current_user.id,
                project_id=board.project_id,
                type="mentioned",
                title="Mentioned in Comment",
                message=f'{commenter_name} mentioned you in a comment on "{task.title if task else "a task"}"',
                data={"task_id": str(task_id), "board_id": str(board.id)},
            )
            if notif:
                await manager.broadcast_to_user(uid_str, {"type": "notification.new"})

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
    await ReactionService.delete_reactions_for_entity(db, "comment", comment_id)
    await crud_comment.remove(db, id=comment_id)
