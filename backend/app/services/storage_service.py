import uuid
from pathlib import Path
from typing import Protocol

from fastapi import UploadFile

from app.core.config import settings


class StorageBackend(Protocol):
    async def save(self, file: UploadFile, subdir: str) -> tuple[str, int]:
        """Save file and return (relative_path, file_size)."""
        ...

    async def delete(self, file_path: str) -> None: ...

    def get_path(self, file_path: str) -> Path: ...


class LocalStorage:
    def __init__(self, base_dir: str = settings.UPLOAD_DIR):
        self.base_dir = Path(base_dir)

    async def save(self, file: UploadFile, subdir: str) -> tuple[str, int]:
        dir_path = self.base_dir / subdir
        dir_path.mkdir(parents=True, exist_ok=True)
        ext = Path(file.filename or "file").suffix
        unique_name = f"{uuid.uuid4().hex}{ext}"
        file_path = dir_path / unique_name
        content = await file.read()
        file_path.write_bytes(content)
        return f"{subdir}/{unique_name}", len(content)

    async def delete(self, file_path: str) -> None:
        full = self.base_dir / file_path
        if full.exists():
            full.unlink()

    def get_path(self, file_path: str) -> Path:
        return self.base_dir / file_path


storage = LocalStorage()
