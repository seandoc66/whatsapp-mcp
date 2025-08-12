const { spawn } = require('child_process');
const path = require('path');

class EmbeddingService {
  constructor() {
    this.modelName = process.env.EMBEDDING_MODEL || 'all-MiniLM-L6-v2';
  }

  async generateEmbedding(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('Text must be a non-empty string');
    }

    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, '../../scripts/generate_embedding.py');
      const process = spawn('python3', [pythonScript, this.modelName, text]);
      
      let output = '';
      let error = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const embedding = JSON.parse(output.trim());
            resolve(embedding);
          } catch (parseError) {
            reject(new Error(`Failed to parse embedding output: ${parseError.message}`));
          }
        } else {
          reject(new Error(`Embedding generation failed: ${error}`));
        }
      });
    });
  }

  async generateBatchEmbeddings(texts) {
    if (!Array.isArray(texts)) {
      throw new Error('Texts must be an array');
    }

    const embeddings = await Promise.all(
      texts.map(text => this.generateEmbedding(text))
    );

    return embeddings;
  }

  validateEmbedding(embedding) {
    return Array.isArray(embedding) && 
           embedding.length > 0 && 
           embedding.every(val => typeof val === 'number');
  }
}

module.exports = EmbeddingService;