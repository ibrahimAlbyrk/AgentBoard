from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.comment import Comment
from app.schemas.comment import CommentCreate, CommentUpdate

from .base import CRUDBase


class CRUDComment(CRUDBase[Comment, CommentCreate, CommentUpdate]):
    async def get_multi_by_task(
        self,
        db: AsyncSession,
        task_id: UUID,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Comment]:
        result = await db.execute(
            select(Comment)
            .where(Comment.task_id == task_id)
            .options(joinedload(Comment.user))
            .order_by(Comment.created_at)
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())


crud_comment = CRUDComment(Comment)
