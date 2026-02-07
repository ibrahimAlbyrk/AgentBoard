import hashlib
import hmac
import json
import logging
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import crud_webhook
from app.models.notification import Notification

logger = logging.getLogger(__name__)


class NotificationService:
    @staticmethod
    async def create_notification(
        db: AsyncSession,
        *,
        user_id: UUID,
        project_id: UUID | None = None,
        type: str,
        title: str,
        message: str,
        data: dict | None = None,
    ) -> Notification:
        notif = Notification(
            user_id=user_id,
            project_id=project_id,
            type=type,
            title=title,
            message=message,
            data=data,
        )
        db.add(notif)
        await db.flush()
        return notif

    @staticmethod
    async def send_email(to: str, subject: str, body: str) -> None:
        logger.info("Email send skipped (SMTP not configured): to=%s subject=%s", to, subject)

    @staticmethod
    async def send_webhook(url: str, secret: str | None, event: dict) -> None:
        import aiohttp

        payload = json.dumps(event, default=str)
        headers = {"Content-Type": "application/json"}
        if secret:
            sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
            headers["X-Webhook-Signature"] = sig

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url, data=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    logger.info("Webhook sent to %s: status=%s", url, resp.status)
        except Exception:
            logger.exception("Failed to send webhook to %s", url)

    @staticmethod
    async def notify_project_event(
        db: AsyncSession, project_id: UUID, event_type: str, data: dict
    ) -> None:
        webhooks = await crud_webhook.get_active_for_event(db, project_id, event_type)
        for wh in webhooks:
            await NotificationService.send_webhook(
                wh.url, wh.secret, {"event": event_type, "data": data}
            )
