from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.schemas.notification import NotificationResponse

from .base import CRUDBase


class CRUDNotification(
    CRUDBase[Notification, NotificationResponse, NotificationResponse]
):
    async def get_by_user(
        self, db: AsyncSession, user_id: UUID, *, skip: int = 0, limit: int = 50
    ) -> list[Notification]:
        result = await db.execute(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_unread_by_user(
        self, db: AsyncSession, user_id: UUID
    ) -> list[Notification]:
        result = await db.execute(
            select(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.is_read == False,  # noqa: E712
            )
            .order_by(Notification.created_at.desc())
        )
        return list(result.scalars().all())

    async def count_unread(self, db: AsyncSession, user_id: UUID) -> int:
        result = await db.execute(
            select(func.count(Notification.id)).where(
                Notification.user_id == user_id,
                Notification.is_read == False,  # noqa: E712
            )
        )
        return result.scalar_one()

    async def mark_read(
        self, db: AsyncSession, notification_id: UUID
    ) -> None:
        await db.execute(
            update(Notification)
            .where(Notification.id == notification_id)
            .values(is_read=True)
        )
        await db.flush()

    async def mark_read_batch(
        self, db: AsyncSession, notification_ids: list[UUID]
    ) -> None:
        if not notification_ids:
            return
        await db.execute(
            update(Notification)
            .where(Notification.id.in_(notification_ids))
            .values(is_read=True)
        )
        await db.flush()

    async def mark_all_read(
        self, db: AsyncSession, user_id: UUID
    ) -> None:
        await db.execute(
            update(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.is_read == False,  # noqa: E712
            )
            .values(is_read=True)
        )
        await db.flush()

    async def delete_all_by_user(
        self, db: AsyncSession, user_id: UUID
    ) -> int:
        from sqlalchemy import delete
        result = await db.execute(
            delete(Notification).where(Notification.user_id == user_id)
        )
        await db.flush()
        return result.rowcount


crud_notification = CRUDNotification(Notification)
