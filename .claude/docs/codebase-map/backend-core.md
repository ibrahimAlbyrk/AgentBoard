### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/main.py`
- **Purpose**: FastAPI application factory — configures middleware, registers all v1 routers, and initializes the database on startup.
- `app` — FastAPI instance with CORS, request-ID middleware, error handlers
- Registers 20 route modules under `/api/v1`: auth, users, api_keys, projects, boards, members, agents, statuses, labels, tasks, comments, checklists, attachments, activity, notifications, search, stats, custom_fields, mentionables, dashboard
- Registers separate routers: `websocket.router`, `attachments.download_router`, `reactions.task_router`, `reactions.comment_router`
- `startup()` — creates upload dir and calls `init_db()`
- `health()` — GET `/health` returning status and version

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/core/config.py`
- **Purpose**: Centralised app configuration loaded from environment variables via Pydantic Settings.
- `Settings` — BaseSettings subclass holding all config fields
  - `DATABASE_URL` — SQLite default, PostgreSQL in prod
  - `REDIS_URL` — Redis connection string
  - `SECRET_KEY` — JWT signing key
  - `JWT_ALGORITHM` — default `HS256`
  - `ACCESS_TOKEN_EXPIRE_MINUTES` — default 60
  - `REFRESH_TOKEN_EXPIRE_DAYS` — default 30
  - `CORS_ORIGINS` — allowed origins list
  - `UPLOAD_DIR` — file upload directory, default `uploads`
  - `MAX_FILE_SIZE` — max upload size, default 10MB
  - `RESEND_API_KEY` — optional Resend API key for email
  - `EMAIL_FROM` — sender address for outbound email
  - `parse_cors_origins()` — splits comma-separated string into list
- `settings` — singleton Settings instance

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/core/database.py`
- **Purpose**: SQLAlchemy async engine, session factory, and base model setup.
- `_build_engine()` — creates async engine with SQLite StaticPool fallback
- `engine` — module-level async engine instance
- `async_session` — async sessionmaker bound to engine
- `Base` — DeclarativeBase for all ORM models
- `get_db()` — async generator yielding a session with auto commit/rollback
- `init_db()` — creates all tables from Base metadata

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/core/security.py`
- **Purpose**: Password hashing, JWT token creation/verification, and API key generation utilities.
- `hash_password()` — bcrypt hash a plaintext password
- `verify_password()` — bcrypt verify plain against hashed
- `create_access_token()` — issue a signed JWT access token
- `create_refresh_token()` — issue a signed JWT refresh token
- `decode_token()` — decode and validate a JWT, raises 401
- `generate_api_key()` — return `(raw_key, sha256_hash)` pair
- `hash_api_key()` — SHA-256 hash an API key string

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/middleware/request_id.py`
- **Purpose**: Starlette middleware that attaches a UUID `X-Request-ID` header to every response.
- `RequestIDMiddleware` — generates UUID per request, sets response header

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/middleware/error_handler.py`
- **Purpose**: Global exception handlers returning standardised JSON error responses.
- `register_error_handlers()` — attaches three exception handlers to the app
  - `validation_exception_handler` — 422 for Pydantic validation errors
  - `http_exception_handler` — forwards HTTP exception status and detail
  - `generic_exception_handler` — 500 catch-all with traceback logging

### `/Users/ibrahimalbyrk/Projects/CC/AgentBoard/backend/app/api/deps.py`
- **Purpose**: FastAPI dependency functions for authentication and resource access control.
- `oauth2_scheme` — OAuth2 bearer token extractor
- `api_key_header` — `X-API-Key` header extractor
- `get_current_user()` — resolves user from JWT or API key, raises 401
- `check_project_access()` — verifies user is project owner or member, raises 403/404
- `check_board_access()` — verifies user can access a board (owner/admin/board member), raises 403/404
