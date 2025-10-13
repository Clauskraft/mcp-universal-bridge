/**
 * MCP Universal AI Bridge - TypeScript Client Example
 *
 * This example demonstrates how to use the MCP Bridge API
 * to connect devices and chat with AI providers.
 *
 * Usage: npm run example
 */

interface Device {
  id: string;
  name: string;
  type: string;
}

interface Session {
  id: string;
  deviceId: string;
  provider: string;
  model: string;
}

interface ChatResponse {
  response: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost?: number;
  };
  latency: number;
}

interface StreamChunk {
  delta: string;
  done: boolean;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export class BridgeClient {
  constructor(private baseUrl: string = 'http://localhost:3000') {}

  /**
   * Register a device
   */
  async registerDevice(
    name: string,
    type: 'web' | 'mobile' | 'desktop' | 'server'
  ): Promise<Device> {
    const response = await fetch(`${this.baseUrl}/devices/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type }),
    });

    if (!response.ok) {
      throw new Error(`Failed to register device: ${await response.text()}`);
    }

    const data = await response.json();
    return data.device;
  }

  /**
   * Create a chat session
   */
  async createSession(
    deviceId: string,
    config: {
      provider: 'claude' | 'gemini' | 'chatgpt';
      model: string;
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    }
  ): Promise<Session> {
    const response = await fetch(`${this.baseUrl}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, config }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: ${await response.text()}`);
    }

    const data = await response.json();
    return data.session;
  }

  /**
   * Send a message and get complete response
   */
  async sendMessage(sessionId: string, message: string): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message, streaming: false }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${await response.text()}`);
    }

    return response.json();
  }

  /**
   * Stream a message response
   */
  async *streamMessage(sessionId: string, message: string): AsyncGenerator<StreamChunk> {
    const response = await fetch(`${this.baseUrl}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message, streaming: true }),
    });

    if (!response.ok) {
      throw new Error(`Failed to stream message: ${await response.text()}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          yield data;
          if (data.done) return;
        }
      }
    }
  }

  /**
   * Get available providers
   */
  async getProviders(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/providers`);
    if (!response.ok) {
      throw new Error(`Failed to get providers: ${await response.text()}`);
    }
    return response.json();
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/stats`);
    if (!response.ok) {
      throw new Error(`Failed to get stats: ${await response.text()}`);
    }
    return response.json();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${await response.text()}`);
    }
    return response.json();
  }
}

// ==================== Example Usage ====================

async function main() {
  console.log('🌉 MCP Universal AI Bridge - Client Example\n');

  const client = new BridgeClient('http://localhost:3000');

  try {
    // 1. Health check
    console.log('1️⃣  Checking server health...');
    const health = await client.healthCheck();
    console.log('✅ Server is healthy');
    console.log(`   Available providers: ${Object.keys(health.providers).join(', ')}\n`);

    // 2. Register device
    console.log('2️⃣  Registering device...');
    const device = await client.registerDevice('Example Client', 'server');
    console.log(`✅ Device registered: ${device.id}\n`);

    // 3. Create session with Claude
    console.log('3️⃣  Creating Claude session...');
    const session = await client.createSession(device.id, {
      provider: 'claude',
      model: 'claude-sonnet-4-5-20250929',
      temperature: 0.7,
      systemPrompt: 'You are a helpful AI assistant.',
    });
    console.log(`✅ Session created: ${session.id}\n`);

    // 4. Send a regular message
    console.log('4️⃣  Sending message (non-streaming)...');
    const response = await client.sendMessage(
      session.id,
      'Write a haiku about coding'
    );
    console.log(`📝 Response:\n${response.response}`);
    console.log(`💰 Cost: $${response.usage.cost?.toFixed(6)}`);
    console.log(`⚡ Latency: ${response.latency}ms\n`);

    // 5. Stream a message
    console.log('5️⃣  Sending message (streaming)...');
    process.stdout.write('📝 Response: ');

    let totalTokens = 0;
    for await (const chunk of client.streamMessage(
      session.id,
      'Tell me a very short joke'
    )) {
      if (!chunk.done) {
        process.stdout.write(chunk.delta);
      } else if (chunk.usage) {
        totalTokens = chunk.usage.inputTokens + chunk.usage.outputTokens;
      }
    }

    console.log(`\n📊 Tokens used: ${totalTokens}\n`);

    // 6. Get statistics
    console.log('6️⃣  Getting statistics...');
    const stats = await client.getStats();
    console.log(`📈 Total messages: ${stats.messagesSent}`);
    console.log(`🔢 Total tokens: ${stats.tokensUsed}`);
    console.log(`⏱️  Uptime: ${Math.floor(stats.uptime / 1000)}s\n`);

    console.log('✅ All examples completed successfully!');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
