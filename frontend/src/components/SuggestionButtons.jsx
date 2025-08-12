import React from 'react';
import './SuggestionButtons.css';

const SuggestionButtons = ({ suggestions = [], onCopy, loading = false }) => {
  const handleCopyClick = async (suggestion, index) => {
    try {
      await navigator.clipboard.writeText(suggestion);
      onCopy?.(suggestion, index);
    } catch (error) {
      console.error('Failed to copy text:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = suggestion;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        onCopy?.(suggestion, index);
      } catch (fallbackError) {
        console.error('Fallback copy failed:', fallbackError);
      }
      document.body.removeChild(textArea);
    }
  };

  if (loading) {
    return (
      <div className="suggestion-buttons" data-testid="suggestion-buttons">
        <div className="suggestion-buttons__loading">
          <div className="spinner" />
          <span>Generating suggestions...</span>
        </div>
      </div>
    );
  }

  if (!suggestions.length) {
    return (
      <div className="suggestion-buttons" data-testid="suggestion-buttons">
        <div className="suggestion-buttons__empty">
          No suggestions available
        </div>
      </div>
    );
  }

  return (
    <div className="suggestion-buttons" data-testid="suggestion-buttons">
      <div className="suggestion-buttons__header">
        <h3>Suggested Responses</h3>
        <span className="suggestion-buttons__count">
          {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      <div className="suggestion-buttons__grid">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            className="suggestion-button"
            onClick={() => handleCopyClick(suggestion, index)}
            title={`Click to copy: ${suggestion.substring(0, 50)}${suggestion.length > 50 ? '...' : ''}`}
            data-testid={`suggestion-button-${index}`}
          >
            <div className="suggestion-button__content">
              <span className="suggestion-button__text">
                {suggestion}
              </span>
              <div className="suggestion-button__action">
                <span className="copy-icon">📋</span>
                <span className="copy-text">Click to Copy</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SuggestionButtons;