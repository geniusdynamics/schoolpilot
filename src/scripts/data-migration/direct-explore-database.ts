#!/usr/bin/env node

// ABOUTME: Script to directly connect to the SQLite database and explore its contents
// ABOUTME: This script mimics the migration script's database connection

import { SQLiteOPFSService } from '../../services/sqlite/SQLiteOPFSService';

async function directDatabaseExploration() {
  console.log('Directly exploring SQLite database contents...');
  
  try {
    // Create SQLite service exactly as the migration script does
    const sqliteService = new SQLiteOPFSService();
    await sqliteService.initialize('schoolpilot_dev.db');
    console.log('✅ SQLite service initialized');
    
    // List all collections
    console.log('\n--- Database Collections ---');
    const collections = sqliteService.getAllCollections();
    console.log(`Total collections: ${collections.size}`);
    
    for (const [name, collection] of collections) {
      console.log(`Collection: ${name}`);
    }
    
    // Try to get some data from a few collections
    console.log('\n--- Sample Data ---');
    const sampleCollections = ['users', 'students', 'subjects', 'staff'];
    
    for (const collectionName of sampleCollections) {
      try {
        const collection = sqliteService.getCollection(collectionName);
        if (collection) {
          console.log(`\n${collectionName}:`);
          
          // Get count
          const count = await collection.count();
          console.log(`  Rows: ${count}`);
          
          // Get sample rows
          if (count > 0) {
            const sampleRows = await collection.find({ limit: 3 });
            console.log(`  Sample rows:`);
            sampleRows.forEach((row, index) => {
              console.log(`    Row ${index + 1}:`, JSON.stringify(row, null, 2));
            });
          }
        } else {
          console.log(`${collectionName}: Collection not found`);
        }
      } catch (error) {
        console.error(`Error querying ${collectionName}:`, error.message);
      }
    }
    
    console.log('\n✅ Direct database exploration complete');
    
  } catch (error) {
    console.error('❌ Direct database exploration failed:', error);
  }
}

// Run the exploration
directDatabaseExploration().catch(console.error);