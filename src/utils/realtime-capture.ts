import { WebSocket, WebSocketServer } from 'ws';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { BridgeError } from '../types/index.js';

/**
 * Real-Time Capture Event
 */
export interface CaptureEvent {
  timestamp: string;
  sessionId: string;
  platform: string;
  data: any;
  metadata?: Record<string, any>;
}

/**
 * Capture Session
 */
export interface CaptureSession {
  id: string;
  title: string;
  platform: string;
  startedAt: Date;
  endedAt?: Date;
  status: 'active' | 'completed' | 'failed';
  eventCount: number;
  metadata?: Record<string, any>;
}

/**
 * Real-Time Capture Manager
 *
 * PART 1: Generic Real-Time Data Capture Layer
 *
 * This is a reusable component for capturing real-time data streams
 * from various sources (Teams, Zoom, browsers, apps, etc.)
 *
 * Responsibilities:
 * - WebSocket server for receiving real-time data
 * - Session management
 * - Event buffering and storage
 * - Multi-client support
 * - Stream coordination
 */
export class RealtimeCaptureManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, ClientInfo> = new Map();
  private sessions: Map<string, CaptureSession> = new Map();
  private eventBuffer: Map<string, CaptureEvent[]> = new Map();
  private storageDir: string;
  private sessionsFile: string;
  private eventHandlers: Map<string, EventHandler[]> = new Map();

  constructor(storageDir: string = './capture-sessions') {
    this.storageDir = storageDir;
    this.sessionsFile = join(storageDir, 'sessions.json');

    // Create storage directory
    if (!existsSync(this.storageDir)) {
      mkdirSync(this.storageDir, { recursive: true });
    }

    // Load existing sessions
    this.loadSessions();

    console.log('[RealtimeCapture] Manager initialized');
  }

  /**
   * Initialize WebSocket server
   */
  initializeWebSocketServer(wss: WebSocketServer): void {
    this.wss = wss;

    wss.on('connection', (ws: WebSocket) => {
      console.log('[RealtimeCapture] New client connected');

      const clientInfo: ClientInfo = {
        id: `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        connectedAt: new Date(),
        activeSessions: new Set(),
      };

      this.clients.set(ws, clientInfo);

      // Handle messages from client
      ws.on('message', (data: Buffer) => {
        this.handleClientMessage(ws, clientInfo, data);
      });

      // Handle client disconnect
      ws.on('close', () => {
        console.log('[RealtimeCapture] Client disconnected:', clientInfo.id);
        this.clients.delete(ws);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('[RealtimeCapture] WebSocket error:', error.message);
      });
    });

    console.log('[RealtimeCapture] WebSocket server initialized');
  }

  /**
   * Handle message from client
   */
  private handleClientMessage(ws: WebSocket, clientInfo: ClientInfo, data: Buffer): void {
    try {
      const message = JSON.parse(data.toString());
      console.log('[RealtimeCapture] Client message:', message.type);

      switch (message.type) {
        case 'REGISTER':
          this.handleRegister(ws, clientInfo, message);
          break;

        case 'CREATE_SESSION':
          this.handleCreateSession(ws, clientInfo, message);
          break;

        case 'END_SESSION':
          this.handleEndSession(ws, clientInfo, message);
          break;

        case 'CAPTION_DATA':
          this.handleCaptionData(ws, clientInfo, message);
          break;

        case 'PING':
          this.sendToClient(ws, { type: 'PONG' });
          break;

        default:
          console.warn('[RealtimeCapture] Unknown message type:', message.type);
          this.sendToClient(ws, {
            type: 'ERROR',
            error: 'Unknown message type',
          });
      }
    } catch (error: any) {
      console.error('[RealtimeCapture] Failed to parse message:', error.message);
      this.sendToClient(ws, {
        type: 'ERROR',
        error: 'Invalid message format',
      });
    }
  }

  /**
   * Handle client registration
   */
  private handleRegister(ws: WebSocket, clientInfo: ClientInfo, message: any): void {
    clientInfo.clientType = message.clientType;
    clientInfo.version = message.version;

    console.log('[RealtimeCapture] Client registered:', clientInfo.id, message.clientType);

    this.sendToClient(ws, {
      type: 'REGISTERED',
      clientId: clientInfo.id,
    });
  }

  /**
   * Handle create session
   */
  private handleCreateSession(ws: WebSocket, clientInfo: ClientInfo, message: any): void {
    const { sessionId, title, platform, tabId } = message;

    const session: CaptureSession = {
      id: sessionId,
      title,
      platform,
      startedAt: new Date(),
      status: 'active',
      eventCount: 0,
      metadata: { tabId },
    };

    this.sessions.set(sessionId, session);
    clientInfo.activeSessions.add(sessionId);
    this.eventBuffer.set(sessionId, []);

    console.log('[RealtimeCapture] Session created:', sessionId, title);

    // Trigger event handlers
    this.triggerEventHandlers('session:created', session);

    this.sendToClient(ws, {
      type: 'SESSION_CREATED',
      sessionId,
      session,
    });

    this.saveSessions();
  }

  /**
   * Handle end session
   */
  private handleEndSession(ws: WebSocket, clientInfo: ClientInfo, message: any): void {
    const { sessionId } = message;

    const session = this.sessions.get(sessionId);
    if (!session) {
      this.sendToClient(ws, {
        type: 'ERROR',
        error: 'Session not found',
      });
      return;
    }

    session.status = 'completed';
    session.endedAt = new Date();
    clientInfo.activeSessions.delete(sessionId);

    console.log('[RealtimeCapture] Session ended:', sessionId);

    // Flush remaining events
    this.flushEventBuffer(sessionId);

    // Trigger event handlers
    this.triggerEventHandlers('session:ended', session);

    this.sendToClient(ws, {
      type: 'SESSION_ENDED',
      sessionId,
    });

    this.saveSessions();
  }

  /**
   * Handle caption data (generic event data)
   */
  private handleCaptionData(ws: WebSocket, clientInfo: ClientInfo, message: any): void {
    const { sessionId, platform, captions, timestamp } = message;

    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn('[RealtimeCapture] Unknown session:', sessionId);
      return;
    }

    // Create capture events
    const events: CaptureEvent[] = captions.map((caption: any) => ({
      timestamp: caption.timestamp || new Date().toISOString(),
      sessionId,
      platform,
      data: caption,
      metadata: { receivedAt: timestamp },
    }));

    // Add to buffer
    const buffer = this.eventBuffer.get(sessionId) || [];
    buffer.push(...events);
    this.eventBuffer.set(sessionId, buffer);

    // Update session stats
    session.eventCount += events.length;

    console.log('[RealtimeCapture] Received events:', events.length, 'for session:', sessionId);

    // Trigger event handlers for each event
    events.forEach((event) => {
      this.triggerEventHandlers('event:received', event);
    });

    // Auto-flush if buffer is large
    if (buffer.length >= 50) {
      this.flushEventBuffer(sessionId);
    }
  }

  /**
   * Flush event buffer to disk
   */
  private flushEventBuffer(sessionId: string): void {
    const buffer = this.eventBuffer.get(sessionId);
    if (!buffer || buffer.length === 0) {
      return;
    }

    const eventFile = join(this.storageDir, `${sessionId}-events.json`);

    try {
      // Read existing events if any
      let existingEvents: CaptureEvent[] = [];
      if (existsSync(eventFile)) {
        const data = readFileSync(eventFile, 'utf-8');
        existingEvents = JSON.parse(data);
      }

      // Append new events
      const allEvents = [...existingEvents, ...buffer];

      // Write to file
      writeFileSync(eventFile, JSON.stringify(allEvents, null, 2), 'utf-8');

      console.log('[RealtimeCapture] Flushed buffer:', buffer.length, 'events for session:', sessionId);

      // Clear buffer
      this.eventBuffer.set(sessionId, []);
    } catch (error: any) {
      console.error('[RealtimeCapture] Failed to flush buffer:', error.message);
    }
  }

  /**
   * Send message to client
   */
  private sendToClient(ws: WebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Register event handler
   */
  registerEventHandler(eventType: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(eventType) || [];
    handlers.push(handler);
    this.eventHandlers.set(eventType, handlers);
  }

  /**
   * Trigger event handlers
   */
  private triggerEventHandlers(eventType: string, data: any): void {
    const handlers = this.eventHandlers.get(eventType) || [];
    handlers.forEach((handler) => {
      try {
        handler(data);
      } catch (error: any) {
        console.error('[RealtimeCapture] Event handler error:', error.message);
      }
    });
  }

  /**
   * Get session
   */
  getSession(sessionId: string): CaptureSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get all sessions
   */
  getAllSessions(): CaptureSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get session events
   */
  getSessionEvents(sessionId: string): CaptureEvent[] {
    const eventFile = join(this.storageDir, `${sessionId}-events.json`);

    if (!existsSync(eventFile)) {
      return [];
    }

    try {
      const data = readFileSync(eventFile, 'utf-8');
      return JSON.parse(data);
    } catch (error: any) {
      console.error('[RealtimeCapture] Failed to read events:', error.message);
      return [];
    }
  }

  /**
   * Load sessions from disk
   */
  private loadSessions(): void {
    if (!existsSync(this.sessionsFile)) {
      return;
    }

    try {
      const data = readFileSync(this.sessionsFile, 'utf-8');
      const sessionsData = JSON.parse(data);

      sessionsData.forEach((sessionData: any) => {
        this.sessions.set(sessionData.id, {
          ...sessionData,
          startedAt: new Date(sessionData.startedAt),
          endedAt: sessionData.endedAt ? new Date(sessionData.endedAt) : undefined,
        });
      });

      console.log('[RealtimeCapture] Loaded sessions:', this.sessions.size);
    } catch (error: any) {
      console.error('[RealtimeCapture] Failed to load sessions:', error.message);
    }
  }

  /**
   * Save sessions to disk
   */
  private saveSessions(): void {
    try {
      const sessionsData = Array.from(this.sessions.values());
      writeFileSync(this.sessionsFile, JSON.stringify(sessionsData, null, 2), 'utf-8');
    } catch (error: any) {
      console.error('[RealtimeCapture] Failed to save sessions:', error.message);
    }
  }

  /**
   * Periodic buffer flush
   */
  startPeriodicFlush(interval: number = 10000): void {
    setInterval(() => {
      this.sessions.forEach((session, sessionId) => {
        if (session.status === 'active') {
          this.flushEventBuffer(sessionId);
        }
      });
    }, interval);

    console.log('[RealtimeCapture] Periodic flush started:', interval, 'ms');
  }
}

// Types
interface ClientInfo {
  id: string;
  connectedAt: Date;
  activeSessions: Set<string>;
  clientType?: string;
  version?: string;
}

type EventHandler = (data: any) => void;

// Export singleton instance
export const realtimeCaptureManager = new RealtimeCaptureManager();
