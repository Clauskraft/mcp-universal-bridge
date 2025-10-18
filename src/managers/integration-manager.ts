/**
 * Integration Manager
 *
 * Manages third-party service integrations (Gmail, Google Maps, Calendar, etc.)
 * Similar to Claude/ChatGPT integration settings pages
 *
 * Features:
 * - OAuth2 flow for secure authorization
 * - Multi-service support (Google, Microsoft, etc.)
 * - Local device access via MCP Bridge
 * - Token refresh and expiration handling
 */

import crypto from 'crypto';

export type IntegrationType =
  | 'gmail'
  | 'google-calendar'
  | 'google-maps'
  | 'google-drive'
  | 'google-sheets'
  | 'microsoft-outlook'
  | 'microsoft-calendar'
  | 'microsoft-teams'
  | 'slack'
  | 'notion'
  | 'github'
  | 'jira'
  | 'linear'
  | 'custom';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
}

export interface Integration {
  id: string;
  type: IntegrationType;
  name: string;
  enabled: boolean;
  config: OAuthConfig;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface IntegrationCapability {
  type: IntegrationType;
  name: string;
  description: string;
  icon: string;
  scopes: string[];
  requiresOAuth: boolean;
  provider: 'google' | 'microsoft' | 'custom';
}

export class IntegrationManager {
  private integrations: Map<string, Integration> = new Map();
  private capabilities: Map<IntegrationType, IntegrationCapability> = new Map();

  constructor() {
    this.initializeCapabilities();
    console.log('[IntegrationManager] Manager initialized');
  }

  /**
   * Initialize available integration capabilities
   */
  private initializeCapabilities(): void {
    // Google Integrations
    this.capabilities.set('gmail', {
      type: 'gmail',
      name: 'Gmail',
      description: 'Read and send emails, manage inbox',
      icon: '📧',
      scopes: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'],
      requiresOAuth: true,
      provider: 'google',
    });

    this.capabilities.set('google-calendar', {
      type: 'google-calendar',
      name: 'Google Calendar',
      description: 'View and manage calendar events',
      icon: '📅',
      scopes: ['https://www.googleapis.com/auth/calendar'],
      requiresOAuth: true,
      provider: 'google',
    });

    this.capabilities.set('google-maps', {
      type: 'google-maps',
      name: 'Google Maps',
      description: 'Geocoding, directions, places search',
      icon: '🗺️',
      scopes: [],
      requiresOAuth: false, // Uses API key
      provider: 'google',
    });

    this.capabilities.set('google-drive', {
      type: 'google-drive',
      name: 'Google Drive',
      description: 'Access and manage files in Drive',
      icon: '📁',
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      requiresOAuth: true,
      provider: 'google',
    });

    this.capabilities.set('google-sheets', {
      type: 'google-sheets',
      name: 'Google Sheets',
      description: 'Read and write spreadsheet data',
      icon: '📊',
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      requiresOAuth: true,
      provider: 'google',
    });

    // Microsoft Integrations
    this.capabilities.set('microsoft-outlook', {
      type: 'microsoft-outlook',
      name: 'Outlook',
      description: 'Read and send emails',
      icon: '📬',
      scopes: ['Mail.Read', 'Mail.Send'],
      requiresOAuth: true,
      provider: 'microsoft',
    });

    this.capabilities.set('microsoft-calendar', {
      type: 'microsoft-calendar',
      name: 'Outlook Calendar',
      description: 'View and manage calendar',
      icon: '📆',
      scopes: ['Calendars.ReadWrite'],
      requiresOAuth: true,
      provider: 'microsoft',
    });

    this.capabilities.set('microsoft-teams', {
      type: 'microsoft-teams',
      name: 'Microsoft Teams',
      description: 'Send messages, access channels',
      icon: '👥',
      scopes: ['Chat.ReadWrite', 'Channel.ReadBasic.All'],
      requiresOAuth: true,
      provider: 'microsoft',
    });

    // Other Integrations
    this.capabilities.set('slack', {
      type: 'slack',
      name: 'Slack',
      description: 'Send messages, read channels',
      icon: '💬',
      scopes: ['chat:write', 'channels:read'],
      requiresOAuth: true,
      provider: 'custom',
    });

    this.capabilities.set('notion', {
      type: 'notion',
      name: 'Notion',
      description: 'Access pages and databases',
      icon: '📝',
      scopes: [],
      requiresOAuth: true,
      provider: 'custom',
    });
  }

  /**
   * Register a new integration
   */
  registerIntegration(
    type: IntegrationType,
    name: string,
    config: OAuthConfig,
    metadata?: Record<string, any>
  ): Integration {
    const id = `int_${crypto.randomBytes(12).toString('hex')}`;

    const integration: Integration = {
      id,
      type,
      name,
      enabled: false,
      config,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata,
    };

    this.integrations.set(id, integration);

    console.log(`[IntegrationManager] Registered ${type} integration: ${id}`);

    return integration;
  }

  /**
   * Start OAuth2 authorization flow
   */
  startOAuthFlow(integrationId: string): string {
    const integration = this.getIntegration(integrationId);

    if (!integration) {
      throw new Error(`Integration ${integrationId} not found`);
    }

    const capability = this.capabilities.get(integration.type);

    if (!capability?.requiresOAuth) {
      throw new Error(`Integration ${integration.type} does not require OAuth`);
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex');

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: integration.config.clientId,
      redirect_uri: integration.config.redirectUri,
      response_type: 'code',
      scope: integration.config.scopes.join(' '),
      state,
      access_type: 'offline', // Request refresh token
    });

    const authUrl = `${integration.config.authUrl}?${params.toString()}`;

    // Store state for validation
    integration.metadata = {
      ...integration.metadata,
      oauthState: state,
    };

    this.integrations.set(integrationId, integration);

    return authUrl;
  }

  /**
   * Complete OAuth2 flow with authorization code
   */
  async completeOAuthFlow(integrationId: string, code: string, state: string): Promise<Integration> {
    const integration = this.getIntegration(integrationId);

    if (!integration) {
      throw new Error(`Integration ${integrationId} not found`);
    }

    // Validate state (CSRF protection)
    if (integration.metadata?.oauthState !== state) {
      throw new Error('Invalid OAuth state - possible CSRF attack');
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(integration.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: integration.config.clientId,
        client_secret: integration.config.clientSecret,
        code,
        redirect_uri: integration.config.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`OAuth token exchange failed: ${error}`);
    }

    const tokens = await tokenResponse.json();

    // Store tokens
    integration.accessToken = tokens.access_token;
    integration.refreshToken = tokens.refresh_token;
    integration.tokenExpiry = new Date(Date.now() + (tokens.expires_in * 1000));
    integration.enabled = true;
    integration.updatedAt = new Date();

    this.integrations.set(integrationId, integration);

    console.log(`[IntegrationManager] OAuth completed for ${integration.type}: ${integrationId}`);

    return integration;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(integrationId: string): Promise<void> {
    const integration = this.getIntegration(integrationId);

    if (!integration || !integration.refreshToken) {
      throw new Error('No refresh token available');
    }

    const tokenResponse = await fetch(integration.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: integration.config.clientId,
        client_secret: integration.config.clientSecret,
        refresh_token: integration.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Token refresh failed');
    }

    const tokens = await tokenResponse.json();

    integration.accessToken = tokens.access_token;
    integration.tokenExpiry = new Date(Date.now() + (tokens.expires_in * 1000));
    integration.updatedAt = new Date();

    this.integrations.set(integrationId, integration);

    console.log(`[IntegrationManager] Token refreshed for ${integrationId}`);
  }

  /**
   * Get valid access token (auto-refresh if needed)
   */
  async getAccessToken(integrationId: string): Promise<string> {
    const integration = this.getIntegration(integrationId);

    if (!integration || !integration.enabled) {
      throw new Error('Integration not enabled');
    }

    // Check if token needs refresh
    if (integration.tokenExpiry && integration.tokenExpiry < new Date()) {
      await this.refreshAccessToken(integrationId);
      return this.integrations.get(integrationId)!.accessToken!;
    }

    return integration.accessToken!;
  }

  /**
   * Execute API call with integration
   */
  async executeIntegrationCall(
    integrationId: string,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const token = await this.getAccessToken(integrationId);
    const integration = this.getIntegration(integrationId)!;

    const response = await fetch(endpoint, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Integration call failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Get integration by ID
   */
  getIntegration(id: string): Integration | null {
    return this.integrations.get(id) || null;
  }

  /**
   * Get all integrations
   */
  getAllIntegrations(): Integration[] {
    return Array.from(this.integrations.values());
  }

  /**
   * Get integrations by type
   */
  getIntegrationsByType(type: IntegrationType): Integration[] {
    return Array.from(this.integrations.values()).filter(i => i.type === type);
  }

  /**
   * Get enabled integrations
   */
  getEnabledIntegrations(): Integration[] {
    return Array.from(this.integrations.values()).filter(i => i.enabled);
  }

  /**
   * Enable/disable integration
   */
  toggleIntegration(id: string, enabled: boolean): Integration {
    const integration = this.getIntegration(id);

    if (!integration) {
      throw new Error(`Integration ${id} not found`);
    }

    integration.enabled = enabled;
    integration.updatedAt = new Date();

    this.integrations.set(id, integration);

    return integration;
  }

  /**
   * Delete integration
   */
  deleteIntegration(id: string): boolean {
    return this.integrations.delete(id);
  }

  /**
   * Get available capabilities
   */
  getAvailableCapabilities(): IntegrationCapability[] {
    return Array.from(this.capabilities.values());
  }

  /**
   * Get capability by type
   */
  getCapability(type: IntegrationType): IntegrationCapability | null {
    return this.capabilities.get(type) || null;
  }

  /**
   * Get statistics
   */
  getStatistics(): any {
    const integrations = Array.from(this.integrations.values());

    return {
      total: integrations.length,
      enabled: integrations.filter(i => i.enabled).length,
      disabled: integrations.filter(i => !i.enabled).length,
      byType: integrations.reduce((acc, i) => {
        acc[i.type] = (acc[i.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      capabilitiesAvailable: this.capabilities.size,
    };
  }

  /**
   * Test integration health
   */
  async testIntegration(id: string): Promise<{healthy: boolean; error?: string}> {
    try {
      const integration = this.getIntegration(id);

      if (!integration) {
        return { healthy: false, error: 'Integration not found' };
      }

      if (!integration.enabled) {
        return { healthy: false, error: 'Integration disabled' };
      }

      // Try to get access token (will auto-refresh if needed)
      await this.getAccessToken(id);

      return { healthy: true };
    } catch (error: any) {
      return { healthy: false, error: error.message };
    }
  }
}

// Singleton instance
export const integrationManager = new IntegrationManager();
