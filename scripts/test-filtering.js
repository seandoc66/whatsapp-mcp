#!/usr/bin/env node

/**
 * Test script for MCP-safe data filtering strategy
 * This tests our smart filtering approach before deploying in n8n
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path (same as used by MCP server)
const dbPath = path.join(__dirname, '..', 'database', 'store', 'messages.db');

console.log('🔍 Testing MCP-Safe Data Filtering Strategy');
console.log('Database path:', dbPath);

// Create database connection
const db = new sqlite3.Database(dbPath);

// Test our filtering strategy
async function testFiltering() {
  try {
    // 1. Count total messages
    const totalCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM messages', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    // 2. Count business messages
    const businessCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM messages WHERE is_from_me = 1', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    // 3. Count standardized auto-responses
    const autoResponseCount = await new Promise((resolve, reject) => {
      db.get(`
        SELECT COUNT(*) as count FROM messages 
        WHERE content LIKE '%Welcome English School%'
      `, (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    // 4. Test our smart filtering query
    const filteredQuery = `
      SELECT m.*, c.name as chat_name,
             CASE WHEN c.name IN (
               SELECT DISTINCT c2.name FROM chats c2 
               JOIN messages m2 ON c2.jid = m2.chat_jid 
               WHERE m2.is_from_me = 1 
               AND LENGTH(m2.content) > 50
               GROUP BY c2.name 
               HAVING COUNT(*) >= 3
             ) THEN 1 ELSE 0 END as is_business_chat
      FROM messages m
      LEFT JOIN chats c ON m.chat_jid = c.jid
      WHERE m.content IS NOT NULL 
        AND m.content != ''
        AND LENGTH(m.content) > 5
        -- Exclude standardized auto-responses
        AND m.content NOT LIKE '%Welcome English School%'
        AND m.content NOT LIKE '%horario de atención%'
        AND m.content NOT LIKE '%no podemos atenderte%'
        AND m.content NOT LIKE '%Ahora no podemos atenderte%'
        -- Exclude obvious personal chats
        AND c.name NOT LIKE 'Familia%'
        AND c.name NOT LIKE 'Family%'
        AND c.name NOT LIKE 'familia%'
        AND c.name NOT LIKE '%Mamis%'
        AND c.name NOT LIKE '%mamis%'
        AND c.name NOT LIKE 'Welcome 2024-2025'
        AND c.name NOT LIKE 'Gins Mamis'
        -- Focus on business conversations
        AND c.name IN (
          SELECT DISTINCT c3.name FROM chats c3 
          JOIN messages m3 ON c3.jid = m3.chat_jid 
          WHERE m3.is_from_me = 1 
          AND LENGTH(m3.content) > 50
          AND m3.content NOT LIKE '%Welcome English School%'
          GROUP BY c3.name 
          HAVING COUNT(*) >= 3
        )
      ORDER BY c.name, m.timestamp ASC
      LIMIT 1000
    `;

    const filteredResults = await new Promise((resolve, reject) => {
      db.all(filteredQuery, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // 5. Analyze results
    const businessChats = new Set();
    const contentLengths = [];
    let businessResponses = 0;
    let customerMessages = 0;

    filteredResults.forEach(row => {
      businessChats.add(row.chat_name);
      contentLengths.push(row.content.length);
      if (row.is_from_me) businessResponses++;
      else customerMessages++;
    });

    const avgContentLength = contentLengths.reduce((a, b) => a + b, 0) / contentLengths.length;

    // 6. Display results
    console.log('\n📊 Filtering Results:');
    console.log('='.repeat(50));
    console.log(`📨 Total Messages: ${totalCount.toLocaleString()}`);
    console.log(`💼 Business Messages (is_from_me=1): ${businessCount.toLocaleString()}`);
    console.log(`🤖 Auto-responses (Welcome English School): ${autoResponseCount.toLocaleString()}`);
    console.log(`✅ Quality Messages After Filtering: ${filteredResults.length.toLocaleString()}`);
    console.log(`🗣️ Business Conversations: ${businessChats.size}`);
    console.log(`📤 Business Responses in Sample: ${businessResponses}`);
    console.log(`📥 Customer Messages in Sample: ${customerMessages}`);
    console.log(`📏 Average Content Length: ${Math.round(avgContentLength)} chars`);

    const reductionPercentage = ((totalCount - filteredResults.length) / totalCount * 100).toFixed(1);
    console.log(`🎯 Noise Reduction: ${reductionPercentage}%`);

    // 7. Show sample business chats
    console.log('\n🏢 Sample Business Conversations:');
    console.log('='.repeat(50));
    Array.from(businessChats).slice(0, 10).forEach(chatName => {
      const chatMessages = filteredResults.filter(r => r.chat_name === chatName).length;
      console.log(`• ${chatName}: ${chatMessages} messages`);
    });

    // 8. Test anonymization patterns
    console.log('\n🔒 Testing Anonymization Patterns:');
    console.log('='.repeat(50));
    const testContent = "Contact me at 555-123-4567 or email@example.com, card 1234-5678-9012-3456";
    const anonymized = testContent
      .replace(/\b\d{10,}\b/g, '[PHONE]')
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
      .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]');
    
    console.log(`Original: ${testContent}`);
    console.log(`Anonymized: ${anonymized}`);

    console.log('\n✅ Filtering test completed successfully!');
    console.log('\n🔄 Next step: Deploy this logic in n8n data migration workflow');

  } catch (error) {
    console.error('❌ Error testing filtering:', error);
  } finally {
    db.close();
  }
}

// Run the test
testFiltering();