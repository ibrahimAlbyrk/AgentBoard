from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.api_key import APIKey
from app.schemas.api_key import APIKeyCreate, APIKeyResponse

from .base import CRUDBase


class CRUDAPIKey(CRUDBase[APIKey, APIKeyCreate, APIKeyResponse]):
    async def get_by_key_hash(
        self, db: AsyncSession, key_hash: str
    ) -> APIKey | None:
        result = await db.execute(
            select(APIKey).where(APIKey.key_hash == key_hash)
        )
        return result.scalar_one_or_none()

    async def get_multi_by_user(
        self, db: AsyncSession, user_id: UUID
    ) -> list[APIKey]:
        result = await db.execute(
            select(APIKey).where(APIKey.user_id == user_id)
        )
        return list(result.scalars().all())

    async def update_last_used(
        self, db: AsyncSession, api_key: APIKey
    ) -> None:
        api_key.last_used_at = datetime.now(timezone.utc)
        db.add(api_key)
        await db.flush()


crud_api_key = CRUDAPIKey(APIKey)
