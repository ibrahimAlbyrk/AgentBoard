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

## Architecture

### Backend (`backend/app/`)
- **Framework:** FastAPI async, Python 3.11+
- **DB:** SQLAlchemy 2.0 async — SQLite (dev) / PostgreSQL (prod)
- **Migrations:** Alembic. `init_db()` in `main.py` auto-creates tables on startup
- **Auth:** JWT (HS256) via `core/security.py` + API key auth (`X-API-Key` header, SHA256 hashed)
- **Token expiry:** 60min access, 30day refresh

**Request flow:** `api/v1/routes.py` → route handlers → services (business logic) → crud layer → models

| Layer | Path | Role |
|-------|------|------|
| Routes | `api/v1/*.py` | HTTP handlers, auth guards |
| Services | `services/*.py` | Business logic, orchestration |
| CRUD | `crud/base.py` + modules | Generic DB ops (CRUDBase class) |
| Models | `models/*.py` | SQLAlchemy ORM models |
| Schemas | `schemas/*.py` | Pydantic request/response DTOs |
| Config | `core/config.py` | Pydantic Settings from env vars |

**Key models:** User, Project, Task, Status, Label, Comment, TaskDependency, APIKey, ProjectMember, ActivityLog

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

**Pages:** Login, Register, Dashboard, Projects, Board, Settings

### Real-time
WebSocket via FastAPI + Redis pub/sub. Frontend hook: `useWebSocket`. Used for live task/activity updates.

## Key Patterns

- **Generic CRUD:** `crud/base.py` provides reusable `CRUDBase[Model, CreateSchema, UpdateSchema]` — extend for custom queries
- **Separate Create/Update/Response schemas** in `schemas/` for each model
- **Position-based ordering** for tasks within statuses (drag-and-drop), managed by `services/position_service.py`
- **Project-scoped resources:** tasks, statuses, labels are nested under `/projects/{project_id}/`
- **Dual auth:** Bearer JWT for users, `X-API-Key` for agents — both checked in security deps

## Environment

Config via `.env` files. Key vars: `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`, `CORS_ORIGINS`. See `.env.example` at root and `backend/.env.example`.
