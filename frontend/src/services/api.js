/**
 * API Client Service for WhatsApp Reply Assistant
 * 
 * Handles all communication with the backend WebSocket server and n8n workflows
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class ApiClient {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('❌ API Response Error:', error.response?.status, error.response?.data || error.message);
        
        // Handle common errors
        if (error.response?.status === 404) {
          throw new Error('API endpoint not found');
        } else if (error.response?.status >= 500) {
          throw new Error('Server error - please try again later');
        } else if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout - check your connection');
        }
        
        throw error;
      }
    );
  }

  /**
   * Health Check - Test backend connectivity
   */
  async checkHealth() {
    try {
      const response = await this.client.get('/api/health');
      return response.data;
    } catch (error) {
      throw new Error(`Backend health check failed: ${error.message}`);
    }
  }

  /**
   * System Status - Get detailed system information
   */
  async getSystemStatus() {
    try {
      const response = await this.client.get('/api/status');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get system status: ${error.message}`);
    }
  }

  /**
   * WebSocket Connections - Get active connection info
   */
  async getConnections() {
    try {
      const response = await this.client.get('/api/connections');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get connection info: ${error.message}`);
    }
  }

  /**
   * Manual Broadcast - Test WebSocket broadcasting
   */
  async testBroadcast(data) {
    try {
      const response = await this.client.post('/api/broadcast', {
        type: 'test',
        data: data || { message: 'Test broadcast from frontend' }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Broadcast test failed: ${error.message}`);
    }
  }

  /**
   * Trigger n8n workflow - For testing purposes
   */
  async triggerWorkflow(workflowType, payload) {
    try {
      // This would typically call n8n webhook directly
      // For now, we'll use our backend as a proxy
      const response = await this.client.post(`/api/webhooks/${workflowType}`, payload);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to trigger ${workflowType} workflow: ${error.message}`);
    }
  }

  /**
   * Simulated endpoints for future implementation
   * These will be replaced with actual n8n workflow calls
   */

  async getMessageSuggestions(messageContent, chatName) {
    // This will eventually be handled by n8n workflow
    // For now, return mock data for UI development
    return {
      suggestions: [
        "Thank you for contacting us! How can I help you today?",
        "I'll look into this right away and get back to you shortly.",
        "Could you provide more details about your inquiry?"
      ],
      similarity_scores: [0.85, 0.78, 0.72],
      processing_time: "1.2s"
    };
  }

  async getSimilarConversations(messageContent) {
    // This will eventually query ChromaDB through n8n
    return {
      similar_conversations: [
        {
          chat_name: "Customer Support",
          messages: [
            { sender: "customer", content: "I have a question about my order", timestamp: "2024-01-15T10:30:00Z" },
            { sender: "business", content: "I'd be happy to help with your order. Could you provide your order number?", timestamp: "2024-01-15T10:31:00Z" }
          ],
          similarity_score: 0.89
        }
      ]
    };
  }
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient;