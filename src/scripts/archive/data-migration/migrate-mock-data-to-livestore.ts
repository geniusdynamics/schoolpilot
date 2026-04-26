#!/usr/bin/env node

// ABOUTME: Data migration script to move mock data to LiveStore database
// ABOUTME: This script reads the existing mock data and inserts it into the LiveStore database

import { SQLiteWASMProvider } from '@/services/database/LiveStoreProvider';
import { LiveStoreSchema } from '../../livestore/schema';
import { DatabaseConfig } from '@/services/database/interfaces';

// Import mock data modules
import * as academicsMockData from '@/modules/academics/data/mockData';
import * as administrationMockData from '@/modules/administration/data/mockData';
import * as financeMockData from '@/modules/finance/data/mockData';
import * as hrMockData from '@/modules/hr/data/mockData';
import * as inventoryMockData from '@/modules/inventory/data/mockData';
import * as libraryMockData from '@/modules/library/data/mockData';
import * as nutritionMockData from '@/modules/nutrition/data/mockData';
import * as transportMockData from '@/modules/transport/data/mockData';

interface MigrationResult {
  success: boolean;
  collectionsCreated: number;
  recordsInserted: number;
  errors: string[];
  duration: number;
}

class SQLiteWASMMigration {
  private provider: SQLiteWASMProvider | null = null;
  private errors: string[] = [];
  private startTime: number = 0;

  async initialize(): Promise<void> {
    console.log('🚀 Initializing LiveStore Migration...');
    this.startTime = Date.now();

    const config: DatabaseConfig = {
      name: 'schoolpilot_migration',
      version: 1,
      collections: LiveStoreSchema.collections,
      options: {
        wasmSqlite: true,
        opfsStorage: true,
        crossTabPersistence: true,
        debug: true
      }
    };

    try {
      this.provider = new SQLiteWASMProvider();
      await this.provider.initialize(config);
      console.log('✅ SQLite WASM provider initialized successfully');
    } catch (error) {
      const errorMsg = `Failed to initialize LiveStore: ${error}`;
      this.errors.push(errorMsg);
      console.error('❌', errorMsg);
      throw error;
    }
  }

  async aggregateMockData(): Promise<Record<string, any[]>> {
    console.log('📦 Aggregating mock data from all modules...');
    const mockData: Record<string, any[]> = {};

    // Add data from each module
    const modules = [
      { name: 'academics', data: academicsMockData },
      { name: 'administration', data: administrationMockData },
      { name: 'finance', data: financeMockData },
      { name: 'hr', data: hrMockData },
      { name: 'inventory', data: inventoryMockData },
      { name: 'library', data: libraryMockData },
      { name: 'nutrition', data: nutritionMockData },
      { name: 'transport', data: transportMockData }
    ];

    modules.forEach(({ name, data }) => {
      Object.entries(data).forEach(([key, value]) => {
        if (Array.isArray(value) && value.length > 0) {
          mockData[key] = value;
          console.log(`  📋 ${name}.${key}: ${value.length} records`);
        }
      });
    });

    console.log(`📊 Total mock data collections: ${Object.keys(mockData).length}`);
    return mockData;
  }

  async migrateData(mockData: Record<string, any[]>): Promise<{ collectionsCreated: number; recordsInserted: number }> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    console.log('🔄 Starting data migration...');
    let collectionsCreated = 0;
    let recordsInserted = 0;

    // Create mapping from mock data keys to collection names
    const collectionNameToMockDataKey = new Map<string, string>();
    
    for (const collectionName of Object.keys(LiveStoreSchema.collections)) {
      // Convert collection name to mock data key format
      // e.g., 'academic_years' -> 'initialMockAcademicYears'
      const camelCaseName = collectionName
        .split('_')
        .map((part, index) => index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
      const mockDataKey = `initialMock${camelCaseName.charAt(0).toUpperCase() + camelCaseName.slice(1)}`;
      collectionNameToMockDataKey.set(collectionName, mockDataKey);
    }

    // Migrate data for each collection
    for (const [collectionName, schema] of Object.entries(LiveStoreSchema.collections)) {
      try {
        const mockDataKey = collectionNameToMockDataKey.get(collectionName);
        const data = mockDataKey ? mockData[mockDataKey] : null;

        if (!data || !Array.isArray(data) || data.length === 0) {
          console.log(`⚠️  No mock data found for collection '${collectionName}' (looking for '${mockDataKey}')`);
          continue;
        }

        console.log(`📥 Migrating ${data.length} records to '${collectionName}'...`);

        // Get or create collection
        const collection = await this.provider.getCollection(collectionName);
        collectionsCreated++;

        // Insert data in batches
        const batchSize = 100;
        for (let i = 0; i < data.length; i += batchSize) {
          const batch = data.slice(i, i + batchSize);
          
          try {
            const results = await collection.insertMany(batch);
            recordsInserted += results.inserted.length;
            
            if (results.errors.length > 0) {
              console.warn(`⚠️  ${results.errors.length} errors in batch for '${collectionName}'`);
              results.errors.forEach(error => {
                this.errors.push(`${collectionName}: ${error.message}`);
              });
            }
          } catch (error) {
            const errorMsg = `Failed to insert batch for '${collectionName}': ${error}`;
            this.errors.push(errorMsg);
            console.error('❌', errorMsg);
          }
        }

        console.log(`✅ Successfully migrated '${collectionName}': ${data.length} records`);
      } catch (error) {
        const errorMsg = `Failed to migrate collection '${collectionName}': ${error}`;
        this.errors.push(errorMsg);
        console.error('❌', errorMsg);
      }
    }

    return { collectionsCreated, recordsInserted };
  }

  async verifyMigration(): Promise<void> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    console.log('🔍 Verifying migration...');
    
    try {
      const collections = await this.provider.listCollections();
      console.log(`📋 Total collections: ${collections.length}`);

      for (const collectionName of collections) {
        try {
          const collection = await this.provider.getCollection(collectionName);
          const stats = await collection.getStats();
          console.log(`  📊 ${collectionName}: ${stats.documentCount} documents`);
        } catch (error) {
          console.warn(`⚠️  Could not get stats for '${collectionName}': ${error}`);
        }
      }
    } catch (error) {
      const errorMsg = `Failed to verify migration: ${error}`;
      this.errors.push(errorMsg);
      console.error('❌', errorMsg);
    }
  }

  async cleanup(): Promise<void> {
    if (this.provider) {
      try {
        await this.provider.destroy();
        console.log('🧹 Cleanup completed');
      } catch (error) {
        console.warn(`⚠️  Cleanup warning: ${error}`);
      }
    }
  }

  getResult(): MigrationResult {
    const duration = Date.now() - this.startTime;
    return {
      success: this.errors.length === 0,
      collectionsCreated: 0, // Will be updated during migration
      recordsInserted: 0, // Will be updated during migration
      errors: [...this.errors],
      duration
    };
  }
}

async function runMigration(): Promise<void> {
  const migration = new SQLiteWASMMigration();
  
  try {
    // Initialize LiveStore
    await migration.initialize();
    
    // Aggregate mock data
    const mockData = await migration.aggregateMockData();
    
    // Migrate data
    const { collectionsCreated, recordsInserted } = await migration.migrateData(mockData);
    
    // Verify migration
    await migration.verifyMigration();
    
    // Get final result
    const result = migration.getResult();
    result.collectionsCreated = collectionsCreated;
    result.recordsInserted = recordsInserted;
    
    // Print summary
    console.log('\n📋 Migration Summary:');
    console.log(`  ✅ Success: ${result.success}`);
    console.log(`  📦 Collections Created: ${result.collectionsCreated}`);
    console.log(`  📄 Records Inserted: ${result.recordsInserted}`);
    console.log(`  ⏱️  Duration: ${result.duration}ms`);
    
    if (result.errors.length > 0) {
      console.log(`  ❌ Errors: ${result.errors.length}`);
      result.errors.forEach(error => console.log(`    - ${error}`));
    }
    
    if (result.success) {
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with errors.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await migration.cleanup();
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  runMigration().catch(error => {
    console.error('💥 Unhandled migration error:', error);
    process.exit(1);
  });
}

export { SQLiteWASMMigration, runMigration };
export type { MigrationResult };