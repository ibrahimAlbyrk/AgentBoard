from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.webhook import Webhook
from app.schemas.webhook import WebhookCreate, WebhookUpdate

from .base import CRUDBase


class CRUDWebhook(CRUDBase[Webhook, WebhookCreate, WebhookUpdate]):
    async def get_multi_by_project(
        self, db: AsyncSession, project_id: UUID
    ) -> list[Webhook]:
        result = await db.execute(
            select(Webhook).where(Webhook.project_id == project_id)
        )
        return list(result.scalars().all())

    async def get_active_for_event(
        self, db: AsyncSession, project_id: UUID, event_type: str
    ) -> list[Webhook]:
        result = await db.execute(
            select(Webhook).where(
                Webhook.project_id == project_id,
                Webhook.is_active == True,  # noqa: E712
            )
        )
        webhooks = result.scalars().all()
        return [w for w in webhooks if event_type in (w.events or [])]


crud_webhook = CRUDWebhook(Webhook)
