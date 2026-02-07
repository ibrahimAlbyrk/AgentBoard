type EventHandler = (event: Record<string, unknown>) => void

class WebSocketManager {
  private ws: WebSocket | null = null
  private handlers = new Map<string, Set<EventHandler>>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private projectId: string | null = null
  private token: string | null = null
  private reconnectDelay = 3000

  connect(projectId: string, token: string) {
    this.disconnect()
    this.projectId = projectId
    this.token = token

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    this.ws = new WebSocket(`${protocol}//${host}/api/v1/ws?token=${token}`)

    this.ws.onopen = () => {
      this.reconnectDelay = 3000
      this.send({ type: 'subscribe', project_id: projectId })
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
      this.reconnectTimer = setTimeout(() => {
        if (this.projectId && this.token) {
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000)
          this.connect(this.projectId, this.token)
        }
      }, this.reconnectDelay)
    }

    this.ws.onerror = () => this.ws?.close()
  }

  disconnect() {
    this.cleanup()
    this.ws?.close()
    this.ws = null
    this.projectId = null
    this.token = null
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
