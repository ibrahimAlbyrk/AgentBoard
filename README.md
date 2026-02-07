# AgentBoard

A task management system with agent-friendly REST API. Build Kanban boards, manage tasks, and integrate with AI agents.

## Features

- Multi-project Kanban boards with customizable workflows
- Drag-and-drop task management
- Real-time collaboration via WebSocket
- REST API with auto-generated OpenAPI docs
- API key authentication for agents
- Task dependencies and parent/child relationships
- File attachments, labels, comments
- Activity logging and project statistics
- Email and webhook notifications

## Tech Stack

### Backend
- Python 3.11+ / FastAPI / SQLAlchemy 2.0 (async)
- PostgreSQL (production) / SQLite (development)
- Redis (caching + WebSocket pub/sub)
- Alembic (migrations)

### Frontend
- React 18 + TypeScript / Vite
- shadcn/ui + Tailwind CSS
- dnd-kit (drag and drop)
- Zustand (state) / TanStack Query (data fetching)

## Quick Start

### Development

1. **Backend:**
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # or .venv\Scripts\activate on Windows
   pip install -r requirements.txt
   cp .env.example .env
   alembic upgrade head
   uvicorn app.main:app --reload --port 8000
   ```

2. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. Open http://localhost:3000

### Production (Docker)

```bash
cp .env.example .env
# Edit .env with production values
docker-compose up -d
```

Open http://localhost

## API Documentation

After starting the backend, visit:
- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

## Agent Integration

Agents can interact with AgentBoard via REST API using API keys:

```bash
# Create a task
curl -X POST http://localhost:8000/api/v1/projects/{project_id}/tasks \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"title": "Investigate API latency", "priority": "high"}'

# Move task to in-progress
curl -X POST http://localhost:8000/api/v1/projects/{project_id}/tasks/{task_id}/move \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"status_id": "in-progress-status-uuid"}'

# List tasks with filters
curl http://localhost:8000/api/v1/projects/{project_id}/tasks?priority=high&status_id=xxx \
  -H "X-API-Key: your_api_key"

# Bulk update
curl -X POST http://localhost:8000/api/v1/projects/{project_id}/tasks/bulk-update \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"task_ids": ["uuid1", "uuid2"], "updates": {"priority": "urgent"}}'
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| DATABASE_URL | Database connection string | sqlite+aiosqlite:///./agentboard.db |
| REDIS_URL | Redis connection string | redis://localhost:6379 |
| SECRET_KEY | JWT signing secret | (required in production) |
| CORS_ORIGINS | Allowed CORS origins | http://localhost:3000 |
| SMTP_HOST | Email SMTP host | (optional) |

## Project Structure

```
AgentBoard/
├── backend/           # FastAPI Python backend
│   ├── app/
│   │   ├── api/v1/    # Route handlers
│   │   ├── core/      # Config, database, security
│   │   ├── crud/      # Database operations
│   │   ├── models/    # SQLAlchemy models
│   │   ├── schemas/   # Pydantic schemas
│   │   └── services/  # Business logic
│   └── alembic/       # Database migrations
├── frontend/          # React TypeScript frontend
│   └── src/
│       ├── components/ # UI components
│       ├── hooks/      # React Query hooks
│       ├── stores/     # Zustand state
│       └── types/      # TypeScript types
├── docker/            # Docker configs
└── docker-compose.yml
```

## License

MIT
