import json

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, set[WebSocket]] = {}

    async def connect(self, key: str, websocket: WebSocket) -> None:
        if key not in self.active_connections:
            self.active_connections[key] = set()
        self.active_connections[key].add(websocket)

    def disconnect(self, key: str, websocket: WebSocket) -> None:
        if key in self.active_connections:
            self.active_connections[key].discard(websocket)
            if not self.active_connections[key]:
                del self.active_connections[key]

    async def _broadcast(self, key: str, message: dict) -> None:
        if key not in self.active_connections:
            return
        dead: set[WebSocket] = set()
        msg = json.dumps(message, default=str)
        for ws in self.active_connections[key]:
            try:
                await ws.send_text(msg)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.disconnect(key, ws)

    async def broadcast_to_board(
        self, project_id: str, board_id: str, message: dict
    ) -> None:
        key = f"{project_id}:{board_id}"
        await self._broadcast(key, message)

    async def broadcast_to_project(
        self, project_id: str, message: dict
    ) -> None:
        await self._broadcast(project_id, message)


manager = ConnectionManager()
