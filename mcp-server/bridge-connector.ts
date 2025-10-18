#!/usr/bin/env node
/**
 * MCP Bridge Connector Server
 *
 * This MCP server allows local AI apps (Claude Desktop, ChatGPT Desktop, etc.)
 * to connect to your MCP Bridge and use all integrations remotely.
 *
 * Setup in Claude Desktop config:
 * {
 *   "mcpServers": {
 *     "mcp-bridge": {
 *       "command": "node",
 *       "args": ["C:/Users/claus/mcp-bridge/mcp-server/bridge-connector.js"]
 *     }
 *   }
 * }
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// MCP Bridge connection config
const BRIDGE_URL = process.env.MCP_BRIDGE_URL || 'http://localhost:3000';
const BRIDGE_API_KEY = process.env.MCP_BRIDGE_API_KEY || '';

interface Tool {
  name: string;
  description: string;
  inputSchema: any;
}

class BridgeConnectorServer {
  private server: Server;
  private deviceId: string | null = null;
  private sessionId: string | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-bridge-connector',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools from MCP Bridge
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = await this.getAvailableTools();

      return { tools };
    });

    // Execute tool calls via MCP Bridge
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      const result = await this.executeTool(name, args || {});

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    });
  }

  /**
   * Get available tools from MCP Bridge
   */
  private async getAvailableTools(): Promise<Tool[]> {
    try {
      const response = await fetch(`${BRIDGE_URL}/`);
      const data = await response.json();

      const tools: Tool[] = [
        // Chat with AI providers
        {
          name: 'chat',
          description: 'Send message to AI provider (Claude, ChatGPT, Gemini, Ollama) via MCP Bridge',
          inputSchema: {
            type: 'object',
            properties: {
              provider: {
                type: 'string',
                enum: ['claude', 'chatgpt', 'gemini', 'grok', 'ollama-local', 'ollama-cloud'],
                description: 'AI provider to use',
              },
              message: {
                type: 'string',
                description: 'Message to send',
              },
              model: {
                type: 'string',
                description: 'Model to use (optional)',
              },
            },
            required: ['provider', 'message'],
          },
        },

        // Chat Optimizer
        {
          name: 'optimize_prompt',
          description: 'Optimize system prompt using templates (60-85% token savings)',
          inputSchema: {
            type: 'object',
            properties: {
              prompt: {
                type: 'string',
                description: 'System prompt to optimize',
              },
            },
            required: ['prompt'],
          },
        },

        {
          name: 'optimize_message',
          description: 'Optimize message content (40-70% token savings)',
          inputSchema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'Message to optimize',
              },
            },
            required: ['message'],
          },
        },

        // Integrations
        {
          name: 'list_integrations',
          description: 'List all configured integrations (Gmail, Calendar, etc.)',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },

        {
          name: 'execute_integration',
          description: 'Execute integration call (Gmail, Google Calendar, etc.)',
          inputSchema: {
            type: 'object',
            properties: {
              integrationId: {
                type: 'string',
                description: 'Integration ID',
              },
              endpoint: {
                type: 'string',
                description: 'API endpoint to call',
              },
              method: {
                type: 'string',
                enum: ['GET', 'POST', 'PUT', 'DELETE'],
                description: 'HTTP method',
              },
              data: {
                type: 'object',
                description: 'Request data',
              },
            },
            required: ['integrationId', 'endpoint'],
          },
        },

        // MCP Orchestrator
        {
          name: 'analyze_task',
          description: 'Analyze task and get MCP server recommendations',
          inputSchema: {
            type: 'object',
            properties: {
              taskDescription: {
                type: 'string',
                description: 'Description of the task',
              },
              context: {
                type: 'object',
                description: 'Additional context',
              },
            },
            required: ['taskDescription'],
          },
        },
      ];

      return tools;
    } catch (error: any) {
      console.error('[BridgeConnector] Failed to fetch tools:', error.message);
      return [];
    }
  }

  /**
   * Execute tool via MCP Bridge
   */
  private async executeTool(name: string, args: Record<string, any>): Promise<any> {
    // Ensure device and session are initialized
    if (!this.deviceId || !this.sessionId) {
      await this.initialize();
    }

    // Route tool to appropriate endpoint
    switch (name) {
      case 'chat':
        return this.executeChat(args);

      case 'optimize_prompt':
        return this.executeOptimizePrompt(args);

      case 'optimize_message':
        return this.executeOptimizeMessage(args);

      case 'list_integrations':
        return this.executeListIntegrations();

      case 'execute_integration':
        return this.executeIntegrationCall(args);

      case 'analyze_task':
        return this.executeAnalyzeTask(args);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /**
   * Initialize device and session
   */
  private async initialize(): Promise<void> {
    // Register device
    const deviceResponse = await fetch(`${BRIDGE_URL}/devices/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'MCP Bridge Connector',
        type: 'mcp-server',
      }),
    });

    const deviceData = await deviceResponse.json();
    this.deviceId = deviceData.device.id;

    // Create session
    const sessionResponse = await fetch(`${BRIDGE_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: this.deviceId,
        config: {
          provider: 'claude',
          model: 'claude-sonnet-4-5-20250929',
        },
      }),
    });

    const sessionData = await sessionResponse.json();
    this.sessionId = sessionData.session.id;

    console.error('[BridgeConnector] Initialized with session:', this.sessionId);
  }

  /**
   * Execute chat via MCP Bridge
   */
  private async executeChat(args: Record<string, any>): Promise<any> {
    const response = await fetch(`${BRIDGE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.sessionId,
        message: args.message,
      }),
    });

    return response.json();
  }

  /**
   * Execute prompt optimization
   */
  private async executeOptimizePrompt(args: Record<string, any>): Promise<any> {
    const response = await fetch(`${BRIDGE_URL}/api/optimizer/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: args.prompt }),
    });

    return response.json();
  }

  /**
   * Execute message optimization
   */
  private async executeOptimizeMessage(args: Record<string, any>): Promise<any> {
    const response = await fetch(`${BRIDGE_URL}/api/optimizer/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: args.message }),
    });

    return response.json();
  }

  /**
   * List integrations
   */
  private async executeListIntegrations(): Promise<any> {
    const response = await fetch(`${BRIDGE_URL}/api/integrations`);
    return response.json();
  }

  /**
   * Execute integration call
   */
  private async executeIntegrationCall(args: Record<string, any>): Promise<any> {
    const response = await fetch(
      `${BRIDGE_URL}/api/integrations/${args.integrationId}/execute`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: args.endpoint,
          method: args.method,
          data: args.data,
        }),
      }
    );

    return response.json();
  }

  /**
   * Execute task analysis
   */
  private async executeAnalyzeTask(args: Record<string, any>): Promise<any> {
    const response = await fetch(`${BRIDGE_URL}/api/mcp/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskDescription: args.taskDescription,
        context: args.context,
      }),
    });

    return response.json();
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[BridgeConnector] MCP server running');
  }
}

// Start server
const server = new BridgeConnectorServer();
server.run().catch(console.error);
