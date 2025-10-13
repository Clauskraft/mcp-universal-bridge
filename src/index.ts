#!/usr/bin/env node

import { serve } from '@hono/node-server';
import app from './server.js';

const port = parseInt(process.env.PORT || '3000');

console.log(`🌉 MCP Universal AI Bridge Server`);
console.log(`📍 Starting server on http://localhost:${port}`);
console.log(`\nAvailable providers:`);

const providers = [];
if (process.env.ANTHROPIC_API_KEY) providers.push('✅ Claude/Anthropic');
if (process.env.GOOGLE_API_KEY) providers.push('✅ Google Gemini');
if (process.env.OPENAI_API_KEY) providers.push('✅ OpenAI ChatGPT');

if (providers.length === 0) {
  console.log('⚠️  No providers configured! Add API keys to environment variables.');
  console.log('\nSet at least one:');
  console.log('  - ANTHROPIC_API_KEY');
  console.log('  - GOOGLE_API_KEY');
  console.log('  - OPENAI_API_KEY');
} else {
  providers.forEach((p) => console.log(`  ${p}`));
}

console.log(`\n🚀 Server ready at http://localhost:${port}\n`);

serve({
  fetch: app.fetch,
  port,
});
