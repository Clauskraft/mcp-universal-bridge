import { realtimeCaptureManager, CaptureEvent, CaptureSession } from './realtime-capture.js';

/**
 * External Data Adapter
 *
 * Provides REST API integration for external applications to send data
 * to the real-time capture system without needing WebSocket connections.
 *
 * Use Cases:
 * - External web applications sending structured data
 * - Third-party integrations
 * - Batch data uploads
 * - Server-to-server data streaming
 */

export interface ExternalDataPayload {
  platform: string;
  data: any[];
  metadata?: Record<string, any>;
}

export interface ExternalSessionConfig {
  title: string;
  platform: string;
  metadata?: Record<string, any>;
}

/**
 * External Data Adapter Class
 */
export class ExternalDataAdapter {
  private readonly PLATFORM_PREFIX = 'external-';

  /**
   * Create a new capture session for external data
   */
  createExternalSession(config: ExternalSessionConfig): CaptureSession {
    const sessionId = `ext-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const platform = config.platform.startsWith(this.PLATFORM_PREFIX)
      ? config.platform
      : `${this.PLATFORM_PREFIX}${config.platform}`;

    const session: CaptureSession = {
      id: sessionId,
      title: config.title,
      platform,
      startedAt: new Date(),
      status: 'active',
      eventCount: 0,
      metadata: {
        ...config.metadata,
        source: 'external-api',
        createdVia: 'REST',
      },
    };

    // Manually add to sessions (simulating CREATE_SESSION message)
    const sessionsMap = (realtimeCaptureManager as any).sessions;
    const eventBuffer = (realtimeCaptureManager as any).eventBuffer;

    sessionsMap.set(sessionId, session);
    eventBuffer.set(sessionId, []);

    console.log('[ExternalAdapter] Session created:', sessionId, config.title);

    // Trigger event handlers
    (realtimeCaptureManager as any).triggerEventHandlers('session:created', session);
    (realtimeCaptureManager as any).saveSessions();

    return session;
  }

  /**
   * Upload data to an existing session
   */
  uploadData(sessionId: string, payload: ExternalDataPayload): {
    success: boolean;
    eventCount: number;
    message: string;
  } {
    const session = realtimeCaptureManager.getSession(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.status !== 'active') {
      throw new Error(`Session is not active: ${session.status}`);
    }

    // Convert external data to CaptureEvents
    const events: CaptureEvent[] = payload.data.map((item) => ({
      timestamp: item.timestamp || new Date().toISOString(),
      sessionId,
      platform: payload.platform,
      data: item,
      metadata: {
        ...payload.metadata,
        uploadedVia: 'REST',
        receivedAt: new Date().toISOString(),
      },
    }));

    // Add events to buffer
    const eventBuffer = (realtimeCaptureManager as any).eventBuffer;
    const buffer = eventBuffer.get(sessionId) || [];
    buffer.push(...events);
    eventBuffer.set(sessionId, buffer);

    // Update session stats
    session.eventCount += events.length;

    console.log('[ExternalAdapter] Uploaded data:', events.length, 'events to session:', sessionId);

    // Trigger event handlers for each event
    events.forEach((event) => {
      (realtimeCaptureManager as any).triggerEventHandlers('event:received', event);
    });

    // Auto-flush if buffer is large
    if (buffer.length >= 50) {
      (realtimeCaptureManager as any).flushEventBuffer(sessionId);
    }

    return {
      success: true,
      eventCount: events.length,
      message: `Successfully uploaded ${events.length} events`,
    };
  }

  /**
   * End a session
   */
  endSession(sessionId: string): CaptureSession {
    const session = realtimeCaptureManager.getSession(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.status !== 'active') {
      throw new Error(`Session is already ${session.status}`);
    }

    session.status = 'completed';
    session.endedAt = new Date();

    console.log('[ExternalAdapter] Session ended:', sessionId);

    // Flush remaining events
    (realtimeCaptureManager as any).flushEventBuffer(sessionId);

    // Trigger event handlers
    (realtimeCaptureManager as any).triggerEventHandlers('session:ended', session);
    (realtimeCaptureManager as any).saveSessions();

    return session;
  }

  /**
   * Get session with all events
   */
  getSessionWithEvents(sessionId: string): {
    session: CaptureSession;
    events: CaptureEvent[];
  } {
    const session = realtimeCaptureManager.getSession(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const events = realtimeCaptureManager.getSessionEvents(sessionId);

    return {
      session,
      events,
    };
  }

  /**
   * Get all external sessions
   */
  getAllExternalSessions(): CaptureSession[] {
    const allSessions = realtimeCaptureManager.getAllSessions();
    return allSessions.filter((s) => s.platform.startsWith(this.PLATFORM_PREFIX));
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId: string): {
    sessionId: string;
    title: string;
    platform: string;
    status: string;
    duration: number | null;
    eventCount: number;
    startedAt: string;
    endedAt: string | null;
  } {
    const session = realtimeCaptureManager.getSession(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const duration = session.endedAt
      ? session.endedAt.getTime() - session.startedAt.getTime()
      : null;

    return {
      sessionId: session.id,
      title: session.title,
      platform: session.platform,
      status: session.status,
      duration,
      eventCount: session.eventCount,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt ? session.endedAt.toISOString() : null,
    };
  }

  /**
   * Create session and upload data in one call
   */
  createAndUpload(config: ExternalSessionConfig, payload: ExternalDataPayload): {
    session: CaptureSession;
    uploadResult: { success: boolean; eventCount: number; message: string };
  } {
    const session = this.createExternalSession(config);
    const uploadResult = this.uploadData(session.id, payload);

    return {
      session,
      uploadResult,
    };
  }

  /**
   * Batch upload to multiple sessions
   */
  batchUpload(uploads: Array<{ sessionId: string; payload: ExternalDataPayload }>): {
    successful: number;
    failed: number;
    results: Array<{ sessionId: string; success: boolean; error?: string }>;
  } {
    const results: Array<{ sessionId: string; success: boolean; error?: string }> = [];
    let successful = 0;
    let failed = 0;

    for (const upload of uploads) {
      try {
        this.uploadData(upload.sessionId, upload.payload);
        results.push({ sessionId: upload.sessionId, success: true });
        successful++;
      } catch (error: any) {
        results.push({
          sessionId: upload.sessionId,
          success: false,
          error: error.message,
        });
        failed++;
      }
    }

    return {
      successful,
      failed,
      results,
    };
  }
}

// Export singleton instance
export const externalDataAdapter = new ExternalDataAdapter();
