// ABOUTME: This file exports the complete data generation service for the mock data expansion system
// ABOUTME: Provides the main entry point for universal data generation across all storage types

// Core components
import { UniversalDataGenerator } from './UniversalDataGenerator';
export { UniversalDataGenerator };
export { RelationshipManager } from './RelationshipManager';
export * from './types';

// Storage adapters
export { BaseStorageAdapter } from './adapters/BaseStorageAdapter';
export { MockAdapter } from './adapters/MockAdapter';
export { AdapterFactory } from './adapters/AdapterFactory';

// Export all generators
export * from './generators/index';

// Type definitions
export interface DataGenerationConfig {
  storageType: 'sqlite-opfs' | 'sqlite-livestore' | 'pouchdb' | 'mock';
  locale?: string;
  batchSize?: number;
  logProgress?: boolean;
  validateData?: boolean;
  modules?: string[];
}

export interface GenerationResult {
  success: boolean;
  stats: {
    totalRecords: number;
    tablesGenerated: string[];
    generationTime: number;
    storageType: string;
  };
  errors: string[];
}

// Main factory function for creating the universal data generator
export async function createDataGenerator(config: DataGenerationConfig): Promise<UniversalDataGenerator> {
  const generator = new UniversalDataGenerator(config);
  await generator.initialize();
  return generator;
}

// Utility function for quick data generation
export async function generateMockData(
  storageType: 'sqlite-opfs' | 'sqlite-livestore' | 'pouchdb' | 'mock' = 'mock',
  modules: string[] = ['administration', 'academic', 'finance', 'clubs', 'dormitory', 'library', 'nutrition', 'payroll', 'inventory']
): Promise<GenerationResult> {
  const config: DataGenerationConfig = {
    storageType,
    modules,
    locale: 'en',
    batchSize: 100,
    logProgress: true,
    validateData: true
  };

  try {
    const generator = await createDataGenerator(config);
    const result = await generator.generateData();
    await generator.cleanup();
    
    return {
      success: true,
      stats: result,
      errors: []
    };
  } catch (error) {
    return {
      success: false,
      stats: {
        totalRecords: 0,
        tablesGenerated: [],
        generationTime: 0,
        storageType
      },
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}