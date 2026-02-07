from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.schemas.notification import NotificationResponse

from .base import CRUDBase


class CRUDNotification(
    CRUDBase[Notification, NotificationResponse, NotificationResponse]
):
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

    async def mark_read(
        self, db: AsyncSession, notification_id: UUID
    ) -> None:
        await db.execute(
            update(Notification)
            .where(Notification.id == notification_id)
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


crud_notification = CRUDNotification(Notification)
