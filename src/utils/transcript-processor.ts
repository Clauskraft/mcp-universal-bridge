import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { BridgeError } from '../types/index.js';

/**
 * Transcript Entry
 */
export interface TranscriptEntry {
  timestamp: string;
  speaker?: string;
  text: string;
}

/**
 * Processed Transcript
 */
export interface ProcessedTranscript {
  id: string;
  title: string;
  source: 'vtt' | 'text';
  entries: TranscriptEntry[];
  createdAt: Date;
  markdown: string;
}

/**
 * Teams Transcript Processor
 * Converts VTT or plain text transcripts to markdown format
 */
export class TranscriptProcessor {
  private storageDir: string;
  private transcriptsFile: string;

  constructor(storageDir: string = './transcripts') {
    this.storageDir = storageDir;
    this.transcriptsFile = join(storageDir, 'index.json');

    // Create storage directory if it doesn't exist
    if (!existsSync(this.storageDir)) {
      mkdirSync(this.storageDir, { recursive: true });
    }

    // Create index file if it doesn't exist
    if (!existsSync(this.transcriptsFile)) {
      writeFileSync(this.transcriptsFile, JSON.stringify([]), 'utf-8');
    }
  }

  /**
   * Parse VTT (WebVTT) format transcript
   */
  parseVTT(vttContent: string): TranscriptEntry[] {
    const entries: TranscriptEntry[] = [];
    const lines = vttContent.split('\n');

    let currentTimestamp = '';
    let currentText = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip WEBVTT header and metadata
      if (line.startsWith('WEBVTT') || line.startsWith('NOTE') || line === '') {
        continue;
      }

      // Timestamp line (e.g., "00:00:01.000 --> 00:00:05.000")
      if (line.includes('-->')) {
        if (currentText && currentTimestamp) {
          entries.push({
            timestamp: currentTimestamp,
            text: currentText.trim(),
          });
        }

        // Extract start timestamp
        const startTime = line.split('-->')[0].trim();
        currentTimestamp = this.formatTimestamp(startTime);
        currentText = '';
      }
      // Text line
      else if (line && !line.match(/^\d+$/)) {
        // Skip cue numbers
        // Check if line starts with speaker name (format: "Name:")
        const speakerMatch = line.match(/^([A-Za-z\s]+):\s*(.+)/);
        if (speakerMatch) {
          if (currentText && currentTimestamp) {
            entries.push({
              timestamp: currentTimestamp,
              text: currentText.trim(),
            });
            currentText = '';
          }

          const speaker = speakerMatch[1].trim();
          const text = speakerMatch[2].trim();

          entries.push({
            timestamp: currentTimestamp || '00:00:00',
            speaker,
            text,
          });
          currentText = '';
        } else {
          currentText += (currentText ? ' ' : '') + line;
        }
      }
    }

    // Add last entry
    if (currentText && currentTimestamp) {
      entries.push({
        timestamp: currentTimestamp,
        text: currentText.trim(),
      });
    }

    return entries;
  }

  /**
   * Parse plain text transcript (attempts to detect speakers and timestamps)
   */
  parsePlainText(textContent: string): TranscriptEntry[] {
    const entries: TranscriptEntry[] = [];
    const lines = textContent.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Try to match "Speaker: text" format
      const speakerMatch = trimmedLine.match(/^([A-Za-z\s]+):\s*(.+)/);
      if (speakerMatch) {
        entries.push({
          timestamp: '', // No timestamp in plain text
          speaker: speakerMatch[1].trim(),
          text: speakerMatch[2].trim(),
        });
      }
      // Try to match "[HH:MM:SS] text" format
      else if (trimmedLine.match(/^\[?\d{1,2}:\d{2}:\d{2}\]?/)) {
        const timestampMatch = trimmedLine.match(/^\[?(\d{1,2}:\d{2}:\d{2})\]?\s*(.+)/);
        if (timestampMatch) {
          entries.push({
            timestamp: timestampMatch[1],
            text: timestampMatch[2].trim(),
          });
        }
      }
      // Plain text without format
      else {
        entries.push({
          timestamp: '',
          text: trimmedLine,
        });
      }
    }

    return entries;
  }

  /**
   * Format timestamp from VTT format (00:00:01.000) to readable format (00:00:01)
   */
  private formatTimestamp(timestamp: string): string {
    return timestamp.split('.')[0]; // Remove milliseconds
  }

  /**
   * Convert transcript entries to markdown
   */
  toMarkdown(title: string, entries: TranscriptEntry[]): string {
    let markdown = `# ${title}\n\n`;
    markdown += `*Transcript processed on ${new Date().toLocaleString()}*\n\n`;
    markdown += `---\n\n`;

    for (const entry of entries) {
      if (entry.speaker) {
        markdown += `### ${entry.speaker}`;
        if (entry.timestamp) {
          markdown += ` [${entry.timestamp}]`;
        }
        markdown += `\n\n${entry.text}\n\n`;
      } else if (entry.timestamp) {
        markdown += `**[${entry.timestamp}]** ${entry.text}\n\n`;
      } else {
        markdown += `${entry.text}\n\n`;
      }
    }

    return markdown;
  }

  /**
   * Process and save a transcript
   */
  processTranscript(
    title: string,
    content: string,
    source: 'vtt' | 'text'
  ): ProcessedTranscript {
    // Parse based on source type
    const entries = source === 'vtt'
      ? this.parseVTT(content)
      : this.parsePlainText(content);

    if (entries.length === 0) {
      throw new BridgeError(
        'No transcript entries found. Please check the format.',
        'PARSE_ERROR',
        400
      );
    }

    // Generate markdown
    const markdown = this.toMarkdown(title, entries);

    // Generate unique ID
    const id = `transcript-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create transcript object
    const transcript: ProcessedTranscript = {
      id,
      title,
      source,
      entries,
      createdAt: new Date(),
      markdown,
    };

    // Save markdown file
    const markdownFile = join(this.storageDir, `${id}.md`);
    writeFileSync(markdownFile, markdown, 'utf-8');

    // Update index
    this.addToIndex(transcript);

    return transcript;
  }

  /**
   * Add transcript to index
   */
  private addToIndex(transcript: ProcessedTranscript): void {
    try {
      const index = this.loadIndex();

      // Store metadata only (not the full markdown content)
      const metadata = {
        id: transcript.id,
        title: transcript.title,
        source: transcript.source,
        entryCount: transcript.entries.length,
        createdAt: transcript.createdAt,
      };

      index.push(metadata);
      writeFileSync(this.transcriptsFile, JSON.stringify(index, null, 2), 'utf-8');
    } catch (error: any) {
      console.error('Failed to update index:', error.message);
    }
  }

  /**
   * Load transcript index
   */
  private loadIndex(): any[] {
    try {
      const data = readFileSync(this.transcriptsFile, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /**
   * Get all transcripts (metadata only)
   */
  getAllTranscripts(): any[] {
    return this.loadIndex();
  }

  /**
   * Get a specific transcript with full content
   */
  getTranscript(id: string): ProcessedTranscript | null {
    const index = this.loadIndex();
    const metadata = index.find((t: any) => t.id === id);

    if (!metadata) {
      return null;
    }

    // Load markdown file
    const markdownFile = join(this.storageDir, `${id}.md`);
    if (!existsSync(markdownFile)) {
      return null;
    }

    const markdown = readFileSync(markdownFile, 'utf-8');

    return {
      ...metadata,
      markdown,
      entries: [], // Don't load full entries for performance
    };
  }

  /**
   * Delete a transcript
   */
  deleteTranscript(id: string): boolean {
    const index = this.loadIndex();
    const initialLength = index.length;
    const filteredIndex = index.filter((t: any) => t.id !== id);

    if (filteredIndex.length === initialLength) {
      return false; // Not found
    }

    // Delete markdown file
    const markdownFile = join(this.storageDir, `${id}.md`);
    if (existsSync(markdownFile)) {
      unlinkSync(markdownFile);
    }

    // Update index
    writeFileSync(this.transcriptsFile, JSON.stringify(filteredIndex, null, 2), 'utf-8');

    return true;
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    total: number;
    bySource: Record<string, number>;
  } {
    const index = this.loadIndex();

    const bySource: Record<string, number> = {
      vtt: 0,
      text: 0,
    };

    for (const transcript of index) {
      if (transcript.source in bySource) {
        bySource[transcript.source]++;
      }
    }

    return {
      total: index.length,
      bySource,
    };
  }
}

// Export singleton instance
export const transcriptProcessor = new TranscriptProcessor();
