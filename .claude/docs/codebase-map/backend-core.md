### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/main.py`
- **Purpose**: FastAPI app entry point — creates app, registers middleware, routers, and startup tasks.
- `app` — FastAPI instance (docs at `/api/docs`, prefix `/api/v1`)
- CORS middleware with `settings.CORS_ORIGINS`
- `RequestIDMiddleware` — adds `X-Request-ID` header
- `register_error_handlers()` — unified error responses
- Routers registered: auth, users, api_keys, projects, boards, members, agents, statuses, labels, tasks, comments, checklists, attachments, activity, notifications, search, stats, custom_fields, mentionables, dashboard, webhooks, websocket, reactions
- `startup()` — creates upload dir, calls `init_db()`
- `health()` — GET `/health` returns status + version

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/core/config.py`
- **Purpose**: App-wide settings loaded from env vars / `.env` file via Pydantic Settings.
- `Settings` — Pydantic BaseSettings class
  - `DATABASE_URL` — default `sqlite+aiosqlite:///./agentboard.db`
  - `REDIS_URL` — default `redis://localhost:6379`
  - `SECRET_KEY` — JWT signing key
  - `JWT_ALGORITHM` — default `HS256`
  - `ACCESS_TOKEN_EXPIRE_MINUTES` — default `60`
  - `REFRESH_TOKEN_EXPIRE_DAYS` — default `30`
  - `CORS_ORIGINS` — list, parsed from comma-separated string
  - `UPLOAD_DIR` — default `uploads`
  - `MAX_FILE_SIZE` — default 10MB
  - `RESEND_API_KEY` — optional, for email service
  - `EMAIL_FROM` — sender address
- `parse_cors_origins()` — splits comma-separated CORS string to list
- `settings` — singleton Settings instance

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/core/database.py`
- **Purpose**: SQLAlchemy async engine, session factory, base model, and DB init.
- `TZDateTime` — TypeDecorator that adds UTC tzinfo to naive datetimes from SQLite
  - `process_result_value()` — attaches UTC if tzinfo missing
- `_build_engine()` — creates async engine with SQLite-specific pooling
- `engine` — global async engine instance
- `async_session` — async session factory (expire_on_commit=False)
- `Base` — SQLAlchemy DeclarativeBase for all models
- `get_db()` — async generator yielding session with auto commit/rollback
- `init_db()` — creates all tables via `Base.metadata.create_all`

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/core/security.py`
- **Purpose**: Password hashing, JWT token creation/decoding, and API key generation.
- `hash_password()` — bcrypt hash a plaintext password
- `verify_password()` — bcrypt verify plain vs hashed
- `create_access_token()` — JWT access token with configurable expiry
- `create_refresh_token()` — JWT refresh token (30-day default)
- `decode_token()` — decode JWT, raises 401 on failure
- `generate_api_key()` — returns `(raw_key, sha256_hash)` tuple
- `hash_api_key()` — SHA256 hash of API key string

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/core/errors.py`
- **Purpose**: Structured error classes with error codes for consistent API error responses.
- `ErrorCode` — enum: VALIDATION_ERROR, NOT_FOUND, DUPLICATE, PERMISSION_DENIED, LIMIT_EXCEEDED, INVALID_OPERATION, AUTH_FAILED, UNAUTHORIZED
- `AppError` — base HTTPException with `code` and `field_errors`
- `ValidationError` — 400, VALIDATION_ERROR
- `NotFoundError` — 404, NOT_FOUND
- `DuplicateError` — 409, DUPLICATE
- `PermissionError_` — 403, PERMISSION_DENIED (trailing underscore avoids builtin shadow)
- `LimitExceededError` — 400, LIMIT_EXCEEDED
- `InvalidOperationError` — 400, INVALID_OPERATION
- `AuthError` — 401 (configurable), AUTH_FAILED

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/core/__init__.py`
- **Purpose**: Empty init file, no logic.

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/middleware/error_handler.py`
- **Purpose**: Registers global exception handlers for unified JSON error responses.
- `_format_validation_errors()` — converts Pydantic errors to `{field, message}` dicts
- `register_error_handlers()` — attaches 4 exception handlers to app:
  - `app_error_handler` — handles `AppError` with code + field errors
  - `validation_exception_handler` — handles `RequestValidationError` (422)
  - `http_exception_handler` — handles Starlette HTTPException with code mapping
  - `generic_exception_handler` — catch-all 500 with traceback print

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/middleware/request_id.py`
- **Purpose**: Middleware that attaches a UUID `X-Request-ID` header to every response.
- `RequestIDMiddleware` — generates UUID per request, adds to response headers

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/middleware/__init__.py`
- **Purpose**: Empty init file, no logic.

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/deps.py`
- **Purpose**: FastAPI dependency injection — auth resolution, project/board access checks.
- `oauth2_scheme` — OAuth2PasswordBearer for JWT extraction
- `api_key_header` — APIKeyHeader for `X-API-Key` extraction
- `Actor` — dataclass wrapping `User` + optional `Agent`
  - `is_agent` — property, True if agent is set
  - `display_name` — agent name or user full_name/username
- `get_current_actor()` — resolves JWT or API key to Actor; supports agent-linked keys
- `get_current_user()` — unwraps Actor to User
- `check_project_access()` — verifies actor has project access (owner/member/agent)
- `check_board_access()` — verifies actor has board access (owner/admin/board member/agent)

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/__init__.py`
- **Purpose**: Empty init file, no logic.

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/v1/__init__.py`
- **Purpose**: Empty init file, no logic.

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/__init__.py`
- **Purpose**: Empty init file, no logic.
