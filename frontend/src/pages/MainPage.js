/**
 * Main Page Component - Primary interface for WhatsApp Reply Assistant
 * 
 * This component orchestrates the main UI and integrates:
 * - MessageDisplay for current message processing
 * - SuggestionButtons for AI-generated responses  
 * - ConversationHistory for similar past conversations
 * - Real-time WebSocket updates from n8n workflows
 */

import React, { useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import MessageDisplay from '../components/MessageDisplay';
import SuggestionButtons from '../components/SuggestionButtons';
import ConversationHistory from '../components/ConversationHistory';
import StatusIndicator from '../components/StatusIndicator';
import useWebSocket from '../hooks/useWebSocket';
import './MainPage.css';

function MainPage() {
  const {
    currentMessage,
    suggestions,
    conversationHistory,
    isProcessingMessage,
    lastProcessedTime,
    systemStatus,
    copyFeedback,
    error,
    setSystemStatus,
    showCopyFeedback,
    clearError,
    checkBackendHealth,
    getSystemStatus,
  } = useApp();

  // Initialize WebSocket connection
  useWebSocket();

  // Handle copy action from suggestion buttons
  const handleCopy = (suggestion, index) => {
    showCopyFeedback(`Copied suggestion ${index + 1} to clipboard`);
    console.log(`📋 Copied suggestion: ${suggestion.substring(0, 50)}...`);
  };

  // Handle status changes from MessageDisplay
  const handleStatusChange = (newStatus) => {
    setSystemStatus(newStatus);
    console.log(`🔄 Status changed to: ${newStatus}`);
  };

  // Error recovery actions
  const handleErrorRetry = async () => {
    clearError();
    try {
      await checkBackendHealth();
      await getSystemStatus();
    } catch (error) {
      console.error('Retry failed:', error);
    }
  };

  // Initial system check
  useEffect(() => {
    const initializeSystem = async () => {
      try {
        await checkBackendHealth();
        await getSystemStatus();
        setSystemStatus('listening');
      } catch (error) {
        console.error('System initialization failed:', error);
      }
    };

    initializeSystem();
  }, []);

  return (
    <div className="main-page">
      {/* System Status Header */}
      <StatusIndicator 
        status={systemStatus}
        error={error}
        onRetry={handleErrorRetry}
        className="main-page__status"
      />

      {/* Copy Feedback Toast */}
      {copyFeedback && (
        <div className="copy-feedback-toast" data-testid="copy-feedback">
          <span className="copy-feedback-toast__icon">✅</span>
          <span className="copy-feedback-toast__message">{copyFeedback.message}</span>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="main-page__content">
        {/* Left Column - Current Message & Suggestions */}
        <div className="main-page__primary">
          <MessageDisplay
            currentMessage={currentMessage}
            status={systemStatus}
            lastProcessedTime={lastProcessedTime}
            onStatusChange={handleStatusChange}
          />
          
          <SuggestionButtons
            suggestions={suggestions}
            onCopy={handleCopy}
            loading={isProcessingMessage}
          />
        </div>

        {/* Right Column - Conversation History */}
        <div className="main-page__secondary">
          <ConversationHistory
            conversations={conversationHistory}
            loading={isProcessingMessage}
          />
        </div>
      </div>

      {/* Debug Panel (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-panel">
          <details>
            <summary>🔧 Debug Information</summary>
            <div className="debug-info">
              <div><strong>System Status:</strong> {systemStatus}</div>
              <div><strong>Processing:</strong> {isProcessingMessage ? 'Yes' : 'No'}</div>
              <div><strong>Current Message:</strong> {currentMessage ? 'Present' : 'None'}</div>
              <div><strong>Suggestions:</strong> {suggestions.length}</div>
              <div><strong>Conversation History:</strong> {conversationHistory.length}</div>
              <div><strong>Last Processed:</strong> {lastProcessedTime || 'Never'}</div>
              {error && <div className="debug-error"><strong>Error:</strong> {error}</div>}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

export default MainPage;