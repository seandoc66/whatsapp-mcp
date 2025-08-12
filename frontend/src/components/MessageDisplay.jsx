import React from 'react';
import './MessageDisplay.css';

const MessageDisplay = ({ 
  currentMessage, 
  status = 'idle', 
  lastProcessedTime,
  onStatusChange 
}) => {
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    
    // Same day - show time only
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    
    // Different day - show date and time
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusDisplay = () => {
    switch (status) {
      case 'listening':
        return {
          text: 'Listening for messages',
          className: 'status--listening',
          icon: '🟢'
        };
      case 'processing':
        return {
          text: 'Processing message',
          className: 'status--processing',
          icon: '🔄'
        };
      case 'error':
        return {
          text: 'Connection error',
          className: 'status--error',
          icon: '🔴'
        };
      case 'paused':
        return {
          text: 'Paused',
          className: 'status--paused',
          icon: '⏸️'
        };
      default:
        return {
          text: 'Ready',
          className: 'status--idle',
          icon: '⚪'
        };
    }
  };

  const statusInfo = getStatusDisplay();

  const handleStatusToggle = () => {
    if (status === 'listening') {
      onStatusChange?.('paused');
    } else if (status === 'paused') {
      onStatusChange?.('listening');
    }
  };

  return (
    <div className="message-display" data-testid="message-display">
      <div className="message-display__header">
        <div className="status-indicator">
          <button
            className={`status-button ${statusInfo.className}`}
            onClick={handleStatusToggle}
            disabled={status === 'processing' || status === 'error'}
            title={`Current status: ${statusInfo.text}. Click to ${status === 'listening' ? 'pause' : 'resume'}.`}
            data-testid="status-button"
          >
            <span className="status-icon" role="img" aria-label={statusInfo.text}>
              {statusInfo.icon}
            </span>
            <span className="status-text">{statusInfo.text}</span>
          </button>
        </div>
        
        {lastProcessedTime && (
          <div className="last-processed" data-testid="last-processed">
            <span className="last-processed__label">Last processed:</span>
            <time className="last-processed__time">
              {formatTimestamp(lastProcessedTime)}
            </time>
          </div>
        )}
      </div>

      <div className="current-message-container">
        {currentMessage ? (
          <div className="current-message" data-testid="current-message">
            <div className="current-message__header">
              <h2>Current Message</h2>
              <div className="message-meta">
                <span className="sender-info">
                  from: {currentMessage.sender?.replace('@s.whatsapp.net', '') || 'Unknown'}
                </span>
                <time className="message-time">
                  {formatTimestamp(currentMessage.timestamp)}
                </time>
              </div>
            </div>
            
            <div className="current-message__content">
              <p>{currentMessage.content}</p>
            </div>
            
            {currentMessage.media_type && (
              <div className="media-indicator" data-testid="media-indicator">
                <span className="media-type">{currentMessage.media_type}</span>
                {currentMessage.filename && (
                  <span className="media-filename">{currentMessage.filename}</span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="no-message" data-testid="no-message">
            <div className="no-message__icon">💬</div>
            <h2>No recent messages</h2>
            <p>
              {status === 'listening' 
                ? 'Waiting for new WhatsApp messages...'
                : 'System is paused. Click the status button to start listening.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageDisplay;