import json

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.core.security import decode_token
from app.services.websocket_manager import manager

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    project_id: str = Query(...),
    board_id: str = Query(...),
):
    try:
        payload = decode_token(token)
    except Exception:
        await websocket.close(code=4001)
        return

    user_id = payload.get("sub")
    board_key = f"{project_id}:{board_id}"
    user_key = f"user:{user_id}" if user_id else None

    await websocket.accept()
    await manager.connect(board_key, websocket)
    if user_key:
        await manager.connect(user_key, websocket)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
                msg_type = data.get("type")
            except json.JSONDecodeError:
                msg_type = raw

            if msg_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        manager.disconnect(board_key, websocket)
        if user_key:
            manager.disconnect(user_key, websocket)
