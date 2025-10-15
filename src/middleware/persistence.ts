import fs from 'fs/promises';
import path from 'path';

/**
 * ENTERPRISE PERSISTENCE & AUDIT LOGGING
 * NEVER LOSE DATA! Every request is GOLD!
 */

interface AuditLog {
  timestamp: Date;
  event: string;
  userId?: string;
  deviceId?: string;
  sessionId?: string;
  provider?: string;
  action: string;
  metadata?: any;
  ip?: string;
  userAgent?: string;
}

class PersistenceManager {
  private logDir = './logs';
  private dataDir = './data';
  private currentLogFile: string;

  constructor() {
    this.currentLogFile = this.getLogFileName();
    this.init();
  }

  private async init() {
    // Create directories
    await fs.mkdir(this.logDir, { recursive: true });
    await fs.mkdir(this.dataDir, { recursive: true });

    console.log(`📁 Persistence initialized:`);
    console.log(`   Logs: ${this.logDir}`);
    console.log(`   Data: ${this.dataDir}`);
  }

  /**
   * Write audit log
   */
  async log(entry: Omit<AuditLog, 'timestamp'>) {
    const logEntry: AuditLog = {
      ...entry,
      timestamp: new Date(),
    };

    const logLine = JSON.stringify(logEntry) + '\n';

    try {
      await fs.appendFile(
        path.join(this.logDir, this.currentLogFile),
        logLine
      );
    } catch (error) {
      console.error('❌ Failed to write audit log:', error);
    }
  }

  /**
   * Save session to disk
   */
  async saveSession(sessionId: string, sessionData: any) {
    const filePath = path.join(this.dataDir, `session-${sessionId}.json`);
    try {
      await fs.writeFile(filePath, JSON.stringify(sessionData, null, 2));
    } catch (error) {
      console.error(`❌ Failed to save session ${sessionId}:`, error);
    }
  }

  /**
   * Load session from disk
   */
  async loadSession(sessionId: string): Promise<any | null> {
    const filePath = path.join(this.dataDir, `session-${sessionId}.json`);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * Save device to disk
   */
  async saveDevice(deviceId: string, deviceData: any) {
    const filePath = path.join(this.dataDir, `device-${deviceId}.json`);
    try {
      await fs.writeFile(filePath, JSON.stringify(deviceData, null, 2));
    } catch (error) {
      console.error(`❌ Failed to save device ${deviceId}:`, error);
    }
  }

  /**
   * Export all data (for backup)
   */
  async exportData(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportFile = path.join(this.dataDir, `backup-${timestamp}.json`);

    const files = await fs.readdir(this.dataDir);
    const data: any = {
      exportedAt: new Date(),
      sessions: [],
      devices: [],
    };

    for (const file of files) {
      if (file.startsWith('session-')) {
        const sessionData = await fs.readFile(
          path.join(this.dataDir, file),
          'utf-8'
        );
        data.sessions.push(JSON.parse(sessionData));
      } else if (file.startsWith('device-')) {
        const deviceData = await fs.readFile(
          path.join(this.dataDir, file),
          'utf-8'
        );
        data.devices.push(JSON.parse(deviceData));
      }
    }

    await fs.writeFile(exportFile, JSON.stringify(data, null, 2));

    console.log(`💾 Data exported to: ${exportFile}`);
    return exportFile;
  }

  /**
   * Get audit logs for date
   */
  async getAuditLogs(date: Date): Promise<AuditLog[]> {
    const fileName = this.getLogFileName(date);
    const filePath = path.join(this.logDir, fileName);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get log file name for date
   */
  private getLogFileName(date: Date = new Date()): string {
    return `audit-${date.toISOString().split('T')[0]}.log`;
  }

  /**
   * Rotate logs (daily)
   */
  async rotateLogs() {
    const newLogFile = this.getLogFileName();
    if (newLogFile !== this.currentLogFile) {
      console.log(`🔄 Rotating logs: ${this.currentLogFile} → ${newLogFile}`);
      this.currentLogFile = newLogFile;
    }
  }

  /**
   * Get storage statistics
   */
  async getStats() {
    const files = await fs.readdir(this.dataDir);
    const logFiles = await fs.readdir(this.logDir);

    let totalSize = 0;
    for (const file of [...files, ...logFiles]) {
      try {
        const dir = files.includes(file) ? this.dataDir : this.logDir;
        const stats = await fs.stat(path.join(dir, file));
        totalSize += stats.size;
      } catch (error) {
        // Ignore errors
      }
    }

    return {
      dataFiles: files.length,
      logFiles: logFiles.length,
      totalSizeBytes: totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    };
  }
}

export const persistence = new PersistenceManager();

// Rotate logs daily at midnight
setInterval(() => persistence.rotateLogs(), 24 * 60 * 60 * 1000);

/**
 * Middleware: Audit logging
 */
export function auditLog() {
  return async (c: any, next: any) => {
    const start = Date.now();

    await persistence.log({
      event: 'request',
      action: `${c.req.method} ${new URL(c.req.url).pathname}`,
      ip: c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP'),
      userAgent: c.req.header('User-Agent'),
    });

    await next();

    const duration = Date.now() - start;
    await persistence.log({
      event: 'response',
      action: `${c.req.method} ${new URL(c.req.url).pathname}`,
      metadata: {
        status: c.res.status,
        duration,
      },
    });
  };
}
