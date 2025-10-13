# 🌉 MCP Universal AI Bridge

Universal MCP (Model Context Protocol) Bridge Server connecting devices to multiple AI providers: **Claude**, **Gemini**, **ChatGPT** and more.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

## ✨ Features

- 🤖 **Multi-Provider Support**: Claude (Opus/Sonnet/Haiku), Gemini (2.0/1.5), ChatGPT (GPT-4o/o1)
- 💬 **Session Management**: Persistent conversations with history
- 📱 **Device Tracking**: Web, mobile, desktop, server devices
- 🌊 **Streaming Responses**: Real-time SSE streaming
- 🔧 **Tool Calling**: Function execution across all providers
- 📊 **Usage Tracking**: Token counting and cost calculation
- 🏥 **Health Monitoring**: Automatic provider health checks
- 🧹 **Auto-Cleanup**: Background job for inactive sessions
- 🚀 **Multiple Deployment Options**: Cloudflare Workers, Vercel, Docker, Node.js

## 📦 Quick Start

### 1. Installation

```bash
# Clone repository
git clone https://github.com/yourusername/mcp-universal-bridge.git
cd mcp-universal-bridge

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys
```

### 2. Configuration

Add at least one API key to `.env`:

```env
# Required: Add at least one
ANTHROPIC_API_KEY=sk-ant-xxx
GOOGLE_API_KEY=AIzaSyxxx
OPENAI_API_KEY=sk-xxx

# Optional: Customize models
CLAUDE_MODEL=claude-sonnet-4-5-20250929
GEMINI_MODEL=gemini-2.0-flash-exp
OPENAI_MODEL=gpt-4o
```

### 3. Run

```bash
# Development
npm run dev

# Production
npm run build
npm start

# Server runs on http://localhost:3000
```

## 🔌 API Endpoints

### Health & Info

```bash
# Welcome
GET /

# Health check
GET /health

# Statistics
GET /stats
```

### Device Management

```bash
# Register device
POST /devices/register
{
  "name": "My Device",
  "type": "web",
  "capabilities": {
    "streaming": true,
    "tools": true,
    "vision": false
  }
}

# List devices
GET /devices

# Get device
GET /devices/:id

# Disconnect device
DELETE /devices/:id
```

### Session Management

```bash
# Create session
POST /sessions
{
  "deviceId": "dev_xxx",
  "config": {
    "provider": "claude",
    "model": "claude-sonnet-4-5-20250929",
    "temperature": 0.7,
    "systemPrompt": "You are a helpful assistant"
  }
}

# Get session
GET /sessions/:id

# Delete session
DELETE /sessions/:id
```

### Chat

```bash
# Send message
POST /chat
{
  "sessionId": "ses_xxx",
  "message": "Hello, how are you?",
  "streaming": false
}

# Stream response
POST /chat/stream
{
  "sessionId": "ses_xxx",
  "message": "Tell me a story",
  "streaming": true
}
```

### Tool Execution

```bash
# Execute tools
POST /tools
{
  "sessionId": "ses_xxx",
  "toolResults": [
    {
      "id": "tool_xxx",
      "result": { "data": "..." },
      "error": null
    }
  ]
}
```

### Provider Info

```bash
# List providers
GET /providers

# Get models
GET /providers/claude/models
GET /providers/gemini/models
GET /providers/chatgpt/models
```

### Admin

```bash
# Manual cleanup
POST /admin/cleanup

# Reset statistics
POST /admin/stats/reset
```

## 💻 Client SDK

### TypeScript/JavaScript Example

```typescript
import { BridgeClient } from './examples/client';

const client = new BridgeClient('http://localhost:3000');

// Register device
const device = await client.registerDevice('My App', 'web');

// Create session
const session = await client.createSession(device.id, {
  provider: 'claude',
  model: 'claude-sonnet-4-5-20250929',
  temperature: 0.7,
});

// Send message
const response = await client.sendMessage(session.id, 'Hello!');
console.log(response.response);

// Stream response
for await (const chunk of client.streamMessage(session.id, 'Tell me a story')) {
  process.stdout.write(chunk.delta);
}
```

### Python Example

```python
import requests

BASE_URL = "http://localhost:3000"

# Register device
device = requests.post(f"{BASE_URL}/devices/register", json={
    "name": "Python Client",
    "type": "server"
}).json()

# Create session
session = requests.post(f"{BASE_URL}/sessions", json={
    "deviceId": device["device"]["id"],
    "config": {
        "provider": "gemini",
        "model": "gemini-2.0-flash-exp",
        "temperature": 0.7
    }
}).json()

# Send message
response = requests.post(f"{BASE_URL}/chat", json={
    "sessionId": session["session"]["id"],
    "message": "Hello from Python!"
}).json()

print(response["response"])
```

### cURL Example

```bash
# Register device
DEVICE=$(curl -X POST http://localhost:3000/devices/register \
  -H "Content-Type: application/json" \
  -d '{"name":"cURL Client","type":"server"}' | jq -r '.device.id')

# Create session
SESSION=$(curl -X POST http://localhost:3000/sessions \
  -H "Content-Type: application/json" \
  -d "{\"deviceId\":\"$DEVICE\",\"config\":{\"provider\":\"chatgpt\",\"model\":\"gpt-4o\"}}" | jq -r '.session.id')

# Send message
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION\",\"message\":\"Hello!\"}" | jq '.response'
```

## ☁️ Deployment

### Cloudflare Workers

```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Set secrets
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put GOOGLE_API_KEY
wrangler secret put OPENAI_API_KEY

# Deploy
npm run deploy:cloudflare
```

### Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
npm run deploy:vercel

# Add environment variables in Vercel dashboard
```

### Docker

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t mcp-bridge .
docker run -p 3000:3000 \
  -e ANTHROPIC_API_KEY=xxx \
  -e GOOGLE_API_KEY=xxx \
  -e OPENAI_API_KEY=xxx \
  mcp-bridge
```

### Traditional Server

```bash
# Build
npm run build

# Run on port 3000
PORT=3000 npm start

# Or use PM2
pm2 start dist/index.js --name mcp-bridge
```

## 🤖 Supported Providers & Models

### Claude / Anthropic

| Model | Context | Best For |
|-------|---------|----------|
| `claude-opus-4-5-20250514` | 200K | Complex reasoning, analysis |
| `claude-sonnet-4-5-20250929` | 200K | Balanced performance |
| `claude-3-5-sonnet-20241022` | 200K | Fast, capable |
| `claude-3-5-haiku-20241022` | 200K | Speed, cost-effective |

**Pricing**: $1-15 per million input tokens

### Google Gemini

| Model | Context | Best For |
|-------|---------|----------|
| `gemini-2.0-flash-exp` | 1M | Latest experimental |
| `gemini-2.0-flash-thinking-exp-01-21` | 32K | Reasoning tasks |
| `gemini-1.5-pro` | 2M | Large context |
| `gemini-1.5-flash` | 1M | Fast responses |

**Pricing**: Free (experimental) or $0.075-1.25 per million tokens

### OpenAI ChatGPT

| Model | Context | Best For |
|-------|---------|----------|
| `gpt-4o` | 128K | Multimodal tasks |
| `gpt-4o-mini` | 128K | Cost-effective |
| `o1` | 200K | Complex reasoning |
| `gpt-3.5-turbo` | 16K | Simple tasks |

**Pricing**: $0.15-30 per million input tokens

## 📊 Features Comparison

| Feature | Claude | Gemini | ChatGPT |
|---------|--------|--------|---------|
| Chat Completions | ✅ | ✅ | ✅ |
| Streaming | ✅ | ✅ | ✅ |
| Tool Calling | ✅ | ✅ | ✅ |
| Usage Tracking | ✅ | ✅ | ✅ |
| Cost Calculation | ✅ | ✅ | ✅ |
| System Prompts | ✅ | ✅ | ✅ |
| Context Window | 200K | 1-2M | 128K |

## 🔧 Configuration

### Environment Variables

```env
# Server
PORT=3000
NODE_ENV=production

# API Keys
ANTHROPIC_API_KEY=sk-ant-xxx
GOOGLE_API_KEY=AIzaSyxxx
OPENAI_API_KEY=sk-xxx

# Model Defaults
CLAUDE_MODEL=claude-sonnet-4-5-20250929
GEMINI_MODEL=gemini-2.0-flash-exp
OPENAI_MODEL=gpt-4o

# Timeouts
API_TIMEOUT=60000

# Custom Base URLs (optional)
ANTHROPIC_BASE_URL=
OPENAI_BASE_URL=
```

## 📈 Monitoring

### Health Check

```bash
curl http://localhost:3000/health
```

```json
{
  "status": "healthy",
  "timestamp": "2025-01-13T10:00:00.000Z",
  "providers": {
    "claude": { "healthy": true, "latency": 120 },
    "gemini": { "healthy": true, "latency": 95 },
    "chatgpt": { "healthy": true, "latency": 110 }
  }
}
```

### Statistics

```bash
curl http://localhost:3000/stats
```

```json
{
  "totalDevices": 42,
  "activeDevices": 15,
  "totalSessions": 128,
  "activeSessions": 8,
  "messagesSent": 5432,
  "tokensUsed": 1234567,
  "providers": {
    "claude": {
      "requests": 234,
      "tokens": 567890,
      "errors": 2,
      "avgLatency": 125
    }
  },
  "uptime": 86400000,
  "startedAt": "2025-01-12T10:00:00.000Z"
}
```

## 🛡️ Security

- **API Keys**: Never commit API keys to version control
- **Environment Variables**: Use `.env` files locally, secrets management in production
- **CORS**: Configure CORS policy for your domain
- **Rate Limiting**: Implement rate limiting for production use
- **Timeouts**: Configure appropriate timeouts to prevent hanging requests

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Anthropic](https://www.anthropic.com/) for Claude API
- [Google](https://ai.google.dev/) for Gemini API
- [OpenAI](https://openai.com/) for ChatGPT API
- [Hono](https://hono.dev/) for the amazing web framework

## 📧 Support

- 📖 [Documentation](https://github.com/yourusername/mcp-universal-bridge/wiki)
- 🐛 [Report Issues](https://github.com/yourusername/mcp-universal-bridge/issues)
- 💬 [Discussions](https://github.com/yourusername/mcp-universal-bridge/discussions)

---

Made with ❤️ by the MCP Community
