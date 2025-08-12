const Database = require('../models/database');

class WhatsAppService {
  constructor() {
    this.database = new Database();
  }

  async getMessages(options = {}) {
    try {
      const messages = await this.database.getMessages(options);
      return messages;
    } catch (error) {
      throw new Error(`Failed to get messages: ${error.message}`);
    }
  }

  async getSimilarConversations(queryEmbedding, options = {}) {
    const { limit = 3 } = options;
    
    try {
      // This would integrate with the similarity service to find similar conversations
      // For now, return mock data structure
      const conversations = await this.database.getMessages({ 
        limit: limit * 10, // Get more messages to find conversations
        from_me: false // Get customer messages to find similar contexts
      });

      // Group by chat_jid to create conversations
      const conversationMap = new Map();
      
      for (const message of conversations) {
        if (!conversationMap.has(message.chat_jid)) {
          conversationMap.set(message.chat_jid, {
            chat_jid: message.chat_jid,
            chat_name: message.chat_name,
            messages: []
          });
        }
        conversationMap.get(message.chat_jid).messages.push(message);
      }

      // Return the first `limit` conversations
      return Array.from(conversationMap.values()).slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to get similar conversations: ${error.message}`);
    }
  }

  async getConversationContext(messageId, chatJid, contextSize = 5) {
    try {
      const context = await this.database.getConversationContext(messageId, chatJid, contextSize);
      return context;
    } catch (error) {
      throw new Error(`Failed to get conversation context: ${error.message}`);
    }
  }

  async getBusinessResponses(options = {}) {
    try {
      const responses = await this.database.getBusinessResponses(options);
      return responses;
    } catch (error) {
      throw new Error(`Failed to get business responses: ${error.message}`);
    }
  }

  async anonymizeMessage(message) {
    // Simple anonymization - replace phone numbers and common personal info
    if (!message || typeof message !== 'string') {
      return message;
    }

    let anonymized = message;
    
    // Replace phone numbers
    anonymized = anonymized.replace(/\+?[\d\s\-\(\)]{10,}/g, '[PHONE]');
    
    // Replace email addresses
    anonymized = anonymized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');
    
    // Replace common personal identifiers (this would be customized based on needs)
    anonymized = anonymized.replace(/\b(mr|mrs|ms|dr)\.?\s+[a-z]+/gi, '[NAME]');
    
    return anonymized;
  }
}

module.exports = WhatsAppService;