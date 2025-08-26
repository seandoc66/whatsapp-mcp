/**
 * Lightweight Express WebSocket Server for WhatsApp Reply Assistant
 * 
 * This server is minimal by design - most business logic is handled by n8n workflows.
 * Primary responsibilities:
 * 1. WebSocket connection management for real-time updates
 * 2. Basic health check endpoints
 * 3. Webhook receivers for n8n integration
 * 4. Static file serving for React frontend
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
// TODO: Re-enable SQLite and ChromaDB after fixing native dependencies
// const sqlite3 = require('sqlite3').verbose();
// const { ChromaApi } = require('chromadb');

const app = express();
const server = http.createServer(app);

// Environment configuration
const PORT = process.env.PORT || 3001;
const WEBSOCKET_PORT = process.env.WEBSOCKET_PORT || 3002;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const DATABASE_PATH = process.env.DATABASE_PATH || '/app/database/store/messages.db';
const CHROMA_DB_URL = process.env.CHROMA_DB_URL || 'http://chroma:8000';

// Middleware
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Basic logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// WebSocket server for real-time communication
const wss = new WebSocket.Server({ port: WEBSOCKET_PORT });

// Store active connections
const clients = new Map();

wss.on('connection', (ws, req) => {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  clients.set(clientId, ws);
  
  console.log(`📱 WebSocket client connected: ${clientId}`);
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    clientId: clientId,
    timestamp: new Date().toISOString(),
    message: 'Connected to WhatsApp Reply Assistant'
  }));

  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`📥 Message from ${clientId}:`, data);
      
      // Echo back for testing
      ws.send(JSON.stringify({
        type: 'echo',
        original: data,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error(`❌ Invalid JSON from ${clientId}:`, error);
    }
  });

  // Handle disconnection
  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`📴 WebSocket client disconnected: ${clientId}`);
  });

  ws.on('error', (error) => {
    console.error(`❌ WebSocket error for ${clientId}:`, error);
    clients.delete(clientId);
  });
});

// Broadcast message to all connected clients
function broadcastToAll(message) {
  const messageStr = JSON.stringify({
    ...message,
    timestamp: new Date().toISOString()
  });
  
  clients.forEach((ws, clientId) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    } else {
      clients.delete(clientId);
    }
  });
}

// Broadcast to specific client
function broadcastToClient(clientId, message) {
  const ws = clients.get(clientId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      ...message,
      timestamp: new Date().toISOString()
    }));
    return true;
  }
  return false;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'WhatsApp Reply Assistant Backend',
    timestamp: new Date().toISOString(),
    connections: clients.size,
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// System status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    backend: 'running',
    websocket: 'running',
    connections: clients.size,
    chromadb_url: CHROMA_DB_URL,
    n8n_webhook_url: process.env.N8N_WEBHOOK_URL,
    database_path: DATABASE_PATH,
    timestamp: new Date().toISOString()
  });
});

// Webhook receiver from n8n workflows
app.post('/api/webhooks/new-message', (req, res) => {
  const { message, suggestions, chat_name } = req.body;
  
  console.log(`🔔 New message webhook from n8n:`, { chat_name, message: message?.substring(0, 50) + '...' });
  
  // Broadcast to all connected clients
  broadcastToAll({
    type: 'new_message',
    data: {
      message,
      suggestions,
      chat_name,
      source: 'n8n_workflow'
    }
  });
  
  res.json({ status: 'received', timestamp: new Date().toISOString() });
});

// Webhook receiver for migration status
app.post('/api/webhooks/migration-status', (req, res) => {
  const { migration_completed, processed_count, failed_count, workflow_type } = req.body;
  
  console.log(`📊 Migration status from n8n:`, { processed_count, failed_count, workflow_type });
  
  // Broadcast migration progress to all clients
  broadcastToAll({
    type: 'migration_progress',
    data: {
      migration_completed,
      processed_count,
      failed_count,
      workflow_type: workflow_type || 'migration',
      source: 'n8n_workflow'
    }
  });
  
  res.json({ status: 'received', timestamp: new Date().toISOString() });
});

// Webhook receiver for similarity search results
app.post('/api/webhooks/similarity-results', (req, res) => {
  const { query_message, similar_messages, workflow_type } = req.body;
  
  console.log(`🔍 Similarity search results from n8n:`, { 
    query_length: query_message?.length, 
    results_count: similar_messages?.documents?.length || 0,
    workflow_type 
  });
  
  // Broadcast similarity results to all clients
  broadcastToAll({
    type: 'similarity_results',
    data: {
      query_message,
      similar_messages,
      workflow_type: workflow_type || 'similarity',
      source: 'n8n_chromadb_test'
    }
  });
  
  res.json({ status: 'received', timestamp: new Date().toISOString() });
});

// Webhook receiver for health status from n8n
app.post('/api/webhooks/health-status', (req, res) => {
  const { system_health, services, timestamp } = req.body;
  
  // Broadcast health status to all clients
  broadcastToAll({
    type: 'health_status',
    data: {
      system_health,
      services,
      source: 'n8n_health_workflow',
      n8n_timestamp: timestamp
    }
  });
  
  res.json({ status: 'received', timestamp: new Date().toISOString() });
});

// ==================== DATA MIGRATION API ENDPOINTS ====================

// Get pending messages for migration (replaces direct SQLite access in n8n)
app.get('/api/messages/pending', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  
  const db = new sqlite3.Database(DATABASE_PATH, sqlite3.OPEN_READONLY);
  
  // Define chat exclusion patterns (personal/family chats)
  const excludedChatPatterns = [
    'Familia%', 'Family%', 'familia%',
    '%Mamis%', '%mamis%',
    'Welcome 2024-2025', // Group chat
    'Gins Mamis'
  ];
  
  // Build exclusion conditions
  const excludeConditions = excludedChatPatterns.map(() => 'c.name NOT LIKE ?').join(' AND ');
  
  // Smart filtering query (same logic as original workflow)
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
      -- Skip already processed
      AND m.id NOT IN (
        SELECT message_id FROM processed_embeddings 
        WHERE processed_embeddings.message_id = m.id
      )
    ORDER BY c.name, m.timestamp ASC
    LIMIT ?
  `;
  
  const queryParams = [...excludedChatPatterns, limit];
  
  db.all(query, queryParams, (err, rows) => {
    db.close();
    
    if (err) {
      console.error('❌ Query error:', err);
      return res.status(500).json({ 
        error: 'Database query failed',
        details: err.message 
      });
    }
    
    console.log(`📊 Found ${rows.length} quality business messages for processing`);
    
    // Transform rows to match expected format
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
    
    res.json({
      status: 'success',
      count: messages.length,
      messages: messages,
      timestamp: new Date().toISOString()
    });
  });
});

// Store embedding in ChromaDB (replaces direct ChromaDB access in n8n)
app.post('/api/embeddings/store', (req, res) => {
  const { 
    message_id, 
    chat_jid, 
    chat_name, 
    sender, 
    content, 
    timestamp, 
    is_business_response, 
    is_business_chat, 
    conversation_context, 
    content_length, 
    embedding 
  } = req.body;
  
  // Validate required fields
  if (!message_id || !content || !embedding || !Array.isArray(embedding)) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['message_id', 'content', 'embedding'],
      timestamp: new Date().toISOString()
    });
  }
  
  console.log(`🔄 Storing embedding for message: ${message_id}`);
  
  // Initialize ChromaDB client
  const client = new ChromaApi({ 
    path: CHROMA_DB_URL 
  });
  
  client.getOrCreateCollection({ name: "conversation_embeddings" })
    .then(collection => {
      // Prepare metadata
      const metadata = {
        message_id,
        chat_jid,
        chat_name: chat_name || 'Unknown',
        sender: sender || '[UNKNOWN]',
        timestamp: timestamp || new Date().toISOString(),
        is_business_response: Boolean(is_business_response),
        is_business_chat: Boolean(is_business_chat),
        conversation_context: conversation_context || '',
        content_length: content_length || content.length
      };
      
      // Add to ChromaDB
      return collection.add({
        ids: [message_id],
        embeddings: [embedding],
        documents: [content],
        metadatas: [metadata]
      });
    })
    .then(() => {
      // Mark as processed in SQLite
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
          console.error('❌ Error creating processed_embeddings table:', err);
        }
      });
      
      // Insert processed record
      const insertSQL = `INSERT OR REPLACE INTO processed_embeddings (message_id, processed_at, status) VALUES (?, ?, ?)`;
      
      db.run(insertSQL, [message_id, new Date().toISOString(), 'success'], (err) => {
        db.close();
        
        if (err) {
          console.error('❌ Error marking message as processed:', err);
          return res.status(500).json({
            error: 'Failed to mark as processed',
            details: err.message,
            timestamp: new Date().toISOString()
          });
        }
        
        console.log(`✅ Successfully stored embedding for message: ${message_id}`);
        
        res.json({
          status: 'success',
          message_id,
          stored_at: new Date().toISOString(),
          embedding_dimensions: embedding.length
        });
      });
    })
    .catch(error => {
      console.error('❌ ChromaDB storage error:', error);
      res.status(500).json({
        error: 'Failed to store embedding',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    });
});

// Get embedding processing statistics
app.get('/api/embeddings/stats', (req, res) => {
  const db = new sqlite3.Database(DATABASE_PATH, sqlite3.OPEN_READONLY);
  
  const statsQuery = `
    SELECT 
      COUNT(*) as total_messages,
      (SELECT COUNT(*) FROM processed_embeddings WHERE status = 'success') as processed_count,
      (SELECT COUNT(*) FROM processed_embeddings WHERE status = 'failed') as failed_count,
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
      console.error('❌ Stats query error:', err);
      return res.status(500).json({ 
        error: 'Failed to get statistics',
        details: err.message 
      });
    }
    
    const pending_count = row.eligible_messages - row.processed_count;
    
    res.json({
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

// Test endpoint for manual broadcasting
app.post('/api/broadcast', (req, res) => {
  const { type, data, clientId } = req.body;
  
  if (clientId) {
    const success = broadcastToClient(clientId, { type, data });
    res.json({ 
      status: success ? 'sent' : 'client_not_found',
      clientId,
      timestamp: new Date().toISOString()
    });
  } else {
    broadcastToAll({ type, data });
    res.json({ 
      status: 'broadcast_to_all',
      clients: clients.size,
      timestamp: new Date().toISOString()
    });
  }
});

// List active WebSocket connections
app.get('/api/connections', (req, res) => {
  const connectionList = Array.from(clients.keys()).map(clientId => ({
    clientId,
    connected: true,
    since: 'unknown' // Could track connection time if needed
  }));
  
  res.json({
    active_connections: clients.size,
    connections: connectionList,
    timestamp: new Date().toISOString()
  });
});

// Fallback for unknown routes
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: 'This is a minimal WebSocket API server. Most logic is handled by n8n workflows.',
    available_endpoints: [
      'GET /api/health',
      'GET /api/status', 
      'GET /api/connections',
      'GET /api/messages/pending',
      'GET /api/embeddings/stats',
      'POST /api/embeddings/store',
      'POST /api/webhooks/new-message',
      'POST /api/webhooks/migration-status',
      'POST /api/webhooks/health-status',
      'POST /api/broadcast'
    ]
  });
});

// Error handling
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 Received SIGTERM, shutting down gracefully...');
  
  // Close all WebSocket connections
  clients.forEach((ws) => {
    ws.close(1000, 'Server shutting down');
  });
  
  // Close WebSocket server
  wss.close(() => {
    console.log('📴 WebSocket server closed');
  });
  
  // Close HTTP server
  server.close(() => {
    console.log('🛑 HTTP server closed');
    process.exit(0);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log('🚀 WhatsApp Reply Assistant Backend Starting...');
  console.log(`📡 HTTP server running on port ${PORT}`);
  console.log(`🔌 WebSocket server running on port ${WEBSOCKET_PORT}`);
  console.log(`🌐 CORS enabled for: ${FRONTEND_URL}`);
  console.log(`📊 ChromaDB URL: ${CHROMA_DB_URL}`);
  console.log(`🔗 Database path: ${DATABASE_PATH}`);
  console.log(`🔗 n8n Webhook URL: ${process.env.N8N_WEBHOOK_URL}`);
  console.log('✅ Server ready for n8n workflow integration');
});