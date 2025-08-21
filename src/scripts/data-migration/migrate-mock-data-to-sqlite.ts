#!/usr/bin/env node

// ABOUTME: Data migration script to move mock data to SQLite database
// ABOUTME: This script reads the existing mock data and inserts it into the SQLite database

import { SQLiteOPFSService } from '../../services/sqlite/SQLiteOPFSService';
import { convertRxDBSchema } from '../../services/database/ProviderSelector';
import { collectionsDefinition } from '../../services/rxdbService';

// Import mock data modules directly instead of using import.meta.glob
import * as academicsMockData from '../../modules/academics/data/mockData';
import * as administrationMockData from '../../modules/administration/data/mockData';
import * as financeMockData from '../../modules/finance/data/mockData';
import * as hrMockData from '../../modules/hr/data/mockData';
import * as inventoryMockData from '../../modules/inventory/data/mockData';
import * as libraryMockData from '../../modules/library/data/mockData';
import * as nutritionMockData from '../../modules/nutrition/data/mockData';

async function migrateMockDataToSQLite() {
  console.log('Starting data migration from mock data to SQLite database...');

  try {
    // Create SQLite service directly
    const sqliteService = new SQLiteOPFSService();
    await sqliteService.initialize('schoolpilot_dev.db');
    console.log(`✅ SQLite service initialized`);

    // Create collections based on the existing schema definitions
    console.log('Creating collections...');
    
    // Convert RxDB collection definitions to our format
    for (const [name, def] of Object.entries(collectionsDefinition)) {
      console.log(`Processing collection: ${name}`);
      
      // Derive the actual schema source - handle both { schema: ... } and raw schema forms
      const schemaSource = def && typeof def === 'object' && 'schema' in def ? def.schema : def;
      
      // Validate schemaSource is an object
      if (!schemaSource || typeof schemaSource !== 'object') {
        const errorMsg = `Invalid schema for collection '${name}': expected object, got ${typeof schemaSource}`;
        console.error('❌ [Migration]', errorMsg);
        console.error('❌ [Migration] Schema source value:', schemaSource);
        throw new Error(errorMsg);
      }
      
      try {
        const convertedSchema = convertRxDBSchema(schemaSource);
        console.log(`✅ [Migration] Successfully converted schema for collection '${name}'`);
        
        // Create the collection
        await sqliteService.createCollection(name, convertedSchema);
        console.log(`✅ Collection '${name}' created successfully`);
      } catch (conversionError) {
        console.error(`❌ [Migration] Failed to convert schema for collection '${name}':`, conversionError);
        throw new Error(`Failed to convert schema for collection '${name}': ${conversionError.message}`);
      }
    }

    console.log('✅ All collections created successfully');
    
    // Now let's import the mock data
    console.log('Importing mock data...');
    
    // Aggregate all mock data into a single object
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
    
    if (!mockData) {
      console.warn('No mock data available for seeding');
      return;
    }
    
    console.log('Mock data keys:', Object.keys(mockData));
    
    // Seed the database with mock data
    console.log('Seeding database with mock data...');
    
    // Map collection names to mock data keys
    const collectionNameToMockDataKey = new Map<string, string>();
    for (const collectionName in collectionsDefinition) {
      if (Object.prototype.hasOwnProperty.call(collectionsDefinition, collectionName)) {
        // Convert collection name to mock data key format
        // e.g., 'academic_years' -> 'initialMockAcademicYears'
        // e.g., 'students' -> 'initialMockStudents'
        // e.g., 'class_subject_allocations' -> 'initialMockClassSubjectAllocations'
        const camelCaseName = collectionName
          .split('_')
          .map((part, index) => index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
          .join('');
        const mockDataKey = `initialMock${camelCaseName.charAt(0).toUpperCase() + camelCaseName.slice(1)}`;
        collectionNameToMockDataKey.set(collectionName, mockDataKey);
      }
    }
    
    // Insert data for each collection
    console.log('Attempting to seed data for collections...');
    let seededCollections = 0;
    
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
              const insertResults = await collection.insertMany(batch);
              console.log(`  Inserted batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(mockDataArray.length/batchSize)} for ${collectionName}`);
            }
          } else if (mockDataArray && !Array.isArray(mockDataArray) && mockDataArray !== null) {
            console.log(`✅ Seeding ${collectionName} with 1 item (key: ${mockDataKey})`);
            seededCollections++;
            await collection.insert(mockDataArray);
          } else {
            // Only show this for a few collections to avoid spam
            if (['app_settings', 'school_details', 'subjects', 'students', 'staff'].includes(collectionName)) {
              console.log(`ℹ️  No data found for ${collectionName} (mock data key: ${mockDataKey})`);
            }
          }
        } catch (error) {
          console.error(`❌ Error seeding collection ${collectionName}:`, error);
        }
      } else {
        console.warn(`⚠️  Collection ${collectionName} not found in provider`);
      }
    }
    
    console.log(`✅ Database seeding complete. Seeded data for ${seededCollections} collections.`);
    console.log('✅ Data migration completed successfully');
    
  } catch (error) {
    console.error('❌ Data migration failed:', error);
    throw error;
  }
}

// Run the migration
migrateMockDataToSQLite().catch(error => {
  console.error('Migration script failed:', error);
  process.exit(1);
});