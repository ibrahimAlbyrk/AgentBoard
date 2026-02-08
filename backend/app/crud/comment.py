from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.models.attachment import Attachment
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
            .options(
                joinedload(Comment.user),
                selectinload(Comment.attachments).joinedload(Attachment.user),
            )
            .order_by(Comment.created_at)
            .offset(skip)
            .limit(limit)
        )
        return list(result.unique().scalars().all())


crud_comment = CRUDComment(Comment)
