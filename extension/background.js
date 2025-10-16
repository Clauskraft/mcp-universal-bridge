/**
 * Real-Time Caption Capture - Background Service Worker
 *
 * Manages WebSocket connection to backend server and coordinates
 * between content scripts and popup UI.
 */

// Configuration
const CONFIG = {
  backendUrl: 'ws://localhost:3000/realtime-capture',
  reconnectInterval: 5000,
  maxReconnectAttempts: 10
};

class CaptureBackgroundService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.sessions = new Map(); // sessionId -> session data
    this.activeSessions = new Set();

    console.log('[Background] Service initialized');
    this.init();
  }

  /**
   * Initialize background service
   */
  init() {
    // Listen for messages from content scripts and popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep channel open for async response
    });

    // Connect to backend on startup
    this.connectToBackend();
  }

  /**
   * Handle messages from content scripts and popup
   */
  async handleMessage(message, sender, sendResponse) {
    console.log('[Background] Received message:', message.action, sender.tab?.id);

    switch (message.action) {
      case 'MEETING_DETECTED':
        await this.handleMeetingDetected(message, sender);
        sendResponse({ success: true });
        break;

      case 'START_CAPTURE_REQUEST':
        await this.handleStartCaptureRequest(message, sender);
        sendResponse({ success: true });
        break;

      case 'STOP_CAPTURE_REQUEST':
        await this.handleStopCaptureRequest(message, sender);
        sendResponse({ success: true });
        break;

      case 'CAPTURE_STARTED':
        this.handleCaptureStarted(message, sender);
        sendResponse({ success: true });
        break;

      case 'CAPTURE_STOPPED':
        this.handleCaptureStopped(message, sender);
        sendResponse({ success: true });
        break;

      case 'CAPTION_DATA':
        await this.handleCaptionData(message, sender);
        sendResponse({ success: true });
        break;

      case 'GET_SESSIONS':
        sendResponse({
          sessions: Array.from(this.sessions.values()),
          activeSessions: Array.from(this.activeSessions)
        });
        break;

      case 'GET_CONNECTION_STATUS':
        sendResponse({
          isConnected: this.isConnected,
          wsState: this.ws?.readyState,
          reconnectAttempts: this.reconnectAttempts
        });
        break;

      default:
        sendResponse({ error: 'Unknown action' });
    }
  }

  /**
   * Connect to WebSocket backend
   */
  connectToBackend() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[Background] Already connected');
      return;
    }

    console.log('[Background] Connecting to backend:', CONFIG.backendUrl);

    try {
      this.ws = new WebSocket(CONFIG.backendUrl);

      this.ws.onopen = () => {
        console.log('[Background] Connected to backend');
        this.isConnected = true;
        this.reconnectAttempts = 0;

        // Send authentication/registration
        this.sendToBackend({
          type: 'REGISTER',
          clientType: 'chrome-extension',
          version: chrome.runtime.getManifest().version
        });

        // Notify popup
        this.notifyPopup({ action: 'CONNECTION_STATUS', isConnected: true });
      };

      this.ws.onmessage = (event) => {
        this.handleBackendMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.error('[Background] WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('[Background] Disconnected from backend');
        this.isConnected = false;

        // Notify popup
        this.notifyPopup({ action: 'CONNECTION_STATUS', isConnected: false });

        // Attempt reconnect
        this.attemptReconnect();
      };

    } catch (error) {
      console.error('[Background] Failed to create WebSocket:', error);
      this.attemptReconnect();
    }
  }

  /**
   * Attempt to reconnect to backend
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= CONFIG.maxReconnectAttempts) {
      console.error('[Background] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`[Background] Reconnecting... (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connectToBackend();
    }, CONFIG.reconnectInterval);
  }

  /**
   * Handle message from backend
   */
  handleBackendMessage(data) {
    try {
      const message = JSON.parse(data);
      console.log('[Background] Backend message:', message.type);

      switch (message.type) {
        case 'REGISTERED':
          console.log('[Background] Registered with backend:', message.clientId);
          break;

        case 'SESSION_CREATED':
          console.log('[Background] Session created:', message.sessionId);
          this.notifyPopup({ action: 'SESSION_CREATED', session: message.session });
          break;

        case 'CAPTURE_STATUS':
          console.log('[Background] Capture status:', message.status);
          this.notifyPopup({ action: 'CAPTURE_STATUS', status: message.status });
          break;

        case 'ERROR':
          console.error('[Background] Backend error:', message.error);
          this.notifyPopup({ action: 'ERROR', error: message.error });
          break;
      }
    } catch (error) {
      console.error('[Background] Failed to parse backend message:', error);
    }
  }

  /**
   * Send message to backend
   */
  sendToBackend(message) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[Background] Cannot send, WebSocket not connected');
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('[Background] Failed to send message:', error);
      return false;
    }
  }

  /**
   * Notify popup of updates
   */
  notifyPopup(message) {
    chrome.runtime.sendMessage(message).catch(() => {
      // Popup might not be open, ignore error
    });
  }

  /**
   * Handle meeting detected
   */
  async handleMeetingDetected(message, sender) {
    console.log('[Background] Meeting detected:', message.platform, sender.tab?.id);

    // Store tab info
    const tabId = sender.tab?.id;
    if (tabId) {
      await chrome.storage.local.set({
        [`meeting_${tabId}`]: {
          platform: message.platform,
          url: message.url,
          detectedAt: Date.now()
        }
      });
    }

    // Notify popup
    this.notifyPopup({
      action: 'MEETING_DETECTED',
      platform: message.platform,
      tabId
    });
  }

  /**
   * Handle start capture request from popup
   */
  async handleStartCaptureRequest(message, sender) {
    console.log('[Background] Start capture request:', message);

    const { tabId, title } = message;
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create session on backend
    const success = this.sendToBackend({
      type: 'CREATE_SESSION',
      sessionId,
      title,
      platform: message.platform || 'teams',
      tabId
    });

    if (!success) {
      console.error('[Background] Failed to create session on backend');
      return;
    }

    // Store session locally
    this.sessions.set(sessionId, {
      sessionId,
      title,
      platform: message.platform || 'teams',
      tabId,
      startedAt: Date.now(),
      captionCount: 0
    });

    this.activeSessions.add(sessionId);

    // Send start message to content script
    chrome.tabs.sendMessage(tabId, {
      action: 'START_CAPTURE',
      sessionId
    });

    console.log('[Background] Capture session started:', sessionId);
  }

  /**
   * Handle stop capture request from popup
   */
  async handleStopCaptureRequest(message, sender) {
    console.log('[Background] Stop capture request:', message);

    const { sessionId, tabId } = message;

    // Send stop message to content script
    if (tabId) {
      chrome.tabs.sendMessage(tabId, {
        action: 'STOP_CAPTURE'
      });
    }

    // Notify backend
    this.sendToBackend({
      type: 'END_SESSION',
      sessionId
    });

    // Update local state
    this.activeSessions.delete(sessionId);

    console.log('[Background] Capture session stopped:', sessionId);
  }

  /**
   * Handle capture started from content script
   */
  handleCaptureStarted(message, sender) {
    console.log('[Background] Capture started:', message.sessionId);

    // Notify popup
    this.notifyPopup({
      action: 'CAPTURE_STARTED',
      sessionId: message.sessionId,
      platform: message.platform
    });
  }

  /**
   * Handle capture stopped from content script
   */
  handleCaptureStopped(message, sender) {
    console.log('[Background] Capture stopped:', message.sessionId);

    // Notify popup
    this.notifyPopup({
      action: 'CAPTURE_STOPPED',
      sessionId: message.sessionId
    });
  }

  /**
   * Handle caption data from content script
   */
  async handleCaptionData(message, sender) {
    const { sessionId, platform, captions } = message;

    console.log('[Background] Caption data received:', captions.length, 'captions');

    // Update session caption count
    const session = this.sessions.get(sessionId);
    if (session) {
      session.captionCount += captions.length;
      this.sessions.set(sessionId, session);
    }

    // Stream to backend
    const success = this.sendToBackend({
      type: 'CAPTION_DATA',
      sessionId,
      platform,
      captions,
      timestamp: Date.now()
    });

    if (!success) {
      console.error('[Background] Failed to send captions to backend');
    }

    // Notify popup with stats
    this.notifyPopup({
      action: 'CAPTION_COUNT_UPDATE',
      sessionId,
      count: session?.captionCount || captions.length
    });
  }
}

// Initialize service
const captureService = new CaptureBackgroundService();

console.log('[Background] Service worker loaded');
