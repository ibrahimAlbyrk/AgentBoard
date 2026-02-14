"""Daily email digest service.

Collects unread notifications for users with email_digest="daily"
and sends a single digest email. Run via: python -m app.services.digest_service
"""
import asyncio
import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_maker
from app.crud.notification import crud_notification
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationPreferences
from app.services.email_service import (
    email_configured,
    fire_and_forget_email,
    render_digest_email,
)

logger = logging.getLogger(__name__)

DIGEST_WINDOW_HOURS = 24


async def _get_digest_users(db: AsyncSession) -> list[User]:
    """Get users who have email_digest enabled."""
    result = await db.execute(select(User))
    users = []
    for u in result.scalars().all():
        prefs = NotificationPreferences(**(u.notification_preferences or {}))
        if prefs.email_enabled and prefs.email_digest == "daily":
            users.append(u)
    return users


async def _get_unread_since(
    db: AsyncSession, user_id, since: datetime
) -> list[Notification]:
    result = await db.execute(
        select(Notification)
        .where(
            Notification.user_id == user_id,
            Notification.is_read == False,  # noqa: E712
            Notification.created_at >= since,
        )
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    return list(result.scalars().all())


def _time_ago(dt: datetime) -> str:
    now = datetime.now(UTC)
    diff = now - dt
    if diff < timedelta(minutes=1):
        return "just now"
    if diff < timedelta(hours=1):
        return f"{int(diff.total_seconds() // 60)}m ago"
    if diff < timedelta(days=1):
        return f"{int(diff.total_seconds() // 3600)}h ago"
    return f"{diff.days}d ago"


async def send_digests() -> int:
    """Send digest emails to all eligible users. Returns count sent."""
    if not email_configured():
        logger.info("Email not configured, skipping digest")
        return 0

    sent = 0
    since = datetime.now(UTC) - timedelta(hours=DIGEST_WINDOW_HOURS)

    async with async_session_maker() as db:
        users = await _get_digest_users(db)
        logger.info("Found %d users with daily digest enabled", len(users))

        for user in users:
            if not user.email:
                continue
            notifications = await _get_unread_since(db, user.id, since)
            if not notifications:
                continue

            items = [
                {
                    "type": n.type,
                    "title": n.title,
                    "message": n.message,
                    "time_ago": _time_ago(n.created_at),
                }
                for n in notifications
            ]
            html = render_digest_email(items, len(notifications))
            fire_and_forget_email(
                user.email,
                f"AgentBoard: {len(notifications)} new notification{'s' if len(notifications) != 1 else ''}",
                html,
            )
            sent += 1
            logger.info("Digest sent to %s (%d notifications)", user.email, len(notifications))

    return sent


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    count = asyncio.run(send_digests())
    print(f"Sent {count} digest emails")
