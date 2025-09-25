const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

/**
 * Convert HTTP URL to WebSocket URL
 */
function toWsUrl(path) {
  // Convert http(s)://host to ws(s)://host and append path (no /api prefix)
  const url = new URL(API_BASE_URL)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  // Channels routes are served at root (no /api)
  return `${url.protocol}//${url.host}${path}`
}

export function connectOrders(onMessage) {
  const ws = new WebSocket(toWsUrl('/ws/orders/'))
  ws.onmessage = (evt) => {
    try {
      const data = JSON.parse(evt.data)
      onMessage?.(data)
    } catch {}
  }
  return ws
}

export function connectOrderDetail(orderId, onMessage) {
  const ws = new WebSocket(toWsUrl(`/ws/orders/${orderId}/`))
  ws.onmessage = (evt) => {
    try {
      const data = JSON.parse(evt.data)
      onMessage?.(data)
    } catch {}
  }
  return ws
}

/**
 * Connect to admin dashboard WebSocket for real-time updates
 * @param {Function} onMessage - Callback when a message is received
 * @returns {WebSocket} WebSocket connection
 */
export function connectAdminDashboard(onMessage) {
  const ws = new WebSocket(toWsUrl('/ws/admin/dashboard/'))
  ws.onmessage = (evt) => {
    try {
      const data = JSON.parse(evt.data)
      onMessage?.(data)
    } catch (e) {
      console.error('Error parsing WebSocket message:', e)
    }
  }
  ws.onerror = (error) => {
    console.error('WebSocket error:', error)
  }
  return ws
}
