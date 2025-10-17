# 🚀 MCP Bridge Production Integration Guide

## ✅ Deployment Status

**Production URL:** https://web-production-d9b2.up.railway.app
**Status:** ✅ LIVE and WORKING
**Health Check:** https://web-production-d9b2.up.railway.app/health

## 🔌 Working API Endpoints

### ✅ Basic Endpoints (CONFIRMED WORKING)
```javascript
// Health Check
fetch('https://web-production-d9b2.up.railway.app/health')
  .then(res => res.json())
  .then(data => console.log(data));

// Server Info
fetch('https://web-production-d9b2.up.railway.app/')
  .then(res => res.json())
  .then(data => console.log(data));

// Statistics
fetch('https://web-production-d9b2.up.railway.app/stats')
  .then(res => res.json())
  .then(data => console.log(data));
```

### 🤖 MCP Orchestrator API (CONFIRMED WORKING)
```javascript
const BRIDGE_URL = 'https://web-production-d9b2.up.railway.app';

// Analyze a task for MCP server recommendations
fetch(`${BRIDGE_URL}/mcp/analyze`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    taskDescription: "I need to rename a function across my codebase",
    context: { language: "typescript", files: 150 }
  })
})
.then(res => res.json())
.then(data => {
  console.log('Recommended MCP Servers:', data.analysis.suggestedServers);
  console.log('Task Type:', data.analysis.taskType);
  console.log('Reasoning:', data.analysis.reasoning);
});

// Get MCP server capabilities
fetch(`${BRIDGE_URL}/mcp/capabilities`)
  .then(res => res.json())
  .then(data => console.log('Available capabilities:', data));

// Get orchestrator statistics
fetch(`${BRIDGE_URL}/mcp/stats`)
  .then(res => res.json())
  .then(data => console.log('MCP Stats:', data));
```

## 🔧 Frontend Integration Example

### Complete Integration for Your GitHub Codespace App

```javascript
// mcp-bridge-client.js
class MCPBridgeClient {
  constructor() {
    this.baseURL = 'https://web-production-d9b2.up.railway.app';
  }

  // Health check
  async checkHealth() {
    const response = await fetch(`${this.baseURL}/health`);
    return response.json();
  }

  // MCP Task Analysis
  async analyzeMCPTask(taskDescription, context = {}) {
    const response = await fetch(`${this.baseURL}/mcp/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskDescription, context })
    });
    return response.json();
  }

  // Create execution strategy
  async createStrategy(analysis) {
    const response = await fetch(`${this.baseURL}/mcp/strategy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis })
    });
    return response.json();
  }

  // Record execution results for learning
  async recordExecution(taskType, serversUsed, success, duration, userFeedback) {
    const response = await fetch(`${this.baseURL}/mcp/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskType,
        serversUsed,
        success,
        duration,
        userFeedback
      })
    });
    return response.json();
  }

  // Get MCP capabilities
  async getCapabilities() {
    const response = await fetch(`${this.baseURL}/mcp/capabilities`);
    return response.json();
  }

  // Get statistics
  async getStats() {
    const response = await fetch(`${this.baseURL}/mcp/stats`);
    return response.json();
  }
}

// Usage Example
const mcpBridge = new MCPBridgeClient();

// Example: Intelligent MCP server selection
async function selectMCPServers(taskDescription) {
  try {
    // 1. Analyze the task
    const { analysis } = await mcpBridge.analyzeMCPTask(taskDescription, {
      projectType: 'typescript',
      codebaseSize: 'large'
    });

    console.log('Task Analysis:', analysis);
    console.log('Recommended Servers:', analysis.suggestedServers);

    // 2. Create execution strategy
    const { strategy } = await mcpBridge.createStrategy(analysis);
    console.log('Execution Strategy:', strategy);

    // 3. Execute with recommended servers (your implementation)
    const startTime = Date.now();
    const success = await executeWithServers(strategy.servers); // Your function

    // 4. Record results for learning
    await mcpBridge.recordExecution(
      analysis.taskType,
      strategy.servers.map(s => s.name),
      success,
      Date.now() - startTime,
      'Worked perfectly!'
    );

    return strategy;
  } catch (error) {
    console.error('MCP Bridge Error:', error);
  }
}

// Test the integration
selectMCPServers("I need to find all references to a class and rename it");
```

## 🎯 Integration with Your GitHub Codespace

### Step 1: Add to your HTML
```html
<!-- Add to your GitHub Codespace app -->
<script src="mcp-bridge-client.js"></script>
```

### Step 2: Use in your application
```javascript
// In your main application code
document.addEventListener('DOMContentLoaded', async () => {
  const mcpBridge = new MCPBridgeClient();

  // Check if bridge is healthy
  const health = await mcpBridge.checkHealth();
  console.log('MCP Bridge Status:', health.status);

  // Get available capabilities
  const capabilities = await mcpBridge.getCapabilities();
  console.log('Available MCP Servers:', Object.keys(capabilities.capabilities));
});
```

### Step 3: Intelligent Task Routing
```javascript
// Example: User requests help with a task
async function handleUserTask(userInput) {
  const mcpBridge = new MCPBridgeClient();

  // Analyze what MCP servers would be best
  const { analysis } = await mcpBridge.analyzeMCPTask(userInput);

  // Display recommendations to user
  const recommendationDiv = document.getElementById('recommendations');
  recommendationDiv.innerHTML = `
    <h3>Recommended MCP Servers:</h3>
    <ul>
      ${analysis.suggestedServers.map(server => `
        <li>
          <strong>${server.name}</strong> (Score: ${server.matchScore})
          <br>Reason: ${server.reasoning}
        </li>
      `).join('')}
    </ul>
    <p>Task Type: ${analysis.taskType}</p>
    <p>Complexity: ${analysis.complexity}</p>
  `;
}
```

## 📊 Example Responses

### Task Analysis Response
```json
{
  "analysis": {
    "taskType": "symbol_operation",
    "complexity": 0.8,
    "requiredCapabilities": ["semantic_search", "symbol_operations"],
    "suggestedServers": [
      {
        "name": "serena",
        "matchScore": 0.95,
        "reasoning": "Best for symbol operations and semantic code search",
        "capabilities": ["symbol_operations", "semantic_search"]
      }
    ],
    "reasoning": "Task involves renaming symbols across codebase",
    "proactiveFlags": ["use_project_memory", "cache_results"]
  }
}
```

### MCP Capabilities Response
```json
{
  "capabilities": {
    "serena": [
      "Symbol operations (find, rename, references)",
      "Semantic code search",
      "Project memory and onboarding"
    ],
    "context7": [
      "Official documentation lookup",
      "Library and framework guides"
    ],
    "magic": [
      "UI component generation from 21st.dev"
    ]
  }
}
```

## 🚨 Known Issues

1. **External Data API**: Currently returns 502 errors due to dynamic import issues
   - Workaround: Use MCP Orchestrator API instead
   - Will be fixed in next deployment

2. **CORS**: May need to configure for your domain
   - Current CORS allows localhost:8080
   - Update needed for your GitHub Codespace domain

## 📚 API Documentation

### MCP Orchestrator Endpoints

| Endpoint | Method | Description |
|----------|---------|------------|
| `/mcp/analyze` | POST | Analyze task and get server recommendations |
| `/mcp/strategy` | POST | Create execution strategy from analysis |
| `/mcp/record` | POST | Record execution results for learning |
| `/mcp/stats` | GET | Get orchestrator statistics |
| `/mcp/capabilities` | GET | Get server capabilities map |

### Request/Response Examples

See full examples above in the integration code.

## 🎉 Summary

**Your Railway deployment is LIVE and working!**

- ✅ Server is running on Railway
- ✅ Health endpoint responds
- ✅ MCP Orchestrator API works
- ✅ Statistics and monitoring work
- ⚠️ External Data API needs fix (dynamic imports issue)

**Production URL:** https://web-production-d9b2.up.railway.app

Use the integration code above to connect your GitHub Codespace application!