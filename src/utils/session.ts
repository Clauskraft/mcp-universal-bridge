import type {
  Device,
  Session,
  Message,
  DeviceCapabilities,
  DeviceType,
  SessionConfig,
  Statistics,
  AIProvider,
} from '../types/index.js';
import { DeviceError, SessionError } from '../types/index.js';

/**
 * Session and Device Management System
 * Handles device registration, session lifecycle, and state management
 */
export class SessionManager {
  private devices: Map<string, Device> = new Map();
  private sessions: Map<string, Session> = new Map();
  private statistics: Statistics = {
    totalDevices: 0,
    activeDevices: 0,
    totalSessions: 0,
    activeSessions: 0,
    messagesSent: 0,
    tokensUsed: 0,
    providers: {
      claude: { requests: 0, tokens: 0, errors: 0, avgLatency: 0 },
      gemini: { requests: 0, tokens: 0, errors: 0, avgLatency: 0 },
      chatgpt: { requests: 0, tokens: 0, errors: 0, avgLatency: 0 },
    },
    uptime: 0,
    startedAt: new Date(),
  };

  private cleanupInterval?: NodeJS.Timeout;
  private readonly INACTIVE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.startCleanupJob();
  }

  // ==================== Device Management ====================

  /**
   * Register a new device
   */
  registerDevice(
    name: string,
    type: DeviceType,
    capabilities?: Partial<DeviceCapabilities>
  ): Device {
    const device: Device = {
      id: this.generateId('dev'),
      name,
      type,
      capabilities: {
        streaming: capabilities?.streaming ?? true,
        tools: capabilities?.tools ?? true,
        vision: capabilities?.vision ?? false,
        audio: capabilities?.audio ?? false,
      },
      connectedAt: new Date(),
      lastActive: new Date(),
    };

    this.devices.set(device.id, device);
    this.statistics.totalDevices++;
    this.statistics.activeDevices++;

    return device;
  }

  /**
   * Get device by ID
   */
  getDevice(deviceId: string): Device {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new DeviceError(`Device not found: ${deviceId}`);
    }
    return device;
  }

  /**
   * Get all devices
   */
  getAllDevices(): Device[] {
    return Array.from(this.devices.values());
  }

  /**
   * Update device last active timestamp
   */
  updateDeviceActivity(deviceId: string): void {
    const device = this.devices.get(deviceId);
    if (device) {
      device.lastActive = new Date();
    }
  }

  /**
   * Disconnect device and cleanup its sessions
   */
  disconnectDevice(deviceId: string): void {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new DeviceError(`Device not found: ${deviceId}`);
    }

    // Delete all sessions for this device
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.deviceId === deviceId) {
        this.sessions.delete(sessionId);
        if (session.active) {
          this.statistics.activeSessions--;
        }
      }
    }

    this.devices.delete(deviceId);
    this.statistics.activeDevices--;
  }

  // ==================== Session Management ====================

  /**
   * Create a new chat session
   */
  createSession(deviceId: string, config: SessionConfig): Session {
    const device = this.getDevice(deviceId);

    const session: Session = {
      id: this.generateId('ses'),
      deviceId,
      config,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      active: true,
    };

    // Add system message if provided
    if (config.systemPrompt) {
      session.messages.push({
        role: 'system',
        content: config.systemPrompt,
        timestamp: new Date(),
      });
    }

    this.sessions.set(session.id, session);
    this.statistics.totalSessions++;
    this.statistics.activeSessions++;
    this.updateDeviceActivity(deviceId);

    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): Session {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SessionError(`Session not found: ${sessionId}`);
    }
    return session;
  }

  /**
   * Get all sessions for a device
   */
  getDeviceSessions(deviceId: string): Session[] {
    return Array.from(this.sessions.values()).filter(
      (session) => session.deviceId === deviceId
    );
  }

  /**
   * Add message to session
   */
  addMessage(sessionId: string, message: Message): void {
    const session = this.getSession(sessionId);
    session.messages.push(message);
    session.updatedAt = new Date();
    this.updateDeviceActivity(session.deviceId);
    this.statistics.messagesSent++;
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SessionError(`Session not found: ${sessionId}`);
    }

    if (session.active) {
      this.statistics.activeSessions--;
    }

    this.sessions.delete(sessionId);
  }

  /**
   * Mark session as inactive
   */
  deactivateSession(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (session.active) {
      session.active = false;
      this.statistics.activeSessions--;
    }
  }

  // ==================== Statistics ====================

  /**
   * Update provider statistics
   */
  updateProviderStats(
    provider: AIProvider,
    tokens: number,
    latency: number,
    error: boolean = false
  ): void {
    const stats = this.statistics.providers[provider];
    stats.requests++;
    stats.tokens += tokens;
    if (error) {
      stats.errors++;
    }
    // Update rolling average latency
    stats.avgLatency = (stats.avgLatency * (stats.requests - 1) + latency) / stats.requests;
    this.statistics.tokensUsed += tokens;
  }

  /**
   * Get current statistics
   */
  getStatistics(): Statistics {
    return {
      ...this.statistics,
      uptime: Date.now() - this.statistics.startedAt.getTime(),
    };
  }

  /**
   * Reset statistics (except structural counts)
   */
  resetStatistics(): void {
    for (const provider of Object.keys(this.statistics.providers) as AIProvider[]) {
      this.statistics.providers[provider] = {
        requests: 0,
        tokens: 0,
        errors: 0,
        avgLatency: 0,
      };
    }
    this.statistics.messagesSent = 0;
    this.statistics.tokensUsed = 0;
  }

  // ==================== Cleanup ====================

  /**
   * Start background cleanup job
   */
  private startCleanupJob(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop cleanup job
   */
  stopCleanupJob(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Clean up inactive sessions and devices
   */
  cleanup(): void {
    const now = Date.now();
    let cleanedSessions = 0;
    let cleanedDevices = 0;

    // Clean up inactive sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      const inactiveTime = now - session.updatedAt.getTime();
      if (inactiveTime > this.INACTIVE_TIMEOUT) {
        this.sessions.delete(sessionId);
        if (session.active) {
          this.statistics.activeSessions--;
        }
        cleanedSessions++;
      }
    }

    // Clean up inactive devices
    for (const [deviceId, device] of this.devices.entries()) {
      const inactiveTime = now - device.lastActive.getTime();
      if (inactiveTime > this.INACTIVE_TIMEOUT) {
        // Only cleanup if device has no active sessions
        const hasSessions = Array.from(this.sessions.values()).some(
          (s) => s.deviceId === deviceId
        );
        if (!hasSessions) {
          this.devices.delete(deviceId);
          this.statistics.activeDevices--;
          cleanedDevices++;
        }
      }
    }

    if (cleanedSessions > 0 || cleanedDevices > 0) {
      console.log(
        `[Cleanup] Removed ${cleanedSessions} inactive sessions and ${cleanedDevices} inactive devices`
      );
    }
  }

  /**
   * Manual cleanup trigger
   */
  async manualCleanup(): Promise<{ sessions: number; devices: number }> {
    const sessionsBefore = this.sessions.size;
    const devicesBefore = this.devices.size;

    this.cleanup();

    return {
      sessions: sessionsBefore - this.sessions.size,
      devices: devicesBefore - this.devices.size,
    };
  }

  // ==================== Utility ====================

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
