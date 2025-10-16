#!/usr/bin/env node

import { serve } from '@hono/node-server';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import app from './server.js';
import { realtimeCaptureManager } from './utils/realtime-capture.js';
import { teamsTranscriptHandler } from './utils/teams-transcript-handler.js';

const port = parseInt(process.env.PORT || '3000');

console.log(`🌉 MCP Universal AI Bridge Server`);
console.log(`📍 Starting server on http://localhost:${port}`);
console.log(`\nAvailable providers:`);

const providers = [];
if (process.env.ANTHROPIC_API_KEY) providers.push('✅ Claude/Anthropic');
if (process.env.GOOGLE_API_KEY) providers.push('✅ Google Gemini');
if (process.env.OPENAI_API_KEY) providers.push('✅ OpenAI ChatGPT');
if (process.env.XAI_API_KEY) providers.push('✅ Grok (xAI)');

// Ollama is always available (local, no API key required)
providers.push('✅ Ollama (Local AI)');

if (providers.length === 1 && providers[0].includes('Ollama')) {
  console.log('⚠️  Only Ollama configured! Add cloud provider API keys for more options:');
  console.log('  - ANTHROPIC_API_KEY (Claude)');
  console.log('  - GOOGLE_API_KEY (Gemini)');
  console.log('  - OPENAI_API_KEY (ChatGPT)');
  console.log('  - XAI_API_KEY (Grok)');
}

providers.forEach((p) => console.log(`  ${p}`));

console.log(`\n🚀 Server ready at http://localhost:${port}`);

// Create HTTP server with WebSocket support
const server = createServer(async (req, res) => {
  // Handle WebSocket upgrade requests
  if (req.url === '/realtime-capture' && req.headers.upgrade?.toLowerCase() === 'websocket') {
    // Let WebSocket server handle this
    return;
  }

  // Handle regular HTTP requests with Hono
  const response = await app.fetch(
    new Request(`http://localhost:${port}${req.url}`, {
      method: req.method || 'GET',
      headers: req.headers as any,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req : undefined,
    })
  );

  // Send response
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  if (response.body) {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  }

  res.end();
});

// Create WebSocket server
const wss = new WebSocketServer({
  server,
  path: '/realtime-capture'
});

// Initialize real-time capture system
realtimeCaptureManager.initializeWebSocketServer(wss);
realtimeCaptureManager.startPeriodicFlush(10000); // Flush every 10 seconds

console.log(`📡 WebSocket server ready at ws://localhost:${port}/realtime-capture`);
console.log(`🎤 Real-time caption capture enabled\n`);

// Start server
server.listen(port, () => {
  console.log(`✨ All systems operational!\n`);
});
