from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import check_project_access, get_current_user
from app.core.database import get_db
from app.crud import crud_comment, crud_task
from app.models.comment import Comment
from app.models.project import Project
from app.models.user import User
from app.schemas.base import PaginatedResponse, PaginationMeta, ResponseBase
from app.schemas.comment import CommentCreate, CommentResponse, CommentUpdate

router = APIRouter(
    prefix="/projects/{project_id}/tasks/{task_id}/comments",
    tags=["Comments"],
)


async def _get_task_or_404(
    task_id: UUID, project: Project, db: AsyncSession
):
    task = await crud_task.get(db, task_id)
    if not task or task.project_id != project.id:
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
    project: Project = Depends(check_project_access),
):
    await _get_task_or_404(task_id, project, db)
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
    project: Project = Depends(check_project_access),
    current_user: User = Depends(get_current_user),
):
    await _get_task_or_404(task_id, project, db)
    comment = Comment(
        task_id=task_id,
        user_id=current_user.id,
        content=comment_in.content,
    )
    db.add(comment)
    await db.flush()
    await db.refresh(comment)
    return ResponseBase(data=CommentResponse.model_validate(comment))


@router.patch("/{comment_id}", response_model=ResponseBase[CommentResponse])
async def update_comment(
    task_id: UUID,
    comment_id: UUID,
    comment_in: CommentUpdate,
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
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
    project: Project = Depends(check_project_access),
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
