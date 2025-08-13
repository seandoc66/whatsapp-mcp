import React, { useState } from 'react';
import './ConversationHistory.css';

const ConversationHistory = ({ conversations = [], loading = false }) => {
  const [expandedConversation, setExpandedConversation] = useState(null);

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

  const formatSimilarityScore = (score) => {
    return (score * 100).toFixed(0) + '%';
  };

  const truncateContent = (content, maxLength = 80) => {
    if (!content || content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const handleConversationClick = (conversationIndex) => {
    setExpandedConversation(
      expandedConversation === conversationIndex ? null : conversationIndex
    );
  };

  if (loading) {
    return (
      <div className="conversation-history" data-testid="conversation-history">
        <div className="conversation-history__header">
          <h3>Similar Conversations</h3>
        </div>
        <div className="conversation-history__loading">
          <div className="spinner" />
          <span>Finding similar conversations...</span>
        </div>
      </div>
    );
  }

  if (!conversations.length) {
    return (
      <div className="conversation-history" data-testid="conversation-history">
        <div className="conversation-history__header">
          <h3>Similar Conversations</h3>
        </div>
        <div className="conversation-history__empty">
          <div className="empty-icon">🔍</div>
          <h4>No Similar Conversations Found</h4>
          <p>
            When you receive a message, we'll show similar past conversations 
            to help you understand the context and provide better responses.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="conversation-history" data-testid="conversation-history">
      <div className="conversation-history__header">
        <h3>Similar Conversations</h3>
        <span className="conversation-history__count">
          {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      <div className="conversation-history__list">
        {conversations.map((conversation, index) => (
          <div 
            key={index}
            className={`conversation-item ${expandedConversation === index ? 'expanded' : ''}`}
            data-testid={`conversation-item-${index}`}
          >
            <div 
              className="conversation-item__header"
              onClick={() => handleConversationClick(index)}
            >
              <div className="conversation-item__info">
                <div className="conversation-item__name">
                  {conversation.chat_name || 'Unknown Chat'}
                </div>
                <div className="conversation-item__meta">
                  <span className="similarity-score">
                    {formatSimilarityScore(conversation.similarity_score || 0)} match
                  </span>
                  <span className="message-count">
                    {conversation.messages?.length || 0} messages
                  </span>
                </div>
              </div>
              
              <button 
                className="conversation-item__toggle"
                aria-label={expandedConversation === index ? 'Collapse' : 'Expand'}
              >
                {expandedConversation === index ? '▼' : '▶'}
              </button>
            </div>
            
            {!expandedConversation === index && (
              <div className="conversation-item__preview">
                {conversation.messages?.slice(0, 2).map((message, msgIndex) => (
                  <div key={msgIndex} className="preview-message">
                    <span className={`message-sender ${message.sender === 'business' ? 'business' : 'customer'}`}>
                      {message.sender === 'business' ? 'You' : 'Customer'}:
                    </span>
                    <span className="message-content">
                      {truncateContent(message.content)}
                    </span>
                  </div>
                ))}
                {conversation.messages?.length > 2 && (
                  <div className="more-messages">
                    +{conversation.messages.length - 2} more messages
                  </div>
                )}
              </div>
            )}
            
            {expandedConversation === index && (
              <div className="conversation-item__expanded">
                <div className="conversation-messages">
                  {conversation.messages?.map((message, msgIndex) => (
                    <div 
                      key={msgIndex} 
                      className={`conversation-message ${message.sender === 'business' ? 'business' : 'customer'}`}
                    >
                      <div className="message-header">
                        <span className="message-sender">
                          {message.sender === 'business' ? 'You' : 'Customer'}
                        </span>
                        <time className="message-time">
                          {formatTimestamp(message.timestamp)}
                        </time>
                      </div>
                      <div className="message-content">
                        {message.content}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="conversation-item__actions">
                  <button 
                    className="use-pattern-button"
                    onClick={() => {
                      // This would trigger using this conversation pattern for suggestions
                      console.log('Using conversation pattern:', conversation);
                    }}
                    title="Use this conversation pattern for better suggestions"
                  >
                    💡 Use This Pattern
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConversationHistory;