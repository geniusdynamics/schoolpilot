#!/usr/bin/env node

// ABOUTME: Script to create both JSON and SQLite file backups for easy exploration

import * as fs from 'fs';
import * as path from 'path';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

async function createSQLiteFileBackup() {
  console.log('=== CREATING SQLITE FILE BACKUP ===');
  
  try {
    // Read the existing JSON backup
    const backupData = fs.readFileSync('schoolpilot_comprehensive_backup.json', 'utf8');
    const backup = JSON.parse(backupData);
    
    console.log(`✅ Loaded backup with ${Object.keys(backup.collections).length} collections`);
    
    // Initialize SQLite WASM
    const sqlite3 = await sqlite3InitModule({
      print: console.log,
      printErr: console.error,
    });
    
    console.log(`✅ SQLite WASM initialized: ${sqlite3.version.libVersion}`);
    
    // Create SQLite database file
    const dbFileName = 'schoolpilot_explorable.db';
    const db = new sqlite3.oo1.DB(dbFileName, 'ct'); // 'ct' = create/write mode
    
    console.log(`✅ SQLite database file created: ${dbFileName}`);
    
    // Create tables and insert data for each collection
    console.log('\n--- Creating Tables and Inserting Data ---');
    
    for (const [collectionName, records] of Object.entries(backup.collections)) {
      if (Array.isArray(records) && records.length > 0) {
        try {
          console.log(`\nProcessing collection: ${collectionName} (${records.length} records)`);
          
          // Create table schema based on first record
          const firstRecord = records[0];
          const columns: string[] = [];
          const columnDefs: string[] = [];
          
          // Add ID column
          columns.push('id');
          columnDefs.push('id TEXT PRIMARY KEY');
          
          // Add other columns based on first record structure
          for (const [key, value] of Object.entries(firstRecord)) {
            if (key === 'id') continue; // Skip ID as we already added it
            
            columns.push(key);
            
            // Determine column type based on value
            let sqliteType = 'TEXT';
            if (typeof value === 'number') {
              sqliteType = Number.isInteger(value) ? 'INTEGER' : 'REAL';
            } else if (typeof value === 'boolean') {
              sqliteType = 'INTEGER'; // Store booleans as 0/1
            } else if (value === null) {
              sqliteType = 'TEXT'; // Default to TEXT for null values
            } else if (Array.isArray(value)) {
              sqliteType = 'TEXT'; // Store arrays as JSON strings
            } else if (typeof value === 'object') {
              sqliteType = 'TEXT'; // Store objects as JSON strings
            }
            
            columnDefs.push(`${key} ${sqliteType}`);
          }
          
          // Create table
          const createTableSQL = `CREATE TABLE IF NOT EXISTS ${collectionName} (${columnDefs.join(', ')})`;
          db.exec(createTableSQL);
          console.log(`  ✅ Table '${collectionName}' created`);
          
          // Insert data
          const placeholders = columns.map(() => '?').join(', ');
          const insertSQL = `INSERT INTO ${collectionName} (${columns.join(', ')}) VALUES (${placeholders})`;
          const stmt = db.prepare(insertSQL);
          
          let insertedCount = 0;
          for (const record of records) {
            try {
              // Prepare values in the same order as columns
              const values: any[] = [];
              for (const column of columns) {
                let value = record[column];
                
                // Serialize complex types to JSON strings
                if (value !== null && value !== undefined) {
                  if (Array.isArray(value) || typeof value === 'object') {
                    value = JSON.stringify(value);
                  } else if (typeof value === 'boolean') {
                    value = value ? 1 : 0;
                  }
                }
                
                values.push(value);
              }
              
              stmt.bind(values);
              stmt.step();
              stmt.reset();
              insertedCount++;
            } catch (insertError) {
              console.error(`    ❌ Error inserting record in ${collectionName}:`, insertError.message);
            }
          }
          
          stmt.finalize();
          console.log(`  ✅ Inserted ${insertedCount} records into '${collectionName}'`);
          
        } catch (error) {
          console.error(`❌ Error processing collection ${collectionName}:`, error.message);
        }
      } else {
        console.log(`\nSkipping collection: ${collectionName} (no records)`);
      }
    }
    
    // Close database
    db.close();
    
    console.log(`\n✅ SQLite file backup created successfully: ${dbFileName}`);
    console.log(`📁 File location: ${path.join(process.cwd(), dbFileName)}`);
    
    // Also create a summary file
    const summary = {
      timestamp: new Date().toISOString(),
      collections: Object.keys(backup.collections).length,
      databaseFile: dbFileName,
      jsonBackup: 'schoolpilot_comprehensive_backup.json'
    };
    
    fs.writeFileSync('schoolpilot_backup_summary.json', JSON.stringify(summary, null, 2), 'utf8');
    console.log(`📄 Summary file created: schoolpilot_backup_summary.json`);
    
    console.log('\n🎉 BACKUP CREATION COMPLETE ===');
    console.log('You can now explore the SQLite database file with any SQLite browser!');
    console.log('Recommended tools:');
    console.log('  - DB Browser for SQLite (https://sqlitebrowser.org/)');
    console.log('  - SQLiteStudio (https://sqlitestudio.pl/)');
    console.log('  - Command line: sqlite3 schoolpilot_explorable.db');
    
  } catch (error) {
    console.error('❌ SQLite file backup creation failed:', error);
    throw error;
  }
}

// Run the backup creation
createSQLiteFileBackup().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});