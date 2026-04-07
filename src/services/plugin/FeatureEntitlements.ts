/**
 * Feature Entitlement System
 * 
 * Gates premium features behind licenses/entitlements.
 * Integrates with marketplace keys and supports offline validation.
 */

import type { MarketplaceKeyConfig } from '../../plugins/types';

// ============================================================================
// Types
// ============================================================================

export type FeatureId = 
  | 'whitelabel-basic'      // Name + Logo only
  | 'whitelabel-full'       // Full branding + label overrides
  | 'advanced-reporting'    // Custom report templates
  | 'api-access'            // External API access
  | 'bulk-operations'       // Bulk import/export
  | 'custom-themes'         // Theme customization
  | 'priority-support';     // Support entitlement (not enforced in code)

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

// ============================================================================
// Pricing Tiers Configuration
// ============================================================================

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    features: [],
    limits: { maxStudents: 100, maxPlugins: 5 },
  },
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 29,
    annualPrice: 290,
    features: ['advanced-reporting', 'bulk-operations'],
    limits: { maxStudents: 500, maxPlugins: 15 },
  },
  {
    id: 'professional',
    name: 'Professional',
    monthlyPrice: 79,
    annualPrice: 790,
    features: ['whitelabel-basic', 'advanced-reporting', 'bulk-operations', 'api-access', 'custom-themes'],
    limits: { maxStudents: 2000, maxPlugins: 50 },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 199,
    annualPrice: 1990,
    features: ['whitelabel-full', 'advanced-reporting', 'bulk-operations', 'api-access', 'custom-themes', 'priority-support'],
    limits: { maxStudents: -1, maxPlugins: -1 },
  },
  {
    id: 'reseller',
    name: 'Reseller / White-Label',
    monthlyPrice: 499,
    annualPrice: 4990,
    features: ['whitelabel-full', 'advanced-reporting', 'bulk-operations', 'api-access', 'custom-themes', 'priority-support'],
    limits: { maxStudents: -1, maxPlugins: -1, maxInstances: 10 },
  },
];

// ============================================================================
// Feature Entitlement Manager
// ============================================================================

class FeatureEntitlementManager {
  private license: FeatureLicense | null = null;
  private marketplaceKey: MarketplaceKeyConfig | null = null;
  private cachedEntitlements: Map<FeatureId, FeatureEntitlement> = new Map();

  initialize(marketplaceKey: MarketplaceKeyConfig | null): void {
    this.marketplaceKey = marketplaceKey;
    this.cacheEntitlements();
  }

  loadLicense(license: FeatureLicense): boolean {
    if (!this.validateLicense(license)) {
      console.error('[FeatureEntitlements] Invalid license');
      return false;
    }

    if (new Date(license.expiresAt) < new Date()) {
      console.error('[FeatureEntitlements] License expired');
      return false;
    }

    if (license.instanceId !== this.getInstanceId()) {
      console.error('[FeatureEntitlements] Instance ID mismatch');
      return false;
    }

    this.license = license;
    this.cacheEntitlements();
    return true;
  }

  hasFeature(featureId: FeatureId): boolean {
    const entitlement = this.cachedEntitlements.get(featureId);
    if (!entitlement) return false;
    if (entitlement.expiresAt && new Date(entitlement.expiresAt) < new Date()) return false;
    return entitlement.enabled;
  }

  getEntitlement(featureId: FeatureId): FeatureEntitlement | null {
    return this.cachedEntitlements.get(featureId) || null;
  }

  getLimit(limitKey: string): number | null {
    if (this.license) {
      const tier = PRICING_TIERS.find(t => t.id === this.license!.plan);
      if (tier && tier.limits[limitKey] !== undefined) return tier.limits[limitKey];
    }

    if (this.marketplaceKey) {
      const tier = PRICING_TIERS.find(t => t.id === this.marketplaceKey!.plan);
      if (tier && tier.limits[limitKey] !== undefined) return tier.limits[limitKey];
    }

    const freeTier = PRICING_TIERS.find(t => t.id === 'free');
    return freeTier?.limits[limitKey] ?? null;
  }

  getCurrentPlan(): PricingTier {
    const planId = this.license?.plan || this.marketplaceKey?.plan || 'free';
    return PRICING_TIERS.find(t => t.id === planId) || PRICING_TIERS[0];
  }

  canUseWhiteLabel(): { available: boolean; reason?: string; tier?: string; upgradeRequired?: string } {
    if (this.hasFeature('whitelabel-full')) {
      return { available: true, tier: 'enterprise or reseller' };
    }

    if (this.hasFeature('whitelabel-basic')) {
      return { available: true, tier: 'professional' };
    }

    return {
      available: false,
      reason: 'White-labeling requires a Professional or higher plan',
      upgradeRequired: 'professional',
    };
  }

  getUpgradeSuggestion(featureId: FeatureId): PricingTier | null {
    const tiers = PRICING_TIERS
      .filter(t => t.features.includes(featureId))
      .sort((a, b) => a.monthlyPrice - b.monthlyPrice);
    return tiers[0] || null;
  }

  getAvailableFeatures(): FeatureId[] {
    return Array.from(this.cachedEntitlements.keys()).filter(id => this.hasFeature(id));
  }

  private cacheEntitlements(): void {
    this.cachedEntitlements.clear();
    const planId = this.license?.plan || this.marketplaceKey?.plan || 'free';
    const tier = PRICING_TIERS.find(t => t.id === planId);

    if (tier) {
      for (const featureId of tier.features) {
        this.cachedEntitlements.set(featureId, {
          featureId,
          enabled: true,
          expiresAt: this.license?.expiresAt,
        });
      }
    }
  }

  private validateLicense(license: FeatureLicense): boolean {
    if (!license.licenseId || !license.signature) return false;
    return /^[a-f0-9]{64}$/.test(license.signature);
  }

  private getInstanceId(): string {
    return localStorage.getItem('marketplace_instance_id') || 'unknown';
  }
}

// ============================================================================
// Singleton & Hook
// ============================================================================

let manager: FeatureEntitlementManager | null = null;

export function getEntitlements(): FeatureEntitlementManager {
  if (!manager) manager = new FeatureEntitlementManager();
  return manager;
}

export function initEntitlements(key: MarketplaceKeyConfig | null): FeatureEntitlementManager {
  const m = getEntitlements();
  m.initialize(key);
  return m;
}

export function useFeatureEntitlement() {
  const m = getEntitlements();
  return {
    hasFeature: (id: FeatureId) => m.hasFeature(id),
    getEntitlement: (id: FeatureId) => m.getEntitlement(id),
    getLimit: (key: string) => m.getLimit(key),
    getCurrentPlan: () => m.getCurrentPlan(),
    canUseWhiteLabel: () => m.canUseWhiteLabel(),
    getUpgradeSuggestion: (id: FeatureId) => m.getUpgradeSuggestion(id),
    getAvailableFeatures: () => m.getAvailableFeatures(),
  };
}

export default FeatureEntitlementManager;
