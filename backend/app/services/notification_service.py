import hashlib
import hmac
import json
import logging
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import crud_user, crud_webhook
from app.models.notification import Notification
from app.schemas.notification import NotificationPreferences

logger = logging.getLogger(__name__)


class NotificationService:
    @staticmethod
    async def get_user_prefs(db: AsyncSession, user_id: UUID) -> NotificationPreferences:
        user = await crud_user.get(db, user_id)
        raw = (user.notification_preferences or {}) if user else {}
        return NotificationPreferences(**raw)

    @staticmethod
    async def should_notify(
        db: AsyncSession,
        *,
        user_id: UUID,
        actor_id: UUID,
        notification_type: str,
        project_id: UUID | None = None,
    ) -> bool:
        prefs = await NotificationService.get_user_prefs(db, user_id)
        if not prefs.self_notifications and user_id == actor_id:
            return False
        if not getattr(prefs, notification_type, True):
            return False
        if project_id and str(project_id) in prefs.muted_projects:
            return False
        return True

    @staticmethod
    async def create_notification(
        db: AsyncSession,
        *,
        user_id: UUID,
        actor_id: UUID | None = None,
        project_id: UUID | None = None,
        type: str,
        title: str,
        message: str,
        data: dict | None = None,
    ) -> Notification | None:
        if actor_id is not None:
            should = await NotificationService.should_notify(
                db, user_id=user_id, actor_id=actor_id,
                notification_type=type, project_id=project_id,
            )
            if not should:
                return None

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

        # trigger email if user opted in
        prefs = await NotificationService.get_user_prefs(db, user_id)
        if prefs.email_enabled and prefs.email_digest == "instant":
            user = await crud_user.get(db, user_id)
            if user and user.email:
                NotificationService._dispatch_email(
                    to=user.email, title=title,
                    message=message, notification_type=type,
                )

        return notif

    @staticmethod
    def _dispatch_email(*, to: str, title: str, message: str, notification_type: str) -> None:
        from app.services.email_service import (
            email_configured,
            fire_and_forget_email,
            render_notification_email,
        )

        if not email_configured():
            logger.debug("Email skipped (Resend not configured): to=%s", to)
            return

        html = render_notification_email(title, message, notification_type)
        fire_and_forget_email(to, f"AgentBoard: {title}", html)

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
