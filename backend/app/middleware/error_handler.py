from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.errors import AppError


def _format_validation_errors(errors: list[dict]) -> list[dict]:
    """Convert Pydantic validation errors to field-level error dicts."""
    result = []
    for err in errors:
        loc = err.get("loc", [])
        # Skip "body" prefix from FastAPI
        field_parts = [str(p) for p in loc if p != "body"]
        field = ".".join(field_parts) if field_parts else "unknown"
        result.append({
            "field": field,
            "message": err.get("msg", "Invalid value"),
        })
    return result


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        content = {
            "success": False,
            "error": {
                "code": exc.code.value if hasattr(exc.code, "value") else str(exc.code),
                "message": str(exc.detail),
            },
            "meta": {"timestamp": datetime.utcnow().isoformat()},
        }
        if exc.field_errors:
            content["error"]["details"] = exc.field_errors
        return JSONResponse(status_code=exc.status_code, content=content)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ):
        details = _format_validation_errors(exc.errors())
        # Build human-readable summary from field errors
        if len(details) == 1:
            summary = f"{details[0]['field']}: {details[0]['message']}"
        else:
            summary = f"{len(details)} validation errors"

        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": summary,
                    "details": details,
                },
                "meta": {"timestamp": datetime.utcnow().isoformat()},
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ):
        # Map HTTP status codes to meaningful error codes
        code_map = {
            400: "VALIDATION_ERROR",
            401: "UNAUTHORIZED",
            403: "PERMISSION_DENIED",
            404: "NOT_FOUND",
            409: "DUPLICATE",
            429: "RATE_LIMIT",
        }
        code = code_map.get(exc.status_code, f"HTTP_{exc.status_code}")

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {
                    "code": code,
                    "message": str(exc.detail),
                },
                "meta": {"timestamp": datetime.utcnow().isoformat()},
            },
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "An unexpected error occurred",
                },
                "meta": {"timestamp": datetime.utcnow().isoformat()},
            },
        )
