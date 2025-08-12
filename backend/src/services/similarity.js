class SimilarityService {
  constructor(chromaClient) {
    this.chromaClient = chromaClient;
    this.collectionName = 'conversation_embeddings';
    this.similarityThreshold = parseFloat(process.env.SIMILARITY_THRESHOLD || '0.7');
    this.maxResults = parseInt(process.env.MAX_RESULTS || '3');
  }

  async initializeCollection() {
    try {
      this.collection = await this.chromaClient.getCollection({
        name: this.collectionName
      });
    } catch (error) {
      // Collection doesn't exist, create it
      this.collection = await this.chromaClient.createCollection({
        name: this.collectionName,
        metadata: { description: 'WhatsApp conversation embeddings' }
      });
    }
    return this.collection;
  }

  async addMessage(messageId, text, embedding, metadata = {}) {
    if (!this.collection) {
      await this.initializeCollection();
    }

    await this.collection.add({
      ids: [messageId],
      embeddings: [embedding],
      documents: [text],
      metadatas: [{
        ...metadata,
        timestamp: new Date().toISOString()
      }]
    });

    return messageId;
  }

  async findSimilar(queryEmbedding, options = {}) {
    if (!this.collection) {
      await this.initializeCollection();
    }

    const {
      nResults = this.maxResults,
      whereClause = {},
      includeDistances = true
    } = options;

    const results = await this.collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults,
      where: whereClause,
      include: ['documents', 'metadatas', 'distances']
    });

    return this.formatSimilarityResults(results, includeDistances);
  }

  async findSimilarBusinessResponses(queryEmbedding, options = {}) {
    const whereClause = {
      is_business_response: { $eq: true }
    };

    return this.findSimilar(queryEmbedding, {
      ...options,
      whereClause
    });
  }

  formatSimilarityResults(results, includeDistances = true) {
    if (!results.documents || !results.documents[0]) {
      return [];
    }

    const documents = results.documents[0];
    const metadatas = results.metadatas[0];
    const distances = results.distances ? results.distances[0] : [];

    return documents.map((doc, index) => {
      const result = {
        document: doc,
        metadata: metadatas[index] || {},
        similarity: includeDistances && distances[index] 
          ? 1 - distances[index] // Convert distance to similarity
          : null
      };

      // Filter by similarity threshold
      if (includeDistances && result.similarity < this.similarityThreshold) {
        return null;
      }

      return result;
    }).filter(Boolean);
  }

  calculateCosineSimilarity(vectorA, vectorB) {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      magnitudeA += vectorA[i] * vectorA[i];
      magnitudeB += vectorB[i] * vectorB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  async getCollectionStats() {
    if (!this.collection) {
      await this.initializeCollection();
    }

    const count = await this.collection.count();
    return {
      totalMessages: count,
      collectionName: this.collectionName,
      similarityThreshold: this.similarityThreshold,
      maxResults: this.maxResults
    };
  }
}

module.exports = SimilarityService;