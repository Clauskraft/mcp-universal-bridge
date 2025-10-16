import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { sessionManager } from './utils/session.js';
import { providerManager } from './providers/manager.js';
import { databaseManager, databaseTools } from './tools/database.js';
import { visualizationManager, visualizationTools } from './tools/visualization.js';
import { aiCollaborationManager, collaborationTools } from './tools/ai-collaboration.js';
import { hybridAgent } from './tools/automation/agent.js';
import { UITarsAutomation } from './tools/automation/uitars.js';
import {
  RegisterDeviceRequestSchema,
  CreateSessionRequestSchema,
  SendMessageRequestSchema,
  ExecuteToolRequestSchema,
  BridgeError,
} from './types/index.js';

const app = new Hono();

// ==================== Middleware ====================

app.use('*', cors());
app.use('*', logger());

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);

  if (err instanceof BridgeError) {
    return c.json(
      {
        error: err.message,
        code: err.code,
        details: err.details,
      },
      err.statusCode as any
    );
  }

  return c.json(
    {
      error: err.message || 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
    500
  );
});

// ==================== Root & Health ====================

app.get('/', (c) => {
  return c.json({
    name: 'MCP Universal AI Bridge',
    version: '1.0.0',
    description: '🌉 Connecting devices to Claude, Gemini, ChatGPT and more',
    providers: providerManager.getAvailableProviders(),
    endpoints: {
      health: 'GET /health',
      stats: 'GET /stats',
      devices: 'POST /devices/register, GET /devices, GET /devices/:id, DELETE /devices/:id',
      sessions: 'POST /sessions, GET /sessions/:id, DELETE /sessions/:id',
      chat: 'POST /chat, POST /chat/stream',
      tools: 'POST /tools',
      providers: 'GET /providers, GET /providers/:id/models',
    },
    documentation: 'https://github.com/yourusername/mcp-universal-bridge',
  });
});

app.get('/health', async (c) => {
  const health = await providerManager.healthCheckAll();
  const healthMap: Record<string, any> = {};

  for (const [provider, status] of health.entries()) {
    healthMap[provider] = {
      healthy: status.healthy,
      latency: status.latency,
      error: status.error,
    };
  }

  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    providers: healthMap,
  });
});

app.get('/stats', (c) => {
  const stats = sessionManager.getStatistics();
  return c.json(stats);
});

// ==================== Device Management ====================

app.post('/devices/register', async (c) => {
  const body = await c.req.json();
  const validated = RegisterDeviceRequestSchema.parse(body);

  const device = sessionManager.registerDevice(
    validated.name,
    validated.type,
    validated.capabilities
  );

  return c.json(
    {
      device,
      message: 'Device registered successfully',
    },
    201
  );
});

app.get('/devices', (c) => {
  const devices = sessionManager.getAllDevices();
  return c.json({ devices });
});

app.get('/devices/:id', (c) => {
  const deviceId = c.req.param('id');
  const device = sessionManager.getDevice(deviceId);
  const sessions = sessionManager.getDeviceSessions(deviceId);

  return c.json({
    device,
    sessions: sessions.map((s) => ({
      id: s.id,
      provider: s.config.provider,
      model: s.config.model,
      active: s.active,
      messageCount: s.messages.length,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })),
  });
});

app.delete('/devices/:id', (c) => {
  const deviceId = c.req.param('id');
  sessionManager.disconnectDevice(deviceId);

  return c.json({
    message: 'Device disconnected successfully',
  });
});

// ==================== Session Management ====================

app.post('/sessions', async (c) => {
  const body = await c.req.json();
  const validated = CreateSessionRequestSchema.parse(body);

  // Verify device exists
  sessionManager.getDevice(validated.deviceId);

  // Verify provider is available
  if (!providerManager.isProviderAvailable(validated.config.provider)) {
    throw new BridgeError(
      `Provider ${validated.config.provider} not available`,
      'PROVIDER_NOT_AVAILABLE',
      400
    );
  }

  const session = sessionManager.createSession(validated.deviceId, validated.config);

  return c.json(
    {
      session: {
        id: session.id,
        deviceId: session.deviceId,
        provider: session.config.provider,
        model: session.config.model,
        createdAt: session.createdAt,
      },
      message: 'Session created successfully',
    },
    201
  );
});

app.get('/sessions/:id', (c) => {
  const sessionId = c.req.param('id');
  const session = sessionManager.getSession(sessionId);

  return c.json({
    session: {
      id: session.id,
      deviceId: session.deviceId,
      config: session.config,
      messageCount: session.messages.length,
      active: session.active,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    },
    messages: session.messages,
  });
});

app.delete('/sessions/:id', (c) => {
  const sessionId = c.req.param('id');
  sessionManager.deleteSession(sessionId);

  return c.json({
    message: 'Session deleted successfully',
  });
});

// ==================== Chat ====================

app.post('/chat', async (c) => {
  const body = await c.req.json();
  const validated = SendMessageRequestSchema.parse(body);

  const session = sessionManager.getSession(validated.sessionId);
  const provider = providerManager.getProvider(session.config.provider);

  // Add user message
  sessionManager.addMessage(validated.sessionId, {
    role: 'user',
    content: validated.message,
    timestamp: new Date(),
  });

  // Get AI response
  const startTime = Date.now();
  try {
    const response = await provider.chat(
      {
        sessionId: validated.sessionId,
        message: validated.message,
        streaming: false,
        tools: validated.tools,
      },
      session
    );

    const latency = Date.now() - startTime;

    // Add assistant message
    sessionManager.addMessage(validated.sessionId, response.message);

    // Update stats
    sessionManager.updateProviderStats(
      session.config.provider,
      response.usage.totalTokens,
      latency
    );

    return c.json({
      response: response.message.content,
      usage: response.usage,
      toolCalls: response.toolCalls,
      finishReason: response.finishReason,
      latency,
    });
  } catch (error: any) {
    const latency = Date.now() - startTime;
    sessionManager.updateProviderStats(session.config.provider, 0, latency, true);
    throw error;
  }
});

app.post('/chat/stream', async (c) => {
  const body = await c.req.json();
  const validated = SendMessageRequestSchema.parse(body);

  const session = sessionManager.getSession(validated.sessionId);
  const provider = providerManager.getProvider(session.config.provider);

  // Add user message
  sessionManager.addMessage(validated.sessionId, {
    role: 'user',
    content: validated.message,
    timestamp: new Date(),
  });

  // Set up SSE stream
  return c.stream(async (stream) => {
    stream.onAbort(() => {
      console.log('Stream aborted by client');
    });

    let fullText = '';
    let finalUsage: any = null;
    let finalToolCalls: any = null;
    const startTime = Date.now();

    try {
      const chatStream = provider.chatStream(
        {
          sessionId: validated.sessionId,
          message: validated.message,
          streaming: true,
          tools: validated.tools,
        },
        session
      );

      for await (const chunk of chatStream) {
        if (chunk.done) {
          finalUsage = chunk.usage;
          finalToolCalls = chunk.toolCalls;
        } else {
          fullText += chunk.delta;
          await stream.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
      }

      // Add assistant message
      sessionManager.addMessage(validated.sessionId, {
        role: 'assistant',
        content: fullText,
        timestamp: new Date(),
      });

      // Update stats
      const latency = Date.now() - startTime;
      if (finalUsage) {
        sessionManager.updateProviderStats(
          session.config.provider,
          finalUsage.inputTokens + finalUsage.outputTokens,
          latency
        );
      }

      // Send final done event
      await stream.write(
        `data: ${JSON.stringify({
          sessionId: validated.sessionId,
          delta: '',
          usage: finalUsage,
          toolCalls: finalToolCalls,
          done: true,
        })}\n\n`
      );
    } catch (error: any) {
      const latency = Date.now() - startTime;
      sessionManager.updateProviderStats(session.config.provider, 0, latency, true);

      await stream.write(
        `data: ${JSON.stringify({
          error: error.message,
          done: true,
        })}\n\n`
      );
    }
  });
});

// ==================== Tool Execution ====================

app.post('/tools', async (c) => {
  const body = await c.req.json();
  const validated = ExecuteToolRequestSchema.parse(body);

  const session = sessionManager.getSession(validated.sessionId);

  // Add tool results as message
  sessionManager.addMessage(validated.sessionId, {
    role: 'tool',
    content: JSON.stringify(validated.toolResults),
    toolResults: validated.toolResults,
    timestamp: new Date(),
  });

  return c.json({
    message: 'Tool results recorded successfully',
    sessionId: validated.sessionId,
  });
});

// ==================== Provider Info ====================

app.get('/providers', (c) => {
  const providers = providerManager.getProviderStats();
  return c.json({ providers });
});

app.get('/providers/:id/models', (c) => {
  const providerId = c.req.param('id') as any;
  const models = providerManager.getAvailableModels(providerId);

  return c.json({
    provider: providerId,
    models,
  });
});

// ==================== Database Management ====================

app.post('/database/connections', async (c) => {
  const body = await c.req.json();
  const { name, config } = body;

  const connectionId = databaseManager.registerConnection(name, config);

  return c.json({
    connectionId,
    message: 'Database connection registered successfully',
  }, 201);
});

app.get('/database/connections', (c) => {
  const connections = databaseManager.getConnections();
  return c.json({ connections });
});

app.post('/database/connections/:id/test', async (c) => {
  const id = c.req.param('id');
  const result = await databaseManager.testConnection(id);

  return c.json(result);
});

app.post('/database/query', async (c) => {
  const body = await c.req.json();
  const { connectionId, query } = body;

  const result = await databaseManager.executeQuery(connectionId, query);

  return c.json(result);
});

app.delete('/database/connections/:id', async (c) => {
  const id = c.req.param('id');
  await databaseManager.disconnect(id);
  const removed = databaseManager.removeConnection(id);

  return c.json({
    message: removed ? 'Connection removed successfully' : 'Connection not found',
  });
});

app.get('/database/tools', (c) => {
  return c.json({
    tools: databaseTools,
    message: 'Available database tools for AI',
  });
});

// ==================== Visualization ====================

app.post('/visualization/create', async (c) => {
  const body = await c.req.json();
  const { type, data, labels, datasets, title, options } = body;

  const result = visualizationManager.createChart({
    type,
    data: {
      labels,
      datasets,
    },
    options: {
      title,
      ...options,
    },
  });

  return c.json(result);
});

app.post('/visualization/from-query', async (c) => {
  const body = await c.req.json();
  const { queryResults, chartType, xField, yField, title } = body;

  const result = visualizationManager.createChartFromQuery(queryResults, chartType, {
    xField,
    yField,
    title,
  });

  return c.json(result);
});

app.post('/visualization/suggest', async (c) => {
  const body = await c.req.json();
  const { data } = body;

  const suggestion = visualizationManager.suggestChartType(data);
  return c.json(suggestion);
});

app.get('/visualization/charts', (c) => {
  const charts = visualizationManager.getAllCharts();
  return c.json({ charts });
});

app.get('/visualization/charts/:id', (c) => {
  const chartId = c.req.param('id');
  const chart = visualizationManager.getChart(chartId);

  if (!chart) {
    return c.json({ error: 'Chart not found' }, 404);
  }

  return c.json({ chart });
});

app.delete('/visualization/charts/:id', (c) => {
  const chartId = c.req.param('id');
  const deleted = visualizationManager.deleteChart(chartId);

  return c.json({
    success: deleted,
    message: deleted ? 'Chart deleted successfully' : 'Chart not found',
  });
});

app.get('/visualization/tools', (c) => {
  return c.json({
    tools: visualizationTools,
    message: 'Available visualization tools for AI',
  });
});

// ==================== Testing ====================

app.post('/tests/run', async (c) => {
  const body = await c.req.json();
  const { suites } = body || { suites: ['all'] };

  // Dynamic import to avoid circular dependency
  const { testOrchestrator } = await import('./tests/test-orchestrator.js');

  const results = await testOrchestrator.runAll();

  return c.json(results);
});

app.get('/tests/results', async (c) => {
  const { testOrchestrator } = await import('./tests/test-orchestrator.js');

  const results = testOrchestrator.getResults();
  return c.json({ results });
});

app.get('/tests/report', async (c) => {
  const { testOrchestrator } = await import('./tests/test-orchestrator.js');

  const report = testOrchestrator.generateReport();
  return c.text(report);
});

// ==================== AI Collaboration ====================

app.post('/collaboration/start', async (c) => {
  const body = await c.req.json();
  const { primaryAI, consultAI, topic, question, files, code, showFullConversation } = body;

  const result = await aiCollaborationManager.collaborate({
    primaryAI,
    consultAI,
    topic,
    context: {
      files,
      code,
      question,
    },
    showFullConversation: showFullConversation !== false,
  });

  return c.json(result);
});

app.get('/collaboration/conversations', (c) => {
  const conversations = aiCollaborationManager.getAllConversations();
  return c.json({ conversations });
});

app.get('/collaboration/conversations/:id', (c) => {
  const id = c.req.param('id');
  const conversation = aiCollaborationManager.getConversation(id);

  if (!conversation) {
    return c.json({ error: 'Conversation not found' }, 404);
  }

  return c.json({ conversation });
});

app.get('/collaboration/stats', (c) => {
  const stats = aiCollaborationManager.getStatistics();
  return c.json(stats);
});

app.get('/collaboration/tools', (c) => {
  return c.json({
    tools: collaborationTools,
    message: 'AI collaboration tools for multi-AI discussions',
  });
});

// ==================== Hybrid Automation ====================

app.post('/automation/execute', async (c) => {
  const body = await c.req.json();
  const task = body;

  const result = await hybridAgent.execute(task);

  return c.json(result);
});

app.get('/automation/metrics', (c) => {
  const metrics = hybridAgent.getMetrics();
  return c.json(metrics);
});

app.post('/automation/uitars/install', async (c) => {
  const result = await UITarsAutomation.install();
  return c.json(result);
});

app.get('/automation/tools', (c) => {
  return c.json({
    tools: [
      {
        name: 'automate_browser',
        description: 'Automate browser interactions using hybrid Playwright/UI-TARS. Intelligently chooses the best tool for the task.',
        input_schema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['web', 'mobile', 'desktop', 'game'],
              description: 'Platform type',
            },
            action: {
              type: 'string',
              enum: ['click', 'type', 'navigate', 'extract', 'screenshot', 'understand', 'test'],
              description: 'Action to perform',
            },
            description: {
              type: 'string',
              description: 'Human-readable description of what to do',
            },
            target: {
              type: 'string',
              description: 'CSS selector or visual description of target element',
            },
            url: {
              type: 'string',
              description: 'URL to navigate to (for navigate action)',
            },
            value: {
              type: 'string',
              description: 'Text to type (for type action)',
            },
            options: {
              type: 'object',
              properties: {
                screenshot: {
                  type: 'boolean',
                  description: 'Take screenshot after action',
                },
                wait: {
                  type: 'number',
                  description: 'Wait time in ms after action',
                },
                validate: {
                  type: 'boolean',
                  description: 'Validate result',
                },
              },
            },
          },
          required: ['type', 'action', 'description'],
        },
      },
    ],
    message: 'Hybrid automation tools for AI',
  });
});

// ==================== Admin ====================

app.post('/admin/cleanup', async (c) => {
  const result = await sessionManager.manualCleanup();
  return c.json({
    message: 'Cleanup completed',
    cleaned: result,
  });
});

app.post('/admin/stats/reset', (c) => {
  sessionManager.resetStatistics();
  return c.json({
    message: 'Statistics reset successfully',
  });
});

// ==================== Export ====================

export default app;
