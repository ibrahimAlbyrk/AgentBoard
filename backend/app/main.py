from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db
from app.middleware.error_handler import register_error_handlers
from app.middleware.request_id import RequestIDMiddleware

app = FastAPI(
    title="AgentBoard API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestIDMiddleware)

register_error_handlers(app)

from app.api.v1 import (
    activity,
    api_keys,
    auth,
    comments,
    labels,
    members,
    projects,
    search,
    stats,
    statuses,
    tasks,
    users,
    websocket,
)

for router_module in [
    auth,
    users,
    api_keys,
    projects,
    members,
    statuses,
    labels,
    tasks,
    comments,
    activity,
    search,
    stats,
]:
    app.include_router(router_module.router, prefix="/api/v1")

app.include_router(websocket.router, prefix="/api/v1")


@app.on_event("startup")
async def startup():
    await init_db()


@app.get("/health")
async def health():
    return {"status": "healthy", "version": "1.0.0"}
