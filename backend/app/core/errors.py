from enum import Enum

from fastapi import HTTPException


class ErrorCode(str, Enum):
    VALIDATION_ERROR = "VALIDATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    DUPLICATE = "DUPLICATE"
    PERMISSION_DENIED = "PERMISSION_DENIED"
    LIMIT_EXCEEDED = "LIMIT_EXCEEDED"
    INVALID_OPERATION = "INVALID_OPERATION"
    AUTH_FAILED = "AUTH_FAILED"
    UNAUTHORIZED = "UNAUTHORIZED"


class AppError(HTTPException):
    def __init__(
        self,
        status_code: int,
        detail: str,
        code: ErrorCode,
        errors: list[dict] | None = None,
    ):
        super().__init__(status_code=status_code, detail=detail)
        self.code = code
        self.field_errors = errors


class ValidationError(AppError):
    def __init__(self, detail: str, errors: list[dict] | None = None):
        super().__init__(400, detail, ErrorCode.VALIDATION_ERROR, errors)


class NotFoundError(AppError):
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(404, detail, ErrorCode.NOT_FOUND)


class DuplicateError(AppError):
    def __init__(self, detail: str = "Resource already exists"):
        super().__init__(409, detail, ErrorCode.DUPLICATE)


class PermissionError_(AppError):
    """Named with trailing underscore to avoid shadowing builtin PermissionError."""
    def __init__(self, detail: str = "Permission denied"):
        super().__init__(403, detail, ErrorCode.PERMISSION_DENIED)


class LimitExceededError(AppError):
    def __init__(self, detail: str):
        super().__init__(400, detail, ErrorCode.LIMIT_EXCEEDED)


class InvalidOperationError(AppError):
    def __init__(self, detail: str):
        super().__init__(400, detail, ErrorCode.INVALID_OPERATION)


class AuthError(AppError):
    def __init__(self, detail: str = "Authentication failed", status_code: int = 401):
        super().__init__(status_code, detail, ErrorCode.AUTH_FAILED)
