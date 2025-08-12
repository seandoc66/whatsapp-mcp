// jest-dom adds custom jest matchers for asserting on DOM nodes.
import '@testing-library/jest-dom';

// Mock clipboard API for testing
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve())
  }
});

// Mock window.matchMedia for responsive component testing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }))
});

// Global test utilities
global.testUtils = {
  mockMessage: {
    id: 'test-msg-123',
    chat_jid: 'test-chat@g.us',
    sender: 'test-sender@s.whatsapp.net',
    content: 'Test message content',
    timestamp: '2024-01-01T10:00:00Z',
    is_from_me: false
  },
  
  mockSuggestions: [
    'Thank you for your message. I will get back to you soon.',
    'I understand your concern. Let me check on that for you.',
    'We appreciate your patience. This will be resolved shortly.'
  ],
  
  mockConversation: [
    {
      sender: 'client@s.whatsapp.net',
      content: 'I need help with enrollment',
      timestamp: '2024-01-01T09:00:00Z',
      is_from_me: false
    },
    {
      sender: 'school@s.whatsapp.net',
      content: 'Of course! Our enrollment process starts in February.',
      timestamp: '2024-01-01T09:05:00Z',
      is_from_me: true
    }
  ]
};