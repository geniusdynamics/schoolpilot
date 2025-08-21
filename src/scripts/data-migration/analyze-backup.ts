#!/usr/bin/env node

// ABOUTME: Script to analyze the backup file and show database contents

import * as fs from 'fs';

async function analyzeBackupFile() {
  console.log('=== ANALYZING BACKUP FILE ===');
  
  try {
    // Read the backup file
    const backupData = fs.readFileSync('schoolpilot_comprehensive_backup.json', 'utf8');
    const backup = JSON.parse(backupData);
    
    console.log(`Timestamp: ${backup.timestamp}`);
    console.log(`Provider: ${backup.provider}`);
    console.log(`Version: ${backup.version}`);
    console.log(`Collections: ${Object.keys(backup.collections).length}`);
    
    // Show collections with record counts
    console.log('\n--- Collections Summary ---');
    for (const [collectionName, records] of Object.entries(backup.collections)) {
      if (Array.isArray(records)) {
        console.log(`${collectionName}: ${records.length} records`);
      } else {
        console.log(`${collectionName}: ${typeof records} (${records})`);
      }
    }
    
    // Show sample data from key collections
    console.log('\n--- Sample Data ---');
    const keyCollections = ['students', 'subjects', 'staff', 'users', 'roles'];
    
    for (const collectionName of keyCollections) {
      const records = backup.collections[collectionName];
      if (Array.isArray(records) && records.length > 0) {
        console.log(`\n${collectionName}:`);
        console.log(`  Total records: ${records.length}`);
        console.log(`  Sample records:`);
        const sampleSize = Math.min(3, records.length);
        for (let i = 0; i < sampleSize; i++) {
          console.log(`    ${i + 1}. ${JSON.stringify(records[i], null, 2)}`);
        }
      }
    }
    
    console.log('\n✅ Backup file analysis complete');
    
  } catch (error) {
    console.error('❌ Backup file analysis failed:', error);
    throw error;
  }
}

// Run the analysis
analyzeBackupFile().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});