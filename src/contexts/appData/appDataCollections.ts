// ABOUTME: AppData collection normalization and loading-state helper utilities
// ABOUTME: NOW AUTO-DISCOVERED FROM MODULES - No manual editing needed!
// ABOUTME: Each module exports collectionConfig.ts, core aggregates automatically

import type { AppDataLoadingStates } from '@/core/types';
import {
  APP_DATA_ARRAY_KEYS as AUTO_APP_DATA_KEYS,
  COLLECTION_KEY_ALIASES as AUTO_ALIASES,
} from './moduleCollectionRegistry';

/**
 * Auto-discovered from modules via moduleCollectionRegistry.ts
 * No need to manually add entries here anymore!
 * 
 * To add a new module:
 * 1. Create src/modules/yourModule/data/collectionConfig.ts
 * 2. Export yourModuleCollections with moduleName and aliases
 * 3. Add import to moduleCollectionRegistry.ts
 * Done! Core automatically discovers your collections.
 */
export const APP_DATA_ARRAY_KEYS = AUTO_APP_DATA_KEYS;
export const COLLECTION_KEY_ALIASES = AUTO_ALIASES;

/**
 * Type extracted from auto-discovered keys
 */
export type AppDataArrayKey = typeof APP_DATA_ARRAY_KEYS[number];

const snakeToCamel = (value: string): string =>
  value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

export const createAppDataLoadingState = (isLoading: boolean): AppDataLoadingStates => {
  const loadingEntries = APP_DATA_ARRAY_KEYS.reduce<Record<string, boolean>>((accumulator, key) => {
    accumulator[key] = isLoading;
    return accumulator;
  }, {
    all: isLoading,
    schoolDetails: isLoading
  });

  return loadingEntries as AppDataLoadingStates;
};

export const normalizeAppDataCollections = (rawData: Record<string, any[] | undefined>) => {
  const normalizedData = APP_DATA_ARRAY_KEYS.reduce<Record<string, any[]>>((accumulator, key) => {
    accumulator[key] = [];
    return accumulator;
  }, {});

  normalizedData.schoolDetails = [];

  Object.entries(rawData).forEach(([collectionName, collectionValue]) => {
    const alias = COLLECTION_KEY_ALIASES[collectionName] || COLLECTION_KEY_ALIASES[snakeToCamel(collectionName)];
    const normalizedValue = Array.isArray(collectionValue) ? collectionValue : [];

    if (alias) {
      normalizedData[alias] = normalizedValue;
      return;
    }

    const camelKey = snakeToCamel(collectionName);
    if (camelKey in normalizedData) {
      normalizedData[camelKey] = normalizedValue;
    }
  });

  return normalizedData as Record<AppDataArrayKey | 'schoolDetails', any[]>;
};
