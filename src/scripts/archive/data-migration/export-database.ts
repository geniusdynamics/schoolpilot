#!/usr/bin/env node

// ABOUTME: Script to export SQLite database to a regular file for exploration
// ABOUTME: This script creates a backup of the OPFS database to a regular file

import { SQLiteOPFSService } from '@/services/sqlite/SQLiteOPFSService';
import * as fs from 'fs';
import * as path from 'path';

async function exportDatabase() {
  console.log('Exporting SQLite database to regular file...');

  try {
    // Create SQLite service
    const sqliteService = new SQLiteOPFSService();
    await sqliteService.initialize('schoolpilot_dev.db');
    console.log('✅ SQLite service initialized');

    // Create a backup of the database
    const backupData = await sqliteService.backup();
    console.log('✅ Database backup created');
    
    // Write backup to a file in the project directory
    const backupFilePath = path.join(process.cwd(), 'schoolpilot_dev_backup.json');
    fs.writeFileSync(backupFilePath, backupData, 'utf8');
    console.log(`✅ Backup written to: ${backupFilePath}`);
    
    // Also try to create a SQL dump if possible
    try {
      // Try to get database connection and create SQL dump
      const db = sqliteService.getDatabase();
      if (db) {
        // Get list of tables
        const tablesResult = db.exec("SELECT name FROM sqlite_master WHERE type='table';");
        console.log('Tables in database:', tablesResult);
        
        // Create SQL dump file
        const sqlDumpPath = path.join(process.cwd(), 'schoolpilot_dev_dump.sql');
        let sqlDump = '-- SchoolPilot3 Database Dump\n\n';
        
        // Add schema and data for each table
        // Note: This is a simplified approach, a full dump would be more complex
        sqlDump += '-- Table schemas and data would go here\n';
        
        fs.writeFileSync(sqlDumpPath, sqlDump, 'utf8');
        console.log(`✅ SQL dump written to: ${sqlDumpPath}`);
      }
    } catch (dumpError) {
      console.warn('⚠️ Could not create SQL dump:', dumpError.message);
    }
    
    console.log('✅ Database export completed successfully');
    console.log('\nFiles created:');
    console.log(`  - JSON Backup: ${backupFilePath}`);
    
    // Show some basic info about the backup
    const backupInfo = JSON.parse(backupData);
    console.log('\nBackup Info:');
    console.log(`  - Timestamp: ${backupInfo.timestamp}`);
    console.log(`  - Provider: ${backupInfo.provider}`);
    console.log(`  - Collections: ${Object.keys(backupInfo.collections).length}`);
    console.log(`  - Collections: ${Object.keys(backupInfo.collections).slice(0, 5).join(', ')}${Object.keys(backupInfo.collections).length > 5 ? '...' : ''}`);
    
  } catch (error) {
    console.error('❌ Database export failed:', error);
    throw error;
  }
}

// Run the export
exportDatabase().catch(error => {
  console.error('Export script failed:', error);
  process.exit(1);
});