import { realtimeCaptureManager, CaptureEvent, CaptureSession } from './realtime-capture.js';
import { transcriptProcessor, TranscriptEntry } from './transcript-processor.js';

/**
 * Teams Transcript Handler
 *
 * PART 2: Data Structuring and Storage Layer (Teams-Specific)
 *
 * This component bridges the generic real-time capture layer with
 * the Teams-specific transcript processing and storage.
 *
 * Responsibilities:
 * - Convert real-time caption events to transcript entries
 * - Handle Teams-specific formatting (speakers, timestamps)
 * - Generate markdown transcripts
 * - Store processed transcripts
 */
export class TeamsTranscriptHandler {
  constructor() {
    console.log('[TeamsHandler] Initializing...');
    this.registerEventHandlers();
  }

  /**
   * Register event handlers with the capture manager
   */
  private registerEventHandlers(): void {
    // Handle session creation
    realtimeCaptureManager.registerEventHandler('session:created', (session: CaptureSession) => {
      console.log('[TeamsHandler] Session created:', session.id);
    });

    // Handle session completion
    realtimeCaptureManager.registerEventHandler('session:ended', (session: CaptureSession) => {
      console.log('[TeamsHandler] Session ended:', session.id);
      this.processCompletedSession(session);
    });

    // Handle real-time events (optional - for live preview)
    realtimeCaptureManager.registerEventHandler('event:received', (event: CaptureEvent) => {
      // Could be used for live preview/streaming
    });

    console.log('[TeamsHandler] Event handlers registered');
  }

  /**
   * Process completed session into transcript
   */
  private processCompletedSession(session: CaptureSession): void {
    console.log('[TeamsHandler] Processing completed session:', session.id);

    try {
      // Get all events for this session
      const events = realtimeCaptureManager.getSessionEvents(session.id);

      if (events.length === 0) {
        console.warn('[TeamsHandler] No events found for session:', session.id);
        return;
      }

      // Convert capture events to transcript entries
      const entries: TranscriptEntry[] = events.map((event) => ({
        timestamp: this.formatTimestamp(event.data.timestamp),
        speaker: event.data.speaker || undefined,
        text: event.data.text,
      }));

      // Generate markdown
      const markdown = transcriptProcessor.toMarkdown(session.title, entries);

      // Create transcript record
      const transcript = {
        id: session.id,
        title: session.title,
        source: 'live-capture' as 'vtt' | 'text',
        entries,
        createdAt: session.startedAt,
        markdown,
      };

      // Save to transcript processor storage
      // (We'll use the existing storage system)
      const savePath = transcriptProcessor['storageDir'];
      const markdownFile = `${savePath}/${session.id}.md`;

      import('fs').then(({ writeFileSync }) => {
        writeFileSync(markdownFile, markdown, 'utf-8');
        console.log('[TeamsHandler] Transcript saved:', markdownFile);
      });

      // Add to transcript index
      this.addToTranscriptIndex(transcript);

      console.log('[TeamsHandler] Session processed successfully:', session.id);
    } catch (error: any) {
      console.error('[TeamsHandler] Failed to process session:', error.message);
    }
  }

  /**
   * Add transcript to index (for compatibility with transcript-processor)
   */
  private addToTranscriptIndex(transcript: any): void {
    try {
      const metadata = {
        id: transcript.id,
        title: transcript.title,
        source: 'live-capture',
        entryCount: transcript.entries.length,
        createdAt: transcript.createdAt,
      };

      // Access transcript processor's private method via type casting
      const processor: any = transcriptProcessor;
      const index = processor.loadIndex();
      index.push(metadata);

      import('fs').then(({ writeFileSync }) => {
        const transcriptsFile = processor.transcriptsFile;
        writeFileSync(transcriptsFile, JSON.stringify(index, null, 2), 'utf-8');
        console.log('[TeamsHandler] Added to transcript index');
      });
    } catch (error: any) {
      console.error('[TeamsHandler] Failed to add to index:', error.message);
    }
  }

  /**
   * Format timestamp from ISO string to readable format
   */
  private formatTimestamp(isoString: string): string {
    try {
      const date = new Date(isoString);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    } catch {
      return '00:00:00';
    }
  }

  /**
   * Get live preview of ongoing session
   */
  getLivePreview(sessionId: string): TranscriptEntry[] {
    const events = realtimeCaptureManager.getSessionEvents(sessionId);

    return events.map((event) => ({
      timestamp: this.formatTimestamp(event.data.timestamp),
      speaker: event.data.speaker || undefined,
      text: event.data.text,
    }));
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId: string): any {
    const session = realtimeCaptureManager.getSession(sessionId);
    const events = realtimeCaptureManager.getSessionEvents(sessionId);

    if (!session) {
      return null;
    }

    const speakers = new Set(
      events.map((e) => e.data.speaker).filter((s) => s)
    );

    return {
      sessionId: session.id,
      title: session.title,
      platform: session.platform,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      eventCount: events.length,
      speakerCount: speakers.size,
      speakers: Array.from(speakers),
    };
  }
}

// Export singleton instance
export const teamsTranscriptHandler = new TeamsTranscriptHandler();
