/**
 * WebSocket Hook for Real-time Communication
 * 
 * Manages WebSocket connection to backend server for real-time updates from n8n workflows
 */

import { useEffect, useRef, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3002';
const RECONNECT_DELAY = 3000; // 3 seconds
const MAX_RECONNECT_ATTEMPTS = 5;

function useWebSocket() {
  const {
    wsConnected,
    setWsConnected,
    setWsClientId,
    setConnectionCount,
    handleWebSocketMessage,
    setError,
    clearError,
  } = useApp();

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const isManualDisconnectRef = useRef(false);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('🔌 WebSocket already connected');
      return;
    }

    console.log(`🔌 Connecting to WebSocket: ${WS_URL}`);
    
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        setWsConnected(true);
        clearError();
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📥 WebSocket message received:', message);
          
          // Handle different message types
          switch (message.type) {
            case 'connection':
              setWsClientId(message.clientId);
              console.log(`🆔 Client ID: ${message.clientId}`);
              break;
              
            case 'new_message':
              console.log('📱 New WhatsApp message from n8n:', message.data);
              handleWebSocketMessage(message);
              break;
              
            case 'health_status':
              console.log('💊 Health status update:', message.data);
              handleWebSocketMessage(message);
              break;
              
            case 'migration_progress':
              console.log('📊 Migration progress:', message.data);
              handleWebSocketMessage(message);
              break;
              
            default:
              console.log('📨 Generic WebSocket message:', message);
              handleWebSocketMessage(message);
          }
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('📴 WebSocket disconnected:', event.code, event.reason);
        setWsConnected(false);
        wsRef.current = null;
        
        // Only attempt reconnection if not manually disconnected
        if (!isManualDisconnectRef.current) {
          attemptReconnection();
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setError('WebSocket connection failed');
        setWsConnected(false);
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setError(`Failed to connect to WebSocket: ${error.message}`);
      attemptReconnection();
    }
  }, [setWsConnected, setWsClientId, setError, clearError, handleWebSocketMessage]);

  // Attempt reconnection with backoff
  const attemptReconnection = useCallback(() => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.error('❌ Max reconnection attempts reached');
      setError('Connection lost - please refresh the page');
      return;
    }

    reconnectAttemptsRef.current += 1;
    const delay = RECONNECT_DELAY * reconnectAttemptsRef.current; // Linear backoff
    
    console.log(`🔄 Attempting reconnection ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect, setError]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    setWsConnected(false);
    console.log('📴 WebSocket manually disconnected');
  }, [setWsConnected]);

  // Send message through WebSocket
  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        const messageStr = JSON.stringify(message);
        wsRef.current.send(messageStr);
        console.log('📤 WebSocket message sent:', message);
        return true;
      } catch (error) {
        console.error('❌ Failed to send WebSocket message:', error);
        setError(`Failed to send message: ${error.message}`);
        return false;
      }
    } else {
      console.warn('⚠️ WebSocket not connected - cannot send message');
      setError('WebSocket not connected');
      return false;
    }
  }, [setError]);

  // Get connection status info
  const getConnectionInfo = useCallback(() => {
    return {
      connected: wsRef.current?.readyState === WebSocket.OPEN,
      readyState: wsRef.current?.readyState,
      url: WS_URL,
      reconnectAttempts: reconnectAttemptsRef.current,
    };
  }, []);

  // Initialize connection on mount
  useEffect(() => {
    isManualDisconnectRef.current = false;
    connect();

    // Cleanup on unmount
    return () => {
      isManualDisconnectRef.current = true;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [connect]);

  // Heartbeat to keep connection alive
  useEffect(() => {
    if (!wsConnected) return;

    const heartbeatInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        sendMessage({ type: 'ping', timestamp: new Date().toISOString() });
      }
    }, 30000); // Send ping every 30 seconds

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [wsConnected, sendMessage]);

  // Handle page visibility changes (reconnect when page becomes visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !wsConnected) {
        console.log('👁️ Page became visible - attempting to reconnect');
        isManualDisconnectRef.current = false;
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [wsConnected, connect]);

  // Return connection utilities
  return {
    connected: wsConnected,
    connect,
    disconnect,
    sendMessage,
    getConnectionInfo,
  };
}

export default useWebSocket;