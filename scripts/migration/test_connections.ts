// ABOUTME: Test script for verifying database connections
// ABOUTME: Validates Akademico, SchoolPilot, and RxDB connectivity

import { databaseManager } from './database_manager';
import { createLogger } from './migration-logger';

const logger = createLogger('ConnectionTest');

async function testDatabaseConnections() {
  logger.info('Starting database connection tests...');
  
  try {
    // Test all connections
    await databaseManager.healthCheck();
    
    logger.info('✅ All database connections are working properly!');
    logger.info('Connection test completed successfully.');
    
    // Get detailed results
    const results = await databaseManager.testConnections();
    
    logger.info('📊 Connection Test Results:');
    logger.info(`  - Akademico (PostgreSQL): ${results.akademico ? '✅ Connected' : '❌ Failed'}`);
    logger.info(`  - SchoolPilot (MySQL): ${results.schoolPilot ? '✅ Connected' : '❌ Failed'}`);
    logger.info(`  - RxDB: ${results.rxdb ? '✅ Connected' : '⚠️ Not Set'}`);
    
    process.exit(0);
    
  } catch (error) {
    logger.error('❌ Database connection test failed:', error);
    logger.error('Please check your database configuration in .env file');
    process.exit(1);
  } finally {
    // Clean up connections
    await databaseManager.closeAllConnections();
  }
}

// Run the test
testDatabaseConnections().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
