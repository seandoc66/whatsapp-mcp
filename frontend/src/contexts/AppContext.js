/**
 * Global App Context for WhatsApp Reply Assistant
 * 
 * Manages application state including:
 * - Current message processing
 * - WebSocket connection status
 * - System health and status
 * - User preferences
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import apiClient from '../services/api';

// Initial state
const initialState = {
  // Current message and processing
  currentMessage: null,
  suggestions: [],
  conversationHistory: [],
  isProcessingMessage: false,
  lastProcessedTime: null,
  
  // System status
  systemStatus: 'idle', // 'idle', 'listening', 'processing', 'error', 'paused'
  backendHealth: null,
  systemInfo: null,
  
  // WebSocket connection
  wsConnected: false,
  wsClientId: null,
  connectionCount: 0,
  
  // UI state
  copyFeedback: null, // { message: string, timestamp: number }
  error: null,
  
  // User preferences
  preferences: {
    theme: 'light',
    autoScroll: true,
    soundEnabled: true,
    showTimestamps: true,
  }
};

// Action types
const ACTION_TYPES = {
  // Message actions
  SET_CURRENT_MESSAGE: 'SET_CURRENT_MESSAGE',
  SET_SUGGESTIONS: 'SET_SUGGESTIONS',
  SET_CONVERSATION_HISTORY: 'SET_CONVERSATION_HISTORY',
  SET_PROCESSING_MESSAGE: 'SET_PROCESSING_MESSAGE',
  SET_LAST_PROCESSED_TIME: 'SET_LAST_PROCESSED_TIME',
  
  // System actions
  SET_SYSTEM_STATUS: 'SET_SYSTEM_STATUS',
  SET_BACKEND_HEALTH: 'SET_BACKEND_HEALTH',
  SET_SYSTEM_INFO: 'SET_SYSTEM_INFO',
  
  // WebSocket actions
  SET_WS_CONNECTED: 'SET_WS_CONNECTED',
  SET_WS_CLIENT_ID: 'SET_WS_CLIENT_ID',
  SET_CONNECTION_COUNT: 'SET_CONNECTION_COUNT',
  
  // UI actions
  SET_COPY_FEEDBACK: 'SET_COPY_FEEDBACK',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  
  // Preference actions
  UPDATE_PREFERENCES: 'UPDATE_PREFERENCES',
  
  // Combined actions
  HANDLE_NEW_MESSAGE: 'HANDLE_NEW_MESSAGE',
  HANDLE_WEBSOCKET_MESSAGE: 'HANDLE_WEBSOCKET_MESSAGE',
};

// Reducer function
function appReducer(state, action) {
  switch (action.type) {
    case ACTION_TYPES.SET_CURRENT_MESSAGE:
      return {
        ...state,
        currentMessage: action.payload,
        lastProcessedTime: new Date().toISOString(),
      };
      
    case ACTION_TYPES.SET_SUGGESTIONS:
      return {
        ...state,
        suggestions: action.payload,
        isProcessingMessage: false,
      };
      
    case ACTION_TYPES.SET_CONVERSATION_HISTORY:
      return {
        ...state,
        conversationHistory: action.payload,
      };
      
    case ACTION_TYPES.SET_PROCESSING_MESSAGE:
      return {
        ...state,
        isProcessingMessage: action.payload,
        systemStatus: action.payload ? 'processing' : state.systemStatus,
      };
      
    case ACTION_TYPES.SET_LAST_PROCESSED_TIME:
      return {
        ...state,
        lastProcessedTime: action.payload,
      };
      
    case ACTION_TYPES.SET_SYSTEM_STATUS:
      return {
        ...state,
        systemStatus: action.payload,
      };
      
    case ACTION_TYPES.SET_BACKEND_HEALTH:
      return {
        ...state,
        backendHealth: action.payload,
      };
      
    case ACTION_TYPES.SET_SYSTEM_INFO:
      return {
        ...state,
        systemInfo: action.payload,
      };
      
    case ACTION_TYPES.SET_WS_CONNECTED:
      return {
        ...state,
        wsConnected: action.payload,
        systemStatus: action.payload ? 'listening' : 'error',
      };
      
    case ACTION_TYPES.SET_WS_CLIENT_ID:
      return {
        ...state,
        wsClientId: action.payload,
      };
      
    case ACTION_TYPES.SET_CONNECTION_COUNT:
      return {
        ...state,
        connectionCount: action.payload,
      };
      
    case ACTION_TYPES.SET_COPY_FEEDBACK:
      return {
        ...state,
        copyFeedback: action.payload,
      };
      
    case ACTION_TYPES.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        systemStatus: 'error',
      };
      
    case ACTION_TYPES.CLEAR_ERROR:
      return {
        ...state,
        error: null,
        systemStatus: state.wsConnected ? 'listening' : 'idle',
      };
      
    case ACTION_TYPES.UPDATE_PREFERENCES:
      return {
        ...state,
        preferences: {
          ...state.preferences,
          ...action.payload,
        },
      };
      
    case ACTION_TYPES.HANDLE_NEW_MESSAGE:
      return {
        ...state,
        currentMessage: action.payload.message,
        suggestions: action.payload.suggestions || [],
        isProcessingMessage: false,
        lastProcessedTime: new Date().toISOString(),
        systemStatus: 'listening',
      };
      
    case ACTION_TYPES.HANDLE_WEBSOCKET_MESSAGE:
      // Handle different WebSocket message types
      const { type, data } = action.payload;
      
      switch (type) {
        case 'new_message':
          return {
            ...state,
            currentMessage: data.message,
            suggestions: data.suggestions || [],
            isProcessingMessage: false,
            lastProcessedTime: new Date().toISOString(),
          };
          
        case 'connection':
          return {
            ...state,
            wsConnected: true,
            wsClientId: data.clientId,
            systemStatus: 'listening',
          };
          
        case 'health_status':
          return {
            ...state,
            systemInfo: data,
          };
          
        default:
          return state;
      }
      
    default:
      return state;
  }
}

// Create context
const AppContext = createContext();

// Context provider component
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Actions
  const actions = {
    // Message actions
    setCurrentMessage: (message) => dispatch({ type: ACTION_TYPES.SET_CURRENT_MESSAGE, payload: message }),
    setSuggestions: (suggestions) => dispatch({ type: ACTION_TYPES.SET_SUGGESTIONS, payload: suggestions }),
    setConversationHistory: (history) => dispatch({ type: ACTION_TYPES.SET_CONVERSATION_HISTORY, payload: history }),
    setProcessingMessage: (processing) => dispatch({ type: ACTION_TYPES.SET_PROCESSING_MESSAGE, payload: processing }),
    
    // System actions
    setSystemStatus: (status) => dispatch({ type: ACTION_TYPES.SET_SYSTEM_STATUS, payload: status }),
    setBackendHealth: (health) => dispatch({ type: ACTION_TYPES.SET_BACKEND_HEALTH, payload: health }),
    setSystemInfo: (info) => dispatch({ type: ACTION_TYPES.SET_SYSTEM_INFO, payload: info }),
    
    // WebSocket actions
    setWsConnected: (connected) => dispatch({ type: ACTION_TYPES.SET_WS_CONNECTED, payload: connected }),
    setWsClientId: (clientId) => dispatch({ type: ACTION_TYPES.SET_WS_CLIENT_ID, payload: clientId }),
    setConnectionCount: (count) => dispatch({ type: ACTION_TYPES.SET_CONNECTION_COUNT, payload: count }),
    
    // UI actions
    setCopyFeedback: (feedback) => dispatch({ type: ACTION_TYPES.SET_COPY_FEEDBACK, payload: feedback }),
    setError: (error) => dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error }),
    clearError: () => dispatch({ type: ACTION_TYPES.CLEAR_ERROR }),
    
    // Preference actions
    updatePreferences: (prefs) => dispatch({ type: ACTION_TYPES.UPDATE_PREFERENCES, payload: prefs }),
    
    // Complex actions
    handleNewMessage: (messageData) => dispatch({ type: ACTION_TYPES.HANDLE_NEW_MESSAGE, payload: messageData }),
    handleWebSocketMessage: (wsMessage) => dispatch({ type: ACTION_TYPES.HANDLE_WEBSOCKET_MESSAGE, payload: wsMessage }),
    
    // API actions
    async checkBackendHealth() {
      try {
        const health = await apiClient.checkHealth();
        actions.setBackendHealth(health);
        actions.clearError();
        return health;
      } catch (error) {
        actions.setError(error.message);
        throw error;
      }
    },
    
    async getSystemStatus() {
      try {
        const status = await apiClient.getSystemStatus();
        actions.setSystemInfo(status);
        return status;
      } catch (error) {
        actions.setError(error.message);
        throw error;
      }
    },
    
    async testBroadcast() {
      try {
        const result = await apiClient.testBroadcast();
        return result;
      } catch (error) {
        actions.setError(error.message);
        throw error;
      }
    },
    
    // Copy feedback with auto-clear
    showCopyFeedback(message) {
      actions.setCopyFeedback({ message, timestamp: Date.now() });
      setTimeout(() => {
        actions.setCopyFeedback(null);
      }, 3000);
    },
  };

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('whatsapp-assistant-preferences');
    if (savedPreferences) {
      try {
        const preferences = JSON.parse(savedPreferences);
        actions.updatePreferences(preferences);
      } catch (error) {
        console.error('Failed to load preferences:', error);
      }
    }
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem('whatsapp-assistant-preferences', JSON.stringify(state.preferences));
  }, [state.preferences]);

  // Initial health check
  useEffect(() => {
    actions.checkBackendHealth().catch(console.error);
  }, []);

  const contextValue = {
    ...state,
    ...actions,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

// Custom hook to use the app context
export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export default AppContext;