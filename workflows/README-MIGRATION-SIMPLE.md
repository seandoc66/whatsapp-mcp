# Simplified Data Migration Workflow

This simplified version of the data migration workflow uses HTTP API calls instead of direct database access, making it compatible with n8n's containerized environment.

## Files

- **`data-migration-simple.json`** - The n8n workflow that processes WhatsApp messages
- **`test-api-endpoints.js`** - Test script to validate backend API endpoints
- **Backend API endpoints** - Added to `/backend/src/server.js`

## Workflow Architecture

```
Cron Trigger
    ↓
HTTP GET /api/messages/pending (get unprocessed messages)
    ↓
Anonymize & Add Context (n8n Set node)
    ↓
Generate Embeddings (HuggingFace API)
    ↓
Prepare Embedding Payload (n8n Set node)
    ↓
HTTP POST /api/embeddings/store (store in ChromaDB + mark as processed)
    ↓
HTTP POST /api/webhooks/migration-status (log progress)
```

## New Backend API Endpoints

### `GET /api/messages/pending`
- **Purpose**: Replaces direct SQLite access in n8n
- **Query Params**: 
  - `limit` (optional): Number of messages to fetch (default: 100)
- **Returns**: Array of unprocessed business messages with smart filtering
- **Logic**: Same filtering as original workflow (excludes personal chats, auto-responses)

### `POST /api/embeddings/store`
- **Purpose**: Replaces direct ChromaDB access in n8n
- **Body**: Complete message data with embedding vector
- **Actions**: 
  1. Stores embedding in ChromaDB
  2. Marks message as processed in SQLite
  3. Returns success confirmation

### `GET /api/embeddings/stats`
- **Purpose**: Monitor migration progress
- **Returns**: Processing statistics (total, processed, pending, progress %)

## Setup Instructions

### 1. Test Backend APIs
```bash
cd /Users/maria/Sites/whatsapp-mcp/workflows
node test-api-endpoints.js
```

### 2. Start Backend Server
```bash
cd /Users/maria/Sites/whatsapp-mcp/backend
npm run dev
```

### 3. Import Workflow into n8n
1. Open n8n interface
2. Create new workflow
3. Import `data-migration-simple.json`
4. Activate the workflow

### 4. Manual Test
- Use n8n's "Execute Workflow" button to test manually
- Check logs in backend console
- Verify data in ChromaDB and processed_embeddings table

## Environment Variables

Ensure these are set in backend `.env`:
```bash
DATABASE_PATH=../database/store/messages.db
CHROMA_DB_PATH=../database/chroma
PORT=3001
```

## Workflow Benefits

1. **No Direct Database Access**: n8n doesn't need SQLite/ChromaDB libraries
2. **Better Error Handling**: API responses provide clear error messages
3. **Easier Debugging**: Each step can be tested independently
4. **Scalability**: Backend can handle multiple concurrent requests
5. **Monitoring**: Progress tracking through API endpoints

## Troubleshooting

### Common Issues

1. **"Database query failed"**
   - Check `DATABASE_PATH` environment variable
   - Ensure messages.db file exists and is readable

2. **"Failed to store embedding"**
   - Check `CHROMA_DB_PATH` environment variable
   - Ensure ChromaDB directory exists and is writable
   - Verify chromadb npm package is installed

3. **"Missing required fields"**
   - Check that HuggingFace embedding generation is working
   - Verify the "Prepare Embedding Payload" node combines data correctly

4. **n8n workflow execution fails**
   - Test individual HTTP nodes manually
   - Check backend server is running on correct port
   - Verify network connectivity between n8n and backend

### Debug Commands

```bash
# Test API endpoints
curl http://localhost:3001/api/health

# Get pending messages count
curl http://localhost:3001/api/messages/pending?limit=1

# Get processing statistics
curl http://localhost:3001/api/embeddings/stats

# Check backend logs
cd backend && npm run dev
```

## Performance Considerations

- **Batch Size**: Default limit is 100 messages per run
- **Embedding Generation**: Uses HuggingFace API (requires internet)
- **Database Locking**: SQLite operations are handled safely in backend
- **Memory Usage**: Each embedding is ~768 dimensions (~3KB)

## Next Steps

1. Test the workflow with a small batch first
2. Monitor ChromaDB collection growth
3. Adjust cron schedule based on processing time
4. Consider implementing batch processing for better performance