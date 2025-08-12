const EmbeddingService = require('../services/embedding');
const SimilarityService = require('../services/similarity');
const WhatsAppService = require('../services/whatsapp');

class MessagesController {
  constructor() {
    this.embeddingService = new EmbeddingService();
    this.similarityService = new SimilarityService();
    this.whatsappService = new WhatsAppService();
  }

  async getSuggestions(req, res) {
    try {
      const { message, chat_jid } = req.body;

      if (!message || !message.trim()) {
        return res.status(400).json({
          error: 'Message is required',
          code: 'MISSING_MESSAGE'
        });
      }

      // Generate embedding for the incoming message
      const messageEmbedding = await this.embeddingService.generateEmbedding(message);

      // Find similar business responses
      const similarResponses = await this.similarityService.findSimilarBusinessResponses(
        messageEmbedding,
        { nResults: 3 }
      );

      // Extract suggestions from similar responses
      const suggestions = similarResponses.map(result => result.document);

      // Find complete similar conversations
      const similarConversations = await this.whatsappService.getSimilarConversations(
        messageEmbedding,
        { limit: 3 }
      );

      res.json({
        suggestions,
        similar_conversations: similarConversations,
        metadata: {
          message_processed_at: new Date().toISOString(),
          similarity_count: similarResponses.length,
          conversation_count: similarConversations.length
        }
      });

    } catch (error) {
      console.error('Error getting suggestions:', error);
      res.status(500).json({
        error: 'Failed to generate suggestions',
        code: 'SUGGESTION_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async findSimilar(req, res) {
    try {
      const { query, limit = 5, threshold } = req.query;

      if (!query || !query.trim()) {
        return res.status(400).json({
          error: 'Query parameter is required',
          code: 'MISSING_QUERY'
        });
      }

      // Generate embedding for the query
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);

      // Find similar messages
      const similarMessages = await this.similarityService.findSimilar(
        queryEmbedding,
        {
          nResults: parseInt(limit),
          threshold: threshold ? parseFloat(threshold) : undefined
        }
      );

      res.json({
        query,
        results: similarMessages,
        metadata: {
          total_results: similarMessages.length,
          query_processed_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error finding similar messages:', error);
      res.status(500).json({
        error: 'Failed to find similar messages',
        code: 'SIMILARITY_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getRecentMessages(req, res) {
    try {
      const { 
        limit = 20, 
        offset = 0, 
        chat_jid,
        from_me,
        start_date,
        end_date 
      } = req.query;

      const messages = await this.whatsappService.getMessages({
        limit: parseInt(limit),
        offset: parseInt(offset),
        chat_jid,
        from_me: from_me !== undefined ? from_me === 'true' : undefined,
        start_date,
        end_date
      });

      res.json({
        messages,
        metadata: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          retrieved_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error getting recent messages:', error);
      res.status(500).json({
        error: 'Failed to retrieve messages',
        code: 'MESSAGES_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = MessagesController;