const request = require('supertest');
const express = require('express');
const MessagesController = require('../../src/controllers/messagesController');

// Mock the services
jest.mock('../../src/services/embedding');
jest.mock('../../src/services/similarity');
jest.mock('../../src/services/whatsapp');

const EmbeddingService = require('../../src/services/embedding');
const SimilarityService = require('../../src/services/similarity');
const WhatsAppService = require('../../src/services/whatsapp');

describe('Messages API Integration Tests', () => {
  let app;
  let messagesController;

  beforeEach(() => {
    // Create Express app for testing
    app = express();
    app.use(express.json());
    
    messagesController = new MessagesController();

    // Setup routes
    app.post('/api/messages/suggestions', (req, res) => {
      messagesController.getSuggestions(req, res);
    });
    app.get('/api/messages/similar', (req, res) => {
      messagesController.findSimilar(req, res);
    });
    app.get('/api/messages', (req, res) => {
      messagesController.getRecentMessages(req, res);
    });

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('POST /api/messages/suggestions', () => {
    it('should return suggestions for valid message', async () => {
      // Mock service responses
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockSimilarResponses = [
        { document: 'Thank you for your message', metadata: {}, similarity: 0.9 },
        { document: 'I will help you with that', metadata: {}, similarity: 0.8 },
        { document: 'Let me check that for you', metadata: {}, similarity: 0.7 }
      ];
      const mockConversations = [
        { messages: [{ content: 'Previous conversation 1' }] },
        { messages: [{ content: 'Previous conversation 2' }] }
      ];

      EmbeddingService.prototype.generateEmbedding.mockResolvedValue(mockEmbedding);
      SimilarityService.prototype.findSimilarBusinessResponses.mockResolvedValue(mockSimilarResponses);
      WhatsAppService.prototype.getSimilarConversations.mockResolvedValue(mockConversations);

      const response = await request(app)
        .post('/api/messages/suggestions')
        .send({
          message: 'I need help with enrollment',
          chat_jid: 'test@g.us'
        })
        .expect(200);

      expect(response.body).toHaveProperty('suggestions');
      expect(response.body.suggestions).toHaveLength(3);
      expect(response.body.suggestions[0]).toBe('Thank you for your message');
      
      expect(response.body).toHaveProperty('similar_conversations');
      expect(response.body.similar_conversations).toHaveLength(2);
      
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('message_processed_at');
      expect(response.body.metadata.similarity_count).toBe(3);
    });

    it('should return 400 for missing message', async () => {
      const response = await request(app)
        .post('/api/messages/suggestions')
        .send({
          chat_jid: 'test@g.us'
        })
        .expect(400);

      expect(response.body.error).toBe('Message is required');
      expect(response.body.code).toBe('MISSING_MESSAGE');
    });

    it('should return 400 for empty message', async () => {
      const response = await request(app)
        .post('/api/messages/suggestions')
        .send({
          message: '   ',
          chat_jid: 'test@g.us'
        })
        .expect(400);

      expect(response.body.error).toBe('Message is required');
    });

    it('should handle service errors gracefully', async () => {
      EmbeddingService.prototype.generateEmbedding.mockRejectedValue(
        new Error('Embedding service failed')
      );

      const response = await request(app)
        .post('/api/messages/suggestions')
        .send({
          message: 'Test message',
          chat_jid: 'test@g.us'
        })
        .expect(500);

      expect(response.body.error).toBe('Failed to generate suggestions');
      expect(response.body.code).toBe('SUGGESTION_ERROR');
    });

    it('should not expose error details in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      EmbeddingService.prototype.generateEmbedding.mockRejectedValue(
        new Error('Internal error details')
      );

      const response = await request(app)
        .post('/api/messages/suggestions')
        .send({
          message: 'Test message',
          chat_jid: 'test@g.us'
        })
        .expect(500);

      expect(response.body).not.toHaveProperty('details');
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('GET /api/messages/similar', () => {
    it('should find similar messages for valid query', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockSimilarMessages = [
        { document: 'Similar message 1', metadata: {}, similarity: 0.9 },
        { document: 'Similar message 2', metadata: {}, similarity: 0.8 }
      ];

      EmbeddingService.prototype.generateEmbedding.mockResolvedValue(mockEmbedding);
      SimilarityService.prototype.findSimilar.mockResolvedValue(mockSimilarMessages);

      const response = await request(app)
        .get('/api/messages/similar')
        .query({ query: 'enrollment help' })
        .expect(200);

      expect(response.body.query).toBe('enrollment help');
      expect(response.body.results).toHaveLength(2);
      expect(response.body.results[0].document).toBe('Similar message 1');
      expect(response.body.metadata.total_results).toBe(2);
    });

    it('should handle custom limit parameter', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      
      EmbeddingService.prototype.generateEmbedding.mockResolvedValue(mockEmbedding);
      SimilarityService.prototype.findSimilar.mockResolvedValue([]);

      await request(app)
        .get('/api/messages/similar')
        .query({ query: 'test', limit: '10' })
        .expect(200);

      expect(SimilarityService.prototype.findSimilar).toHaveBeenCalledWith(
        mockEmbedding,
        expect.objectContaining({ nResults: 10 })
      );
    });

    it('should handle custom threshold parameter', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      
      EmbeddingService.prototype.generateEmbedding.mockResolvedValue(mockEmbedding);
      SimilarityService.prototype.findSimilar.mockResolvedValue([]);

      await request(app)
        .get('/api/messages/similar')
        .query({ query: 'test', threshold: '0.8' })
        .expect(200);

      expect(SimilarityService.prototype.findSimilar).toHaveBeenCalledWith(
        mockEmbedding,
        expect.objectContaining({ threshold: 0.8 })
      );
    });

    it('should return 400 for missing query', async () => {
      const response = await request(app)
        .get('/api/messages/similar')
        .expect(400);

      expect(response.body.error).toBe('Query parameter is required');
      expect(response.body.code).toBe('MISSING_QUERY');
    });

    it('should return 400 for empty query', async () => {
      const response = await request(app)
        .get('/api/messages/similar')
        .query({ query: '   ' })
        .expect(400);

      expect(response.body.error).toBe('Query parameter is required');
    });
  });

  describe('GET /api/messages', () => {
    it('should return recent messages with default parameters', async () => {
      const mockMessages = [
        global.testUtils.createMockMessage({ id: 'msg1' }),
        global.testUtils.createMockMessage({ id: 'msg2' })
      ];

      WhatsAppService.prototype.getMessages.mockResolvedValue(mockMessages);

      const response = await request(app)
        .get('/api/messages')
        .expect(200);

      expect(response.body.messages).toHaveLength(2);
      expect(response.body.metadata.limit).toBe(20);
      expect(response.body.metadata.offset).toBe(0);
      
      expect(WhatsAppService.prototype.getMessages).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
        chat_jid: undefined,
        from_me: undefined,
        start_date: undefined,
        end_date: undefined
      });
    });

    it('should handle custom parameters', async () => {
      WhatsAppService.prototype.getMessages.mockResolvedValue([]);

      await request(app)
        .get('/api/messages')
        .query({
          limit: '10',
          offset: '5',
          chat_jid: 'test@g.us',
          from_me: 'true',
          start_date: '2024-01-01',
          end_date: '2024-01-31'
        })
        .expect(200);

      expect(WhatsAppService.prototype.getMessages).toHaveBeenCalledWith({
        limit: 10,
        offset: 5,
        chat_jid: 'test@g.us',
        from_me: true,
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      });
    });

    it('should handle from_me parameter correctly', async () => {
      WhatsAppService.prototype.getMessages.mockResolvedValue([]);

      // Test false value
      await request(app)
        .get('/api/messages')
        .query({ from_me: 'false' })
        .expect(200);

      expect(WhatsAppService.prototype.getMessages).toHaveBeenCalledWith(
        expect.objectContaining({ from_me: false })
      );
    });

    it('should handle service errors', async () => {
      WhatsAppService.prototype.getMessages.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/api/messages')
        .expect(500);

      expect(response.body.error).toBe('Failed to retrieve messages');
      expect(response.body.code).toBe('MESSAGES_ERROR');
    });
  });

  describe('Error handling consistency', () => {
    it('should return consistent error format across endpoints', async () => {
      EmbeddingService.prototype.generateEmbedding.mockRejectedValue(
        new Error('Service error')
      );

      const suggestionsResponse = await request(app)
        .post('/api/messages/suggestions')
        .send({ message: 'test' })
        .expect(500);

      const similarResponse = await request(app)
        .get('/api/messages/similar')
        .query({ query: 'test' })
        .expect(500);

      // Both should have consistent error structure
      expect(suggestionsResponse.body).toHaveProperty('error');
      expect(suggestionsResponse.body).toHaveProperty('code');
      expect(similarResponse.body).toHaveProperty('error');
      expect(similarResponse.body).toHaveProperty('code');
    });
  });
});