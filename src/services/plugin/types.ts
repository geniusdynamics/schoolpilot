/**
 * Plugin Service Types
 *
 * Type definitions and interfaces for plugin marketplace and feature entitlements.
 * Enables dependency injection and testability.
 */

import type { MarketplaceKeyConfig } from '../../plugins/types';

// ============================================================================
// Plugin Marketplace Types
// ============================================================================

export interface MarketplaceSearchResult {
  plugins: Plugin[];
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
  featured: Plugin[];
  trending: Plugin[];
  newReleases: Plugin[];
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
  permissions: MarketplaceKeyPermissions;
  expiresAt: string;
  error?: string;
}

export interface MarketplaceKeyPermissions {
  accessMarketplace: boolean;
  installFreePlugins: boolean;
  installPaidPlugins: boolean;
  maxPlugins: number;
  prioritySupport: boolean;
}

export interface MarketplaceClientConfig {
  registryUrl?: string;
  cacheTimeout?: number;
  instanceId?: string;
  apiKey?: string;
}

// ============================================================================
// Plugin Types
// ============================================================================

export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;
  tags: string[];
  icon?: string;
  screenshots?: string[];
  rating: number;
  reviewCount: number;
  downloadCount: number;
  price: number;
  isFree: boolean;
  isInstalled: boolean;
  isActive: boolean;
  manifest: PluginManifest;
  lastUpdated: Date;
  createdAt: Date;
  compatibility: PluginCompatibility;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  entry: string;
  permissions: string[];
  dependencies: string[];
  hooks: string[];
  configSchema?: Record<string, any>;
}

export interface PluginCompatibility {
  minAppVersion: string;
  maxAppVersion?: string;
  supportedPlatforms: ('web' | 'desktop' | 'mobile')[];
}

export interface PluginVersion {
  version: string;
  changelog: string;
  releaseDate: Date;
  downloadUrl: string;
  minAppVersion: string;
}

export interface PluginReview {
  id: string;
  pluginId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: Date;
  helpful: number;
}

export interface PluginInstallOptions {
  version?: string;
  activate?: boolean;
  force?: boolean;
  backup?: boolean;
}

export interface PluginInstallResult {
  success: boolean;
  pluginId: string;
  version: string;
  message: string;
  error?: string;
  requiresRestart?: boolean;
}

export interface PluginUninstallResult {
  success: boolean;
  pluginId: string;
  message: string;
  error?: string;
  requiresRestart?: boolean;
}

// ============================================================================
// Feature Entitlement Types
// ============================================================================

export type FeatureId =
  | 'whitelabel-basic'
  | 'whitelabel-full'
  | 'advanced-reporting'
  | 'api-access'
  | 'bulk-operations'
  | 'custom-themes'
  | 'priority-support';

export interface FeatureEntitlement {
  featureId: FeatureId;
  enabled: boolean;
  expiresAt?: string;
  limits?: Record<string, number>;
  metadata?: Record<string, any>;
}

export interface FeatureLicense {
  licenseId: string;
  instanceId: string;
  issuedAt: string;
  expiresAt: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise' | 'reseller';
  features: FeatureEntitlement[];
  signature: string;
}

export interface PricingTier {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  features: FeatureId[];
  limits: Record<string, number>;
}

export interface FeatureConfig {
  featureId: FeatureId;
  config: Record<string, any>;
  enabled: boolean;
}

export interface WhiteLabelConfig {
  enabled: boolean;
  logo?: string;
  name?: string;
  favicon?: string;
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  customCss?: string;
}

// ============================================================================
// Service Interfaces
// ============================================================================

/**
 * Plugin Marketplace Interface
 *
 * Handles marketplace connectivity, plugin discovery, and installation.
 */
export interface IPluginMarketplace {
  /**
   * Set marketplace key for authenticated requests
   */
  setMarketplaceKey(key: MarketplaceKeyConfig): void;

  /**
   * Get current marketplace key
   */
  getMarketplaceKey(): MarketplaceKeyConfig | null;

  /**
   * Validate marketplace key with server
   */
  validateKey(key: string): Promise<KeyValidationResult>;

  /**
   * Search for plugins
   */
  search(query: string, options?: { page?: number; pageSize?: number; category?: string }): Promise<MarketplaceSearchResult>;

  /**
   * Get plugin details
   */
  getPlugin(pluginId: string): Promise<Plugin | null>;

  /**
   * Get all categories
   */
  getCategories(): Promise<MarketplaceCategory[]>;

  /**
   * Get featured plugins
   */
  getFeatured(): Promise<MarketplaceFeatured>;

  /**
   * Get plugins by category
   */
  getPluginsByCategory(categoryId: string): Promise<Plugin[]>;

  /**
   * Get plugin versions
   */
  getPluginVersions(pluginId: string): Promise<PluginVersion[]>;

  /**
   * Get plugin reviews
   */
  getPluginReviews(pluginId: string, options?: { page?: number; pageSize?: number }): Promise<PluginReview[]>;

  /**
   * Install a plugin
   */
  installPlugin(pluginId: string, options?: PluginInstallOptions): Promise<PluginInstallResult>;

  /**
   * Uninstall a plugin
   */
  uninstallPlugin(pluginId: string): Promise<PluginUninstallResult>;

  /**
   * Activate a plugin
   */
  activatePlugin(pluginId: string): Promise<boolean>;

  /**
   * Deactivate a plugin
   */
  deactivatePlugin(pluginId: string): Promise<boolean>;

  /**
   * Update a plugin
   */
  updatePlugin(pluginId: string, version?: string): Promise<PluginInstallResult>;

  /**
   * Get installed plugins
   */
  getInstalledPlugins(): Plugin[];

  /**
   * Check for plugin updates
   */
  checkForUpdates(): Promise<Plugin[]>;

  /**
   * Track installation event
   */
  trackEvent(event: InstallTrackingEvent): Promise<void>;

  /**
   * Clear cache
   */
  clearCache(): void;
}

/**
 * Feature Entitlements Interface
 *
 * Gates premium features behind licenses/entitlements.
 */
export interface IFeatureEntitlements {
  /**
   * Initialize with marketplace key
   */
  initialize(marketplaceKey: MarketplaceKeyConfig | null): void;

  /**
   * Load a feature license
   */
  loadLicense(license: FeatureLicense): boolean;

  /**
   * Check if feature is available
   */
  hasFeature(featureId: FeatureId): boolean;

  /**
   * Get feature entitlement details
   */
  getEntitlement(featureId: FeatureId): FeatureEntitlement | null;

  /**
   * Get limit for a specific resource
   */
  getLimit(limitKey: string): number | null;

  /**
   * Get current pricing tier
   */
  getCurrentPlan(): PricingTier;

  /**
   * Check white-label availability
   */
  canUseWhiteLabel(): { available: boolean; reason?: string; tier?: string; upgradeRequired?: string };

  /**
   * Get upgrade suggestion for a feature
   */
  getUpgradeSuggestion(featureId: FeatureId): PricingTier | null;

  /**
   * Get all available features
   */
  getAvailableFeatures(): FeatureId[];

  /**
   * Get white-label configuration
   */
  getWhiteLabelConfig(): WhiteLabelConfig;

  /**
   * Set white-label configuration
   */
  setWhiteLabelConfig(config: Partial<WhiteLabelConfig>): void;
}

// ============================================================================
// Event Types
// ============================================================================

export type PluginEventType =
  | 'plugin_installed'
  | 'plugin_uninstalled'
  | 'plugin_activated'
  | 'plugin_deactivated'
  | 'plugin_updated'
  | 'feature_enabled'
  | 'feature_disabled'
  | 'license_changed';

export interface PluginEvent {
  type: PluginEventType;
  pluginId?: string;
  featureId?: FeatureId;
  timestamp: Date;
  data?: any;
}

export type PluginEventListener = (event: PluginEvent) => void;
