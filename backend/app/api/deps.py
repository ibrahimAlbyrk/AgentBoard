from datetime import UTC, datetime
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader, OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token, hash_api_key
from app.crud import crud_api_key, crud_board, crud_board_member, crud_project, crud_project_member
from app.models.board import Board
from app.models.project import Project
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str | None = Depends(oauth2_scheme),
    api_key: str | None = Depends(api_key_header),
) -> User:
    if token:
        payload = decode_token(token)
        from app.crud import crud_user

        user = await crud_user.get(db, UUID(payload["sub"]))
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or inactive user",
            )
        return user

    if api_key:
        key_hash = hash_api_key(api_key)
        ak = await crud_api_key.get_by_key_hash(db, key_hash)
        if not ak or not ak.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key",
            )
        if ak.expires_at and ak.expires_at.replace(tzinfo=UTC) < datetime.now(UTC):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API key expired",
            )
        await crud_api_key.update_last_used(db, ak)
        from app.crud import crud_user

        return await crud_user.get(db, ak.user_id)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def check_project_access(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Project:
    project = await crud_project.get(db, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    if project.owner_id != current_user.id:
        is_member = await crud_project_member.is_member(
            db, project_id, current_user.id
        )
        if not is_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )
    return project


async def check_board_access(
    project_id: UUID,
    board_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Board:
    project = await crud_project.get(db, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    board = await crud_board.get(db, board_id)
    if not board or board.project_id != project.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
        )

    # Project owner or admin → access all boards
    if project.owner_id == current_user.id:
        return board

    project_member = await crud_project_member.get_by_project_and_user(
        db, project.id, current_user.id
    )
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    if project_member.role == "admin":
        return board

    # Regular member → must be board member
    is_board_member = await crud_board_member.is_member(
        db, board_id, current_user.id
    )
    if not is_board_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No access to this board",
        )
    return board
