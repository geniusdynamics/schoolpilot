// ABOUTME: Premium feature utilities and constants
// ABOUTME: Defines limits and configurations for premium vs non-premium functionality

// Collection limits for non-premium users
export const NON_PREMIUM_COLLECTION_LIMIT = 100;

// Other premium-related constants
export const PREMIUM_COLLECTION_LIMIT = 10000;
export const NON_PREMIUM_STORAGE_LIMIT = 50; // MB
export const PREMIUM_STORAGE_LIMIT = 1000; // MB

// Premium feature flags
export const PREMIUM_FEATURES = {
  UNLIMITED_COLLECTIONS: 'unlimited_collections',
  ADVANCED_REPORTING: 'advanced_reporting',
  BULK_OPERATIONS: 'bulk_operations',
  CUSTOM_THEMES: 'custom_themes',
  PRIORITY_SUPPORT: 'priority_support'
} as const;

export type PremiumFeature = typeof PREMIUM_FEATURES[keyof typeof PREMIUM_FEATURES];

// Check if a feature is available based on premium status
export function isPremiumFeatureAvailable(feature: PremiumFeature, isPremium: boolean): boolean {
  return isPremium;
}

// Get collection limit based on premium status
export function getCollectionLimit(isPremium: boolean): number {
  return isPremium ? PREMIUM_COLLECTION_LIMIT : NON_PREMIUM_COLLECTION_LIMIT;
}

// Get storage limit based on premium status
export function getStorageLimit(isPremium: boolean): number {
  return isPremium ? PREMIUM_STORAGE_LIMIT : NON_PREMIUM_STORAGE_LIMIT;
}