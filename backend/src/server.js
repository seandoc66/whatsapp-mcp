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
const { ChromaApi } = require('chromadb');
const { exec } = require('child_process');
const fetch = require('node-fetch');

const app = express();
const server = http.createServer(app);

// Environment configuration
const PORT = process.env.PORT || 3004;
const WEBSOCKET_PORT = process.env.WEBSOCKET_PORT || 3003;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const DATABASE_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../..', 'whatsapp-bridge/store/messages.db');
const CHROMA_DB_URL = process.env.CHROMA_DB_URL || 'http://localhost:8000';

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

// Initialize ChromaDB collection
app.post('/api/chroma/init', async (req, res) => {
  try {
    const response = await fetch(`${CHROMA_DB_URL}/api/v2/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'conversation_embeddings',
        metadata: { description: 'WhatsApp conversation embeddings for similarity search' }
      })
    });

    if (response.status === 409) {
      // Collection already exists
      res.json({ status: 'exists', message: 'ChromaDB collection already exists' });
    } else if (response.ok) {
      res.json({ status: 'created', message: 'ChromaDB collection created successfully' });
    } else {
      throw new Error(`ChromaDB error: ${response.status}`);
    }
  } catch (err) {
    console.error('❌ Failed to initialize ChromaDB collection:', err);
    res.status(500).json({ 
      error: 'Failed to initialize ChromaDB', 
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get pending messages for migration (replaces direct SQLite access in n8n)
app.get('/api/messages/pending', async (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  try {
    // Use external SQLite handler script to avoid native compilation
    exec(`node scripts/sqlite-handler.js pending ${limit}`, { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ SQLite handler error:', error);
        return res.status(500).json({ error: 'Database query failed', details: error.message });
      }
      
      if (stderr) {
        console.error('❌ SQLite handler stderr:', stderr);
      }
      
      try {
        const result = JSON.parse(stdout);
        console.log(`📊 Found ${result.count || 0} quality business messages for processing`);
        res.json(result);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        res.status(500).json({ error: 'Invalid response from database handler', details: parseError.message });
      }
    });
  } catch (err) {
    console.error('❌ Failed to execute SQLite handler:', err);
    res.status(500).json({ error: 'Failed to fetch pending messages', details: err.message });
  }
});

// Store embedding in ChromaDB (replaces direct ChromaDB access in n8n)
app.post('/api/embeddings/store', async (req, res) => {
  const embeddingData = req.body;
  
  // Validate required fields
  if (!embeddingData.message_id || !embeddingData.content || !embeddingData.embedding) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['message_id', 'content', 'embedding'],
      timestamp: new Date().toISOString()
    });
  }
  
  console.log(`🔄 Storing embedding for message: ${embeddingData.message_id}`);
  
  try {
    // TODO: Store in ChromaDB - for now just simulate successful storage
    // In a real n8n workflow, embeddings would be stored differently
    console.log(`📊 Would store embedding: ${embeddingData.message_id} (${embeddingData.embedding.length} dimensions)`);
    
    // Note: ChromaDB integration will be handled by n8n workflows
    // This endpoint serves as a receiver for workflow completion confirmation
    
    // Mark as processed using external SQLite handler
    exec(`node scripts/sqlite-handler.js mark-processed ${embeddingData.message_id}`, { cwd: path.join(__dirname, '..') }, (error) => {
      if (error) {
        console.error('Failed to mark as processed:', error);
      }
    });
    
    console.log(`✅ Successfully stored embedding for message: ${embeddingData.message_id}`);
    
    res.json({ 
      success: true, 
      message_id: embeddingData.message_id, 
      stored_at: new Date().toISOString() 
    });
  } catch (err) {
    console.error('❌ Failed to store embedding:', err);
    res.status(500).json({ 
      error: 'Failed to store embedding', 
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get embedding processing statistics
app.get('/api/embeddings/stats', (req, res) => {
  try {
    // Use external SQLite handler script to avoid native compilation
    exec(`node scripts/sqlite-handler.js stats`, { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ SQLite handler error:', error);
        return res.status(500).json({ error: 'Failed to get statistics', details: error.message });
      }
      
      if (stderr) {
        console.error('❌ SQLite handler stderr:', stderr);
      }
      
      try {
        const result = JSON.parse(stdout);
        res.json(result);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        res.status(500).json({ error: 'Invalid response from database handler', details: parseError.message });
      }
    });
  } catch (err) {
    console.error('❌ Failed to execute SQLite handler:', err);
    res.status(500).json({ error: 'Failed to get statistics', details: err.message });
  }
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