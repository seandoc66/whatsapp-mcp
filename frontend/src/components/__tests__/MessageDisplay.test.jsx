import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MessageDisplay from '../MessageDisplay';

describe('MessageDisplay', () => {
  const mockOnStatusChange = jest.fn();
  const mockMessage = global.testUtils.mockMessage;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock current date for consistent timestamp testing
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T15:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('status indicator', () => {
    it('should render listening status correctly', () => {
      render(
        <MessageDisplay 
          status="listening" 
          onStatusChange={mockOnStatusChange}
        />
      );
      
      const statusButton = screen.getByTestId('status-button');
      expect(statusButton).toHaveTextContent('Listening for messages');
      expect(statusButton).toHaveClass('status--listening');
      expect(statusButton).not.toBeDisabled();
    });

    it('should render processing status correctly', () => {
      render(
        <MessageDisplay 
          status="processing" 
          onStatusChange={mockOnStatusChange}
        />
      );
      
      const statusButton = screen.getByTestId('status-button');
      expect(statusButton).toHaveTextContent('Processing message');
      expect(statusButton).toHaveClass('status--processing');
      expect(statusButton).toBeDisabled();
    });

    it('should render error status correctly', () => {
      render(
        <MessageDisplay 
          status="error" 
          onStatusChange={mockOnStatusChange}
        />
      );
      
      const statusButton = screen.getByTestId('status-button');
      expect(statusButton).toHaveTextContent('Connection error');
      expect(statusButton).toHaveClass('status--error');
      expect(statusButton).toBeDisabled();
    });

    it('should render paused status correctly', () => {
      render(
        <MessageDisplay 
          status="paused" 
          onStatusChange={mockOnStatusChange}
        />
      );
      
      const statusButton = screen.getByTestId('status-button');
      expect(statusButton).toHaveTextContent('Paused');
      expect(statusButton).toHaveClass('status--paused');
      expect(statusButton).not.toBeDisabled();
    });

    it('should render default idle status', () => {
      render(<MessageDisplay />);
      
      const statusButton = screen.getByTestId('status-button');
      expect(statusButton).toHaveTextContent('Ready');
      expect(statusButton).toHaveClass('status--idle');
    });
  });

  describe('status toggle functionality', () => {
    it('should toggle from listening to paused', () => {
      render(
        <MessageDisplay 
          status="listening" 
          onStatusChange={mockOnStatusChange}
        />
      );
      
      const statusButton = screen.getByTestId('status-button');
      fireEvent.click(statusButton);
      
      expect(mockOnStatusChange).toHaveBeenCalledWith('paused');
    });

    it('should toggle from paused to listening', () => {
      render(
        <MessageDisplay 
          status="paused" 
          onStatusChange={mockOnStatusChange}
        />
      );
      
      const statusButton = screen.getByTestId('status-button');
      fireEvent.click(statusButton);
      
      expect(mockOnStatusChange).toHaveBeenCalledWith('listening');
    });

    it('should not trigger status change when processing', () => {
      render(
        <MessageDisplay 
          status="processing" 
          onStatusChange={mockOnStatusChange}
        />
      );
      
      const statusButton = screen.getByTestId('status-button');
      fireEvent.click(statusButton);
      
      expect(mockOnStatusChange).not.toHaveBeenCalled();
    });

    it('should handle missing onStatusChange prop', () => {
      render(<MessageDisplay status="listening" />);
      
      const statusButton = screen.getByTestId('status-button');
      expect(() => {
        fireEvent.click(statusButton);
      }).not.toThrow();
    });
  });

  describe('current message display', () => {
    it('should render message when provided', () => {
      render(<MessageDisplay currentMessage={mockMessage} />);
      
      expect(screen.getByTestId('current-message')).toBeInTheDocument();
      expect(screen.getByText('Current Message')).toBeInTheDocument();
      expect(screen.getByText(mockMessage.content)).toBeInTheDocument();
      expect(screen.getByText('from: test-sender')).toBeInTheDocument();
    });

    it('should render no message state when no current message', () => {
      render(<MessageDisplay status="listening" />);
      
      expect(screen.getByTestId('no-message')).toBeInTheDocument();
      expect(screen.getByText('No recent messages')).toBeInTheDocument();
      expect(screen.getByText('Waiting for new WhatsApp messages...')).toBeInTheDocument();
    });

    it('should show paused message when system is paused', () => {
      render(<MessageDisplay status="paused" />);
      
      expect(screen.getByText('System is paused. Click the status button to start listening.')).toBeInTheDocument();
    });

    it('should display media indicator when message has media', () => {
      const messageWithMedia = {
        ...mockMessage,
        media_type: 'image',
        filename: 'photo.jpg'
      };
      
      render(<MessageDisplay currentMessage={messageWithMedia} />);
      
      const mediaIndicator = screen.getByTestId('media-indicator');
      expect(mediaIndicator).toBeInTheDocument();
      expect(screen.getByText('image')).toBeInTheDocument();
      expect(screen.getByText('photo.jpg')).toBeInTheDocument();
    });

    it('should display media type without filename', () => {
      const messageWithMedia = {
        ...mockMessage,
        media_type: 'audio'
      };
      
      render(<MessageDisplay currentMessage={messageWithMedia} />);
      
      const mediaIndicator = screen.getByTestId('media-indicator');
      expect(mediaIndicator).toBeInTheDocument();
      expect(screen.getByText('audio')).toBeInTheDocument();
      expect(screen.queryByText('photo.jpg')).not.toBeInTheDocument();
    });
  });

  describe('timestamp formatting', () => {
    it('should format same-day timestamps as time only', () => {
      const todayMessage = {
        ...mockMessage,
        timestamp: '2024-01-01T10:30:00Z' // Same day as mocked current time
      };
      
      render(<MessageDisplay currentMessage={todayMessage} />);
      
      expect(screen.getByText('10:30 AM')).toBeInTheDocument();
    });

    it('should format different-day timestamps with date', () => {
      const yesterdayMessage = {
        ...mockMessage,
        timestamp: '2023-12-31T10:30:00Z' // Different day
      };
      
      render(<MessageDisplay currentMessage={yesterdayMessage} />);
      
      expect(screen.getByText('Dec 31, 10:30 AM')).toBeInTheDocument();
    });

    it('should display last processed time', () => {
      const lastProcessedTime = '2024-01-01T14:30:00Z';
      
      render(
        <MessageDisplay 
          lastProcessedTime={lastProcessedTime}
        />
      );
      
      const lastProcessed = screen.getByTestId('last-processed');
      expect(lastProcessed).toBeInTheDocument();
      expect(screen.getByText('Last processed:')).toBeInTheDocument();
      expect(screen.getByText('2:30 PM')).toBeInTheDocument();
    });

    it('should handle invalid timestamps gracefully', () => {
      const invalidMessage = {
        ...mockMessage,
        timestamp: 'invalid-date'
      };
      
      render(<MessageDisplay currentMessage={invalidMessage} />);
      
      // Should not crash and should render other content
      expect(screen.getByText('Current Message')).toBeInTheDocument();
    });

    it('should handle missing timestamps', () => {
      const noTimestampMessage = {
        ...mockMessage,
        timestamp: null
      };
      
      render(<MessageDisplay currentMessage={noTimestampMessage} />);
      
      // Should not crash and should render other content
      expect(screen.getByText('Current Message')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels for status icons', () => {
      render(<MessageDisplay status="listening" />);
      
      const statusIcon = screen.getByRole('img');
      expect(statusIcon).toHaveAttribute('aria-label', 'Listening for messages');
    });

    it('should have proper button titles with action hints', () => {
      render(
        <MessageDisplay 
          status="listening" 
          onStatusChange={mockOnStatusChange}
        />
      );
      
      const statusButton = screen.getByTestId('status-button');
      expect(statusButton).toHaveAttribute('title', expect.stringContaining('Click to pause'));
    });

    it('should use semantic time elements', () => {
      render(
        <MessageDisplay 
          currentMessage={mockMessage}
          lastProcessedTime="2024-01-01T14:30:00Z"
        />
      );
      
      const timeElements = screen.getAllByRole('time');
      expect(timeElements.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle message with missing sender', () => {
      const messageNoSender = {
        ...mockMessage,
        sender: null
      };
      
      render(<MessageDisplay currentMessage={messageNoSender} />);
      
      expect(screen.getByText('from: Unknown')).toBeInTheDocument();
    });

    it('should handle empty message content', () => {
      const emptyMessage = {
        ...mockMessage,
        content: ''
      };
      
      render(<MessageDisplay currentMessage={emptyMessage} />);
      
      expect(screen.getByTestId('current-message')).toBeInTheDocument();
    });
  });
});