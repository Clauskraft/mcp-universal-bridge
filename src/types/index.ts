import { z } from 'zod';

// ==================== Core Types ====================

export type AIProvider = 'claude' | 'gemini' | 'chatgpt';
export type DeviceType = 'web' | 'mobile' | 'desktop' | 'server';
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

// ==================== Device Management ====================

export const DeviceCapabilitiesSchema = z.object({
  streaming: z.boolean().default(true),
  tools: z.boolean().default(true),
  vision: z.boolean().default(false),
  audio: z.boolean().default(false),
});

export const DeviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['web', 'mobile', 'desktop', 'server']),
  capabilities: DeviceCapabilitiesSchema,
  connectedAt: z.date(),
  lastActive: z.date(),
});

export type DeviceCapabilities = z.infer<typeof DeviceCapabilitiesSchema>;
export type Device = z.infer<typeof DeviceSchema>;

// ==================== Message System ====================

export const ToolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  arguments: z.record(z.any()),
});

export const ToolResultSchema = z.object({
  id: z.string(),
  result: z.any(),
  error: z.string().optional(),
});

export const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  toolCalls: z.array(ToolCallSchema).optional(),
  toolResults: z.array(ToolResultSchema).optional(),
  timestamp: z.date(),
});

export type ToolCall = z.infer<typeof ToolCallSchema>;
export type ToolResult = z.infer<typeof ToolResultSchema>;
export type Message = z.infer<typeof MessageSchema>;

// ==================== Session Management ====================

export const SessionConfigSchema = z.object({
  provider: z.enum(['claude', 'gemini', 'chatgpt']),
  model: z.string(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().positive().optional(),
  systemPrompt: z.string().optional(),
  tools: z.array(z.any()).optional(),
});

export const SessionSchema = z.object({
  id: z.string(),
  deviceId: z.string(),
  config: SessionConfigSchema,
  messages: z.array(MessageSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
  active: z.boolean(),
});

export type SessionConfig = z.infer<typeof SessionConfigSchema>;
export type Session = z.infer<typeof SessionSchema>;

// ==================== AI Provider Interface ====================

export interface ChatRequest {
  sessionId: string;
  message: string;
  streaming?: boolean;
  tools?: Array<{
    name: string;
    description: string;
    parameters: Record<string, any>;
  }>;
}

export interface ChatResponse {
  sessionId: string;
  message: Message;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost?: number;
  };
  toolCalls?: ToolCall[];
  finishReason: 'stop' | 'length' | 'tool_calls' | 'error';
}

export interface StreamChunk {
  sessionId: string;
  delta: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  toolCalls?: ToolCall[];
  done: boolean;
}

export interface ProviderConfig {
  apiKey: string;
  model: string;
  baseURL?: string;
  timeout?: number;
}

export interface ProviderHealth {
  provider: AIProvider;
  healthy: boolean;
  latency?: number;
  error?: string;
  checkedAt: Date;
}

// ==================== API Request/Response Types ====================

export const RegisterDeviceRequestSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['web', 'mobile', 'desktop', 'server']),
  capabilities: DeviceCapabilitiesSchema.optional(),
});

export const CreateSessionRequestSchema = z.object({
  deviceId: z.string(),
  config: SessionConfigSchema,
});

export const SendMessageRequestSchema = z.object({
  sessionId: z.string(),
  message: z.string().min(1),
  streaming: z.boolean().optional(),
  tools: z.array(z.any()).optional(),
});

export const ExecuteToolRequestSchema = z.object({
  sessionId: z.string(),
  toolResults: z.array(ToolResultSchema),
});

export type RegisterDeviceRequest = z.infer<typeof RegisterDeviceRequestSchema>;
export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;
export type ExecuteToolRequest = z.infer<typeof ExecuteToolRequestSchema>;

// ==================== Statistics & Monitoring ====================

export interface Statistics {
  totalDevices: number;
  activeDevices: number;
  totalSessions: number;
  activeSessions: number;
  messagesSent: number;
  tokensUsed: number;
  providers: {
    [key in AIProvider]: {
      requests: number;
      tokens: number;
      errors: number;
      avgLatency: number;
    };
  };
  uptime: number;
  startedAt: Date;
}

// ==================== Error Types ====================

export class BridgeError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'BridgeError';
  }
}

export class ProviderError extends BridgeError {
  constructor(message: string, public provider: AIProvider, details?: any) {
    super(message, 'PROVIDER_ERROR', 502, { provider, ...details });
    this.name = 'ProviderError';
  }
}

export class SessionError extends BridgeError {
  constructor(message: string, details?: any) {
    super(message, 'SESSION_ERROR', 400, details);
    this.name = 'SessionError';
  }
}

export class DeviceError extends BridgeError {
  constructor(message: string, details?: any) {
    super(message, 'DEVICE_ERROR', 400, details);
    this.name = 'DeviceError';
  }
}
