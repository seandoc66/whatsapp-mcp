import React from 'react';
import './StatusIndicator.css';

const StatusIndicator = ({ status, error, onRetry, className = '' }) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'listening':
        return {
          icon: '🟢',
          text: 'Connected & Listening',
          description: 'Waiting for new WhatsApp messages',
          color: '#25d366',
          showRetry: false
        };
      case 'processing':
        return {
          icon: '🔄',
          text: 'Processing Message',
          description: 'Generating AI response suggestions',
          color: '#ffa500',
          showRetry: false
        };
      case 'error':
        return {
          icon: '🔴',
          text: 'Connection Error',
          description: error || 'Unable to connect to backend services',
          color: '#dc3545',
          showRetry: true
        };
      case 'paused':
        return {
          icon: '⏸️',
          text: 'Paused',
          description: 'Message processing is temporarily paused',
          color: '#6c757d',
          showRetry: false
        };
      default:
        return {
          icon: '⚪',
          text: 'Ready',
          description: 'System initialized, preparing to connect',
          color: '#6c757d',
          showRetry: false
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`status-indicator ${className}`} data-testid="status-indicator">
      <div className="status-indicator__main">
        <div 
          className="status-indicator__icon"
          style={{ color: statusInfo.color }}
          role="img" 
          aria-label={statusInfo.text}
        >
          {statusInfo.icon}
        </div>
        
        <div className="status-indicator__text">
          <div className="status-indicator__title">
            {statusInfo.text}
          </div>
          <div className="status-indicator__description">
            {statusInfo.description}
          </div>
        </div>
        
        {statusInfo.showRetry && onRetry && (
          <button
            className="status-indicator__retry"
            onClick={onRetry}
            title="Retry connection"
          >
            🔄 Retry
          </button>
        )}
      </div>
      
      {status === 'processing' && (
        <div className="status-indicator__progress">
          <div className="progress-bar">
            <div className="progress-bar__fill"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusIndicator;