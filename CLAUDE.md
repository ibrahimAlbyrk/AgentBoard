# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AgentBoard — full-stack Kanban task management system with agent-friendly REST API. Two independent apps: FastAPI backend + React frontend, orchestrated via Docker Compose.

## Commands

### Backend (run from `backend/`)
```bash
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000    # dev server
alembic upgrade head                          # apply migrations
alembic revision --autogenerate -m "msg"      # create migration
pip install -r requirements.txt               # install deps
```

### Frontend (run from `frontend/`)
```bash
npm run dev       # Vite dev server on :3000, proxies /api → :8000
npm run build     # TypeScript check + production build
npm run lint      # ESLint
npm run preview   # preview production build
```

### Docker (from root)
```bash
docker-compose up -d          # prod: PostgreSQL + Redis + app
docker-compose -f docker-compose.dev.yml up -d  # dev
```

### Seed Demo Data (from root)
```bash
python scripts/seed_demo_data.py --api-key <key>            # create 3 projects, ~290 tasks
python scripts/seed_demo_data.py --api-key <key> --clean     # clean + re-seed
```

## Architecture

### Backend (`backend/app/`)
- **Framework:** FastAPI async, Python 3.11+
- **DB:** SQLAlchemy 2.0 async — SQLite (dev) / PostgreSQL (prod)
- **Migrations:** Alembic. `init_db()` in `main.py` auto-creates tables on startup
- **Auth:** JWT (HS256) via `core/security.py` + API key auth (`X-API-Key` header, SHA256 hashed)
- **Token expiry:** 60min access, 30day refresh
- **Email:** Resend API integration (`services/email_service.py`), Jinja2 templates in `templates/email/`

**Request flow:** `main.py` router registration → `api/v1/*.py` handlers → `services/*.py` → `crud/*.py` → `models/*.py`

| Layer | Path | Role |
|-------|------|------|
| Routes | `api/v1/*.py` | HTTP handlers, auth guards |
| Services | `services/*.py` | Business logic, orchestration |
| CRUD | `crud/base.py` + modules | Generic DB ops (CRUDBase class) |
| Models | `models/*.py` | SQLAlchemy ORM models |
| Schemas | `schemas/*.py` | Pydantic request/response DTOs |
| Config | `core/config.py` | Pydantic Settings from env vars |
| Middleware | `middleware/*.py` | Error handler, RequestID |

**Key models:** User, Project, Board, BoardMember, Task, Status, Label, Comment, TaskDependency, Notification, Webhook, Attachment, APIKey, ProjectMember, ActivityLog

**API prefix:** `/api/v1/` — OpenAPI docs at `/api/docs`

### Frontend (`frontend/src/`)
- **Stack:** React 19, TypeScript, Vite, Tailwind CSS v4
- **UI:** shadcn/ui (new-york style) + Radix primitives + Lucide icons
- **State:** Zustand stores (`stores/`) with persist middleware for auth
- **Server state:** TanStack Query via custom hooks (`hooks/`)
- **Drag & drop:** dnd-kit
- **API client:** `lib/api-client.ts` — centralized HTTP wrapper with auto token refresh on 401
- **Routing:** React Router with lazy-loaded pages, protected routes in `App.tsx`
- **Path alias:** `@` → `src/` (configured in vite.config.ts + tsconfig)

**Pages:** Login, Register, Dashboard, Projects, BoardList, Board, Settings

### Real-time
- **WebSocket endpoint:** `ws://host/api/v1/ws?token=...&project_id=...&board_id=...`
- **Channels:** board (project:board), per-user (user:id)
- **Backend:** `services/websocket_manager.py` — Redis pub/sub based
- **Frontend:** `hooks/useWebSocket.ts`

## Key Patterns

- **Multi-board architecture:** Projects contain multiple Boards. Tasks and Statuses are board-scoped (not project-scoped). URL pattern: `/projects/{id}/boards/{id}/...`
- **Generic CRUD:** `crud/base.py` provides reusable `CRUDBase[Model, CreateSchema, UpdateSchema]` — extend for custom queries
- **Separate Create/Update/Response schemas** in `schemas/` for each model
- **Position-based ordering** for tasks within statuses (drag-and-drop), managed by `services/position_service.py`
- **Dual auth:** Bearer JWT for users, `X-API-Key` for agents — both checked in security deps
- **Notification system:** Preference-based (JSON in User model), supports per-project muting, instant email via Resend API, real-time via WebSocket. Service: `services/notification_service.py`
- **Webhook system:** Per-project webhooks with HMAC-SHA256 signing (`X-Webhook-Signature` header)
- **Dashboard:** `/dashboard/stats` (in-progress + overdue counts), `/dashboard/my-tasks` (assigned tasks with overdue/due-today/due-this-week summary)
- **Task navigation:** Dashboard tasks link to board via `?task={taskId}` query param, auto-opens detail panel

## Environment

Config via `.env` files. Key vars: `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`, `CORS_ORIGINS`, `RESEND_API_KEY`, `EMAIL_FROM`. See `.env.example` at root and `backend/.env.example`.

## Codebase Map

Auto-indexed codebase map at `.claude/docs/codebase-map/INDEX.md`. Contains structured maps of every source file, class, function, and API endpoint. Consult these maps BEFORE exploring the codebase — they provide instant lookup:

| Map File | Contents |
|----------|----------|
| `backend-core.md` | App entry, config, database, security, middleware |
| `backend-routes.md` | All API route handlers with HTTP methods and paths |
| `backend-models.md` | SQLAlchemy models and Pydantic schemas with fields |
| `backend-services.md` | Business logic services and CRUD operations |
| `frontend-components.md` | App entry, React pages, layout, board, and task components |
| `frontend-state.md` | Hooks, Zustand stores, types, and API client |

**Usage**: When you need to find or modify code, read the relevant map file first. Run `/map-codebase` to update after structural changes.
