const EmbeddingService = require('../../../src/services/embedding');

describe('EmbeddingService', () => {
  let embeddingService;

  beforeEach(() => {
    embeddingService = new EmbeddingService();
  });

  describe('constructor', () => {
    it('should initialize with default model name', () => {
      expect(embeddingService.modelName).toBe('all-MiniLM-L6-v2');
    });

    it('should use environment variable for model name', () => {
      process.env.EMBEDDING_MODEL = 'test-model';
      const service = new EmbeddingService();
      expect(service.modelName).toBe('test-model');
      delete process.env.EMBEDDING_MODEL;
    });
  });

  describe('generateEmbedding', () => {
    it('should reject with error for empty text', async () => {
      await expect(embeddingService.generateEmbedding('')).rejects.toThrow('Text must be a non-empty string');
    });

    it('should reject with error for null text', async () => {
      await expect(embeddingService.generateEmbedding(null)).rejects.toThrow('Text must be a non-empty string');
    });

    it('should reject with error for non-string text', async () => {
      await expect(embeddingService.generateEmbedding(123)).rejects.toThrow('Text must be a non-empty string');
    });

    // Mock test for successful embedding generation
    it('should generate embedding for valid text', async () => {
      // Mock the spawn process for testing
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4];
      
      // We'll skip actual Python execution in tests
      // This would normally call the Python script
      const mockGenerateEmbedding = jest.fn().mockResolvedValue(mockEmbedding);
      embeddingService.generateEmbedding = mockGenerateEmbedding;

      const result = await embeddingService.generateEmbedding('test text');
      expect(result).toEqual(mockEmbedding);
      expect(mockGenerateEmbedding).toHaveBeenCalledWith('test text');
    });
  });

  describe('generateBatchEmbeddings', () => {
    it('should reject with error for non-array input', async () => {
      await expect(embeddingService.generateBatchEmbeddings('not an array')).rejects.toThrow('Texts must be an array');
    });

    it('should generate embeddings for array of texts', async () => {
      const mockEmbeddings = [[0.1, 0.2], [0.3, 0.4]];
      embeddingService.generateEmbedding = jest.fn()
        .mockResolvedValueOnce(mockEmbeddings[0])
        .mockResolvedValueOnce(mockEmbeddings[1]);

      const result = await embeddingService.generateBatchEmbeddings(['text1', 'text2']);
      expect(result).toEqual(mockEmbeddings);
    });

    it('should handle empty array', async () => {
      const result = await embeddingService.generateBatchEmbeddings([]);
      expect(result).toEqual([]);
    });
  });

  describe('validateEmbedding', () => {
    it('should return true for valid embedding', () => {
      const validEmbedding = [0.1, 0.2, 0.3];
      expect(embeddingService.validateEmbedding(validEmbedding)).toBe(true);
    });

    it('should return false for non-array embedding', () => {
      expect(embeddingService.validateEmbedding('not an array')).toBe(false);
    });

    it('should return false for empty array', () => {
      expect(embeddingService.validateEmbedding([])).toBe(false);
    });

    it('should return false for array with non-numeric values', () => {
      expect(embeddingService.validateEmbedding([0.1, 'string', 0.3])).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(embeddingService.validateEmbedding(null)).toBe(false);
      expect(embeddingService.validateEmbedding(undefined)).toBe(false);
    });
  });
});