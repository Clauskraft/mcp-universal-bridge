/**
 * Real-Time Caption Capture - Popup Controller
 */

class CapturePopupController {
  constructor() {
    this.currentTab = null;
    this.meetingDetected = false;
    this.isCapturing = false;
    this.currentSession = null;
    this.captionCount = 0;

    console.log('[Popup] Initializing...');
    this.init();
  }

  /**
   * Initialize popup
   */
  async init() {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tab;

    // Check connection status
    await this.updateConnectionStatus();

    // Check if on a meeting page
    await this.checkMeetingPage();

    // Listen for messages from background
    chrome.runtime.onMessage.addListener((message) => {
      this.handleBackgroundMessage(message);
    });

    // Set up event listeners
    this.setupEventListeners();

    // Render UI
    this.render();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    document.getElementById('open-dashboard')?.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'http://localhost:8080/mini-tools.html' });
    });
  }

  /**
   * Update connection status
   */
  async updateConnectionStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'GET_CONNECTION_STATUS' });

      const statusEl = document.getElementById('connection-status');
      if (response.isConnected) {
        statusEl.className = 'status-indicator connected';
        statusEl.textContent = '🟢 Connected to server';
      } else {
        statusEl.className = 'status-indicator disconnected';
        statusEl.textContent = '🔴 Server disconnected';
      }
    } catch (error) {
      console.error('[Popup] Failed to get connection status:', error);
    }
  }

  /**
   * Check if current tab is a meeting page
   */
  async checkMeetingPage() {
    const url = this.currentTab?.url || '';

    if (url.includes('teams.microsoft.com')) {
      this.meetingDetected = true;
      this.platform = 'teams';
    } else if (url.includes('zoom.us')) {
      this.meetingDetected = true;
      this.platform = 'zoom';
    } else if (url.includes('meet.google.com')) {
      this.meetingDetected = true;
      this.platform = 'meet';
    } else {
      this.meetingDetected = false;
      this.platform = null;
    }

    console.log('[Popup] Meeting detected:', this.meetingDetected, this.platform);
  }

  /**
   * Handle messages from background
   */
  handleBackgroundMessage(message) {
    console.log('[Popup] Background message:', message.action);

    switch (message.action) {
      case 'CONNECTION_STATUS':
        this.updateConnectionStatus();
        break;

      case 'MEETING_DETECTED':
        this.meetingDetected = true;
        this.platform = message.platform;
        this.render();
        break;

      case 'CAPTURE_STARTED':
        this.isCapturing = true;
        this.currentSession = message.sessionId;
        this.render();
        break;

      case 'CAPTURE_STOPPED':
        this.isCapturing = false;
        this.currentSession = null;
        this.captionCount = 0;
        this.render();
        break;

      case 'CAPTION_COUNT_UPDATE':
        this.captionCount = message.count;
        this.updateStats();
        break;

      case 'ERROR':
        alert('Error: ' + message.error);
        break;
    }
  }

  /**
   * Start capture
   */
  async startCapture() {
    const titleInput = document.getElementById('capture-title');
    const title = titleInput?.value.trim();

    if (!title) {
      alert('Please enter a title for this capture session');
      return;
    }

    console.log('[Popup] Starting capture:', title);

    try {
      await chrome.runtime.sendMessage({
        action: 'START_CAPTURE_REQUEST',
        tabId: this.currentTab.id,
        title,
        platform: this.platform
      });

      this.isCapturing = true;
      this.render();
    } catch (error) {
      console.error('[Popup] Failed to start capture:', error);
      alert('Failed to start capture: ' + error.message);
    }
  }

  /**
   * Stop capture
   */
  async stopCapture() {
    if (!this.currentSession) {
      return;
    }

    console.log('[Popup] Stopping capture');

    try {
      await chrome.runtime.sendMessage({
        action: 'STOP_CAPTURE_REQUEST',
        sessionId: this.currentSession,
        tabId: this.currentTab.id
      });

      this.isCapturing = false;
      this.currentSession = null;
      this.captionCount = 0;
      this.render();
    } catch (error) {
      console.error('[Popup] Failed to stop capture:', error);
      alert('Failed to stop capture: ' + error.message);
    }
  }

  /**
   * Update stats display
   */
  updateStats() {
    const statsValue = document.getElementById('caption-count-value');
    if (statsValue) {
      statsValue.textContent = this.captionCount;
    }
  }

  /**
   * Render UI
   */
  render() {
    const content = document.getElementById('content');

    if (!this.meetingDetected) {
      content.innerHTML = `
        <div class="no-meeting">
          <p style="margin-bottom: 8px;">⚠️ No meeting detected</p>
          <p>Open a Teams, Zoom, or Google Meet session to start capturing captions.</p>
        </div>
      `;
      return;
    }

    if (this.isCapturing) {
      content.innerHTML = `
        <div class="meeting-info detected">
          <div class="meeting-label">Currently Capturing</div>
          <div class="meeting-platform">
            ${this.getPlatformIcon(this.platform)} ${this.getPlatformName(this.platform)}
          </div>
        </div>

        <div class="capture-stats">
          <div class="stat-row">
            <span class="stat-label">Captions captured:</span>
            <span class="stat-value" id="caption-count-value">${this.captionCount}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Session:</span>
            <span class="stat-value">Active</span>
          </div>
        </div>

        <button class="btn-danger" id="stop-capture-btn">
          ⏹️ Stop Capture
        </button>
      `;

      document.getElementById('stop-capture-btn').addEventListener('click', () => {
        this.stopCapture();
      });
    } else {
      content.innerHTML = `
        <div class="meeting-info detected">
          <div class="meeting-label">Meeting Detected</div>
          <div class="meeting-platform">
            ${this.getPlatformIcon(this.platform)} ${this.getPlatformName(this.platform)}
          </div>
        </div>

        <div class="form-group">
          <label for="capture-title">Capture Title *</label>
          <input
            type="text"
            id="capture-title"
            placeholder="e.g., Team Meeting - Jan 2024"
            required
          />
        </div>

        <button class="btn-primary" id="start-capture-btn">
          ▶️ Start Capture
        </button>

        <p style="margin-top: 12px; font-size: 12px; color: #718096; text-align: center;">
          Captions will be captured in real-time and saved to the dashboard
        </p>
      `;

      document.getElementById('start-capture-btn').addEventListener('click', () => {
        this.startCapture();
      });
    }
  }

  /**
   * Get platform icon
   */
  getPlatformIcon(platform) {
    const icons = {
      teams: '👥',
      zoom: '🎥',
      meet: '📹'
    };
    return icons[platform] || '🎤';
  }

  /**
   * Get platform name
   */
  getPlatformName(platform) {
    const names = {
      teams: 'Microsoft Teams',
      zoom: 'Zoom',
      meet: 'Google Meet'
    };
    return names[platform] || platform;
  }
}

// Initialize popup controller
const controller = new CapturePopupController();

console.log('[Popup] Script loaded');
