# WhatsApp Business Reply Assistant

## Project Overview

This project transforms a WhatsApp MCP server into a comprehensive web application that helps businesses respond to WhatsApp messages by suggesting relevant responses based on historical conversation patterns. The system uses semantic similarity search to find past conversations and suggests appropriate responses.

## Project Structure

```
whatsapp-mcp/
├── README.md                     # Original MCP server documentation
├── LICENSE                       # Project license
├── docker-compose.yml           # Container orchestration
├── 
├── backend/                     # Node.js REST API server
│   ├── package.json            # Backend dependencies
│   ├── .env.example           # Environment configuration template
│   └── src/
│       ├── server.js          # Express server entry point
│       ├── controllers/       # API request handlers
│       ├── services/          # Business logic layer
│       │   ├── embedding.js   # Text embedding generation
│       │   ├── similarity.js  # Semantic similarity search
│       │   └── whatsapp.js    # WhatsApp data processing
│       ├── models/            # Data models and schemas
│       ├── routes/            # API route definitions
│       └── utils/             # Utility functions
│
├── frontend/                   # React web application
│   ├── package.json           # Frontend dependencies
│   ├── .env.example          # Frontend environment config
│   └── src/
│       ├── App.js            # Main React component
│       ├── components/       # Reusable UI components
│       │   ├── MessageDisplay.jsx
│       │   ├── SuggestionButtons.jsx
│       │   └── ConversationHistory.jsx
│       ├── pages/            # Main application pages
│       ├── hooks/            # Custom React hooks
│       ├── utils/            # Frontend utilities
│       └── styles/           # CSS and styling files
│
├── tools/                     # External tools and services
│   ├── mcp-server/           # Python MCP server (moved from root)
│   │   ├── main.py           # MCP server implementation
│   │   ├── whatsapp.py       # WhatsApp integration
│   │   ├── audio.py          # Audio message handling
│   │   └── pyproject.toml    # Python dependencies
│   │
│   └── whatsapp-bridge/      # Go WhatsApp bridge (moved from root)
│       ├── main.go           # WhatsApp connection handler
│       ├── go.mod            # Go module definition
│       └── go.sum            # Go dependencies
│
├── database/                  # Data storage and management
│   ├── store/                # SQLite databases (moved from bridge)
│   │   ├── messages.db       # WhatsApp message history
│   │   └── whatsapp.db       # WhatsApp connection data
│   ├── chroma/               # Vector database for embeddings
│   ├── migrations/           # Database schema changes
│   └── seeds/                # Initial data setup
│
├── workflows/                # n8n automation workflows
│   ├── data-migration/       # Historical data processing
│   └── message-processing/   # Real-time message handling
│
└── docs/                     # Project documentation
    ├── how-to-use.md         # Original usage guide
    ├── example-use.png       # Example screenshot
    └── api.md                # API documentation
```

## Database Schema

### SQLite Database (messages.db)
```sql
-- Chats table: stores chat/group information
CREATE TABLE chats (
    jid TEXT PRIMARY KEY,           -- WhatsApp JID (unique identifier)
    name TEXT,                      -- Chat/contact name
    last_message_time TIMESTAMP     -- Last activity timestamp
);

-- Messages table: stores all WhatsApp messages
CREATE TABLE messages (
    id TEXT,                        -- Message unique ID
    chat_jid TEXT,                  -- Reference to chat
    sender TEXT,                    -- Message sender
    content TEXT,                   -- Message text content
    timestamp TIMESTAMP,            -- When message was sent
    is_from_me BOOLEAN,            -- True if sent by business
    media_type TEXT,               -- Type of media (image, video, etc.)
    filename TEXT,                 -- Media filename
    url TEXT,                      -- Media URL
    media_key BLOB,                -- WhatsApp media encryption key
    file_sha256 BLOB,              -- File integrity hash
    file_enc_sha256 BLOB,          -- Encrypted file hash
    file_length INTEGER,           -- File size in bytes
    PRIMARY KEY (id, chat_jid),
    FOREIGN KEY (chat_jid) REFERENCES chats(jid)
);
```

### Vector Database (ChromaDB)
- **Collection**: `conversation_embeddings`
- **Documents**: Message text content
- **Metadata**: 
  - `chat_jid`: Chat identifier
  - `message_id`: Original message ID
  - `sender`: Message sender
  - `timestamp`: Message timestamp
  - `is_business_response`: Whether message was from business
- **Embeddings**: Vector representations of message content

## Architecture & Data Flow

### Components Interaction
1. **WhatsApp Bridge** (Go) ↔ WhatsApp Web API
2. **MCP Server** (Python) ↔ WhatsApp Bridge
3. **n8n Workflows** ↔ MCP Server & Backend API
4. **Backend API** (Node.js) ↔ SQLite & ChromaDB
5. **Frontend** (React) ↔ Backend API

### Real-time Message Processing Flow
```
New WhatsApp Message
    ↓
MCP Server Detects Message
    ↓
n8n Workflow Triggered
    ↓
Message Anonymized & Embedded
    ↓
Backend API Similarity Search
    ↓
Frontend Displays Suggestions
    ↓
User Copies & Pastes Response
```

### Data Migration Flow
```
Historical SQLite Messages
    ↓
n8n Data Migration Workflow
    ↓
Clean & Anonymize Content
    ↓
Generate Embeddings
    ↓
Store in ChromaDB
```

## Development Setup

### Prerequisites
- Node.js 18+ and npm/yarn
- Python 3.8+ and UV package manager
- Go 1.19+
- Docker and Docker Compose
- SQLite3
- n8n (local installation)

### Quick Start
```bash
# Clone and setup
git clone <repository>
cd whatsapp-mcp

# Backend setup
cd backend
cp .env.example .env
npm install

# Frontend setup
cd ../frontend
cp .env.example .env
npm install

# Start with Docker
docker-compose up -d

# Or start components individually
cd backend && npm run dev
cd frontend && npm start
cd tools/whatsapp-bridge && go run main.go
```

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [x] Reorganize project structure
- [ ] Set up ChromaDB and embedding pipeline
- [ ] Create data migration n8n workflow
- [ ] Build basic backend API structure
- [ ] Test similarity search with existing data

### Phase 2: Real-time Processing (Week 2)
- [ ] Integrate MCP server with n8n workflows
- [ ] Implement message processing pipeline
- [ ] Build similarity search API endpoints
- [ ] Create basic React frontend
- [ ] Test end-to-end message flow

### Phase 3: User Interface (Week 3)
- [ ] Build responsive React components
- [ ] Implement clipboard copy functionality
- [ ] Create conversation history display
- [ ] Add real-time status indicators
- [ ] Integrate with backend API

### Phase 4: Optimization (Week 4)
- [ ] Fine-tune similarity search parameters
- [ ] Improve anonymization rules
- [ ] Add error handling and logging
- [ ] Performance optimization
- [ ] User testing and feedback

## Key Features

### Core Functionality
- **Real-time Message Detection**: Automatic detection of new WhatsApp messages
- **Semantic Similarity Search**: Find relevant past conversations using AI
- **Response Suggestions**: 3 clickable suggested responses based on history
- **Conversation Context**: Display complete past conversations for reference
- **One-Click Copy**: Copy suggestions to clipboard for manual pasting

### Data Privacy & Security
- **Local Storage**: All data remains on local systems
- **Automatic Anonymization**: Client names removed except whitelisted contacts
- **Secure Processing**: No external API calls for sensitive data
- **Encryption**: WhatsApp's end-to-end encryption maintained

### Technical Features
- **Vector Search**: ChromaDB for efficient similarity matching
- **Embeddings**: Sentence transformers for semantic understanding
- **Responsive UI**: Works on desktop and mobile browsers
- **Docker Support**: Easy deployment with containers
- **API Documentation**: Comprehensive REST API docs

## Environment Configuration

### Backend (.env)
```bash
DATABASE_PATH=../database/store/messages.db
CHROMA_DB_PATH=../database/chroma
PORT=3001
FRONTEND_URL=http://localhost:3000
EMBEDDING_MODEL=all-MiniLM-L6-v2
SIMILARITY_THRESHOLD=0.7
MAX_RESULTS=3
```

### Frontend (.env)
```bash
REACT_APP_API_URL=http://localhost:3001
REACT_APP_NAME=WhatsApp Reply Assistant
```

## API Endpoints

### Core API Routes
- `GET /api/messages/suggestions` - Get response suggestions for new message
- `GET /api/messages/similar` - Find similar past conversations
- `GET /api/chats` - List all chats
- `GET /api/status` - System status and health check
- `POST /api/embeddings/generate` - Generate embeddings for text

## Testing Strategy

### Unit Tests
- Backend service functions
- Embedding generation
- Similarity search algorithms
- Data anonymization

### Integration Tests
- API endpoint functionality
- Database operations
- n8n workflow execution
- Frontend component rendering

### End-to-End Tests
- Complete message processing flow
- User interaction scenarios
- Clipboard functionality
- Real-time updates

## Performance Considerations

### Optimization Areas
- **Embedding Generation**: Cache frequently used embeddings
- **Database Queries**: Index optimization for fast lookups
- **Memory Usage**: Efficient vector storage and retrieval
- **Response Time**: Sub-second suggestion generation
- **Scalability**: Handle large message histories efficiently

## Monitoring & Logging

### Metrics to Track
- Message processing time
- Similarity search accuracy
- User interaction patterns
- System resource usage
- Error rates and types

### Logging Strategy
- Structured JSON logging
- Separate logs for each component
- Privacy-compliant log content
- Rotation and retention policies

## Security & Privacy

### Data Protection
- No external API calls with sensitive data
- Local processing only
- Automatic data anonymization
- Secure WebSocket connections

### Access Control
- Local network access only
- No authentication required (single user)
- Secure file system permissions
- Regular security updates

## Future Enhancements

### Potential Features
- Multi-language support
- Custom response templates
- Advanced filtering options
- Analytics dashboard
- Team collaboration features
- Mobile app companion

### Technical Improvements
- WebSocket real-time updates
- Advanced AI models
- Better anonymization
- Cloud deployment option
- API rate limiting

## Troubleshooting

### Common Issues
1. **Database locked**: Restart WhatsApp bridge
2. **Embedding errors**: Check Python dependencies
3. **No suggestions**: Verify similarity threshold
4. **CORS issues**: Check frontend/backend URLs
5. **Memory issues**: Adjust embedding batch size

### Debug Commands
```bash
# Check database
sqlite3 database/store/messages.db ".schema"

# Test API
curl http://localhost:3001/api/status

# Check ChromaDB
docker logs whatsapp-mcp-chroma-1

# Verify embeddings
python -c "from sentence_transformers import SentenceTransformer; print('OK')"
```

---

*This project builds upon the excellent WhatsApp MCP server by lharries, extending it into a full business communication assistant.*

we will use n8n for a lot of the logic. remember to use the installed n8n-mcp tools you have    