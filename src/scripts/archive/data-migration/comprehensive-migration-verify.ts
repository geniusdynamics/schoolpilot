#!/usr/bin/env node

// ABOUTME: Comprehensive script to migrate mock data to SQLite and verify access in one run
// ABOUTME: This script creates the database, seeds it with mock data, and verifies access

import { SQLiteOPFSService } from '@/services/sqlite/SQLiteOPFSService';
import { convertRxDBSchema } from '@/services/database/ProviderSelector';
// RXDB removed - Phase 2: Using provider-agnostic collections
import { collectionsDefinition } from '@/services/database/collections';

// Import mock data modules
import * as academicsMockData from '@/modules/academics/data/mockData';
import * as administrationMockData from '@/modules/administration/data/mockData';
import * as financeMockData from '@/modules/finance/data/mockData';
import * as hrMockData from '@/modules/hr/data/mockData';
import * as inventoryMockData from '@/modules/inventory/data/mockData';
import * as libraryMockData from '@/modules/library/data/mockData';
import * as nutritionMockData from '@/modules/nutrition/data/mockData';

async function comprehensiveMigrationAndVerification() {
  console.log('=== COMPREHENSIVE MIGRATION AND VERIFICATION ===');
  
  try {
    // Step 1: Create SQLite service
    const sqliteService = new SQLiteOPFSService();
    await sqliteService.initialize('schoolpilot_comprehensive.db');
    console.log('✅ SQLite service initialized');

    // Step 2: Create all collections
    console.log('\n--- Creating Collections ---');
    let collectionsCreated = 0;
    
    for (const [name, def] of Object.entries(collectionsDefinition)) {
      try {
        // Derive the actual schema source - handle both { schema: ... } and raw schema forms
        const schemaSource = def && typeof def === 'object' && 'schema' in def ? def.schema : def;
        
        // Validate schemaSource is an object
        if (!schemaSource || typeof schemaSource !== 'object') {
          console.error(`❌ Invalid schema for collection '${name}': expected object, got ${typeof schemaSource}`);
          continue;
        }
        
        const convertedSchema = convertRxDBSchema(schemaSource);
        await sqliteService.createCollection(name, convertedSchema);
        collectionsCreated++;
        console.log(`✅ Collection '${name}' created successfully`);
      } catch (error) {
        console.error(`❌ Failed to create collection '${name}':`, error.message);
      }
    }
    
    console.log(`✅ Successfully created ${collectionsCreated} collections`);

    // Step 3: Aggregate mock data from all modules
    console.log('\n--- Aggregating Mock Data ---');
    const mockData: any = {};
    
    // Add data from each module
    Object.entries(academicsMockData).forEach(([key, value]) => {
      mockData[key] = value;
    });
    
    Object.entries(administrationMockData).forEach(([key, value]) => {
      mockData[key] = value;
    });
    
    Object.entries(financeMockData).forEach(([key, value]) => {
      mockData[key] = value;
    });
    
    Object.entries(hrMockData).forEach(([key, value]) => {
      mockData[key] = value;
    });
    
    Object.entries(inventoryMockData).forEach(([key, value]) => {
      mockData[key] = value;
    });
    
    Object.entries(libraryMockData).forEach(([key, value]) => {
      mockData[key] = value;
    });
    
    Object.entries(nutritionMockData).forEach(([key, value]) => {
      mockData[key] = value;
    });
    
    console.log(`✅ Mock data aggregated with ${Object.keys(mockData).length} keys`);

    // Step 4: Seed the database with mock data
    console.log('\n--- Seeding Database ---');
    let seededCollections = 0;
    
    // Map collection names to mock data keys
    const collectionNameToMockDataKey = new Map<string, string>();
    for (const collectionName in collectionsDefinition) {
      if (Object.prototype.hasOwnProperty.call(collectionsDefinition, collectionName)) {
        // Convert collection name to mock data key format
        // e.g., 'academic_years' -> 'initialMockAcademicYears'
        const camelCaseName = collectionName
          .split('_')
          .map((part, index) => index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
          .join('');
        const mockDataKey = `initialMock${camelCaseName.charAt(0).toUpperCase() + camelCaseName.slice(1)}`;
        collectionNameToMockDataKey.set(collectionName, mockDataKey);
      }
    }
    
    // Insert data for each collection
    for (const [collectionName, mockDataKey] of collectionNameToMockDataKey) {
      const collection = sqliteService.getCollection(collectionName);
      if (collection) {
        try {
          const mockDataArray = mockData[mockDataKey];
          
          if (mockDataArray && Array.isArray(mockDataArray) && mockDataArray.length > 0) {
            console.log(`✅ Seeding ${collectionName} with ${mockDataArray.length} items (key: ${mockDataKey})`);
            seededCollections++;
            
            // Insert data in batches to avoid memory issues
            const batchSize = 100;
            for (let i = 0; i < mockDataArray.length; i += batchSize) {
              const batch = mockDataArray.slice(i, i + batchSize);
              await collection.insertMany(batch);
            }
          } else if (mockDataArray && !Array.isArray(mockDataArray) && mockDataArray !== null) {
            console.log(`✅ Seeding ${collectionName} with 1 item (key: ${mockDataKey})`);
            seededCollections++;
            await collection.insert(mockDataArray);
          } else {
            // Only show this for a few key collections to avoid spam
            if (['app_settings', 'school_details', 'subjects', 'students', 'staff'].includes(collectionName)) {
              console.log(`ℹ️  No data found for ${collectionName} (mock data key: ${mockDataKey})`);
            }
          }
        } catch (error) {
          console.error(`❌ Error seeding collection ${collectionName}:`, error.message);
        }
      } else {
        console.warn(`⚠️  Collection ${collectionName} not found in provider`);
      }
    }
    
    console.log(`✅ Database seeding complete. Seeded data for ${seededCollections} collections.`);

    // Step 5: Verify data access
    console.log('\n--- Verifying Data Access ---');
    
    // Check key collections
    const keyCollections = ['users', 'students', 'subjects', 'staff', 'roles'];
    
    for (const collectionName of keyCollections) {
      const collection = sqliteService.getCollection(collectionName);
      if (collection) {
        try {
          const count = await collection.count();
          console.log(`✅ ${collectionName}: ${count} records`);
          
          if (count > 0) {
            // Get first few records as samples
            const sampleRecords = await collection.find({ limit: 3 });
            console.log(`  Sample records:`);
            sampleRecords.forEach((record, index) => {
              console.log(`    ${index + 1}. ${JSON.stringify(record, null, 2)}`);
            });
          }
        } catch (error) {
          console.error(`❌ Error querying ${collectionName}:`, error.message);
        }
      } else {
        console.log(`❌ ${collectionName}: Collection not found`);
      }
    }

    // Step 6: Create backup
    console.log('\n--- Creating Backup ---');
    try {
      const backupData = await sqliteService.backup();
      const backupFilePath = 'schoolpilot_comprehensive_backup.json';
      
      // Write backup to file
      const fs = await import('fs');
      fs.writeFileSync(backupFilePath, backupData, 'utf8');
      console.log(`✅ Backup written to: ${backupFilePath}`);
      
      // Parse backup to show contents
      const backup = JSON.parse(backupData);
      console.log(`✅ Backup contains ${Object.keys(backup.collections).length} collections`);
    } catch (backupError) {
      console.error('❌ Failed to create backup:', backupError.message);
    }

    console.log('\n✅ COMPREHENSIVE MIGRATION AND VERIFICATION COMPLETE ===');
    
  } catch (error) {
    console.error('❌ Comprehensive migration and verification failed:', error);
    throw error;
  }
}

// Run the comprehensive script
comprehensiveMigrationAndVerification().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});