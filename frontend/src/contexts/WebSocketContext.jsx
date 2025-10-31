import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';

export const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const { tokens, isAuthenticated, user } = useAuth();
  const ws = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeout = useRef(null);

  const connect = useCallback(() => {
    // Only connect if authenticated and user has a role
    if (ws.current || !isAuthenticated || !tokens?.access || !user?.role) return;

    // Close any existing connection
    if (ws.current) {
      ws.current.close();
    }

    // Create a new WebSocket connection based on user role
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8000/ws';

    let endpoint = '';
    switch (user.role) {
      case 'vendor':
        endpoint = '/vendor/orders/';
        break;
      case 'admin':
        endpoint = '/admin/dashboard/';
        break;
      case 'rider':
        endpoint = '/rider/orders/';
        break;
      default:
        endpoint = '/customer/orders/';
    }

    const fullWsUrl = `${wsUrl}${endpoint}`;
    console.log(`Connecting to WebSocket: ${fullWsUrl} for role: ${user.role}`);
    try {
      ws.current = new WebSocket(fullWsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket Connected');
        reconnectAttempts.current = 0; // Reset reconnect attempts on successful connection

        // Authenticate with the server
        if (tokens?.access) {
          ws.current.send(JSON.stringify({
            type: 'auth',
            token: tokens.access
          }));
        }
      };

      ws.current.onclose = (e) => {
        console.log('WebSocket Disconnected', e);
        ws.current = null;

        // Attempt to reconnect
        if (isAuthenticated && user?.role && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          console.log(`Attempting to reconnect... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
          setTimeout(() => connect(), 5000);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket Error:', error);
        // WebSocket error - will attempt to reconnect
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [tokens, isAuthenticated, user]);

  // Handle initial connection and reconnection when auth state changes
  useEffect(() => {
    // Enable WebSocket connection now that backend is implemented
    if (isAuthenticated && user?.role) {
      connect();
    } else {
      // Clean up on logout or when user role is not available
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
    }

    // Cleanup function
    return () => {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
    };
  }, [connect, isAuthenticated, user]);

  // Function to send messages through the WebSocket
  const sendMessage = useCallback((message) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
      return true;
    }
    console.warn('WebSocket is not connected');
    return false;
  }, []);

  // Subscribe to order updates
  const subscribeToOrderUpdates = useCallback((vendorId, callback) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected');
      return () => {};
    }

    const subscriptionId = `order_updates_${vendorId}_${Date.now()}`;
    
    // Send subscription message
    sendMessage({
      type: 'subscribe',
      channel: 'order_updates',
      vendor_id: vendorId,
      subscription_id: subscriptionId
    });

    // Handle incoming messages
    const messageHandler = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'order_update' && data.subscription_id === subscriptionId) {
          callback(data.payload);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    ws.current.addEventListener('message', messageHandler);

    // Return cleanup function to unsubscribe
    return () => {
      if (ws.current) {
        ws.current.removeEventListener('message', messageHandler);
        sendMessage({
          type: 'unsubscribe',
          subscription_id: subscriptionId
        });
      }
    };
  }, [sendMessage]);

  const value = {
    isConnected: ws.current?.readyState === WebSocket.OPEN,
    sendMessage,
    subscribeToOrderUpdates,
    connect: () => {
      // Manual connect function - now enabled
      if (isAuthenticated && user?.role) {
        connect();
      } else {
        console.log('Cannot connect to WebSocket - user not authenticated or no role assigned');
      }
    }
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
