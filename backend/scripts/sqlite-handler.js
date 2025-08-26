#!/usr/bin/env node
/**
 * External SQLite Handler Script
 * Handles SQLite operations for the Docker backend via host system
 * This avoids native module compilation issues in Alpine containers
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path (adjust for host system)
const DATABASE_PATH = process.env.DATABASE_PATH || path.resolve(__dirname, '../../whatsapp-bridge/store/messages.db');

function getPendingMessages(limit = 100) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DATABASE_PATH, sqlite3.OPEN_READONLY);
    
    // Define chat exclusion patterns (personal/family chats)
    const excludedChatPatterns = [
      'Familia%', 'Family%', 'familia%',
      '%Mamis%', '%mamis%',
      'Welcome 2024-2025',
      'Gins Mamis'
    ];
    
    // Build exclusion conditions
    const excludeConditions = excludedChatPatterns.map(() => 'c.name NOT LIKE ?').join(' AND ');
    
    // Smart filtering query
    const query = `
      SELECT m.*, c.name as chat_name,
             CASE WHEN c.name IN (
               SELECT DISTINCT c2.name FROM chats c2 
               JOIN messages m2 ON c2.jid = m2.chat_jid 
               WHERE m2.is_from_me = 1 
               AND LENGTH(m2.content) > 50
               GROUP BY c2.name 
               HAVING COUNT(*) >= 3
             ) THEN 1 ELSE 0 END as is_business_chat
      FROM messages m
      LEFT JOIN chats c ON m.chat_jid = c.jid
      WHERE m.content IS NOT NULL 
        AND m.content != ''
        AND LENGTH(m.content) > 5
        -- Exclude standardized auto-responses
        AND m.content NOT LIKE '%Welcome English School%'
        AND m.content NOT LIKE '%horario de atención%'
        AND m.content NOT LIKE '%no podemos atenderte%'
        AND m.content NOT LIKE '%Ahora no podemos atenderte%'
        -- Exclude obvious personal chats
        AND (${excludeConditions})
        -- Focus on business conversations
        AND c.name IN (
          SELECT DISTINCT c3.name FROM chats c3 
          JOIN messages m3 ON c3.jid = m3.chat_jid 
          WHERE m3.is_from_me = 1 
          AND LENGTH(m3.content) > 50
          AND m3.content NOT LIKE '%Welcome English School%'
          GROUP BY c3.name 
          HAVING COUNT(*) >= 3
        )
        -- Note: processed_embeddings check will be added after first migration
      ORDER BY c.name, m.timestamp ASC
      LIMIT ?
    `;
    
    const queryParams = [...excludedChatPatterns, limit];
    
    db.all(query, queryParams, (err, rows) => {
      db.close();
      
      if (err) {
        reject(err);
        return;
      }
      
      // Transform rows to expected format
      const messages = rows.map(row => ({
        message_id: row.id,
        chat_jid: row.chat_jid,
        chat_name: row.chat_name || 'Unknown',
        sender: row.sender,
        content: row.content.trim(),
        timestamp: row.timestamp,
        is_from_me: Boolean(row.is_from_me),
        is_business_response: Boolean(row.is_from_me),
        is_business_chat: Boolean(row.is_business_chat),
        content_length: row.content.length
      }));
      
      resolve({
        status: 'success',
        count: messages.length,
        messages: messages,
        timestamp: new Date().toISOString()
      });
    });
  });
}

function markAsProcessed(messageId) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DATABASE_PATH);
    
    // Create table if it doesn't exist
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS processed_embeddings (
        message_id TEXT PRIMARY KEY,
        processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'success'
      )
    `;
    
    db.run(createTableSQL, (err) => {
      if (err) {
        console.error('Error creating processed_embeddings table:', err);
      }
      
      // Insert processed record
      const insertSQL = `INSERT OR REPLACE INTO processed_embeddings (message_id, processed_at, status) VALUES (?, ?, ?)`;
      
      db.run(insertSQL, [messageId, new Date().toISOString(), 'success'], (err) => {
        db.close();
        
        if (err) {
          reject(err);
          return;
        }
        
        resolve({
          status: 'success',
          message_id: messageId,
          processed_at: new Date().toISOString()
        });
      });
    });
  });
}

function getStats() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DATABASE_PATH, sqlite3.OPEN_READONLY);
    
    const statsQuery = `
      SELECT 
        COUNT(*) as total_messages,
        0 as processed_count,
        0 as failed_count,
        (SELECT COUNT(*) FROM messages m 
         LEFT JOIN chats c ON m.chat_jid = c.jid
         WHERE m.content IS NOT NULL 
         AND LENGTH(m.content) > 5
         AND c.name NOT LIKE '%Familia%' 
         AND c.name NOT LIKE '%Family%'
         AND c.name NOT LIKE '%mamis%') as eligible_messages
      FROM messages
    `;
    
    db.get(statsQuery, (err, row) => {
      db.close();
      
      if (err) {
        reject(err);
        return;
      }
      
      const pending_count = row.eligible_messages - row.processed_count;
      
      resolve({
        total_messages: row.total_messages,
        eligible_messages: row.eligible_messages,
        processed_count: row.processed_count,
        failed_count: row.failed_count,
        pending_count: pending_count,
        progress_percentage: row.eligible_messages > 0 ? 
          Math.round((row.processed_count / row.eligible_messages) * 100) : 0,
        timestamp: new Date().toISOString()
      });
    });
  });
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  const param = process.argv[3];
  
  switch (command) {
    case 'pending':
      getPendingMessages(parseInt(param) || 100)
        .then(result => console.log(JSON.stringify(result, null, 2)))
        .catch(err => {
          console.error('Error:', err.message);
          process.exit(1);
        });
      break;
      
    case 'mark-processed':
      if (!param) {
        console.error('Usage: node sqlite-handler.js mark-processed <message_id>');
        process.exit(1);
      }
      markAsProcessed(param)
        .then(result => console.log(JSON.stringify(result, null, 2)))
        .catch(err => {
          console.error('Error:', err.message);
          process.exit(1);
        });
      break;
      
    case 'stats':
      getStats()
        .then(result => console.log(JSON.stringify(result, null, 2)))
        .catch(err => {
          console.error('Error:', err.message);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Usage:');
      console.log('  node sqlite-handler.js pending [limit]');
      console.log('  node sqlite-handler.js mark-processed <message_id>');
      console.log('  node sqlite-handler.js stats');
      process.exit(1);
  }
}

module.exports = {
  getPendingMessages,
  markAsProcessed,
  getStats
};