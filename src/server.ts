import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { rateLimiter } from 'hono-rate-limiter';
import { serveStatic } from '@hono/node-server/serve-static';
import { sanitizeRequestBody, getSanitizedBody, sanitizeString, sanitizeSQLInput } from './middleware/sanitization.js';
import { sessionManager } from './utils/session.js';
import { providerManager } from './providers/manager.js';
import { databaseManager, databaseTools } from './tools/database.js';
import { visualizationManager, visualizationTools } from './tools/visualization.js';
import { aiCollaborationManager, collaborationTools } from './tools/ai-collaboration.js';
import { githubManager, githubTools } from './tools/github-integration.js';
import { secretsManager, secretsTools } from './tools/secrets-manager.js';
import { customModelsManager } from './utils/custom-models.js';
import { transcriptProcessor } from './utils/transcript-processor.js';
import { hybridAgent } from './tools/automation/agent.js';
import { UITarsAutomation } from './tools/automation/uitars.js';
import { mcpOrchestrator } from './agents/mcp-orchestrator.js';
import { chatOptimizer } from './agents/chat-optimizer.js';
import { externalDataAdapter } from './utils/external-data-adapter.js';
import {
  RegisterDeviceRequestSchema,
  CreateSessionRequestSchema,
  SendMessageRequestSchema,
  ExecuteToolRequestSchema,
  BridgeError,
} from './types/index.js';

const app = new Hono();

// ==================== Middleware ====================

// CORS - Allow all origins in production for testing
app.use('*', cors({
  origin: '*',  // Allow all origins for now
  credentials: true,
}));

// Static file serving for frontend assets
app.use('/assets/*', serveStatic({ root: './dashboard/public/assets' }));
app.use('/css/*', serveStatic({ root: './dashboard/public/css' }));
app.use('/js/*', serveStatic({ root: './dashboard/public/js' }));

// Serve dashboard pages with specific routes
app.get('/dashboard', serveStatic({ path: './dashboard/index.html' }));
app.get('/dashboard/chat.html', serveStatic({ path: './dashboard/public/chat.html' }));
app.get('/dashboard/settings.html', serveStatic({ path: './dashboard/public/settings.html' }));
app.get('/dashboard/onboarding.html', serveStatic({ path: './dashboard/public/onboarding.html' }));
app.get('/dashboard/mini-tools.html', serveStatic({ path: './dashboard/public/mini-tools.html' }));

// Alternative routes without .html extension
app.get('/dashboard/chat', serveStatic({ path: './dashboard/public/chat.html' }));
app.get('/dashboard/settings', serveStatic({ path: './dashboard/public/settings.html' }));
app.get('/dashboard/onboarding', serveStatic({ path: './dashboard/public/onboarding.html' }));
app.get('/dashboard/mini-tools', serveStatic({ path: './dashboard/public/mini-tools.html' }));

// Serve test files
app.get('/test-deployment', serveStatic({ path: './test-deployment.html' }));
app.get('/test-integration', serveStatic({ path: './QUICK_INTEGRATION.html' }));
app.get('/local-test', serveStatic({ path: './LOCAL_TEST.html' }));

// Rate limiting - Prevent DoS attacks (100 requests per minute per IP)
app.use('*', rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 100, // 100 requests per window
  standardHeaders: 'draft-7',
  keyGenerator: (c) => c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
}));

// Input sanitization - Prevent XSS and injection attacks
app.use('*', sanitizeRequestBody);

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
    frontend: {
      dashboard: 'GET /dashboard - Main dashboard interface',
      chat: 'GET /dashboard/chat.html - AI Chat interface',
      settings: 'GET /dashboard/settings.html - Configuration settings',
      onboarding: 'GET /dashboard/onboarding.html - Setup wizard',
      miniTools: 'GET /dashboard/mini-tools.html - Utility tools',
      test: {
        deployment: 'GET /test-deployment - Production test suite',
        integration: 'GET /test-integration - Integration test page',
        local: 'GET /local-test - Local development test',
      }
    },
    api: {
      health: 'GET /health',
      stats: 'GET /stats',
      devices: 'POST /devices/register, GET /devices, GET /devices/:id, DELETE /devices/:id',
      sessions: 'POST /sessions, GET /sessions/:id, DELETE /sessions/:id',
      chat: 'POST /chat, POST /chat/stream',
      tools: 'POST /tools',
      providers: 'GET /providers, GET /providers/:id/models',
      customModels: 'POST /models/custom, GET /models/custom, GET /models/custom/:id, PUT /models/custom/:id, DELETE /models/custom/:id, GET /models/custom/stats',
      secrets: 'POST /secrets/set, POST /secrets/validate, POST /secrets/set-and-validate, GET /secrets/list, DELETE /secrets/:name, GET /secrets/stats, GET /secrets/tools',
      miniTools: 'POST /mini-tools/teams-transcript, GET /mini-tools/teams-transcript, GET /mini-tools/teams-transcript/:id, DELETE /mini-tools/teams-transcript/:id, GET /mini-tools/teams-transcript/stats',
      mcpOrchestrator: 'POST /api/mcp/analyze, POST /api/mcp/strategy, POST /api/mcp/record, GET /api/mcp/stats, GET /api/mcp/capabilities',
      externalData: 'POST /api/external/data/sessions/create, POST /api/external/data/upload, POST /api/external/data/sessions/create-and-upload, POST /api/external/data/sessions/:id/end, GET /api/external/data/sessions, GET /api/external/data/sessions/:id, GET /api/external/data/sessions/:id/stats, POST /api/external/data/batch-upload',
      chatOptimizer: 'POST /api/optimizer/prompt, POST /api/optimizer/message, POST /api/optimizer/session, POST /api/optimizer/file-upload, GET /api/optimizer/file/:id, GET /api/optimizer/stats, POST /api/optimizer/clear-cache',
    },
    documentation: 'https://github.com/Clauskraft/mcp-universal-bridge',
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
  const sanitizedBody = getSanitizedBody(c);
  const validated = SendMessageRequestSchema.parse(sanitizedBody);

  const session = sessionManager.getSession(validated.sessionId);
  const provider = providerManager.getProvider(session.config.provider);

  // Add user message (already sanitized)
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
  const sanitizedBody = getSanitizedBody(c);
  const validated = SendMessageRequestSchema.parse(sanitizedBody);

  const session = sessionManager.getSession(validated.sessionId);
  const provider = providerManager.getProvider(session.config.provider);

  // Add user message (already sanitized)
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
  const standardModels = providerManager.getAvailableModels(providerId);
  const customModels = customModelsManager.getModelsForDisplay(providerId);

  // Format standard models as objects with value and label
  // Add 📖 indicator for Ollama models (all open-source)
  const formattedStandard = standardModels.map(model => ({
    value: model,
    label: providerId === 'ollama' ? `📖 ${model}` : model,
  }));

  return c.json({
    provider: providerId,
    models: [...formattedStandard, ...customModels],
  });
});

// ==================== Custom Models Management ====================

app.post('/models/custom', async (c) => {
  const body = await c.req.json();
  const { provider, modelId, displayName, description, parameters } = body;

  if (!provider || !modelId || !displayName) {
    throw new BridgeError(
      'provider, modelId, and displayName are required',
      'INVALID_REQUEST',
      400
    );
  }

  const model = customModelsManager.addModel({
    provider,
    modelId,
    displayName,
    description,
    parameters,
  });

  return c.json(
    {
      model,
      message: 'Custom model added successfully',
    },
    201
  );
});

app.get('/models/custom', (c) => {
  const provider = c.req.query('provider') as any;

  const models = provider
    ? customModelsManager.getModelsByProvider(provider)
    : customModelsManager.getAllModels();

  return c.json({ models });
});

app.get('/models/custom/:id', (c) => {
  const id = c.req.param('id');
  const model = customModelsManager.getModel(id);

  if (!model) {
    throw new BridgeError(
      `Custom model ${id} not found`,
      'MODEL_NOT_FOUND',
      404
    );
  }

  return c.json({ model });
});

app.put('/models/custom/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { modelId, displayName, description, parameters } = body;

  const model = customModelsManager.updateModel(id, {
    modelId,
    displayName,
    description,
    parameters,
  });

  return c.json({
    model,
    message: 'Custom model updated successfully',
  });
});

app.delete('/models/custom/:id', (c) => {
  const id = c.req.param('id');
  const deleted = customModelsManager.deleteModel(id);

  if (!deleted) {
    throw new BridgeError(
      `Custom model ${id} not found`,
      'MODEL_NOT_FOUND',
      404
    );
  }

  return c.json({
    message: 'Custom model deleted successfully',
  });
});

app.get('/models/custom/stats', (c) => {
  const stats = customModelsManager.getStatistics();
  return c.json(stats);
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
  const sanitizedBody = getSanitizedBody(c);
  const { connectionId, query } = sanitizedBody;

  // Additional SQL-specific sanitization
  const sanitizedQuery = sanitizeSQLInput(query);

  const result = await databaseManager.executeQuery(connectionId, sanitizedQuery);

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

// ==================== GitHub Integration ====================

app.post('/github/connections', async (c) => {
  const body = await c.req.json();
  const { name, token, owner, baseUrl } = body;

  const result = githubManager.registerConnection({ name, token, owner, baseUrl });

  return c.json(result, 201);
});

app.get('/github/connections', (c) => {
  const connections = githubManager.listConnections();
  return c.json({ connections });
});

app.post('/github/connections/:id/test', async (c) => {
  const id = c.req.param('id');
  const result = await githubManager.testConnection(id);

  return c.json(result);
});

app.delete('/github/connections/:id', (c) => {
  const id = c.req.param('id');
  const result = githubManager.removeConnection(id);

  return c.json(result);
});

app.get('/github/:connectionId/repos', async (c) => {
  const connectionId = c.req.param('connectionId');
  const owner = c.req.query('owner');
  const type = c.req.query('type') as 'all' | 'owner' | 'member' | undefined;
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : undefined;

  const repos = await githubManager.listRepositories(connectionId, { owner, type, limit });

  return c.json({ repositories: repos });
});

app.get('/github/:connectionId/repos/:owner/:repo', async (c) => {
  const connectionId = c.req.param('connectionId');
  const owner = c.req.param('owner');
  const repo = c.req.param('repo');

  const repository = await githubManager.getRepository(connectionId, owner, repo);

  return c.json({ repository });
});

app.get('/github/:connectionId/repos/:owner/:repo/file', async (c) => {
  const connectionId = c.req.param('connectionId');
  const owner = c.req.param('owner');
  const repo = c.req.param('repo');
  const path = c.req.query('path');
  const ref = c.req.query('ref');

  if (!path) {
    return c.json({ error: 'File path is required' }, 400);
  }

  const file = await githubManager.getFileContent(connectionId, owner, repo, path, ref);

  return c.json({ file });
});

app.get('/github/:connectionId/repos/:owner/:repo/branches', async (c) => {
  const connectionId = c.req.param('connectionId');
  const owner = c.req.param('owner');
  const repo = c.req.param('repo');

  const branches = await githubManager.listBranches(connectionId, owner, repo);

  return c.json({ branches });
});

app.post('/github/:connectionId/repos/:owner/:repo/pulls', async (c) => {
  const connectionId = c.req.param('connectionId');
  const owner = c.req.param('owner');
  const repo = c.req.param('repo');
  const body = await c.req.json();

  const { title, body: prBody, head, base, draft } = body;

  const pullRequest = await githubManager.createPullRequest({
    connectionId,
    owner,
    repo,
    title,
    body: prBody,
    head,
    base,
    draft,
  });

  return c.json({ pullRequest }, 201);
});

app.get('/github/:connectionId/repos/:owner/:repo/pulls', async (c) => {
  const connectionId = c.req.param('connectionId');
  const owner = c.req.param('owner');
  const repo = c.req.param('repo');
  const state = c.req.query('state') as 'open' | 'closed' | 'all' | undefined;
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : undefined;

  const pullRequests = await githubManager.listPullRequests(connectionId, owner, repo, { state, limit });

  return c.json({ pullRequests });
});

app.get('/github/:connectionId/repos/:owner/:repo/pulls/:number', async (c) => {
  const connectionId = c.req.param('connectionId');
  const owner = c.req.param('owner');
  const repo = c.req.param('repo');
  const number = parseInt(c.req.param('number'));

  const pullRequest = await githubManager.getPullRequest(connectionId, owner, repo, number);

  return c.json({ pullRequest });
});

app.post('/github/:connectionId/repos/:owner/:repo/pulls/:number/reviews', async (c) => {
  const connectionId = c.req.param('connectionId');
  const owner = c.req.param('owner');
  const repo = c.req.param('repo');
  const prNumber = parseInt(c.req.param('number'));
  const body = await c.req.json();

  const { event, body: reviewBody, comments } = body;

  const result = await githubManager.createReview({
    connectionId,
    owner,
    repo,
    prNumber,
    event,
    body: reviewBody,
    comments,
  });

  return c.json(result, 201);
});

app.put('/github/:connectionId/repos/:owner/:repo/pulls/:number/merge', async (c) => {
  const connectionId = c.req.param('connectionId');
  const owner = c.req.param('owner');
  const repo = c.req.param('repo');
  const prNumber = parseInt(c.req.param('number'));
  const body = await c.req.json();

  const { commitTitle, commitMessage, mergeMethod } = body || {};

  const result = await githubManager.mergePullRequest(connectionId, owner, repo, prNumber, {
    commitTitle,
    commitMessage,
    mergeMethod,
  });

  return c.json(result);
});

app.post('/github/:connectionId/repos/:owner/:repo/issues', async (c) => {
  const connectionId = c.req.param('connectionId');
  const owner = c.req.param('owner');
  const repo = c.req.param('repo');
  const body = await c.req.json();

  const { title, body: issueBody, labels, assignees } = body;

  const issue = await githubManager.createIssue({
    connectionId,
    owner,
    repo,
    title,
    body: issueBody,
    labels,
    assignees,
  });

  return c.json({ issue }, 201);
});

app.get('/github/:connectionId/repos/:owner/:repo/issues', async (c) => {
  const connectionId = c.req.param('connectionId');
  const owner = c.req.param('owner');
  const repo = c.req.param('repo');
  const state = c.req.query('state') as 'open' | 'closed' | 'all' | undefined;
  const labelsQuery = c.req.query('labels');
  const labels = labelsQuery ? labelsQuery.split(',') : undefined;
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : undefined;

  const issues = await githubManager.listIssues(connectionId, owner, repo, { state, labels, limit });

  return c.json({ issues });
});

app.post('/github/:connectionId/repos/:owner/:repo/issues/:number/comments', async (c) => {
  const connectionId = c.req.param('connectionId');
  const owner = c.req.param('owner');
  const repo = c.req.param('repo');
  const issueNumber = parseInt(c.req.param('number'));
  const body = await c.req.json();

  const { body: commentBody } = body;

  const result = await githubManager.addComment(connectionId, owner, repo, issueNumber, commentBody);

  return c.json(result, 201);
});

app.patch('/github/:connectionId/repos/:owner/:repo/issues/:number/close', async (c) => {
  const connectionId = c.req.param('connectionId');
  const owner = c.req.param('owner');
  const repo = c.req.param('repo');
  const issueNumber = parseInt(c.req.param('number'));

  const result = await githubManager.closeIssue(connectionId, owner, repo, issueNumber);

  return c.json(result);
});

app.get('/github/tools', (c) => {
  return c.json({
    tools: githubTools,
    message: 'GitHub integration tools for AI',
  });
});

// ==================== Secrets Management ====================

app.post('/secrets/set', async (c) => {
  const body = await c.req.json();
  const { name, value, type, provider, expiresAt, metadata } = body;

  const result = secretsManager.setSecret({
    name,
    value,
    type,
    provider,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    metadata,
  });

  return c.json(result);
});

app.post('/secrets/validate', async (c) => {
  const body = await c.req.json();
  const { provider, api_key } = body;

  const result = await secretsManager.validateAPIKey(provider, api_key);

  return c.json(result);
});

app.post('/secrets/set-and-validate', async (c) => {
  const body = await c.req.json();
  const { name, value, provider } = body;

  const result = await secretsManager.setAndValidateAPIKey(name, value, provider);

  return c.json(result);
});

app.get('/secrets/list', (c) => {
  const secrets = secretsManager.listSecrets();
  return c.json({ secrets });
});

app.delete('/secrets/:name', (c) => {
  const name = c.req.param('name');
  const result = secretsManager.deleteSecret(name);

  return c.json(result);
});

app.get('/secrets/stats', (c) => {
  const stats = secretsManager.getStatistics();
  return c.json(stats);
});

app.post('/secrets/external/configure', async (c) => {
  const body = await c.req.json();
  const { type, enabled, config } = body;

  const result = secretsManager.configureExternalManager({ type, enabled, config });

  return c.json(result);
});

app.post('/secrets/external/sync', async (c) => {
  const result = await secretsManager.syncWithExternal();

  return c.json(result);
});

app.get('/secrets/tools', (c) => {
  return c.json({
    tools: secretsTools,
    message: 'Secrets management tools for AI',
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

// ==================== Mini Tools ====================

// POST /mini-tools/teams-transcript - Process Teams transcript
app.post('/mini-tools/teams-transcript', async (c) => {
  const body = await c.req.json();
  const { title, content, source } = body;

  if (!title || !content || !source) {
    throw new BridgeError(
      'title, content, and source are required',
      'INVALID_REQUEST',
      400
    );
  }

  if (source !== 'vtt' && source !== 'text') {
    throw new BridgeError(
      'source must be either "vtt" or "text"',
      'INVALID_SOURCE',
      400
    );
  }

  const transcript = transcriptProcessor.processTranscript(title, content, source);

  return c.json(
    {
      transcript: {
        id: transcript.id,
        title: transcript.title,
        source: transcript.source,
        entryCount: transcript.entries.length,
        createdAt: transcript.createdAt,
      },
      message: 'Transcript processed successfully',
    },
    201
  );
});

// GET /mini-tools/teams-transcript - List all transcripts
app.get('/mini-tools/teams-transcript', (c) => {
  const transcripts = transcriptProcessor.getAllTranscripts();
  return c.json({ transcripts });
});

// GET /mini-tools/teams-transcript/:id - Get specific transcript
app.get('/mini-tools/teams-transcript/:id', (c) => {
  const id = c.req.param('id');
  const transcript = transcriptProcessor.getTranscript(id);

  if (!transcript) {
    throw new BridgeError(
      `Transcript ${id} not found`,
      'TRANSCRIPT_NOT_FOUND',
      404
    );
  }

  return c.json({ transcript });
});

// DELETE /mini-tools/teams-transcript/:id - Delete transcript
app.delete('/mini-tools/teams-transcript/:id', (c) => {
  const id = c.req.param('id');
  const deleted = transcriptProcessor.deleteTranscript(id);

  if (!deleted) {
    throw new BridgeError(
      `Transcript ${id} not found`,
      'TRANSCRIPT_NOT_FOUND',
      404
    );
  }

  return c.json({
    message: 'Transcript deleted successfully',
  });
});

// GET /mini-tools/teams-transcript/stats - Get statistics
app.get('/mini-tools/teams-transcript/stats', (c) => {
  const stats = transcriptProcessor.getStatistics();
  return c.json(stats);
});

// ==================== MCP Orchestrator Agent ====================

// POST /api/mcp/analyze - Analyze task and get MCP server recommendations
app.post('/api/mcp/analyze', async (c) => {
  const body = await c.req.json();
  const { taskDescription, context } = body;

  if (!taskDescription) {
    throw new BridgeError(
      'taskDescription is required',
      'INVALID_REQUEST',
      400
    );
  }

  const analysis = mcpOrchestrator.analyzeTask(taskDescription, context);
  return c.json({ analysis });
});

// POST /api/mcp/strategy - Create execution strategy for analyzed task
app.post('/api/mcp/strategy', async (c) => {
  const body = await c.req.json();
  const { analysis } = body;

  if (!analysis) {
    throw new BridgeError(
      'analysis is required',
      'INVALID_REQUEST',
      400
    );
  }

  const strategy = mcpOrchestrator.createExecutionStrategy(analysis);
  return c.json({ strategy });
});

// POST /api/mcp/record - Record execution result for learning
app.post('/api/mcp/record', async (c) => {
  const body = await c.req.json();
  const { taskType, serversUsed, success, duration, userFeedback } = body;

  if (!taskType || !serversUsed || success === undefined || !duration) {
    throw new BridgeError(
      'taskType, serversUsed, success, and duration are required',
      'INVALID_REQUEST',
      400
    );
  }

  mcpOrchestrator.recordExecution(taskType, serversUsed, success, duration, userFeedback);

  return c.json({
    message: 'Execution recorded successfully',
  });
});

// GET /api/mcp/stats - Get orchestrator statistics
app.get('/api/mcp/stats', async (c) => {
  const stats = mcpOrchestrator.getStatistics();
  return c.json(stats);
});

// GET /api/mcp/capabilities - Get server capabilities map
app.get('/api/mcp/capabilities', async (c) => {
  // Return public capability information
  const capabilities = {
    serena: [
      'Symbol operations (find, rename, references)',
      'Semantic code search',
      'Project memory and onboarding',
      'Multi-language support',
      'Large codebase navigation',
    ],
    context7: [
      'Official documentation lookup',
      'Library and framework guides',
      'API reference and examples',
      'Best practices and patterns',
      'Version-specific information',
    ],
    magic: [
      'UI component generation from 21st.dev',
      'React, Vue, Angular components',
      'Design system integration',
      'Accessible and responsive design',
    ],
    playwright: [
      'Browser automation and E2E testing',
      'Visual testing and screenshots',
      'Form interaction and navigation',
      'Accessibility testing (WCAG)',
    ],
    'sequential-thinking': [
      'Complex multi-step reasoning',
      'Hypothesis testing and verification',
      'Structured problem decomposition',
      'Debugging logic analysis',
    ],
    'logo-search': [
      'Company logo lookup',
      'Brand assets in SVG/TSX/JSX',
      'Icon components generation',
    ],
  };

  return c.json({ capabilities });
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

// ==================== External Data Integration ====================

// POST /api/external/data/sessions/create - Create external data session
app.post('/api/external/data/sessions/create', async (c) => {
  const body = await c.req.json();
  const { title, platform, metadata } = body;

  if (!title || !platform) {
    throw new BridgeError(
      'title and platform are required',
      'INVALID_REQUEST',
      400
    );
  }

  const session = externalDataAdapter.createExternalSession({
    title,
    platform,
    metadata,
  });

  return c.json(
    {
      session,
      message: 'External session created successfully',
    },
    201
  );
});

// POST /api/external/data/upload - Upload data to existing session
app.post('/api/external/data/upload', async (c) => {
  const body = await c.req.json();
  const { sessionId, platform, data, metadata } = body;

  if (!sessionId || !platform || !data) {
    throw new BridgeError(
      'sessionId, platform, and data are required',
      'INVALID_REQUEST',
      400
    );
  }

  if (!Array.isArray(data)) {
    throw new BridgeError(
      'data must be an array',
      'INVALID_REQUEST',
      400
    );
  }

  const result = externalDataAdapter.uploadData(sessionId, {
    platform,
    data,
    metadata,
  });

  return c.json(result);
});

// POST /api/external/data/sessions/create-and-upload - Create session and upload data
app.post('/api/external/data/sessions/create-and-upload', async (c) => {
  const body = await c.req.json();
  const { title, platform, metadata, data } = body;

  if (!title || !platform || !data) {
    throw new BridgeError(
      'title, platform, and data are required',
      'INVALID_REQUEST',
      400
    );
  }

  if (!Array.isArray(data)) {
    throw new BridgeError(
      'data must be an array',
      'INVALID_REQUEST',
      400
    );
  }

  const result = externalDataAdapter.createAndUpload(
    { title, platform, metadata },
    { platform, data, metadata }
  );

  return c.json(
    {
      session: result.session,
      uploadResult: result.uploadResult,
      message: 'Session created and data uploaded successfully',
    },
    201
  );
});

// POST /api/external/data/sessions/:id/end - End a session
app.post('/api/external/data/sessions/:id/end', async (c) => {
  const sessionId = c.req.param('id');

  const session = externalDataAdapter.endSession(sessionId);

  return c.json({
    session,
    message: 'Session ended successfully',
  });
});

// GET /api/external/data/sessions - List all external sessions
app.get('/api/external/data/sessions', async (c) => {

  const sessions = externalDataAdapter.getAllExternalSessions();

  return c.json({
    sessions,
    count: sessions.length,
  });
});

// GET /api/external/data/sessions/:id - Get session with data
app.get('/api/external/data/sessions/:id', async (c) => {
  const sessionId = c.req.param('id');

  const result = externalDataAdapter.getSessionWithEvents(sessionId);

  return c.json(result);
});

// GET /api/external/data/sessions/:id/stats - Get session statistics
app.get('/api/external/data/sessions/:id/stats', async (c) => {
  const sessionId = c.req.param('id');

  const stats = externalDataAdapter.getSessionStats(sessionId);

  return c.json(stats);
});

// POST /api/external/data/batch-upload - Batch upload to multiple sessions
app.post('/api/external/data/batch-upload', async (c) => {
  const body = await c.req.json();
  const { uploads } = body;

  if (!uploads || !Array.isArray(uploads)) {
    throw new BridgeError(
      'uploads array is required',
      'INVALID_REQUEST',
      400
    );
  }

  const result = externalDataAdapter.batchUpload(uploads);

  return c.json(result);
});

// ==================== Chat Optimizer ====================

// POST /api/optimizer/prompt - Optimize system prompt
app.post('/api/optimizer/prompt', async (c) => {
  const body = await c.req.json();
  const { prompt } = body;

  if (!prompt) {
    throw new BridgeError(
      'prompt is required',
      'INVALID_REQUEST',
      400
    );
  }

  const result = chatOptimizer.optimizeSystemPrompt(prompt);
  return c.json({ optimization: result });
});

// POST /api/optimizer/message - Optimize message content
app.post('/api/optimizer/message', async (c) => {
  const body = await c.req.json();
  const { message } = body;

  if (!message) {
    throw new BridgeError(
      'message is required',
      'INVALID_REQUEST',
      400
    );
  }

  const result = await chatOptimizer.optimizeMessage(message);
  return c.json({ optimization: result });
});

// POST /api/optimizer/session - Optimize session context
app.post('/api/optimizer/session', async (c) => {
  const body = await c.req.json();
  const { sessionId, maxMessages } = body;

  if (!sessionId) {
    throw new BridgeError(
      'sessionId is required',
      'INVALID_REQUEST',
      400
    );
  }

  const session = sessionManager.getSession(sessionId);
  const result = chatOptimizer.optimizeSessionContext(session, maxMessages || 10);

  return c.json({ optimization: result });
});

// POST /api/optimizer/file-upload - Upload file and get reference
app.post('/api/optimizer/file-upload', async (c) => {
  const body = await c.req.json();
  const { content, filename, mimeType } = body;

  if (!content || !filename) {
    throw new BridgeError(
      'content and filename are required',
      'INVALID_REQUEST',
      400
    );
  }

  const result = await chatOptimizer.optimizeFileAttachment(
    content,
    filename,
    mimeType || 'text/plain'
  );

  return c.json({ optimization: result });
});

// GET /api/optimizer/file/:id - Get file content by reference
app.get('/api/optimizer/file/:id', (c) => {
  const fileId = c.req.param('id');
  const content = chatOptimizer.getFileContent(fileId);

  if (!content) {
    throw new BridgeError(
      `File ${fileId} not found`,
      'FILE_NOT_FOUND',
      404
    );
  }

  const reference = chatOptimizer.getFileReference(fileId);

  return c.json({
    fileId,
    content,
    reference,
  });
});

// GET /api/optimizer/stats - Get optimization statistics
app.get('/api/optimizer/stats', (c) => {
  const stats = chatOptimizer.getStatistics();
  return c.json(stats);
});

// POST /api/optimizer/clear-cache - Clear old cache entries
app.post('/api/optimizer/clear-cache', async (c) => {
  const body = await c.req.json();
  const olderThan = body.olderThan || 3600000;

  chatOptimizer.clearCache(olderThan);

  return c.json({
    message: 'Cache cleared successfully',
  });
});

// ==================== Export ====================

export default app;
