import { webSocketService } from '../services/api'

/**
 * Legacy function for backward compatibility
 * @deprecated Use webSocketService directly instead
 */
export function connectOrders(onMessage) {
  // Connect as customer by default
  webSocketService.connect('customer')

  // Set up message handler
  const unsubscribe = webSocketService.on('onOrderStatusChanged', onMessage)

  return {
    close: () => {
      unsubscribe()
      webSocketService.disconnect()
    }
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use webSocketService directly instead
 */
export function connectOrderDetail(orderId, onMessage) {
  // Connect as customer by default
  webSocketService.connect('customer')

  // Set up message handler for specific order
  const unsubscribe = webSocketService.on('onOrderStatusChanged', (orderIdFromWS, status) => {
    if (orderIdFromWS === orderId) {
      onMessage({ order_id: orderId, status })
    }
  })

  return {
    close: () => {
      unsubscribe()
      webSocketService.disconnect()
    }
  }
}

/**
 * Connect to admin dashboard WebSocket for real-time updates
 * @param {Function} onMessage - Callback when a message is received
 * @returns {WebSocket} WebSocket connection
 */
export function connectAdminDashboard(onMessage) {
  // Use the new WebSocket service
  webSocketService.connect('admin')

  // Set up message handlers
  const unsubscribeAnalytics = webSocketService.on('onOrderUpdated', (data) => {
    if (data.type === 'analytics_update') {
      onMessage(data)
    }
  })

  const unsubscribeError = webSocketService.on('onAuthError', (data) => {
    onMessage({ type: 'error', message: data.message })
  })

  return {
    close: () => {
      unsubscribeAnalytics()
      unsubscribeError()
      webSocketService.disconnect()
    }
  }
}
