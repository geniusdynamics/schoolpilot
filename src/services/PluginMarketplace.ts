/**
 * Plugin Marketplace Service
 * 
 * Handles marketplace connectivity, plugin discovery, key validation,
 * installation tracking, and analytics reporting.
 */

import type {
  MarketplaceKeyConfig,
  MarketplacePlugin,
  MarketplaceClientConfig,
  PluginManifest,
  PluginInstallResult,
  AdminPluginConfig,
} from '../plugins/types';

// ============================================================================
// Types
// ============================================================================

export interface MarketplaceSearchResult {
  plugins: MarketplacePlugin[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MarketplaceCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  pluginCount: number;
}

export interface MarketplaceFeatured {
  featured: MarketplacePlugin[];
  trending: MarketplacePlugin[];
  newReleases: MarketplacePlugin[];
}

export interface InstallTrackingEvent {
  eventType: 'install' | 'activate' | 'deactivate' | 'uninstall';
  pluginId: string;
  pluginVersion: string;
  instanceId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface KeyValidationResult {
  valid: boolean;
  plan: 'free' | 'standard' | 'enterprise';
  permissions: MarketplaceKeyConfig['permissions'];
  expiresAt: string;
  error?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_REGISTRY_URL = 'https://marketplace.schoolpilot3.com/api/v1';
const CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// Plugin Marketplace Service
// ============================================================================

export class PluginMarketplace {
  private config: MarketplaceClientConfig;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private instanceId: string;
  private keyConfig: MarketplaceKeyConfig | null = null;

  constructor(config: MarketplaceClientConfig) {
    this.config = {
      registryUrl: DEFAULT_REGISTRY_URL,
      cacheTimeout: CACHE_TIMEOUT,
      ...config,
    } as MarketplaceClientConfig;
    this.instanceId = config.instanceId || this.generateInstanceId();
  }

  // ============================================================================
  // Key Management
  // ============================================================================

  /**
   * Set marketplace key for authenticated requests
   */
  setMarketplaceKey(key: MarketplaceKeyConfig): void {
    this.keyConfig = key;
    this.clearCache();
  }

  /**
   * Get current marketplace key
   */
  getMarketplaceKey(): MarketplaceKeyConfig | null {
    return this.keyConfig;
  }

  /**
   * Validate marketplace key with server
   */
  async validateKey(key: string): Promise<KeyValidationResult> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.config.registryUrl}/keys/validate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key,
            instanceId: this.instanceId,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          valid: false,
          plan: 'free',
          permissions: {
            accessMarketplace: false,
            installFreePlugins: true,
            installPaidPlugins: false,
            maxPlugins: 5,
            prioritySupport: false,
          },
          expiresAt: '',
          error: error.message || 'Key validation failed',
        };
      }

      const data = await response.json();
      
      return {
        valid: true,
        plan: data.plan,
        permissions: data.permissions,
        expiresAt: data.expiresAt,
      };
    } catch {
      // Offline fallback - check local key format
      return this.validateKeyLocally(key);
    }
  }

  /**
   * Validate key format locally (offline fallback)
   */
  private validateKeyLocally(key: string): KeyValidationResult {
    // Key format: sp3_<plan>_<random>_<checksum>
    const keyPattern = /^sp3_(free|standard|enterprise)_([a-zA-Z0-9]{16})_([a-zA-Z0-9]{8})$/;
    const match = key.match(keyPattern);

    if (!match) {
      return {
        valid: false,
        plan: 'free',
        permissions: {
          accessMarketplace: false,
          installFreePlugins: true,
          installPaidPlugins: false,
          maxPlugins: 5,
          prioritySupport: false,
        },
        expiresAt: '',
        error: 'Invalid key format',
      };
    }

    const [, plan, , checksum] = match;
    
    // Simple checksum validation (in production, use proper crypto)
    const expectedChecksum = this.generateChecksum(plan + match[2]);
    const validChecksum = checksum === expectedChecksum;

    if (!validChecksum) {
      return {
        valid: false,
        plan: 'free',
        permissions: {
          accessMarketplace: false,
          installFreePlugins: true,
          installPaidPlugins: false,
          maxPlugins: 5,
          prioritySupport: false,
        },
        expiresAt: '',
        error: 'Invalid key checksum',
      };
    }

    const permissions = {
      free: {
        accessMarketplace: true,
        installFreePlugins: true,
        installPaidPlugins: false,
        maxPlugins: 10,
        prioritySupport: false,
      },
      standard: {
        accessMarketplace: true,
        installFreePlugins: true,
        installPaidPlugins: true,
        maxPlugins: 25,
        prioritySupport: false,
      },
      enterprise: {
        accessMarketplace: true,
        installFreePlugins: true,
        installPaidPlugins: true,
        maxPlugins: 100,
        prioritySupport: true,
      },
    };

    return {
      valid: true,
      plan: plan as 'free' | 'standard' | 'enterprise',
      permissions: permissions[plan as keyof typeof permissions],
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  // ============================================================================
  // Plugin Discovery
  // ============================================================================

  /**
   * Search marketplace for plugins
   */
  async searchPlugins(
    query: string,
    options: {
      category?: string;
      type?: string;
      page?: number;
      pageSize?: number;
      sortBy?: 'relevance' | 'downloads' | 'rating' | 'updated';
    } = {}
  ): Promise<MarketplaceSearchResult> {
    const params = new URLSearchParams({
      q: query,
      ...(options.category && { category: options.category }),
      ...(options.type && { type: options.type }),
      page: String(options.page || 1),
      pageSize: String(options.pageSize || 20),
      sortBy: options.sortBy || 'relevance',
    });

    const cacheKey = `search_${params.toString()}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.authenticatedFetch(
        `${this.config.registryUrl}/plugins?${params}`
      );

      if (!response.ok) {
        throw new Error('Failed to search marketplace');
      }

      const data = await response.json();
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('[PluginMarketplace] Search failed:', error);
      // Return empty result on error
      return {
        plugins: [],
        total: 0,
        page: options.page || 1,
        pageSize: options.pageSize || 20,
      };
    }
  }

  /**
   * Get plugin details from marketplace
   */
  async getPluginDetails(pluginId: string): Promise<MarketplacePlugin | null> {
    const cacheKey = `plugin_${pluginId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.authenticatedFetch(
        `${this.config.registryUrl}/plugins/${pluginId}`
      );

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to get plugin details');
      }

      const data = await response.json();
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('[PluginMarketplace] Get plugin details failed:', error);
      return null;
    }
  }

  /**
   * Get featured plugins
   */
  async getFeatured(): Promise<MarketplaceFeatured> {
    const cacheKey = 'featured';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.authenticatedFetch(
        `${this.config.registryUrl}/featured`
      );

      if (!response.ok) {
        throw new Error('Failed to get featured plugins');
      }

      const data = await response.json();
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('[PluginMarketplace] Get featured failed:', error);
      return { featured: [], trending: [], newReleases: [] };
    }
  }

  /**
   * Get marketplace categories
   */
  async getCategories(): Promise<MarketplaceCategory[]> {
    const cacheKey = 'categories';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.authenticatedFetch(
        `${this.config.registryUrl}/categories`
      );

      if (!response.ok) {
        throw new Error('Failed to get categories');
      }

      const data = await response.json();
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('[PluginMarketplace] Get categories failed:', error);
      return this.getDefaultCategories();
    }
  }

  /**
   * Get plugin reviews
   */
  async getPluginReviews(
    pluginId: string,
    page: number = 1
  ): Promise<{ reviews: any[]; total: number; averageRating: number }> {
    const cacheKey = `reviews_${pluginId}_${page}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.authenticatedFetch(
        `${this.config.registryUrl}/plugins/${pluginId}/reviews?page=${page}`
      );

      if (!response.ok) {
        throw new Error('Failed to get reviews');
      }

      const data = await response.json();
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('[PluginMarketplace] Get reviews failed:', error);
      return { reviews: [], total: 0, averageRating: 0 };
    }
  }

  // ============================================================================
  // Plugin Installation
  // ============================================================================

  /**
   * Install a plugin from marketplace
   */
  async installPlugin(
    pluginId: string,
    adminConfig: AdminPluginConfig
  ): Promise<PluginInstallResult> {
    try {
      // Check if plugins are enabled
      if (!adminConfig.pluginsEnabled) {
        return {
          success: false,
          error: 'Plugin system is disabled',
        };
      }

      // Get plugin details
      const plugin = await this.getPluginDetails(pluginId);
      if (!plugin) {
        return {
          success: false,
          error: 'Plugin not found in marketplace',
        };
      }

      // Check if it's a paid plugin and permissions
      const isPaid = plugin.manifest.marketplace?.price && plugin.manifest.marketplace.price > 0;
      if (isPaid && !adminConfig.marketplace.allowPaidPlugins) {
        return {
          success: false,
          error: 'Paid plugins are not allowed',
        };
      }

      // Check marketplace key for paid plugins
      if (isPaid && !this.keyConfig?.permissions.installPaidPlugins) {
        return {
          success: false,
          error: 'Your marketplace plan does not allow paid plugin installation',
        };
      }

      // Track installation
      await this.trackEvent({
        eventType: 'install',
        pluginId: plugin.manifest.id,
        pluginVersion: plugin.manifest.version,
        instanceId: this.instanceId,
        timestamp: new Date().toISOString(),
        metadata: {
          price: plugin.manifest.marketplace?.price || 0,
          source: 'marketplace',
        },
      });

      // Download and verify plugin
      const manifest = await this.downloadAndVerify(plugin);

      return {
        success: true,
        plugin: {
          manifest,
          module: {},
          status: 'loaded',
          loadedAt: new Date(),
          source: 'marketplace',
        },
      };
    } catch (error) {
      console.error('[PluginMarketplace] Install failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Installation failed',
      };
    }
  }

  /**
   * Download and verify plugin package
   */
  private async downloadAndVerify(plugin: MarketplacePlugin): Promise<PluginManifest> {
    // Verify signature
    const isValid = await this.verifySignature(plugin);
    if (!isValid) {
      throw new Error('Plugin signature verification failed');
    }

    // In a real implementation, this would:
    // 1. Download the plugin package from plugin.downloadUrl
    // 2. Extract the package
    // 3. Verify file integrity
    // 4. Load the manifest

    // For now, return the manifest from the marketplace listing
    return plugin.manifest;
  }

  /**
   * Verify plugin signature
   */
  private async verifySignature(plugin: MarketplacePlugin): Promise<boolean> {
    if (!plugin.signature) {
      // Allow unsigned plugins for development
      console.warn('[PluginMarketplace] Plugin has no signature');
      return true;
    }

    try {
      // In production, use Web Crypto API to verify signature
      // For now, just check that signature exists and hasn't expired
      const expires = new Date(plugin.signature.expiresAt);
      if (expires < new Date()) {
        console.error('[PluginMarketplace] Plugin signature has expired');
        return false;
      }

      return true;
    } catch (error) {
      console.error('[PluginMarketplace] Signature verification failed:', error);
      return false;
    }
  }

  // ============================================================================
  // Analytics & Tracking
  // ============================================================================

  /**
   * Track installation event
   */
  async trackEvent(event: InstallTrackingEvent): Promise<void> {
    try {
      // Store locally for offline sync
      const events = this.getStoredEvents();
      events.push(event);
      localStorage.setItem('marketplace_tracking_events', JSON.stringify(events));

      // Try to send to server
      if (navigator.onLine) {
        await this.sendTrackingEvents();
      }
    } catch (error) {
      console.error('[PluginMarketplace] Failed to track event:', error);
    }
  }

  /**
   * Send stored tracking events to server
   */
  async sendTrackingEvents(): Promise<void> {
    const events = this.getStoredEvents();
    if (events.length === 0) return;

    try {
      const response = await this.authenticatedFetch(
        `${this.config.registryUrl}/analytics/events`,
        {
          method: 'POST',
          body: JSON.stringify({ events }),
        }
      );

      if (response.ok) {
        // Clear sent events
        localStorage.removeItem('marketplace_tracking_events');
      }
    } catch (error) {
      console.error('[PluginMarketplace] Failed to send tracking events:', error);
    }
  }

  /**
   * Get instance statistics
   */
  async getInstanceStats(): Promise<{
    totalInstalls: number;
    activePlugins: number;
    plan: string;
    usageQuota: { used: number; max: number };
  }> {
    try {
      const response = await this.authenticatedFetch(
        `${this.config.registryUrl}/instances/${this.instanceId}/stats`
      );

      if (!response.ok) {
        throw new Error('Failed to get instance stats');
      }

      return response.json();
    } catch (error) {
      console.error('[PluginMarketplace] Get stats failed:', error);
      return {
        totalInstalls: 0,
        activePlugins: 0,
        plan: 'free',
        usageQuota: { used: 0, max: 10 },
      };
    }
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  /**
   * Get instance ID
   */
  getInstanceId(): string {
    return this.instanceId;
  }

  /**
   * Check if marketplace is accessible
   */
  async checkConnectivity(): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.config.registryUrl}/health`,
        { method: 'HEAD' },
        5000
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Generate unique instance ID
   */
  private generateInstanceId(): string {
    const stored = localStorage.getItem('marketplace_instance_id');
    if (stored) return stored;

    const id = `sp3_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('marketplace_instance_id', id);
    return id;
  }

  /**
   * Generate checksum for key validation
   */
  private generateChecksum(input: string): string {
    // Simple hash for demo - use proper crypto in production
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0').substr(0, 8);
  }

  /**
   * Get default categories (fallback)
   */
  private getDefaultCategories(): MarketplaceCategory[] {
    return [
      { id: 'academics', name: 'Academics', description: 'Academic management plugins', icon: 'AcademicCapIcon', pluginCount: 0 },
      { id: 'finance', name: 'Finance', description: 'Financial management plugins', icon: 'CurrencyDollarIcon', pluginCount: 0 },
      { id: 'reporting', name: 'Reporting', description: 'Report and analytics plugins', icon: 'ChartBarIcon', pluginCount: 0 },
      { id: 'integration', name: 'Integrations', description: 'Third-party integrations', icon: 'LinkIcon', pluginCount: 0 },
      { id: 'theming', name: 'Theming', description: 'Visual customization plugins', icon: 'PaintBrushIcon', pluginCount: 0 },
      { id: 'utilities', name: 'Utilities', description: 'Helper and utility plugins', icon: 'WrenchScrewdriverIcon', pluginCount: 0 },
    ];
  }

  /**
   * Authenticated fetch wrapper
   */
  private async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.keyConfig) {
      headers['X-Marketplace-Key'] = this.keyConfig.key;
      headers['X-Instance-Id'] = this.instanceId;
    }

    return this.fetchWithTimeout(url, {
      ...options,
      headers,
    });
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout: number = 30000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < (this.config.cacheTimeout || CACHE_TIMEOUT)) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get stored tracking events
   */
  private getStoredEvents(): InstallTrackingEvent[] {
    try {
      const stored = localStorage.getItem('marketplace_tracking_events');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let marketplaceInstance: PluginMarketplace | null = null;

export function initMarketplace(config: MarketplaceClientConfig): PluginMarketplace {
  marketplaceInstance = new PluginMarketplace(config);
  return marketplaceInstance;
}

export function getMarketplace(): PluginMarketplace {
  if (!marketplaceInstance) {
    marketplaceInstance = new PluginMarketplace({
      registryUrl: DEFAULT_REGISTRY_URL,
      instanceId: 'auto-generated',
    });
  }
  return marketplaceInstance;
}

export default PluginMarketplace;
