# WhatsApp Business Data Filtering Strategy

## Overview

This document explains the intelligent filtering approach used to clean WhatsApp conversation data before creating vector embeddings, while preserving the functionality of the existing MCP server.

## Key Principles

### 1. MCP Server Preservation
- **Never modify the original SQLite database** - this would break MCP server functionality
- **Use MCP server APIs** for safe data access where possible
- **Filter at the embedding stage**, not at the source database level

### 2. Context-Aware Filtering
- **Preserve complete conversations** rather than filtering individual messages
- **Maintain conversational flow** by including both customer and business sides
- **Keep emojis and short responses** that are part of natural business communication

## Filtering Strategy

### Level 1: Chat-Level Filtering

**Excluded Chat Patterns:**
```javascript
const excludedChatPatterns = [
  'Familia%', 'Family%', 'familia%',  // Personal family chats
  '%Mamis%', '%mamis%',               // Friend group chats  
  'Welcome 2024-2025',                // Social group chat
  'Gins Mamis'                        // Personal friend group
];
```

**Business Chat Identification:**
- Chats with ≥3 substantial business responses (>50 characters)
- Excludes chats that are primarily personal/social

### Level 2: Content Filtering

**Removed Standardized Responses:**
- Auto-replies: "Welcome English School" template (948 instances)
- Business hours messages: "horario de atención"  
- Unavailability messages: "no podemos atenderte"

**Preserved Content:**
- All emojis (important for business communication tone)
- Short responses ("Sí", "Perfect", "Ok") when part of business conversations
- Complete conversation threads for context

### Level 3: Data Anonymization

**PII Removal:**
- Phone numbers → `[PHONE]`
- Email addresses → `[EMAIL]`  
- Credit card numbers → `[CARD]`
- IBAN numbers → `[IBAN]`

**Context Preservation:**
- Customer/Business role identification
- Conversation timestamps
- Chat names (for grouping related messages)

## Expected Results

### Before Filtering:
- **Total Messages:** 17,446
- **Business Messages:** 9,523
- **Auto-responses:** 948 (10% of business messages)
- **Personal/Family:** ~2,000 messages

### After Filtering:
- **Quality Business Messages:** ~6,000-7,000
- **Noise Reduction:** ~65% reduction in low-value content
- **Context Preservation:** Complete conversation threads maintained

## Technical Implementation

### Database Query Logic:
```sql
-- Focus on chats with substantial business activity
WHERE c.name IN (
  SELECT DISTINCT c3.name FROM chats c3 
  JOIN messages m3 ON c3.jid = m3.chat_jid 
  WHERE m3.is_from_me = 1 
  AND LENGTH(m3.content) > 50
  AND m3.content NOT LIKE '%Welcome English School%'
  GROUP BY c3.name 
  HAVING COUNT(*) >= 3
)
-- Remove standardized templates
AND m.content NOT LIKE '%Welcome English School%'
AND m.content NOT LIKE '%horario de atención%'
-- Exclude personal chats
AND c.name NOT LIKE 'Familia%'
-- Preserve all message lengths (≥5 chars for basic content)
AND LENGTH(m.content) > 5
```

### ChromaDB Metadata:
```javascript
metadata = {
  'message_id': data['message_id'],
  'chat_jid': data['chat_jid'], 
  'chat_name': data['chat_name'],
  'is_business_response': data['is_business_response'],
  'is_business_chat': data['is_business_chat'],
  'conversation_context': data['conversation_context'],
  'content_length': data['content_length']
}
```

## Validation Approach

### Quality Metrics:
1. **Conversation Completeness:** Both customer questions and business responses present
2. **Context Preservation:** Message order and timing maintained  
3. **Business Relevance:** Focus on educational service interactions
4. **Template Reduction:** Standardized responses eliminated

### Success Indicators:
- Significant noise reduction (templates, personal chats)
- Preserved conversational context and tone
- Maintained emoji usage patterns
- Kept short but meaningful business responses

## MCP Server Compatibility

### Safe Operations:
- ✅ Read-only database access
- ✅ Use existing database schema
- ✅ No modifications to original message data
- ✅ Filter applied only during vector embedding process

### Avoided Operations:
- ❌ Direct database modifications
- ❌ Message deletion from original database  
- ❌ Schema changes
- ❌ Breaking MCP server dependencies

This approach ensures that the WhatsApp MCP server continues to function normally while providing high-quality, contextually-rich data for the business reply suggestion system.