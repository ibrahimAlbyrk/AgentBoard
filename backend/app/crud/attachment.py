from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.attachment import Attachment
from app.schemas.attachment import AttachmentResponse

from .base import CRUDBase


class CRUDAttachment(CRUDBase[Attachment, AttachmentResponse, AttachmentResponse]):
    async def get_by_task(
        self, db: AsyncSession, task_id: UUID
    ) -> list[Attachment]:
        result = await db.execute(
            select(Attachment)
            .where(Attachment.task_id == task_id, Attachment.comment_id.is_(None))
            .options(joinedload(Attachment.user))
            .order_by(Attachment.created_at)
        )
        return list(result.scalars().all())

    async def get_by_comment(
        self, db: AsyncSession, comment_id: UUID
    ) -> list[Attachment]:
        result = await db.execute(
            select(Attachment)
            .where(Attachment.comment_id == comment_id)
            .options(joinedload(Attachment.user))
            .order_by(Attachment.created_at)
        )
        return list(result.scalars().all())

    async def get_unlinked_by_ids(
        self,
        db: AsyncSession,
        ids: list[UUID],
        task_id: UUID,
        user_id: UUID,
    ) -> list[Attachment]:
        result = await db.execute(
            select(Attachment).where(
                Attachment.id.in_(ids),
                Attachment.task_id == task_id,
                Attachment.user_id == user_id,
                Attachment.comment_id.is_(None),
            )
        )
        return list(result.scalars().all())


crud_attachment = CRUDAttachment(Attachment)
