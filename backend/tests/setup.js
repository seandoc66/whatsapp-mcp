// Test setup and global configurations
const path = require('path');
const fs = require('fs');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';
process.env.CHROMA_DB_PATH = path.join(__dirname, 'fixtures', 'test_chroma');
process.env.PORT = 3001;

// Clean up test files before each test
beforeEach(() => {
  // Clean up any test databases or files
  const testChromaPath = process.env.CHROMA_DB_PATH;
  if (fs.existsSync(testChromaPath)) {
    fs.rmSync(testChromaPath, { recursive: true, force: true });
  }
});

// Global test utilities
global.testUtils = {
  createMockMessage: (overrides = {}) => ({
    id: 'test-msg-123',
    chat_jid: 'test-chat@g.us',
    sender: 'test-sender@s.whatsapp.net',
    content: 'Test message content',
    timestamp: new Date().toISOString(),
    is_from_me: false,
    ...overrides
  }),
  
  createMockChat: (overrides = {}) => ({
    jid: 'test-chat@g.us',
    name: 'Test Chat',
    last_message_time: new Date().toISOString(),
    ...overrides
  })
};