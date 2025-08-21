#!/usr/bin/env node

// ABOUTME: Simple script to connect to SQLite database and explore its contents

import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import * as fs from 'fs';

async function exploreDatabase() {
  console.log('Exploring SQLite database contents...');
  
  try {
    // Initialize SQLite
    const sqlite3 = await sqlite3InitModule({
      print: console.log,
      printErr: console.error,
    });
    
    console.log('SQLite version:', sqlite3.version.libVersion);
    
    // Try to open the database file
    let db;
    try {
      db = new sqlite3.oo1.DB('schoolpilot_dev.db', 'c');
      console.log('✅ Database opened successfully');
    } catch (openError) {
      console.log('Could not open database file directly, trying in-memory...');
      db = new sqlite3.oo1.DB(':memory:', 'c');
      console.log('✅ In-memory database opened');
    }
    
    // List all tables
    console.log('\n--- Database Tables ---');
    try {
      const tableStmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table';");
      while (tableStmt.step()) {
        const row = tableStmt.get({});
        console.log(`Table: ${row.name}`);
      }
      tableStmt.finalize();
    } catch (error) {
      console.error('Error listing tables:', error);
    }
    
    // Try to get some data from a few tables
    console.log('\n--- Sample Data ---');
    const sampleTables = ['users', 'students', 'subjects', 'staff'];
    
    for (const tableName of sampleTables) {
      try {
        // Check if table exists
        const tableExistsStmt = db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?;");
        tableExistsStmt.bind([tableName]);
        const existsResult = tableExistsStmt.step();
        const existsRow = tableExistsStmt.get({});
        tableExistsStmt.finalize();
        
        if (existsRow.count > 0) {
          console.log(`\n${tableName}:`);
          
          // Get row count
          const countStmt = db.prepare(`SELECT COUNT(*) as count FROM ${tableName};`);
          countStmt.step();
          const countRow = countStmt.get({});
          countStmt.finalize();
          console.log(`  Rows: ${countRow.count}`);
          
          // Get sample rows
          if (countRow.count > 0) {
            const sampleStmt = db.prepare(`SELECT * FROM ${tableName} LIMIT 3;`);
            let rowCount = 0;
            while (sampleStmt.step() && rowCount < 3) {
              const row = sampleStmt.get({});
              console.log(`  Row ${++rowCount}:`, JSON.stringify(row, null, 2));
            }
            sampleStmt.finalize();
          }
        } else {
          console.log(`${tableName}: Table does not exist`);
        }
      } catch (error) {
        console.error(`Error querying ${tableName}:`, error.message);
      }
    }
    
    // Close database
    db.close();
    console.log('\n✅ Database exploration complete');
    
  } catch (error) {
    console.error('❌ Database exploration failed:', error);
  }
}

// Run the exploration
exploreDatabase().catch(console.error);