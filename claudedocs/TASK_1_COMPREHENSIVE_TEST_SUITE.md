# 🧪 TASK 1: Comprehensive Test Suite & Prioritized To-Do List

**Project:** MCP Universal AI Bridge
**Analysis Date:** October 18, 2025
**Analyzer:** Quality Engineer Agent
**Status:** Production Readiness Assessment

---

## Table of Contents

1. [Test Suite Structure](#test-suite-structure)
2. [Test Categories & Coverage](#test-categories--coverage)
3. [Testing Framework Recommendations](#testing-framework-recommendations)
4. [Prioritized To-Do List](#prioritized-to-do-list)
5. [Implementation Roadmap](#implementation-roadmap)

---

## Test Suite Structure

### Proposed Directory Organization

```
mcp-bridge/
├── tests/
│   ├── unit/                          # Unit tests (80%+ coverage target)
│   │   ├── agents/
│   │   │   ├── chat-optimizer.test.ts
│   │   │   └── mcp-orchestrator.test.ts
│   │   ├── providers/
│   │   │   ├── base.test.ts
│   │   │   ├── claude.test.ts
│   │   │   ├── gemini.test.ts
│   │   │   ├── chatgpt.test.ts
│   │   │   ├── ollama.test.ts
│   │   │   ├── grok.test.ts
│   │   │   └── manager.test.ts
│   │   ├── middleware/
│   │   │   ├── auth.test.ts
│   │   │   ├── cache.test.ts
│   │   │   ├── ratelimit.test.ts
│   │   │   ├── sanitization.test.ts
│   │   │   └── persistence.test.ts
│   │   ├── tools/
│   │   │   ├── secrets-manager.test.ts
│   │   │   ├── database.test.ts
│   │   │   ├── visualization.test.ts
│   │   │   └── github-integration.test.ts
│   │   └── utils/
│   │       ├── session.test.ts
│   │       ├── external-data-adapter.test.ts
│   │       └── transcript-processor.test.ts
│   │
│   ├── integration/                   # Integration tests
│   │   ├── api/
│   │   │   ├── health.test.ts
│   │   │   ├── chat.test.ts
│   │   │   ├── session.test.ts
│   │   │   ├── device.test.ts
│   │   │   └── optimizer.test.ts
│   │   ├── providers/
│   │   │   ├── provider-switching.test.ts
│   │   │   └── model-selection.test.ts
│   │   ├── database/
│   │   │   └── connection-lifecycle.test.ts
│   │   └── mcp/
│   │       ├── orchestrator-flow.test.ts
│   │       └── external-data.test.ts
│   │
│   ├── e2e/                           # End-to-end tests
│   │   ├── playwright/
│   │   │   ├── dashboard.spec.ts
│   │   │   ├── chat-interface.spec.ts
│   │   │   ├── settings.spec.ts
│   │   │   ├── onboarding.spec.ts
│   │   │   ├── mini-tools.spec.ts
│   │   │   └── test-page.spec.ts
│   │   └── flows/
│   │       ├── complete-chat-flow.spec.ts
│   │       ├── provider-switch-flow.spec.ts
│   │       ├── file-upload-optimize-chat.spec.ts
│   │       └── onboarding-to-dashboard.spec.ts
│   │
│   ├── performance/                   # Performance tests
│   │   ├── load/
│   │   │   ├── concurrent-users.test.ts
│   │   │   ├── message-throughput.test.ts
│   │   │   └── optimizer-performance.test.ts
│   │   └── benchmarks/
│   │       ├── provider-latency.test.ts
│   │       └── token-optimization.test.ts
│   │
│   ├── security/                      # Security tests
│   │   ├── api-key-exposure.test.ts
│   │   ├── input-sanitization.test.ts
│   │   ├── cors-policy.test.ts
│   │   ├── rate-limiting.test.ts
│   │   └── secrets-encryption.test.ts
│   │
│   ├── fixtures/                      # Test data
│   │   ├── sessions.json
│   │   ├── messages.json
│   │   ├── devices.json
│   │   └── mock-responses/
│   │
│   ├── mocks/                         # Mock implementations
│   │   ├── providers/
│   │   └── external-apis/
│   │
│   └── helpers/                       # Test utilities
│       ├── test-server.ts
│       ├── mock-provider.ts
│       ├── assert-helpers.ts
│       └── cleanup.ts
│
├── playwright.config.ts               # Playwright configuration
├── vitest.config.ts                   # Vitest configuration
└── jest.config.js                     # Jest configuration (if needed)
```

---

## Test Categories & Coverage

### 1. 🧬 Unit Tests (CRITICAL - Brand New Chat Optimizer)

#### 1.1 Chat Optimizer Agent Tests (`tests/unit/agents/chat-optimizer.test.ts`)

**Priority:** P0 (Brand new 390-line agent with 7 API endpoints)

```typescript
describe('ChatOptimizer', () => {
  describe('Template Detection & Application', () => {
    test('detects code review template from prompt', () => {
      const prompt = "Review this code for security issues...";
      const result = optimizer.optimizeSystemPrompt(prompt);
      expect(result.strategy).toBe('template:code-review');
      expect(result.savingsPercent).toBeGreaterThan(60);
    });

    test('detects data analysis template', () => {
      const prompt = "Analyze this CSV data for trends...";
      expect(optimizer.detectTemplate(prompt)?.id).toBe('data-analysis');
    });

    test('applies assistant template as fallback', () => {
      const prompt = "Generic assistant prompt...";
      expect(optimizer.detectTemplate(prompt)?.id).toBe('assistant');
    });

    test('extracts variables correctly', () => {
      // Test language extraction
      expect(extractVariable("Python code review", "language")).toBe("python");

      // Test tool extraction
      expect(extractVariable("web and database", "tools")).toContain("web,database");
    });

    test('template compression achieves 60-85% savings', () => {
      const longPrompt = "You are a helpful AI assistant... [500 chars]";
      const result = optimizer.optimizeSystemPrompt(longPrompt);
      expect(result.savingsPercent).toBeGreaterThan(60);
      expect(result.savingsPercent).toBeLessThan(90);
    });
  });

  describe('File Upload & Reference System', () => {
    test('uploads file and generates reference ID', async () => {
      const content = "Large code content here...".repeat(1000);
      const result = await optimizer.optimizeFileAttachment(
        content,
        'app.ts',
        'text/typescript'
      );

      expect(result.strategy).toBe('file-reference');
      expect(result.optimizedContent).toMatch(/\[File: app\.ts.*ID: [a-f0-9]+\]/);
    });

    test('retrieves file content by reference ID', async () => {
      const content = "Original file content";
      const result = await optimizer.optimizeFileAttachment(content, 'test.txt', 'text/plain');
      const fileId = result.optimizedContent.match(/ID: ([a-f0-9]+)/)[1];

      const retrieved = optimizer.getFileContent(fileId);
      expect(retrieved).toBe(content);
    });

    test('file references achieve 95%+ savings', async () => {
      const largeFile = "x".repeat(10000); // 10KB
      const result = await optimizer.optimizeFileAttachment(largeFile, 'large.txt', 'text/plain');
      expect(result.savingsPercent).toBeGreaterThan(95);
    });

    test('handles empty file content gracefully', async () => {
      const result = await optimizer.optimizeFileAttachment('', 'empty.txt', 'text/plain');
      expect(result.savings).toBe(0);
    });

    test('generates unique IDs for identical content', async () => {
      const content = "Same content";
      const result1 = await optimizer.optimizeFileAttachment(content, 'file1.txt', 'text/plain');
      const result2 = await optimizer.optimizeFileAttachment(content, 'file2.txt', 'text/plain');

      const id1 = result1.optimizedContent.match(/ID: ([a-f0-9]+)/)[1];
      const id2 = result2.optimizedContent.match(/ID: ([a-f0-9]+)/)[1];

      expect(id1).toBe(id2); // SHA-256 hash should be same for same content
    });
  });

  describe('Message Optimization (Multi-Strategy)', () => {
    test('optimizes code blocks >500 tokens', async () => {
      const message = "Here's the code:\n```javascript\n" + "code line\n".repeat(600) + "```";
      const result = await optimizer.optimizeMessage(message);
      expect(result.strategy).toContain('code-blocks');
    });

    test('optimizes large JSON data >300 tokens', async () => {
      const largeJson = JSON.stringify({ data: Array(100).fill({ item: "value" }) });
      const message = `Analysis: ${largeJson}`;
      const result = await optimizer.optimizeMessage(message);
      expect(result.strategy).toContain('data-upload');
    });

    test('removes redundant whitespace', () => {
      const message = "Text\n\n\n\nMore text    with     spaces";
      const result = optimizer.removeRedundantWhitespace(message);
      expect(result).toBe("Text\n\nMore text with spaces");
    });

    test('compresses repeated patterns', () => {
      const message = "Line 1\nLine 2\nLine 1\nLine 3";
      const result = optimizer.compressRepeatedPatterns(message);
      expect(result.split('\n')).toHaveLength(3); // Deduped
    });

    test('multi-strategy optimization achieves 30-50% savings', async () => {
      const complexMessage = `
        Long description with redundant    whitespace

        \`\`\`javascript
        ${"code line\n".repeat(600)}
        \`\`\`

        JSON data: ${ JSON.stringify({ large: "data".repeat(100) }) }
      `;
      const result = await optimizer.optimizeMessage(complexMessage);
      expect(result.savingsPercent).toBeGreaterThan(30);
    });
  });

  describe('Context Summarization', () => {
    test('keeps all messages when under limit', () => {
      const session = createMockSession(5); // 5 messages
      const result = optimizer.optimizeSessionContext(session, 10);
      expect(result.savings).toBe(0);
      expect(result.strategy).toBe('no-optimization-needed');
    });

    test('summarizes old messages when over limit', () => {
      const session = createMockSession(50); // 50 messages
      const result = optimizer.optimizeSessionContext(session, 10);
      expect(result.strategy).toMatch(/context-summarization:\d+→1/);
      expect(JSON.parse(result.optimizedContent)).toHaveLength(12); // system + summary + 10 recent
    });

    test('preserves system messages in summarization', () => {
      const session = createMockSessionWithSystem(30);
      const result = optimizer.optimizeSessionContext(session, 10);
      const optimized = JSON.parse(result.optimizedContent);

      const systemMessages = optimized.filter(m => m.role === 'system');
      expect(systemMessages.length).toBeGreaterThan(0);
    });

    test('summary respects 200 token limit', () => {
      const session = createMockSession(100);
      const result = optimizer.optimizeSessionContext(session, 10);
      const optimized = JSON.parse(result.optimizedContent);

      const summaryMessage = optimized.find(m => m.content.includes('Previous conversation summary'));
      const tokens = optimizer.estimateTokens(summaryMessage.content);
      expect(tokens).toBeLessThanOrEqual(200);
    });

    test('achieves 60-80% savings on long conversations', () => {
      const session = createMockSession(50);
      const result = optimizer.optimizeSessionContext(session, 10);
      expect(result.savingsPercent).toBeGreaterThan(60);
      expect(result.savingsPercent).toBeLessThan(85);
    });
  });

  describe('Token Estimation', () => {
    test('estimates tokens accurately (±10%)', () => {
      const text = "This is a test sentence with about 10 words in it.";
      const estimated = optimizer.estimateTokens(text);
      // Rough check: 1 token ≈ 4 chars, so ~13 tokens expected
      expect(estimated).toBeGreaterThan(10);
      expect(estimated).toBeLessThan(20);
    });

    test('handles empty string', () => {
      expect(optimizer.estimateTokens('')).toBe(0);
    });

    test('handles very long text', () => {
      const longText = "word ".repeat(10000);
      const tokens = optimizer.estimateTokens(longText);
      expect(tokens).toBeGreaterThan(10000);
    });
  });

  describe('Cache Management', () => {
    test('clears cache entries older than expiration', () => {
      jest.useFakeTimers();

      optimizer.addFileReference('test1', 'content1');
      jest.advanceTimersByTime(2 * 3600000); // 2 hours
      optimizer.addFileReference('test2', 'content2');

      optimizer.clearCache(3600000); // Clear >1 hour

      expect(optimizer.getFileContent('test1')).toBeNull();
      expect(optimizer.getFileContent('test2')).not.toBeNull();

      jest.useRealTimers();
    });

    test('statistics reflect current cache state', () => {
      const stats = optimizer.getStatistics();
      expect(stats).toHaveProperty('templatesAvailable');
      expect(stats).toHaveProperty('filesReferenced');
      expect(stats).toHaveProperty('cacheSize');
      expect(stats.templatesAvailable).toBe(5); // 5 default templates
    });
  });

  describe('Edge Cases', () => {
    test('handles null/undefined input gracefully', () => {
      expect(() => optimizer.optimizeSystemPrompt(null)).not.toThrow();
      expect(() => optimizer.optimizeMessage(undefined)).not.toThrow();
    });

    test('handles extremely large files (>10MB)', async () => {
      const hugeFile = "x".repeat(10 * 1024 * 1024); // 10MB
      const result = await optimizer.optimizeFileAttachment(hugeFile, 'huge.txt', 'text/plain');
      expect(result.savingsPercent).toBeGreaterThan(99);
    });

    test('handles special characters in file names', async () => {
      const result = await optimizer.optimizeFileAttachment(
        'content',
        'file with spaces & special!@#.txt',
        'text/plain'
      );
      expect(result.optimizedContent).toContain('file with spaces & special!@#.txt');
    });

    test('handles binary MIME types', async () => {
      const binaryContent = Buffer.from([0x89, 0x50, 0x4E, 0x47]).toString();
      const result = await optimizer.optimizeFileAttachment(
        binaryContent,
        'image.png',
        'image/png'
      );
      expect(result.strategy).toBe('file-reference');
    });
  });
});
```

**Coverage Target:** 90%+ (brand new critical agent)

---

#### 1.2 Provider Tests

**Priority:** P1

```typescript
// tests/unit/providers/claude.test.ts
describe('ClaudeProvider', () => {
  test('initializes with valid API key');
  test('throws error with invalid API key');
  test('supports streaming responses');
  test('handles tool calling correctly');
  test('tracks token usage accurately');
  test('respects rate limits');
  test('retries on transient failures (429, 503)');
  test('fails fast on permanent errors (401, 403)');
  test('handles timeouts gracefully');
});

// Similar for gemini.test.ts, chatgpt.test.ts, ollama.test.ts, grok.test.ts

// tests/unit/providers/manager.test.ts
describe('ProviderManager', () => {
  test('registers all 6 providers correctly');
  test('switches providers dynamically');
  test('selects appropriate model');
  test('health check returns provider status');
  test('distributes load across healthy providers');
  test('fails over to backup provider on error');
});
```

---

#### 1.3 Middleware Tests

```typescript
// tests/unit/middleware/sanitization.test.ts
describe('Input Sanitization', () => {
  test('prevents XSS in message content');
  test('blocks SQL injection attempts');
  test('sanitizes HTML in user input');
  test('allows safe markdown');
  test('validates API endpoint inputs');
  test('escapes special characters');
});

// tests/unit/middleware/ratelimit.test.ts
describe('Rate Limiting', () => {
  test('allows requests within limit');
  test('blocks requests exceeding limit');
  test('resets limit after window expires');
  test('per-IP rate limiting works');
  test('per-session rate limiting works');
});
```

---

### 2. 🔗 Integration Tests

**Priority:** P1

```typescript
// tests/integration/api/optimizer.test.ts
describe('Optimizer API Integration', () => {
  test('POST /api/optimizer/prompt returns valid optimization', async () => {
    const response = await request(app)
      .post('/api/optimizer/prompt')
      .send({ prompt: "Long verbose prompt..." });

    expect(response.status).toBe(200);
    expect(response.body.optimization.savingsPercent).toBeGreaterThan(0);
  });

  test('POST /api/optimizer/file-upload → GET /api/optimizer/file/:id flow', async () => {
    const uploadRes = await request(app)
      .post('/api/optimizer/file-upload')
      .send({ content: "File content", filename: "test.txt", mimeType: "text/plain" });

    const fileId = uploadRes.body.optimization.optimizedContent.match(/ID: ([a-f0-9]+)/)[1];

    const retrieveRes = await request(app).get(`/api/optimizer/file/${fileId}`);
    expect(retrieveRes.body.content).toBe("File content");
  });

  test('POST /api/optimizer/clear-cache removes expired entries');
  test('GET /api/optimizer/stats returns accurate metrics');
});

// tests/integration/api/chat.test.ts
describe('Chat API Integration', () => {
  test('complete chat flow: register → session → chat → response');
  test('streaming chat returns SSE events');
  test('tool calling triggers and returns results');
  test('provider switching mid-conversation works');
  test('session persistence across requests');
});
```

---

### 3. 🌐 End-to-End Tests (Playwright)

**Priority:** P1

```typescript
// tests/e2e/playwright/chat-interface.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Chat Interface E2E', () => {
  test('loads chat interface successfully', async ({ page }) => {
    await page.goto('http://localhost:8080/chat.html');
    await expect(page.locator('#chat-container')).toBeVisible();
  });

  test('sends message and receives response', async ({ page }) => {
    await page.goto('http://localhost:8080/chat.html');

    // Select provider
    await page.selectOption('#provider-select', 'claude');

    // Type message
    await page.fill('#message-input', 'Hello, test message');
    await page.click('#send-button');

    // Wait for response
    await expect(page.locator('.message.assistant')).toBeVisible({ timeout: 10000 });
  });

  test('optimizer toggle works', async ({ page }) => {
    await page.goto('http://localhost:8080/chat.html');

    // Enable optimizer
    await page.check('#optimizer-toggle');

    // Send message
    await page.fill('#message-input', 'Test optimization');
    await page.click('#send-button');

    // Check for optimization stats
    await expect(page.locator('.optimization-stats')).toContainText('Saved');
  });
});

// tests/e2e/playwright/dashboard.spec.ts
test('dashboard displays statistics', async ({ page }) => {
  await page.goto('http://localhost:8080');
  await expect(page.locator('.stat-card')).toHaveCount(6);
  await expect(page.locator('.provider-status')).toContainText('Healthy');
});

// tests/e2e/flows/complete-chat-flow.spec.ts
test('complete user journey: onboarding → settings → chat', async ({ page }) => {
  // Step 1: Onboarding
  await page.goto('http://localhost:8080/onboarding.html');
  await page.click('#start-button');

  // Step 2: Settings
  await page.goto('http://localhost:8080/settings.html');
  await page.fill('#api-key-input', 'test-key');
  await page.click('#save-button');

  // Step 3: Chat
  await page.goto('http://localhost:8080/chat.html');
  await page.fill('#message-input', 'Hello');
  await page.click('#send-button');
  await expect(page.locator('.message.assistant')).toBeVisible();
});
```

---

### 4. ⚡ Performance Tests

**Priority:** P2

```typescript
// tests/performance/load/concurrent-users.test.ts
describe('Concurrent User Load Test', () => {
  test('handles 50 concurrent chat requests', async () => {
    const requests = Array(50).fill(null).map(() =>
      request(app).post('/chat').send({ sessionId: 'test', message: 'Hello' })
    );

    const results = await Promise.all(requests);
    const successRate = results.filter(r => r.status === 200).length / 50;

    expect(successRate).toBeGreaterThan(0.95); // 95%+ success rate
  });

  test('optimizer maintains performance under load', async () => {
    const start = Date.now();

    const requests = Array(100).fill(null).map(() =>
      request(app).post('/api/optimizer/message').send({ message: "Test" })
    );

    await Promise.all(requests);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(5000); // <5s for 100 requests
  });
});

// tests/performance/benchmarks/provider-latency.test.ts
describe('Provider Latency Benchmarks', () => {
  test('Claude response time <2s for simple query');
  test('Gemini response time <1.5s for simple query');
  test('ChatGPT response time <2s for simple query');
  test('Ollama-Local response time <5s');
  test('Optimizer adds <100ms overhead');
});
```

---

### 5. 🔒 Security Tests

**Priority:** P0

```typescript
// tests/security/api-key-exposure.test.ts
describe('API Key Security', () => {
  test('API keys never appear in responses', async () => {
    const response = await request(app).get('/health');
    expect(JSON.stringify(response.body)).not.toMatch(/sk-ant-/);
    expect(JSON.stringify(response.body)).not.toMatch(/sk-proj-/);
  });

  test('API keys not exposed in error messages', async () => {
    const response = await request(app)
      .post('/chat')
      .send({ invalid: 'data' });

    expect(response.body.error).not.toContain(process.env.ANTHROPIC_API_KEY);
  });

  test('secrets manager encrypts stored keys', () => {
    secretsManager.setSecret({ name: 'TEST_KEY', value: 'secret123', type: 'api_key' });

    const stored = fs.readFileSync('.secrets/store.json', 'utf8');
    expect(stored).not.toContain('secret123'); // Should be encrypted
  });
});

// tests/security/input-sanitization.test.ts
describe('Input Sanitization', () => {
  test('blocks XSS attempts', async () => {
    const xssPayload = '<script>alert("XSS")</script>';
    const response = await request(app)
      .post('/chat')
      .send({ sessionId: 'test', message: xssPayload });

    expect(response.body.response).not.toContain('<script>');
  });

  test('prevents SQL injection', async () => {
    const sqlPayload = "'; DROP TABLE sessions; --";
    const response = await request(app)
      .post('/database/query')
      .send({ connectionId: 'test', query: sqlPayload });

    expect(response.status).toBe(400); // Should be rejected
  });
});

// tests/security/cors-policy.test.ts
describe('CORS Policy', () => {
  test('allows requests from configured origins');
  test('blocks requests from unknown origins');
  test('handles preflight OPTIONS requests');
});
```

---

## Testing Framework Recommendations

### Primary Stack

**1. Unit & Integration Tests: Vitest**
- ✅ Fast execution (20x faster than Jest)
- ✅ Native ESM support
- ✅ Compatible with TypeScript
- ✅ Watch mode for development
- ✅ Built-in code coverage

```bash
npm install -D vitest @vitest/ui c8
```

**Configuration** (`vitest.config.ts`):
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.ts',
      ],
      // Critical paths: 80%+ coverage
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
    },
    setupFiles: ['./tests/helpers/setup.ts'],
    mockReset: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

---

**2. E2E Tests: Playwright**
- ✅ Already installed (@playwright/test v1.56.0)
- ✅ Cross-browser testing (Chromium, Firefox, WebKit)
- ✅ Auto-wait for elements
- ✅ Video/screenshot capture
- ✅ Network interception

**Configuration** (`playwright.config.ts`):
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

**3. Performance Tests: Artillery or k6**

**Artillery** (easier setup):
```bash
npm install -D artillery
```

**Test script** (`tests/performance/load-test.yml`):
```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Spike test"

scenarios:
  - name: "Chat API Load"
    flow:
      - post:
          url: "/chat"
          json:
            sessionId: "perf-test"
            message: "Performance test message"
```

---

### Test Utilities & Mocks

**Mock Provider** (`tests/mocks/providers/mock-provider.ts`):
```typescript
export class MockProvider implements AIProvider {
  async generateResponse(prompt: string): Promise<Response> {
    return {
      content: "Mock response",
      tokensUsed: 10,
      model: "mock-model",
    };
  }
}
```

**Test Server** (`tests/helpers/test-server.ts`):
```typescript
export async function setupTestServer() {
  const app = createApp();
  const server = await serve(app, { port: 0 }); // Random port
  return { app, server, port: server.port };
}
```

---

### Coverage Targets

| Category | Target | Priority |
|----------|--------|----------|
| **Chat Optimizer** | 90%+ | P0 (NEW) |
| **Providers** | 85%+ | P0 |
| **API Endpoints** | 80%+ | P1 |
| **Middleware** | 85%+ | P1 |
| **Tools** | 75%+ | P2 |
| **Utils** | 80%+ | P2 |
| **Overall** | 80%+ | - |

---

## Prioritized To-Do List

### P0 - CRITICAL (Fix Immediately)

**Security & Data Safety**

1. **API Key Exposure Prevention** - Impact: CRITICAL | Effort: 4h
   - Issue: API keys may leak in error messages or logs
   - Solution: Implement comprehensive key sanitization in all responses
   - Test: `tests/security/api-key-exposure.test.ts`
   - Dependencies: None
   ```typescript
   // Add global error handler sanitization
   app.onError((err, c) => {
     const sanitized = sanitizeError(err); // Remove all API keys
     return c.json({ error: sanitized }, 500);
   });
   ```

2. **Input Sanitization Missing** - Impact: CRITICAL | Effort: 6h
   - Issue: XSS and SQL injection vectors in chat input, database queries
   - Solution: Add validator middleware to all input endpoints
   - Test: `tests/security/input-sanitization.test.ts`
   - Dependencies: Install `validator` library (already in package.json)
   ```typescript
   import validator from 'validator';

   app.use('/chat', (c, next) => {
     const message = c.req.json().message;
     if (!validator.isLength(message, { max: 10000 })) {
       return c.json({ error: 'Message too long' }, 400);
     }
     // Sanitize HTML but allow markdown
     c.set('sanitizedMessage', validator.escape(message));
     return next();
   });
   ```

3. **Chat Optimizer Cache Overflow Risk** - Impact: HIGH | Effort: 3h
   - Issue: No max cache size enforcement (only 100MB config, not enforced)
   - Solution: Add cache size tracking and automatic expiration
   - File: `src/agents/chat-optimizer.ts`
   - Dependencies: None
   ```typescript
   private enforceMaxCacheSize(maxMB: number = 100): void {
     const maxBytes = maxMB * 1024 * 1024;
     const stats = this.getStatistics();

     if (stats.totalBytesCached > maxBytes) {
       // Clear oldest entries until under limit
       const sorted = Array.from(this.fileReferences.entries())
         .sort((a, b) => a[1].uploadedAt.getTime() - b[1].uploadedAt.getTime());

       let currentSize = stats.totalBytesCached;
       for (const [id, ref] of sorted) {
         if (currentSize <= maxBytes * 0.8) break; // Leave 20% buffer

         const content = this.messageCache.get(id);
         currentSize -= content?.length || 0;

         this.fileReferences.delete(id);
         this.messageCache.delete(id);
       }
     }
   }
   ```

4. **Secrets Manager Not Enforced** - Impact: HIGH | Effort: 5h
   - Issue: Basic implementation exists but not integrated with server
   - Solution: Migrate all provider initialization to use SecretsManager
   - Files: `src/server.ts`, `src/providers/manager.ts`
   - Dependencies: Complete secrets manager integration
   ```typescript
   // Replace direct process.env access with secretsManager
   const apiKey = secretsManager.getSecret('ANTHROPIC_API_KEY') ||
                  process.env.ANTHROPIC_API_KEY;
   ```

5. **No Rate Limiting on Optimizer Endpoints** - Impact: HIGH | Effort: 2h
   - Issue: 7 new optimizer endpoints lack rate limiting
   - Solution: Add rate limiting middleware
   - Dependencies: `hono-rate-limiter` (already installed)
   ```typescript
   import { rateLimiter } from 'hono-rate-limiter';

   const optimizerLimiter = rateLimiter({
     windowMs: 60 * 1000, // 1 minute
     limit: 100, // 100 requests per minute
     standardHeaders: true,
   });

   app.use('/api/optimizer/*', optimizerLimiter);
   ```

---

### P1 - HIGH (Before Production)

**Core Functionality & Testing**

6. **Chat Optimizer Test Suite Missing** - Impact: HIGH | Effort: 12h
   - Issue: Brand new 390-line agent with ZERO tests
   - Solution: Implement comprehensive test suite (see Unit Tests section above)
   - File: Create `tests/unit/agents/chat-optimizer.test.ts`
   - Dependencies: Vitest setup
   - Target: 90%+ coverage

7. **Provider Health Checks Unreliable** - Impact: HIGH | Effort: 6h
   - Issue: Health checks don't actually test API connectivity
   - Solution: Add real API validation calls
   - File: `src/providers/manager.ts`
   ```typescript
   async healthCheck(provider: string): Promise<HealthStatus> {
     try {
       // Make minimal API call (1 token)
       const result = await this.providers[provider].generateResponse(
         'test',
         { maxTokens: 1, temperature: 0 }
       );

       return {
         healthy: true,
         latency: result.latency,
         lastChecked: new Date(),
       };
     } catch (error) {
       return {
         healthy: false,
         error: error.message,
         lastChecked: new Date(),
       };
     }
   }
   ```

8. **Session Cleanup Not Automatic** - Impact: MEDIUM | Effort: 4h
   - Issue: Background cleanup job exists but not running automatically
   - Solution: Start cleanup interval on server startup
   - File: `src/server.ts`
   ```typescript
   // Add to server initialization
   setInterval(() => {
     const inactive = cleanupInactiveSessions(24 * 3600000); // 24h
     console.log(`🧹 Cleaned up ${inactive} inactive sessions`);
   }, 3600000); // Every hour
   ```

9. **Ollama-Cloud Configuration Missing** - Impact: MEDIUM | Effort: 3h
   - Issue: Split to Ollama-Local and Ollama-Cloud but no cloud config
   - Solution: Add OLLAMA_CLOUD_URL environment variable support
   - Files: `.env.example`, `src/providers/ollama.ts`
   ```typescript
   const ollamaUrl = config.variant === 'cloud'
     ? process.env.OLLAMA_CLOUD_URL || 'https://cloud-ollama.example.com'
     : 'http://localhost:11434';
   ```

10. **Error Handling Inconsistent** - Impact: MEDIUM | Effort: 8h
    - Issue: Some endpoints return 500, others 400 for same error types
    - Solution: Standardize error responses across all endpoints
    - File: Create `src/middleware/error-handler.ts`
    ```typescript
    export class APIError extends Error {
      constructor(
        public statusCode: number,
        public code: string,
        message: string,
        public details?: any
      ) {
        super(message);
      }
    }

    // Use consistently
    throw new APIError(400, 'INVALID_SESSION', 'Session not found');
    ```

11. **No E2E Test Coverage** - Impact: HIGH | Effort: 16h
    - Issue: Playwright installed but no comprehensive E2E tests
    - Solution: Implement E2E test suite for all 6 dashboard pages
    - Files: Create `tests/e2e/playwright/*.spec.ts`
    - Dependencies: Playwright config
    - Target: All critical user flows covered

12. **Token Estimation Inaccurate** - Impact: MEDIUM | Effort: 4h
    - Issue: Chat optimizer uses rough 4-char/token estimation
    - Solution: Integrate tiktoken for accurate token counting
    - File: `src/agents/chat-optimizer.ts`
    - Dependencies: Install `@anthropic-ai/tokenizer` or `tiktoken`
    ```typescript
    import { encoding_for_model } from 'tiktoken';

    private estimateTokens(text: string, model: string = 'gpt-4'): number {
      const encoding = encoding_for_model(model);
      const tokens = encoding.encode(text);
      encoding.free();
      return tokens.length;
    }
    ```

---

### P2 - MEDIUM (Next Iteration)

**Enhancements & Code Quality**

13. **TypeScript Strict Mode Disabled** - Impact: MEDIUM | Effort: 10h
    - Issue: `tsconfig.json` likely has loose typing
    - Solution: Enable strict mode and fix type errors
    - File: `tsconfig.json`
    ```json
    {
      "compilerOptions": {
        "strict": true,
        "noImplicitAny": true,
        "strictNullChecks": true
      }
    }
    ```

14. **No Request Validation Schema** - Impact: MEDIUM | Effort: 6h
    - Issue: Manual validation in endpoints, error-prone
    - Solution: Use Zod schemas for all API endpoints
    - Dependencies: `zod` (already installed)
    ```typescript
    import { z } from 'zod';

    const chatSchema = z.object({
      sessionId: z.string().min(1),
      message: z.string().min(1).max(10000),
      streaming: z.boolean().optional(),
    });

    app.post('/chat', async (c) => {
      const body = await c.req.json();
      const validated = chatSchema.parse(body); // Throws on invalid
      // ...
    });
    ```

15. **Logging Inconsistent** - Impact: LOW | Effort: 4h
    - Issue: Mix of console.log, console.error, no structured logging
    - Solution: Implement structured logging with Winston or Pino
    - Dependencies: Install `pino` or `winston`
    ```typescript
    import pino from 'pino';

    const logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    });

    // Use consistently
    logger.info({ sessionId, provider }, 'Chat request received');
    logger.error({ error, sessionId }, 'Chat request failed');
    ```

16. **No Metrics Collection** - Impact: MEDIUM | Effort: 8h
    - Issue: Stats endpoint exists but no time-series metrics
    - Solution: Add Prometheus metrics or similar
    - Dependencies: Install `prom-client`
    ```typescript
    import { Counter, Histogram, register } from 'prom-client';

    const requestCounter = new Counter({
      name: 'mcp_bridge_requests_total',
      help: 'Total requests',
      labelNames: ['endpoint', 'status'],
    });

    app.get('/metrics', async (c) => {
      return c.text(await register.metrics());
    });
    ```

17. **Chat Optimizer Templates Hardcoded** - Impact: LOW | Effort: 4h
    - Issue: Only 5 templates, no way to add custom ones
    - Solution: Add API endpoint to register custom templates
    - File: `src/server.ts`
    ```typescript
    app.post('/api/optimizer/templates', async (c) => {
      const template = await c.req.json();
      chatOptimizer.addTemplate(template);
      return c.json({ success: true, template });
    });

    app.get('/api/optimizer/templates', (c) => {
      return c.json({ templates: chatOptimizer.listTemplates() });
    });
    ```

18. **Frontend Build Process Missing** - Impact: MEDIUM | Effort: 6h
    - Issue: No minification, no TypeScript compilation for frontend
    - Solution: Add Vite or esbuild for dashboard
    - Files: Create `dashboard/vite.config.ts`
    ```bash
    cd dashboard && npm init -y
    npm install -D vite
    ```

19. **No Database Migration System** - Impact: LOW | Effort: 4h
    - Issue: Database schema changes not versioned
    - Solution: Add migration system (if using persistent DB)
    - Dependencies: `node-pg-migrate` or similar

20. **Ollama Model Auto-Detection** - Impact: LOW | Effort: 3h
    - Issue: Must manually specify model, doesn't check availability
    - Solution: Query Ollama API for available models
    - File: `src/providers/ollama.ts`
    ```typescript
    async getAvailableModels(): Promise<string[]> {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      const data = await response.json();
      return data.models.map(m => m.name);
    }
    ```

---

### P3 - LOW (Future)

**Nice-to-Have Features**

21. **GraphQL API Alternative** - Impact: LOW | Effort: 16h
    - Enhancement: Offer GraphQL alongside REST
    - Solution: Add GraphQL layer with Apollo Server

22. **WebSocket Bi-directional Chat** - Impact: LOW | Effort: 12h
    - Enhancement: Real-time bidirectional communication
    - Solution: Implement WebSocket server for chat

23. **Multi-language SDK** - Impact: LOW | Effort: 20h
    - Enhancement: Python, Go, Rust client libraries
    - Solution: Generate SDKs from OpenAPI spec

24. **Admin Dashboard** - Impact: LOW | Effort: 24h
    - Enhancement: Web UI for managing servers, keys, users
    - Solution: Build React admin panel

25. **Cost Tracking Per User** - Impact: LOW | Effort: 8h
    - Enhancement: Track token usage and costs per user/API key
    - Solution: Add usage tracking tables

26. **A/B Testing Framework** - Impact: LOW | Effort: 10h
    - Enhancement: Test different prompts, models
    - Solution: Add experiment framework

27. **Prompt Template Marketplace** - Impact: LOW | Effort: 16h
    - Enhancement: Community-contributed templates
    - Solution: Build template repository system

28. **Auto-Scaling Configuration** - Impact: LOW | Effort: 6h
    - Enhancement: Railway auto-scaling based on load
    - Solution: Configure horizontal scaling rules

29. **Backup & Restore Tools** - Impact: LOW | Effort: 8h
    - Enhancement: Backup sessions, configs, secrets
    - Solution: Add CLI tools for backup/restore

30. **Performance Monitoring Dashboard** - Impact: LOW | Effort: 12h
    - Enhancement: Real-time metrics visualization
    - Solution: Integrate Grafana or custom dashboard

---

## Implementation Roadmap

### Phase 1: Critical Security & Testing (Week 1)
**Goal:** Production-ready security and quality

- [ ] Day 1-2: P0 items 1-3 (Security fixes)
- [ ] Day 3-4: P0 items 4-5 (Secrets & rate limiting)
- [ ] Day 5-7: P1 item 6 (Chat optimizer tests - comprehensive)

**Deliverables:**
- ✅ All API keys secured
- ✅ Input sanitization complete
- ✅ 90%+ test coverage for Chat Optimizer

---

### Phase 2: Core Functionality Hardening (Week 2)
**Goal:** Reliable, tested core features

- [ ] Day 1-2: P1 items 7-8 (Health checks, session cleanup)
- [ ] Day 3-4: P1 items 9-10 (Ollama-Cloud, error handling)
- [ ] Day 5-7: P1 items 11-12 (E2E tests, token estimation)

**Deliverables:**
- ✅ Reliable provider health monitoring
- ✅ Automatic session cleanup
- ✅ E2E test coverage for critical flows

---

### Phase 3: Code Quality & DX (Week 3)
**Goal:** Maintainable, developer-friendly codebase

- [ ] Day 1-2: P2 items 13-14 (TypeScript strict, Zod validation)
- [ ] Day 3-4: P2 items 15-16 (Structured logging, metrics)
- [ ] Day 5-7: P2 items 17-20 (Template API, frontend build, migrations)

**Deliverables:**
- ✅ Type-safe codebase
- ✅ Comprehensive request validation
- ✅ Production-grade monitoring

---

### Phase 4: Enhancements & Polish (Week 4)
**Goal:** Production-ready platform

- [ ] Day 1-3: Final testing and bug fixes
- [ ] Day 4-5: Documentation updates
- [ ] Day 6-7: Performance testing and optimization

**Deliverables:**
- ✅ 80%+ overall test coverage
- ✅ Complete API documentation
- ✅ Load tested for production traffic

---

## Testing Commands

### Local Development
```bash
# Run all tests
npm test

# Run specific suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests (Playwright)
npx playwright test
npx playwright test --ui  # Interactive mode
npx playwright test --headed  # See browser

# Performance tests
npm run test:performance
```

### CI/CD Integration
```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

---

## Summary Statistics

### Current State
- **Existing Tests:** Minimal (test-orchestrator.ts only)
- **Test Coverage:** <10% estimated
- **Production Readiness:** 60%
- **Critical Issues:** 5 (P0)
- **High Priority Issues:** 7 (P1)

### Target State (After Implementation)
- **Total Tests:** 150+ tests
- **Test Coverage:** 80%+ overall, 90%+ for Chat Optimizer
- **Production Readiness:** 95%
- **CI/CD:** Fully automated
- **Security:** Hardened and validated

### Estimated Timeline
- **Phase 1 (Critical):** 1 week
- **Phase 2 (Core):** 1 week
- **Phase 3 (Quality):** 1 week
- **Phase 4 (Polish):** 1 week
- **Total:** 4 weeks to production-ready state

---

## Next Steps

1. **Immediate (This Week):**
   - Fix P0 security issues (API key exposure, input sanitization)
   - Implement Chat Optimizer test suite (90%+ coverage)
   - Add rate limiting to optimizer endpoints

2. **Short-term (Next 2 Weeks):**
   - Complete E2E test coverage
   - Improve provider health checks
   - Standardize error handling

3. **Medium-term (Month 2):**
   - Code quality improvements (TypeScript strict, Zod validation)
   - Monitoring and observability
   - Performance testing

---

**Document Status:** ✅ Complete
**Confidence Level:** High (comprehensive analysis based on codebase review)
**Recommendation:** Start with P0 items immediately, then follow phased approach
