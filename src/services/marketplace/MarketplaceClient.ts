import { logger } from '@/utils/logging';

/**
 * Marketplace Client
 * 
 * Service for interacting with the SchoolPilot3 plugin marketplace.
 * Handles plugin discovery, installation, key validation, and analytics.
 */

import type {
  MarketplaceClientConfig,
  MarketplaceKeyConfig,
  MarketplacePlugin,
  PluginSignature,
  PluginReview,
} from '../../plugins/types';

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

export interface AnalyticsEvent {
  type: 'install' | 'uninstall' | 'activate' | 'deactivate' | 'update' | 'search' | 'view';
  pluginId?: string;
  metadata?: Record<string, any>;
  timestamp: string;
  instanceId: string;
}

export interface MarketplaceStatus {
  connected: boolean;
  lastSync: Date | null;
  keyValid: boolean;
  keyPlan: 'free' | 'standard' | 'enterprise' | null;
  installedCount: number;
  maxPlugins: number;
}

// ============================================================================
// Marketplace Client
// ============================================================================

export class MarketplaceClient {
  private config: MarketplaceClientConfig;
  private key: MarketplaceKeyConfig | null = null;
  private cache: Map<string, { data: any; expiry: number }> = new Map();
  private pendingAnalytics: AnalyticsEvent[] = [];
  private analyticsInterval: NodeJS.Timeout | null = null;

  constructor(config: MarketplaceClientConfig) {
    this.config = {
      cacheTimeout: 300000, // 5 minutes default
      ...config,
    };
    
    // Start analytics flush interval
    this.startAnalyticsFlush();
  }

  // ============================================================================
  // Key Management
  // ============================================================================

  /**
   * Validate marketplace key with the registry
   */
  async validateKey(key: string): Promise<MarketplaceKeyConfig> {
    try {
      const response = await fetch(`${this.config.registryUrl}/api/v1/keys/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key,
          instanceId: this.config.instanceId,
        }),
      });

      if (!response.ok) {
        throw new Error('Invalid marketplace key');
      }

      const result = await response.json();
      
      if (result.valid) {
        this.key = result.config;
        return result.config;
      }

      throw new Error(result.message || 'Invalid marketplace key');
    } catch (error) {
      logger.error('[MarketplaceClient] Key validation failed:', error);
      throw error;
    }
  }

  /**
   * Activate marketplace key for this instance
   */
  async activateKey(key: string): Promise<MarketplaceKeyConfig> {
    try {
      const response = await fetch(`${this.config.registryUrl}/api/v1/keys/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key,
          instanceId: this.config.instanceId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to activate marketplace key');
      }

      const result = await response.json();
      this.key = result.config;
      
      return result.config;
    } catch (error) {
      logger.error('[MarketplaceClient] Key activation failed:', error);
      throw error;
    }
  }

  /**
   * Get current key configuration
   */
  getKey(): MarketplaceKeyConfig | null {
    return this.key;
  }

  /**
   * Check if key has required permissions
   */
  hasPermission(permission: keyof MarketplaceKeyConfig['permissions']): boolean {
    if (!this.key) return false;
    return this.key.permissions[permission] === true;
  }

  // ============================================================================
  // Plugin Discovery
  // ============================================================================

  /**
   * Search plugins in marketplace
   */
  async searchPlugins(
    query: string,
    options?: {
      category?: string;
      type?: string;
      page?: number;
      pageSize?: number;
      sortBy?: 'downloads' | 'rating' | 'updated' | 'name';
    }
  ): Promise<MarketplaceSearchResult> {
    const cacheKey = `search:${query}:${JSON.stringify(options)}`;
    
    // Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        q: query,
        ...(options?.category && { category: options.category }),
        ...(options?.type && { type: options.type }),
        ...(options?.page && { page: String(options.page) }),
        ...(options?.pageSize && { pageSize: String(options.pageSize) }),
        ...(options?.sortBy && { sortBy: options.sortBy }),
      });

      const response = await fetch(
        `${this.config.registryUrl}/api/v1/plugins?${params}`,
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to search plugins');
      }

      const result = await response.json();
      
      // Cache the result
      this.setCache(cacheKey, result);
      
      // Report analytics
      this.reportAnalytics({
        type: 'search',
        metadata: { query, options },
        timestamp: new Date().toISOString(),
        instanceId: this.config.instanceId,
      });

      return result;
    } catch (error) {
      logger.error('[MarketplaceClient] Search failed:', error);
      throw error;
    }
  }

  /**
   * Get plugin details
   */
  async getPluginDetails(pluginId: string): Promise<MarketplacePlugin> {
    const cacheKey = `plugin:${pluginId}`;
    
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `${this.config.registryUrl}/api/v1/plugins/${pluginId}`,
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`Plugin not found: ${pluginId}`);
      }

      const result = await response.json();
      this.setCache(cacheKey, result);
      
      // Report view analytics
      this.reportAnalytics({
        type: 'view',
        pluginId,
        timestamp: new Date().toISOString(),
        instanceId: this.config.instanceId,
      });

      return result;
    } catch (error) {
      logger.error('[MarketplaceClient] Failed to get plugin details:', error);
      throw error;
    }
  }

  /**
   * Get plugin reviews
   */
  async getPluginReviews(pluginId: string): Promise<PluginReview[]> {
    const cacheKey = `reviews:${pluginId}`;
    
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `${this.config.registryUrl}/api/v1/plugins/${pluginId}/reviews`,
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        return [];
      }

      const result = await response.json();
      this.setCache(cacheKey, result);
      return result;
    } catch {
      return [];
    }
  }

  /**
   * Get available categories
   */
  async getCategories(): Promise<MarketplaceCategory[]> {
    const cacheKey = 'categories';
    
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `${this.config.registryUrl}/api/v1/categories`,
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        return [];
      }

      const result = await response.json();
      this.setCache(cacheKey, result);
      return result;
    } catch {
      return [];
    }
  }

  /**
   * Get featured plugins
   */
  async getFeaturedPlugins(): Promise<MarketplacePlugin[]> {
    const result = await this.searchPlugins('', { 
      sortBy: 'downloads',
      pageSize: 10 
    });
    return result.plugins.filter(p => p.manifest.marketplace?.featured);
  }

  // ============================================================================
  // Plugin Installation
  // ============================================================================

  /**
   * Download plugin package
   */
  async downloadPlugin(
    pluginId: string,
    version?: string
  ): Promise<{ data: ArrayBuffer; signature: PluginSignature }> {
    try {
      const versionPath = version ? `/${version}` : '/latest';
      
      // Get download URL
      const downloadResponse = await fetch(
        `${this.config.registryUrl}/api/v1/plugins/${pluginId}/download${versionPath}`,
        {
          headers: this.getHeaders(),
        }
      );

      if (!downloadResponse.ok) {
        throw new Error('Failed to get download URL');
      }

      const { downloadUrl, signature } = await downloadResponse.json();

      // Download the package
      const packageResponse = await fetch(downloadUrl);
      if (!packageResponse.ok) {
        throw new Error('Failed to download plugin package');
      }

      const data = await packageResponse.arrayBuffer();

      return { data, signature };
    } catch (error) {
      logger.error('[MarketplaceClient] Download failed:', error);
      throw error;
    }
  }

  /**
   * Verify plugin signature
   */
  async verifySignature(
    packageData: ArrayBuffer,
    signature: PluginSignature
  ): Promise<boolean> {
    try {
      // In production, this would use WebCrypto API to verify the signature
      // For now, we'll do a basic check
      const now = new Date();
      const expires = new Date(signature.expiresAt);
      
      if (now > expires) {
        logger.warn('[MarketplaceClient] Signature has expired');
        return false;
      }

      // TODO: Implement actual signature verification using WebCrypto
      // const key = await crypto.subtle.importKey(...)
      // const verified = await crypto.subtle.verify(...)

      return true;
    } catch (error) {
      logger.error('[MarketplaceClient] Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Check for plugin updates
   */
  async checkForUpdates(
    installedPlugins: Array<{ id: string; version: string }>
  ): Promise<Array<{ pluginId: string; currentVersion: string; latestVersion: string }>> {
    try {
      const response = await fetch(
        `${this.config.registryUrl}/api/v1/plugins/check-updates`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ plugins: installedPlugins }),
        }
      );

      if (!response.ok) {
        return [];
      }

      const result = await response.json();
      return result.updates || [];
    } catch {
      return [];
    }
  }

  // ============================================================================
  // Analytics
  // ============================================================================

  /**
   * Report analytics event
   */
  reportAnalytics(event: AnalyticsEvent): void {
    if (!this.key?.tracking.analyticsEnabled) {
      return;
    }

    this.pendingAnalytics.push(event);

    // Flush immediately for certain events
    if (['install', 'uninstall'].includes(event.type)) {
      this.flushAnalytics();
    }
  }

  /**
   * Flush pending analytics to server
   */
  private async flushAnalytics(): Promise<void> {
    if (this.pendingAnalytics.length === 0) return;

    const events = [...this.pendingAnalytics];
    this.pendingAnalytics = [];

    try {
      await fetch(`${this.config.registryUrl}/api/v1/analytics/batch`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ events }),
      });
    } catch (error) {
      // Re-add events on failure
      this.pendingAnalytics = [...events, ...this.pendingAnalytics];
      logger.error('[MarketplaceClient] Failed to flush analytics:', error);
    }
  }

  /**
   * Start periodic analytics flush
   */
  private startAnalyticsFlush(): void {
    this.analyticsInterval = setInterval(() => {
      this.flushAnalytics();
    }, 60000); // Flush every minute
  }

  /**
   * Stop analytics flush interval
   */
  stopAnalyticsFlush(): void {
    if (this.analyticsInterval) {
      clearInterval(this.analyticsInterval);
      this.analyticsInterval = null;
    }
  }

  // ============================================================================
  // Marketplace Status
  // ============================================================================

  /**
   * Get marketplace connection status
   */
  async getStatus(): Promise<MarketplaceStatus> {
    let connected = false;
    
    try {
      const response = await fetch(`${this.config.registryUrl}/health`, {
        method: 'HEAD',
      });
      connected = response.ok;
    } catch {
      connected = false;
    }

    return {
      connected,
      lastSync: connected ? new Date() : null,
      keyValid: this.key !== null,
      keyPlan: this.key?.plan || null,
      installedCount: 0, // Would be populated from PluginManager
      maxPlugins: this.key?.permissions.maxPlugins || 10,
    };
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  /**
   * Get request headers with auth
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.key) {
      headers['X-Marketplace-Key'] = this.key.key;
      headers['X-Instance-Id'] = this.config.instanceId;
    }

    return headers;
  }

  /**
   * Get from cache
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * Set cache
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + (this.config.cacheTimeout || 300000),
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopAnalyticsFlush();
    this.flushAnalytics();
    this.clearCache();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let marketplaceClientInstance: MarketplaceClient | null = null;

export function initMarketplace(config: MarketplaceClientConfig): MarketplaceClient {
  marketplaceClientInstance = new MarketplaceClient(config);
  return marketplaceClientInstance;
}

export function getMarketplace(): MarketplaceClient | null {
  return marketplaceClientInstance;
}

export default MarketplaceClient;
