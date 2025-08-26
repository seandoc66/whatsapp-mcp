#!/usr/bin/env node

/**
 * Test Script for Data Migration API Endpoints
 * 
 * This script validates that the backend API endpoints work correctly
 * before running the n8n workflow.
 * 
 * Usage: node test-api-endpoints.js
 */

const http = require('http');

// Configuration
const BACKEND_HOST = process.env.BACKEND_HOST || 'localhost';
const BACKEND_PORT = process.env.BACKEND_PORT || 3004;

/**
 * Make HTTP request
 */
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedBody = JSON.parse(body);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsedBody
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Test health endpoint
 */
async function testHealth() {
  console.log('\n🔍 Testing health endpoint...');
  try {
    const response = await makeRequest('GET', '/api/health');
    
    if (response.statusCode === 200) {
      console.log('✅ Health endpoint working');
      console.log(`   Status: ${response.body.status}`);
      console.log(`   Service: ${response.body.service}`);
      console.log(`   Connections: ${response.body.connections}`);
    } else {
      console.log(`❌ Health endpoint failed: ${response.statusCode}`);
      console.log('   Response:', response.body);
    }
    
    return response.statusCode === 200;
  } catch (error) {
    console.log(`❌ Health endpoint error: ${error.message}`);
    return false;
  }
}

/**
 * Test pending messages endpoint
 */
async function testPendingMessages() {
  console.log('\n🔍 Testing pending messages endpoint...');
  try {
    const response = await makeRequest('GET', '/api/messages/pending?limit=5');
    
    if (response.statusCode === 200) {
      console.log('✅ Pending messages endpoint working');
      console.log(`   Found: ${response.body.count} messages`);
      
      if (response.body.messages && response.body.messages.length > 0) {
        const firstMessage = response.body.messages[0];
        console.log(`   Sample message ID: ${firstMessage.message_id}`);
        console.log(`   Chat: ${firstMessage.chat_name}`);
        console.log(`   Content length: ${firstMessage.content_length}`);
        console.log(`   Is business chat: ${firstMessage.is_business_chat}`);
      } else {
        console.log('   No pending messages found (this is expected if all are processed)');
      }
    } else {
      console.log(`❌ Pending messages endpoint failed: ${response.statusCode}`);
      console.log('   Response:', response.body);
    }
    
    return response.statusCode === 200;
  } catch (error) {
    console.log(`❌ Pending messages endpoint error: ${error.message}`);
    return false;
  }
}

/**
 * Test embedding storage endpoint (with mock data)
 */
async function testEmbeddingStorage() {
  console.log('\n🔍 Testing embedding storage endpoint...');
  
  // Mock embedding data (768 dimensions for all-mpnet-base-v2)
  const mockEmbedding = new Array(768).fill(0).map(() => Math.random() * 2 - 1);
  
  const mockData = {
    message_id: 'test_message_' + Date.now(),
    chat_jid: 'test@chat.whatsapp.net',
    chat_name: 'Test Business Chat',
    sender: '[USER]',
    content: 'This is a test message for embedding storage validation.',
    timestamp: new Date().toISOString(),
    is_business_response: false,
    is_business_chat: true,
    conversation_context: 'Test Business Chat - Customer - 2024-01-01T12:00:00Z',
    content_length: 56,
    embedding: mockEmbedding
  };
  
  try {
    const response = await makeRequest('POST', '/api/embeddings/store', mockData);
    
    if (response.statusCode === 200) {
      console.log('✅ Embedding storage endpoint working');
      console.log(`   Stored message ID: ${response.body.message_id}`);
      console.log(`   Embedding dimensions: ${response.body.embedding_dimensions}`);
    } else {
      console.log(`❌ Embedding storage endpoint failed: ${response.statusCode}`);
      console.log('   Response:', response.body);
    }
    
    return response.statusCode === 200;
  } catch (error) {
    console.log(`❌ Embedding storage endpoint error: ${error.message}`);
    return false;
  }
}

/**
 * Test statistics endpoint
 */
async function testStatistics() {
  console.log('\n🔍 Testing statistics endpoint...');
  try {
    const response = await makeRequest('GET', '/api/embeddings/stats');
    
    if (response.statusCode === 200) {
      console.log('✅ Statistics endpoint working');
      console.log(`   Total messages: ${response.body.total_messages}`);
      console.log(`   Eligible messages: ${response.body.eligible_messages}`);
      console.log(`   Processed: ${response.body.processed_count}`);
      console.log(`   Failed: ${response.body.failed_count}`);
      console.log(`   Pending: ${response.body.pending_count}`);
      console.log(`   Progress: ${response.body.progress_percentage}%`);
    } else {
      console.log(`❌ Statistics endpoint failed: ${response.statusCode}`);
      console.log('   Response:', response.body);
    }
    
    return response.statusCode === 200;
  } catch (error) {
    console.log(`❌ Statistics endpoint error: ${error.message}`);
    return false;
  }
}

/**
 * Test migration webhook endpoint
 */
async function testMigrationWebhook() {
  console.log('\n🔍 Testing migration webhook endpoint...');
  
  const mockWebhookData = {
    migration_completed: true,
    processed_count: 1,
    failed_count: 0,
    timestamp: new Date().toISOString(),
    message_id: 'test_webhook_message',
    status: 'success'
  };
  
  try {
    const response = await makeRequest('POST', '/api/webhooks/migration-status', mockWebhookData);
    
    if (response.statusCode === 200) {
      console.log('✅ Migration webhook endpoint working');
      console.log(`   Status: ${response.body.status}`);
    } else {
      console.log(`❌ Migration webhook endpoint failed: ${response.statusCode}`);
      console.log('   Response:', response.body);
    }
    
    return response.statusCode === 200;
  } catch (error) {
    console.log(`❌ Migration webhook endpoint error: ${error.message}`);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🧪 Starting API Endpoint Tests for Data Migration Workflow');
  console.log(`🔗 Testing backend at: ${BACKEND_HOST}:${BACKEND_PORT}`);
  
  const tests = [
    { name: 'Health Check', fn: testHealth },
    { name: 'Pending Messages', fn: testPendingMessages },
    { name: 'Embedding Storage', fn: testEmbeddingStorage },
    { name: 'Statistics', fn: testStatistics },
    { name: 'Migration Webhook', fn: testMigrationWebhook }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ Test "${test.name}" crashed: ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! The n8n workflow should work correctly.');
    console.log('💡 Next steps:');
    console.log('   1. Start the backend server: cd backend && npm run dev');
    console.log('   2. Import data-migration-simple.json into n8n');
    console.log('   3. Activate the workflow and test it manually');
  } else {
    console.log('\n⚠️  Some tests failed. Please fix the issues before running the n8n workflow.');
    console.log('💡 Common issues:');
    console.log('   - Backend server not running');
    console.log('   - Database file not accessible');
    console.log('   - ChromaDB not properly configured');
    console.log('   - Missing dependencies (sqlite3, chromadb)');
  }
  
  process.exit(failed === 0 ? 0 : 1);
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('💥 Test runner crashed:', error);
    process.exit(1);
  });
}

module.exports = { runTests, makeRequest };