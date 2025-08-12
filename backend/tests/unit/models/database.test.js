const Database = require('../../../src/models/database');
const sqlite3 = require('sqlite3');
const path = require('path');

// Mock sqlite3
jest.mock('sqlite3', () => ({
  verbose: jest.fn(() => ({
    Database: jest.fn()
  }))
}));

describe('Database', () => {
  let database;
  let mockDb;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock database instance
    mockDb = {
      close: jest.fn((callback) => callback()),
      all: jest.fn(),
      run: jest.fn()
    };

    // Mock sqlite3.Database constructor
    const MockDatabase = jest.fn((dbPath, callback) => {
      // Simulate successful connection
      setTimeout(() => callback(null), 0);
      return mockDb;
    });

    sqlite3.verbose().Database = MockDatabase;

    database = new Database(':memory:');
  });

  afterEach(async () => {
    await database.close();
  });

  describe('constructor', () => {
    it('should use provided database path', () => {
      const customPath = '/custom/path/db.sqlite';
      const db = new Database(customPath);
      expect(db.dbPath).toBe(customPath);
    });

    it('should use environment variable when no path provided', () => {
      process.env.DATABASE_PATH = '/env/path/db.sqlite';
      const db = new Database();
      expect(db.dbPath).toBe('/env/path/db.sqlite');
      delete process.env.DATABASE_PATH;
    });

    it('should use default path when no path or env var', () => {
      const db = new Database();
      expect(db.dbPath).toContain('database/store/messages.db');
    });
  });

  describe('connection management', () => {
    it('should connect successfully', async () => {
      await expect(database.connect()).resolves.toBeUndefined();
      expect(database.db).toBe(mockDb);
    });

    it('should handle connection errors', async () => {
      const errorMessage = 'Connection failed';
      const MockDatabase = jest.fn((dbPath, callback) => {
        setTimeout(() => callback(new Error(errorMessage)), 0);
        return mockDb;
      });

      sqlite3.verbose().Database = MockDatabase;
      const db = new Database(':memory:');

      await expect(db.connect()).rejects.toThrow(`Failed to connect to database: ${errorMessage}`);
    });

    it('should close connection', async () => {
      await database.connect();
      await database.close();
      expect(mockDb.close).toHaveBeenCalled();
    });

    it('should handle close when not connected', async () => {
      // Should not throw error
      await expect(database.close()).resolves.toBeUndefined();
    });
  });

  describe('getMessages', () => {
    beforeEach(async () => {
      await database.connect();
    });

    it('should get messages with default parameters', async () => {
      const mockMessages = [
        global.testUtils.createMockMessage({ id: 'msg1' }),
        global.testUtils.createMockMessage({ id: 'msg2' })
      ];

      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, mockMessages);
      });

      const result = await database.getMessages();

      expect(mockDb.all).toHaveBeenCalled();
      expect(result).toEqual(mockMessages);
      
      // Check SQL contains expected clauses
      const [sql, params] = mockDb.all.mock.calls[0];
      expect(sql).toContain('SELECT m.*, c.name as chat_name');
      expect(sql).toContain('FROM messages m JOIN chats c');
      expect(sql).toContain('LIMIT ? OFFSET ?');
      expect(params).toContain(20); // default limit
      expect(params).toContain(0);  // default offset
    });

    it('should filter by chat_jid', async () => {
      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      await database.getMessages({ chat_jid: 'test@g.us' });

      const [sql, params] = mockDb.all.mock.calls[0];
      expect(sql).toContain('m.chat_jid = ?');
      expect(params).toContain('test@g.us');
    });

    it('should filter by from_me boolean', async () => {
      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      await database.getMessages({ from_me: true });

      const [sql, params] = mockDb.all.mock.calls[0];
      expect(sql).toContain('m.is_from_me = ?');
      expect(params).toContain(1);
    });

    it('should filter by date range', async () => {
      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      await database.getMessages({
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      });

      const [sql, params] = mockDb.all.mock.calls[0];
      expect(sql).toContain('m.timestamp >= ?');
      expect(sql).toContain('m.timestamp <= ?');
      expect(params).toContain('2024-01-01');
      expect(params).toContain('2024-01-31');
    });

    it('should search by text content', async () => {
      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      await database.getMessages({ search_text: 'enrollment' });

      const [sql, params] = mockDb.all.mock.calls[0];
      expect(sql).toContain('m.content LIKE ?');
      expect(params).toContain('%enrollment%');
    });

    it('should handle database errors', async () => {
      const errorMessage = 'Query failed';
      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(new Error(errorMessage));
      });

      await expect(database.getMessages()).rejects.toThrow(`Database query failed: ${errorMessage}`);
    });
  });

  describe('getChats', () => {
    beforeEach(async () => {
      await database.connect();
    });

    it('should get chats with default parameters', async () => {
      const mockChats = [
        global.testUtils.createMockChat({ jid: 'chat1@g.us' }),
        global.testUtils.createMockChat({ jid: 'chat2@g.us' })
      ];

      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, mockChats);
      });

      const result = await database.getChats();

      expect(result).toEqual(mockChats);
      
      const [sql, params] = mockDb.all.mock.calls[0];
      expect(sql).toContain('SELECT * FROM chats');
      expect(sql).toContain('ORDER BY last_message_time DESC');
      expect(params).toContain(50); // default limit
    });

    it('should filter by name', async () => {
      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      await database.getChats({ name_filter: 'John' });

      const [sql, params] = mockDb.all.mock.calls[0];
      expect(sql).toContain('name LIKE ?');
      expect(params).toContain('%John%');
    });
  });

  describe('getChatById', () => {
    beforeEach(async () => {
      await database.connect();
    });

    it('should return chat when found', async () => {
      const mockChat = global.testUtils.createMockChat();

      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, [mockChat]);
      });

      const result = await database.getChatById('test-jid');

      expect(result).toEqual(mockChat);
      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM chats WHERE jid = ?',
        ['test-jid'],
        expect.any(Function)
      );
    });

    it('should return null when not found', async () => {
      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      const result = await database.getChatById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getMessageById', () => {
    beforeEach(async () => {
      await database.connect();
    });

    it('should return message with chat info when found', async () => {
      const mockMessage = {
        ...global.testUtils.createMockMessage(),
        chat_name: 'Test Chat'
      };

      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, [mockMessage]);
      });

      const result = await database.getMessageById('msg-123', 'chat@g.us');

      expect(result).toEqual(mockMessage);
      
      const [sql, params] = mockDb.all.mock.calls[0];
      expect(sql).toContain('JOIN chats c ON m.chat_jid = c.jid');
      expect(sql).toContain('WHERE m.id = ? AND m.chat_jid = ?');
      expect(params).toEqual(['msg-123', 'chat@g.us']);
    });
  });

  describe('getConversationContext', () => {
    beforeEach(async () => {
      await database.connect();
    });

    it('should return messages in chronological order', async () => {
      const mockMessages = [
        { id: 'msg3', timestamp: '2024-01-01T12:00:00Z' },
        { id: 'msg2', timestamp: '2024-01-01T11:00:00Z' },
        { id: 'msg1', timestamp: '2024-01-01T10:00:00Z' }
      ];

      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, mockMessages);
      });

      const result = await database.getConversationContext('msg2', 'chat@g.us', 5);

      // Should be reversed to chronological order
      expect(result[0].id).toBe('msg1');
      expect(result[1].id).toBe('msg2');
      expect(result[2].id).toBe('msg3');

      const [sql, params] = mockDb.all.mock.calls[0];
      expect(sql).toContain('timestamp <= (');
      expect(params).toEqual(['chat@g.us', 'msg2', 'chat@g.us', 11]); // contextSize * 2 + 1
    });
  });

  describe('getBusinessResponses', () => {
    beforeEach(async () => {
      await database.connect();
    });

    it('should get business messages only', async () => {
      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      await database.getBusinessResponses({ limit: 50 });

      const [sql, params] = mockDb.all.mock.calls[0];
      expect(sql).toContain('WHERE is_from_me = 1');
      expect(sql).toContain('AND content IS NOT NULL');
      expect(sql).toContain('AND content != \'\'');
      expect(params).toContain(50);
    });

    it('should filter by chat_jid when provided', async () => {
      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      await database.getBusinessResponses({ chat_jid: 'test@g.us' });

      const [sql, params] = mockDb.all.mock.calls[0];
      expect(sql).toContain('AND chat_jid = ?');
      expect(params).toContain('test@g.us');
    });
  });

  describe('run method', () => {
    beforeEach(async () => {
      await database.connect();
    });

    it('should execute INSERT/UPDATE/DELETE queries', async () => {
      mockDb.run.mockImplementation(function(sql, params, callback) {
        // Simulate successful run with this context
        callback.call({ lastID: 1, changes: 1 }, null);
      });

      const result = await database.run(
        'INSERT INTO messages (id, content) VALUES (?, ?)',
        ['msg-123', 'Test content']
      );

      expect(result).toEqual({ lastID: 1, changes: 1 });
      expect(mockDb.run).toHaveBeenCalled();
    });

    it('should handle run errors', async () => {
      const errorMessage = 'Insert failed';
      mockDb.run.mockImplementation((sql, params, callback) => {
        callback(new Error(errorMessage));
      });

      await expect(database.run('INSERT INTO messages VALUES (1)')).rejects.toThrow(
        `Database operation failed: ${errorMessage}`
      );
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await database.connect();
    });

    it('should return comprehensive statistics', async () => {
      const mockStats = [
        [{ total_messages: 1000 }],
        [{ total_chats: 50 }],
        [{ business_messages: 400 }],
        [{ client_messages: 600 }]
      ];

      let callCount = 0;
      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, mockStats[callCount++]);
      });

      const result = await database.getStats();

      expect(result).toEqual({
        total_messages: 1000,
        total_chats: 50,
        business_messages: 400,
        client_messages: 600
      });

      expect(mockDb.all).toHaveBeenCalledTimes(4);
    });
  });

  describe('auto-connection', () => {
    it('should auto-connect when running queries', async () => {
      const db = new Database(':memory:');
      
      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      await db.query('SELECT * FROM messages');

      // Should have connected automatically
      expect(db.db).toBe(mockDb);
    });

    it('should auto-connect when running operations', async () => {
      const db = new Database(':memory:');
      
      mockDb.run.mockImplementation(function(sql, params, callback) {
        callback.call({ lastID: 1, changes: 1 }, null);
      });

      await db.run('INSERT INTO test VALUES (1)');

      // Should have connected automatically
      expect(db.db).toBe(mockDb);
    });
  });
});