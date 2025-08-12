const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor(dbPath = null) {
    this.dbPath = dbPath || process.env.DATABASE_PATH || path.join(__dirname, '../../../database/store/messages.db');
    this.db = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(new Error(`Failed to connect to database: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  async close() {
    if (!this.db) return;
    
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        }
        resolve();
      });
    });
  }

  async getMessages(options = {}) {
    const {
      limit = 20,
      offset = 0,
      chat_jid,
      from_me,
      start_date,
      end_date,
      search_text
    } = options;

    let sql = `
      SELECT m.*, c.name as chat_name
      FROM messages m
      JOIN chats c ON m.chat_jid = c.jid
      WHERE 1=1
    `;
    const params = [];

    if (chat_jid) {
      sql += ' AND m.chat_jid = ?';
      params.push(chat_jid);
    }

    if (from_me !== undefined) {
      sql += ' AND m.is_from_me = ?';
      params.push(from_me ? 1 : 0);
    }

    if (start_date) {
      sql += ' AND m.timestamp >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND m.timestamp <= ?';
      params.push(end_date);
    }

    if (search_text) {
      sql += ' AND m.content LIKE ?';
      params.push(`%${search_text}%`);
    }

    sql += ' ORDER BY m.timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return this.query(sql, params);
  }

  async getChats(options = {}) {
    const { limit = 50, offset = 0, name_filter } = options;

    let sql = 'SELECT * FROM chats WHERE 1=1';
    const params = [];

    if (name_filter) {
      sql += ' AND name LIKE ?';
      params.push(`%${name_filter}%`);
    }

    sql += ' ORDER BY last_message_time DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return this.query(sql, params);
  }

  async getChatById(jid) {
    const sql = 'SELECT * FROM chats WHERE jid = ?';
    const results = await this.query(sql, [jid]);
    return results[0] || null;
  }

  async getMessageById(id, chat_jid) {
    const sql = `
      SELECT m.*, c.name as chat_name
      FROM messages m
      JOIN chats c ON m.chat_jid = c.jid
      WHERE m.id = ? AND m.chat_jid = ?
    `;
    const results = await this.query(sql, [id, chat_jid]);
    return results[0] || null;
  }

  async getConversationContext(messageId, chatJid, contextSize = 5) {
    const sql = `
      SELECT * FROM messages 
      WHERE chat_jid = ? 
      AND timestamp <= (
        SELECT timestamp FROM messages 
        WHERE id = ? AND chat_jid = ?
      )
      ORDER BY timestamp DESC 
      LIMIT ?
    `;
    
    const results = await this.query(sql, [chatJid, messageId, chatJid, contextSize * 2 + 1]);
    return results.reverse(); // Return in chronological order
  }

  async getBusinessResponses(options = {}) {
    const { limit = 100, chat_jid } = options;

    let sql = `
      SELECT * FROM messages 
      WHERE is_from_me = 1 
      AND content IS NOT NULL 
      AND content != ''
    `;
    const params = [];

    if (chat_jid) {
      sql += ' AND chat_jid = ?';
      params.push(chat_jid);
    }

    sql += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    return this.query(sql, params);
  }

  async query(sql, params = []) {
    if (!this.db) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(new Error(`Database query failed: ${err.message}`));
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async run(sql, params = []) {
    if (!this.db) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(new Error(`Database operation failed: ${err.message}`));
        } else {
          resolve({
            lastID: this.lastID,
            changes: this.changes
          });
        }
      });
    });
  }

  async getStats() {
    const queries = [
      'SELECT COUNT(*) as total_messages FROM messages',
      'SELECT COUNT(*) as total_chats FROM chats',
      'SELECT COUNT(*) as business_messages FROM messages WHERE is_from_me = 1',
      'SELECT COUNT(*) as client_messages FROM messages WHERE is_from_me = 0'
    ];

    const results = await Promise.all(
      queries.map(query => this.query(query))
    );

    return {
      total_messages: results[0][0].total_messages,
      total_chats: results[1][0].total_chats,
      business_messages: results[2][0].business_messages,
      client_messages: results[3][0].client_messages
    };
  }
}

module.exports = Database;