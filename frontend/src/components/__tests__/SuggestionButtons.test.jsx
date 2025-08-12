import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SuggestionButtons from '../SuggestionButtons';

// Mock clipboard API
const mockClipboard = {
  writeText: jest.fn()
};
Object.assign(navigator, { clipboard: mockClipboard });

describe('SuggestionButtons', () => {
  const mockOnCopy = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockClipboard.writeText.mockResolvedValue();
  });

  describe('rendering states', () => {
    it('should render loading state', () => {
      render(<SuggestionButtons loading={true} />);
      
      expect(screen.getByText('Generating suggestions...')).toBeInTheDocument();
      expect(screen.getByTestId('suggestion-buttons')).toBeInTheDocument();
    });

    it('should render empty state when no suggestions', () => {
      render(<SuggestionButtons suggestions={[]} />);
      
      expect(screen.getByText('No suggestions available')).toBeInTheDocument();
    });

    it('should render suggestions when provided', () => {
      const suggestions = global.testUtils.mockSuggestions;
      
      render(<SuggestionButtons suggestions={suggestions} />);
      
      expect(screen.getByText('Suggested Responses')).toBeInTheDocument();
      expect(screen.getByText('3 suggestions')).toBeInTheDocument();
      
      suggestions.forEach((suggestion, index) => {
        expect(screen.getByTestId(`suggestion-button-${index}`)).toBeInTheDocument();
        expect(screen.getByText(suggestion)).toBeInTheDocument();
      });
    });

    it('should handle singular suggestion count', () => {
      render(<SuggestionButtons suggestions={['One suggestion']} />);
      
      expect(screen.getByText('1 suggestion')).toBeInTheDocument();
    });
  });

  describe('copy functionality', () => {
    it('should copy text to clipboard when button clicked', async () => {
      const suggestions = ['Test suggestion'];
      
      render(
        <SuggestionButtons 
          suggestions={suggestions} 
          onCopy={mockOnCopy}
        />
      );
      
      const button = screen.getByTestId('suggestion-button-0');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith('Test suggestion');
        expect(mockOnCopy).toHaveBeenCalledWith('Test suggestion', 0);
      });
    });

    it('should handle clipboard API failure with fallback', async () => {
      mockClipboard.writeText.mockRejectedValue(new Error('Clipboard failed'));
      
      render(
        <SuggestionButtons 
          suggestions={['Test suggestion']} 
          onCopy={mockOnCopy}
        />
      );
      
      const button = screen.getByTestId('suggestion-button-0');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(mockOnCopy).toHaveBeenCalledWith('Test suggestion', 0);
      });
    });

    it('should not call onCopy when not provided', async () => {
      render(<SuggestionButtons suggestions={['Test suggestion']} />);
      
      const button = screen.getByTestId('suggestion-button-0');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith('Test suggestion');
      });
      
      // Should not throw error
    });
  });

  describe('accessibility and UX', () => {
    it('should have proper button titles for long suggestions', () => {
      const longSuggestion = 'This is a very long suggestion that should be truncated in the title attribute for better UX';
      
      render(<SuggestionButtons suggestions={[longSuggestion]} />);
      
      const button = screen.getByTestId('suggestion-button-0');
      expect(button).toHaveAttribute('title', expect.stringContaining('This is a very long suggestion that should be trun'));
    });

    it('should show full suggestion for short text', () => {
      const shortSuggestion = 'Short';
      
      render(<SuggestionButtons suggestions={[shortSuggestion]} />);
      
      const button = screen.getByTestId('suggestion-button-0');
      expect(button).toHaveAttribute('title', 'Click to copy: Short');
    });

    it('should have proper ARIA attributes', () => {
      render(<SuggestionButtons suggestions={['Test']} />);
      
      const button = screen.getByTestId('suggestion-button-0');
      expect(button).toBeInstanceOf(HTMLButtonElement);
      expect(button).toHaveAttribute('title');
    });
  });

  describe('edge cases', () => {
    it('should handle undefined suggestions prop', () => {
      render(<SuggestionButtons />);
      
      expect(screen.getByText('No suggestions available')).toBeInTheDocument();
    });

    it('should handle empty string suggestions', () => {
      render(<SuggestionButtons suggestions={['', 'Valid suggestion']} />);
      
      expect(screen.getByTestId('suggestion-button-0')).toBeInTheDocument();
      expect(screen.getByTestId('suggestion-button-1')).toBeInTheDocument();
    });

    it('should handle multiple rapid clicks', async () => {
      render(
        <SuggestionButtons 
          suggestions={['Test']} 
          onCopy={mockOnCopy}
        />
      );
      
      const button = screen.getByTestId('suggestion-button-0');
      
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledTimes(3);
        expect(mockOnCopy).toHaveBeenCalledTimes(3);
      });
    });
  });
});