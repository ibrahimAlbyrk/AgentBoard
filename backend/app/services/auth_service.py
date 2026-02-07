from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_api_key,
)
from app.crud import crud_api_key, crud_user
from app.models.api_key import APIKey
from app.schemas.api_key import APIKeyCreate
from app.schemas.user import UserCreate


class AuthService:
    @staticmethod
    async def register(db: AsyncSession, user_in: UserCreate) -> dict:
        existing = await crud_user.get_by_email(db, user_in.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        existing = await crud_user.get_by_username(db, user_in.username)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken",
            )
        user = await crud_user.create(db, obj_in=user_in)
        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(str(user.id))
        return {
            "user": user,
            "access_token": access_token,
            "refresh_token": refresh_token,
        }

    @staticmethod
    async def login(db: AsyncSession, email: str, password: str) -> dict:
        user = await crud_user.authenticate(db, email, password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is disabled",
            )
        user.last_login_at = datetime.now(UTC)
        db.add(user)
        await db.flush()

        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(str(user.id))
        return {
            "user": user,
            "access_token": access_token,
            "refresh_token": refresh_token,
        }

    @staticmethod
    async def refresh_token(token: str) -> dict:
        payload = decode_token(token)
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )
        access_token = create_access_token(data={"sub": payload["sub"]})
        return {"access_token": access_token, "token_type": "bearer"}

    @staticmethod
    async def create_api_key(
        db: AsyncSession, user_id: UUID, key_in: APIKeyCreate
    ) -> dict:
        raw_key, key_hash = generate_api_key()
        expires_at = None
        if key_in.expires_in_days:
            expires_at = datetime.now(UTC) + timedelta(days=key_in.expires_in_days)
        api_key = APIKey(
            user_id=user_id,
            key_hash=key_hash,
            name=key_in.name,
            prefix=raw_key[:10],
            scopes=key_in.scopes,
            expires_at=expires_at,
        )
        db.add(api_key)
        await db.flush()
        await db.refresh(api_key)
        return {"api_key": api_key, "raw_key": raw_key}
