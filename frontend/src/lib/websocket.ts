type EventHandler = (event: Record<string, unknown>) => void

class WebSocketManager {
  private ws: WebSocket | null = null
  private handlers = new Map<string, Set<EventHandler>>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private projectId: string | null = null
  private boardId: string | null = null
  private token: string | null = null
  private reconnectDelay = 3000
  private intentionalClose = false

  connect(projectId: string, boardId: string, token: string) {
    if (this.ws && this.projectId === projectId && this.boardId === boardId && this.token === token) return
    this.disconnect()
    this.projectId = projectId
    this.boardId = boardId
    this.token = token
    this.intentionalClose = false

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    this.ws = new WebSocket(`${protocol}//${host}/api/v1/ws?token=${token}&project_id=${projectId}&board_id=${boardId}`)

    this.ws.onopen = () => {
      this.reconnectDelay = 3000
      this.send({ type: 'subscribe', project_id: projectId, board_id: boardId })
      this.heartbeatTimer = setInterval(() => this.send({ type: 'ping' }), 30000)
    }

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'pong') return
      const handlers = this.handlers.get(data.type)
      handlers?.forEach((h) => h(data))
    }

    this.ws.onclose = () => {
      this.cleanup()
      if (this.intentionalClose) return
      this.reconnectTimer = setTimeout(() => {
        if (this.projectId && this.boardId && this.token) {
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000)
          this.connect(this.projectId, this.boardId, this.token)
        }
      }, this.reconnectDelay)
    }

    this.ws.onerror = () => this.ws?.close()
  }

  disconnect() {
    this.intentionalClose = true
    this.cleanup()
    if (this.ws) {
      this.ws.onclose = null
      this.ws.onerror = null
      this.ws.onmessage = null
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close()
      }
      this.ws = null
    }
  }

  on(type: string, handler: EventHandler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set())
    this.handlers.get(type)!.add(handler)
  }

  off(type: string, handler: EventHandler) {
    this.handlers.get(type)?.delete(handler)
  }

  private send(data: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  private cleanup() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.heartbeatTimer = null
    this.reconnectTimer = null
  }
}

export const wsManager = new WebSocketManager()
