#!/usr/bin/env node

// Simple test to understand SQLite WASM stmt.get() usage

import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

async function testSQLiteGet() {
  console.log('Testing SQLite WASM stmt.get() usage...');

  try {
    // Initialize SQLite
    const sqlite3 = await sqlite3InitModule({
      print: console.log,
      printErr: console.error,
    });

    console.log('SQLite version:', sqlite3.version.libVersion);

    // Open database
    const db = new sqlite3.oo1.DB(':memory:', 'c');
    console.log('Database opened successfully');

    // Create a test table
    db.exec(`CREATE TABLE test_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      age INTEGER,
      email TEXT
    )`);

    console.log('Test table created');

    // Insert some test data
    const stmt = db.prepare('INSERT INTO test_users (id, name, age, email) VALUES (?, ?, ?, ?)');
    stmt.bind(['1', 'John Doe', 30, 'john@example.com']);
    stmt.step();
    stmt.finalize();

    console.log('Test data inserted');

    // Query the data
    const queryStmt = db.prepare('SELECT * FROM test_users');
    while (queryStmt.step()) {
      // Try different ways to get the row data
      try {
        const row = queryStmt.get();
        console.log('Row (get()):', row);
      } catch (error) {
        console.error('Error with get():', error);
      }

      try {
        const row = queryStmt.get({});
        console.log('Row (get({})):', row);
      } catch (error) {
        console.error('Error with get({}):', error);
      }

      try {
        // Get column names and values
        const columnNames = queryStmt.getColumnNames();
        console.log('Column names:', columnNames);
        
        // Get values by column name
        const row = {};
        for (let i = 0; i < columnNames.length; i++) {
          row[columnNames[i]] = queryStmt.get(i + 1); // 1-based indexing
        }
        console.log('Row (by column index):', row);
      } catch (error) {
        console.error('Error with column-based access:', error);
      }
    }
    queryStmt.finalize();

    // Close database
    db.close();
    console.log('Database closed');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testSQLiteGet();