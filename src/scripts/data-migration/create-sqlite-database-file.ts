#!/usr/bin/env node

// ABOUTME: Script to create a proper SQLite database file in the project directory
// ABOUTME: This script creates an actual .db file that can be explored with SQLite tools

import { SQLiteOPFSService } from '../../services/sqlite/SQLiteOPFSService';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import mock data modules
import * as academicsMockData from '../../modules/academics/data/mockData';
import * as administrationMockData from '../../modules/administration/data/mockData';
import * as financeMockData from '../../modules/finance/data/mockData';
import * as hrMockData from '../../modules/hr/data/mockData';
import * as inventoryMockData from '../../modules/inventory/data/mockData';
import * as libraryMockData from '../../modules/library/data/mockData';
import * as nutritionMockData from '../../modules/nutrition/data/mockData';
import { convertRxDBSchema } from '../../services/database/ProviderSelector';
import { collectionsDefinition } from '../../services/rxdbService';

async function createSQLiteDatabaseFile() {
  console.log('=== Creating SQLite Database File ===');
  
  try {
    // Ensure we're using an absolute path for the database file
    const dbFileName = 'schoolpilot_database.db';
    const dbFilePath = path.resolve(process.cwd(), dbFileName);
    console.log(`Creating database file at: ${dbFilePath}`);
    
    // Step 1: Create SQLite service
    const sqliteService = new SQLiteOPFSService();
    await sqliteService.initialize(dbFileName);
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

    // Step 3: Import and aggregate mock data
    console.log('\n--- Importing Mock Data ---');
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
    
    console.log(`✅ Mock data imported with ${Object.keys(mockData).length} keys`);

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

    // Step 5: Verify database file exists
    console.log('\n--- Verifying Database File ---');
    if (fs.existsSync(dbFilePath)) {
      const stats = fs.statSync(dbFilePath);
      console.log(`✅ Database file exists at: ${dbFilePath}`);
      console.log(`✅ Database file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    } else {
      console.log('⚠️  Database file not found in expected location');
      console.log(`Expected path: ${dbFilePath}`);
      
      // Let's try to find where the database might have been created
      const possiblePaths = [
        path.join(process.cwd(), dbFileName),
        path.join(__dirname, dbFileName),
        dbFileName
      ];
      
      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          console.log(`✅ Found database file at: ${possiblePath}`);
          break;
        }
      }
    }

    console.log('\n✅ SQLite Database File Creation Complete ===');
    console.log(`📁 Database file location: ${dbFilePath}`);
    console.log('You can now explore this file with any SQLite browser or command-line tool!');
    
  } catch (error) {
    console.error('❌ Database file creation failed:', error);
    throw error;
  }
}

// Run the database file creation
createSQLiteDatabaseFile().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});