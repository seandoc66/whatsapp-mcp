const SimilarityService = require('../../../src/services/similarity');

describe('SimilarityService', () => {
  let similarityService;
  let mockChromaClient;
  let mockCollection;

  beforeEach(() => {
    mockCollection = {
      add: jest.fn().mockResolvedValue(true),
      query: jest.fn(),
      count: jest.fn().mockResolvedValue(100)
    };

    mockChromaClient = {
      getCollection: jest.fn().mockResolvedValue(mockCollection),
      createCollection: jest.fn().mockResolvedValue(mockCollection)
    };

    similarityService = new SimilarityService(mockChromaClient);
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(similarityService.collectionName).toBe('conversation_embeddings');
      expect(similarityService.similarityThreshold).toBe(0.7);
      expect(similarityService.maxResults).toBe(3);
    });

    it('should use environment variables', () => {
      process.env.SIMILARITY_THRESHOLD = '0.8';
      process.env.MAX_RESULTS = '5';
      
      const service = new SimilarityService(mockChromaClient);
      expect(service.similarityThreshold).toBe(0.8);
      expect(service.maxResults).toBe(5);

      delete process.env.SIMILARITY_THRESHOLD;
      delete process.env.MAX_RESULTS;
    });
  });

  describe('initializeCollection', () => {
    it('should get existing collection', async () => {
      const collection = await similarityService.initializeCollection();
      
      expect(mockChromaClient.getCollection).toHaveBeenCalledWith({
        name: 'conversation_embeddings'
      });
      expect(collection).toBe(mockCollection);
    });

    it('should create collection if it does not exist', async () => {
      mockChromaClient.getCollection.mockRejectedValue(new Error('Collection not found'));
      
      const collection = await similarityService.initializeCollection();
      
      expect(mockChromaClient.createCollection).toHaveBeenCalledWith({
        name: 'conversation_embeddings',
        metadata: { description: 'WhatsApp conversation embeddings' }
      });
      expect(collection).toBe(mockCollection);
    });
  });

  describe('addMessage', () => {
    it('should add message to collection', async () => {
      const messageId = 'msg-123';
      const text = 'Hello world';
      const embedding = [0.1, 0.2, 0.3];
      const metadata = { chat_jid: 'test@g.us' };

      await similarityService.initializeCollection();
      const result = await similarityService.addMessage(messageId, text, embedding, metadata);

      expect(mockCollection.add).toHaveBeenCalledWith({
        ids: [messageId],
        embeddings: [embedding],
        documents: [text],
        metadatas: [{
          ...metadata,
          timestamp: expect.any(String)
        }]
      });
      expect(result).toBe(messageId);
    });

    it('should initialize collection if not already done', async () => {
      const messageId = 'msg-123';
      const text = 'Hello world';
      const embedding = [0.1, 0.2, 0.3];

      await similarityService.addMessage(messageId, text, embedding);

      expect(mockChromaClient.getCollection).toHaveBeenCalled();
    });
  });

  describe('findSimilar', () => {
    it('should find similar messages', async () => {
      const queryEmbedding = [0.1, 0.2, 0.3];
      const mockResults = {
        documents: [['Similar message', 'Another message']],
        metadatas: [[{ chat_jid: 'test1@g.us' }, { chat_jid: 'test2@g.us' }]],
        distances: [[0.1, 0.2]]
      };

      mockCollection.query.mockResolvedValue(mockResults);
      await similarityService.initializeCollection();

      const results = await similarityService.findSimilar(queryEmbedding);

      expect(mockCollection.query).toHaveBeenCalledWith({
        queryEmbeddings: [queryEmbedding],
        nResults: 3,
        where: {},
        include: ['documents', 'metadatas', 'distances']
      });

      expect(results).toHaveLength(2);
      expect(results[0].document).toBe('Similar message');
      expect(results[0].similarity).toBe(0.9); // 1 - 0.1
    });

    it('should filter results by similarity threshold', async () => {
      const queryEmbedding = [0.1, 0.2, 0.3];
      const mockResults = {
        documents: [['Good match', 'Poor match']],
        metadatas: [[{ chat_jid: 'test1@g.us' }, { chat_jid: 'test2@g.us' }]],
        distances: [[0.1, 0.8]] // Second result below threshold (similarity = 0.2)
      };

      mockCollection.query.mockResolvedValue(mockResults);
      await similarityService.initializeCollection();

      const results = await similarityService.findSimilar(queryEmbedding);

      expect(results).toHaveLength(1);
      expect(results[0].document).toBe('Good match');
    });

    it('should handle empty results', async () => {
      mockCollection.query.mockResolvedValue({ documents: [[]] });
      await similarityService.initializeCollection();

      const results = await similarityService.findSimilar([0.1, 0.2, 0.3]);
      expect(results).toEqual([]);
    });
  });

  describe('findSimilarBusinessResponses', () => {
    it('should filter for business responses', async () => {
      const queryEmbedding = [0.1, 0.2, 0.3];
      const spy = jest.spyOn(similarityService, 'findSimilar').mockResolvedValue([]);

      await similarityService.findSimilarBusinessResponses(queryEmbedding);

      expect(spy).toHaveBeenCalledWith(queryEmbedding, {
        whereClause: { is_business_response: { $eq: true } }
      });
    });
  });

  describe('calculateCosineSimilarity', () => {
    it('should calculate cosine similarity correctly', () => {
      const vectorA = [1, 2, 3];
      const vectorB = [4, 5, 6];
      
      const similarity = similarityService.calculateCosineSimilarity(vectorA, vectorB);
      
      // Expected: (1*4 + 2*5 + 3*6) / (sqrt(1+4+9) * sqrt(16+25+36))
      // = 32 / (sqrt(14) * sqrt(77)) = 32 / (3.74 * 8.77) ≈ 0.975
      expect(similarity).toBeCloseTo(0.975, 2);
    });

    it('should return 0 for zero magnitude vectors', () => {
      const vectorA = [0, 0, 0];
      const vectorB = [1, 2, 3];
      
      const similarity = similarityService.calculateCosineSimilarity(vectorA, vectorB);
      expect(similarity).toBe(0);
    });

    it('should throw error for different length vectors', () => {
      const vectorA = [1, 2];
      const vectorB = [1, 2, 3];
      
      expect(() => {
        similarityService.calculateCosineSimilarity(vectorA, vectorB);
      }).toThrow('Vectors must have the same length');
    });
  });

  describe('getCollectionStats', () => {
    it('should return collection statistics', async () => {
      await similarityService.initializeCollection();
      
      const stats = await similarityService.getCollectionStats();
      
      expect(stats).toEqual({
        totalMessages: 100,
        collectionName: 'conversation_embeddings',
        similarityThreshold: 0.7,
        maxResults: 3
      });
      expect(mockCollection.count).toHaveBeenCalled();
    });
  });
});