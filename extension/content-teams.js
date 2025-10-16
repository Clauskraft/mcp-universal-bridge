/**
 * Real-Time Caption Capture - Teams Content Script
 *
 * Monitors Teams meeting captions using MutationObserver
 * and streams them to the background service worker.
 */

// Configuration for Teams caption selectors
const CONFIG = {
  platform: 'teams',
  captionContainerSelectors: [
    '[data-tid="closed-captions-v2-container"]',
    '[class*="caption"]',
    '[class*="subtitle"]',
    '[class*="transcription"]',
    '.fui-StyledText',  // Teams UI text elements
    '[role="log"]'      // ARIA live regions
  ],
  captionTextSelectors: [
    '[data-tid="closed-caption-text"]',
    '.caption-text',
    '.subtitle-text',
    'p', 'span', 'div'
  ],
  speakerSelectors: [
    '[data-tid="closed-caption-speaker"]',
    '.caption-speaker',
    '.speaker-name',
    'strong', 'b'
  ],
  observerConfig: {
    childList: true,
    subtree: true,
    characterData: true,
    characterDataOldValue: false
  }
};

class TeamsCaptureSniffer {
  constructor() {
    this.isCapturing = false;
    this.observer = null;
    this.captionContainer = null;
    this.lastCaptionText = '';
    this.captionBuffer = [];
    this.sessionId = null;

    console.log('[Teams Capture] Initializing...');
    this.init();
  }

  /**
   * Initialize the capture system
   */
  init() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('[Teams Capture] Received message:', message);

      switch (message.action) {
        case 'START_CAPTURE':
          this.startCapture(message.sessionId);
          sendResponse({ success: true, platform: CONFIG.platform });
          break;

        case 'STOP_CAPTURE':
          this.stopCapture();
          sendResponse({ success: true });
          break;

        case 'GET_STATUS':
          sendResponse({
            isCapturing: this.isCapturing,
            platform: CONFIG.platform,
            sessionId: this.sessionId,
            bufferSize: this.captionBuffer.length
          });
          break;

        default:
          sendResponse({ error: 'Unknown action' });
      }

      return true; // Keep message channel open for async response
    });

    // Auto-detect when on Teams meeting page
    this.detectMeetingPage();
  }

  /**
   * Detect if we're on a Teams meeting page
   */
  detectMeetingPage() {
    const isMeetingPage = window.location.href.includes('teams.microsoft.com') &&
                          (window.location.href.includes('/meet') ||
                           window.location.href.includes('/calling'));

    if (isMeetingPage) {
      console.log('[Teams Capture] Meeting page detected');

      // Notify background script
      chrome.runtime.sendMessage({
        action: 'MEETING_DETECTED',
        platform: CONFIG.platform,
        url: window.location.href
      });
    }
  }

  /**
   * Start caption capture
   */
  startCapture(sessionId) {
    if (this.isCapturing) {
      console.log('[Teams Capture] Already capturing');
      return;
    }

    this.sessionId = sessionId;
    this.isCapturing = true;
    this.captionBuffer = [];

    console.log('[Teams Capture] Starting capture with session:', sessionId);

    // Find caption container
    this.captionContainer = this.findCaptionContainer();

    if (!this.captionContainer) {
      console.warn('[Teams Capture] Caption container not found, will retry...');
      // Start observer anyway - captions might appear later
      this.startObserver(document.body);
    } else {
      console.log('[Teams Capture] Caption container found:', this.captionContainer);
      this.startObserver(this.captionContainer);
    }

    // Notify background
    chrome.runtime.sendMessage({
      action: 'CAPTURE_STARTED',
      sessionId: this.sessionId,
      platform: CONFIG.platform
    });
  }

  /**
   * Stop caption capture
   */
  stopCapture() {
    if (!this.isCapturing) {
      return;
    }

    console.log('[Teams Capture] Stopping capture');

    this.isCapturing = false;

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    // Send remaining buffer
    if (this.captionBuffer.length > 0) {
      this.flushBuffer();
    }

    // Notify background
    chrome.runtime.sendMessage({
      action: 'CAPTURE_STOPPED',
      sessionId: this.sessionId,
      platform: CONFIG.platform
    });

    this.sessionId = null;
    this.captionContainer = null;
    this.lastCaptionText = '';
  }

  /**
   * Find caption container element
   */
  findCaptionContainer() {
    for (const selector of CONFIG.captionContainerSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log('[Teams Capture] Found container with selector:', selector);
        return element;
      }
    }
    return null;
  }

  /**
   * Start MutationObserver
   */
  startObserver(targetElement) {
    this.observer = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });

    this.observer.observe(targetElement, CONFIG.observerConfig);
    console.log('[Teams Capture] Observer started on:', targetElement);
  }

  /**
   * Handle DOM mutations
   */
  handleMutations(mutations) {
    if (!this.isCapturing) {
      return;
    }

    for (const mutation of mutations) {
      // Check if caption container appeared
      if (!this.captionContainer && mutation.addedNodes.length > 0) {
        this.captionContainer = this.findCaptionContainer();
        if (this.captionContainer) {
          console.log('[Teams Capture] Caption container appeared dynamically');
          // Restart observer on the specific container
          this.observer.disconnect();
          this.startObserver(this.captionContainer);
          return;
        }
      }

      // Extract caption text from mutations
      this.extractCaptionFromMutation(mutation);
    }
  }

  /**
   * Extract caption text from mutation
   */
  extractCaptionFromMutation(mutation) {
    let captionText = '';
    let speaker = '';
    let timestamp = new Date().toISOString();

    // Check added nodes
    if (mutation.addedNodes.length > 0) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Try to find speaker
          const speakerElement = this.findSpeaker(node);
          if (speakerElement) {
            speaker = speakerElement.textContent.trim();
          }

          // Try to find caption text
          const textElement = this.findCaptionText(node);
          if (textElement) {
            captionText = textElement.textContent.trim();
          } else {
            captionText = node.textContent.trim();
          }
        } else if (node.nodeType === Node.TEXT_NODE) {
          captionText = node.textContent.trim();
        }
      }
    }

    // Check character data changes
    if (mutation.type === 'characterData' && mutation.target.textContent) {
      captionText = mutation.target.textContent.trim();
    }

    // Validate and send caption
    if (captionText && captionText !== this.lastCaptionText && captionText.length > 2) {
      this.lastCaptionText = captionText;

      const captionEntry = {
        timestamp,
        speaker,
        text: captionText,
        platform: CONFIG.platform,
        sessionId: this.sessionId
      };

      console.log('[Teams Capture] Caption:', captionEntry);

      this.captionBuffer.push(captionEntry);

      // Flush buffer if it gets large
      if (this.captionBuffer.length >= 10) {
        this.flushBuffer();
      }
    }
  }

  /**
   * Find speaker element
   */
  findSpeaker(element) {
    for (const selector of CONFIG.speakerSelectors) {
      const speaker = element.querySelector(selector);
      if (speaker) {
        return speaker;
      }
    }
    return null;
  }

  /**
   * Find caption text element
   */
  findCaptionText(element) {
    for (const selector of CONFIG.captionTextSelectors) {
      const text = element.querySelector(selector);
      if (text) {
        return text;
      }
    }
    return null;
  }

  /**
   * Flush caption buffer to background
   */
  flushBuffer() {
    if (this.captionBuffer.length === 0) {
      return;
    }

    console.log('[Teams Capture] Flushing buffer:', this.captionBuffer.length, 'captions');

    chrome.runtime.sendMessage({
      action: 'CAPTION_DATA',
      sessionId: this.sessionId,
      platform: CONFIG.platform,
      captions: [...this.captionBuffer]
    });

    this.captionBuffer = [];
  }
}

// Initialize capture system
const captureSystem = new TeamsCaptureSniffer();

// Periodic buffer flush
setInterval(() => {
  if (captureSystem.isCapturing && captureSystem.captionBuffer.length > 0) {
    captureSystem.flushBuffer();
  }
}, 5000); // Flush every 5 seconds

console.log('[Teams Capture] Content script loaded');
