// Test script to verify database initialization fixes
import { databaseService } from './services/databaseService.js';
import { DatabaseSchemaConverter } from './utils/databaseAgnosticSchema.js';

console.log('=== Testing Database Initialization Fixes ===\n');

// Test 1: Verify databaseService exports the right methods
console.log('Test 1: Checking databaseService methods...');
console.log('  - initializeDatabase exists:', typeof databaseService.initializeDatabase === 'function');
console.log('  - initialize exists:', typeof databaseService.initialize === 'function');
console.log('  - getDatabase exists:', typeof databaseService.getDatabase === 'function');

// Test 2: Verify DatabaseSchemaConverter binding
console.log('\nTest 2: Testing DatabaseSchemaConverter...');
try {
  const testSchema = {
    title: 'Test',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' }
    }
  };
  
  const rxdbSchema = DatabaseSchemaConverter.convertToRxDBSchema(testSchema);
  console.log('  - convertToRxDBSchema works:', rxdbSchema !== undefined);
  console.log('  - Schema has properties:', rxdbSchema.properties !== undefined);
} catch (error) {
  console.error('  - ERROR in convertToRxDBSchema:', error.message);
}

// Test 3: Test the exported convertToRxDBSchema function
console.log('\nTest 3: Testing exported convertToRxDBSchema...');
import { convertToRxDBSchema } from './utils/databaseAgnosticSchema.js';
try {
  const testSchema = {
    title: 'Test2',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
      id: { type: 'string' },
      value: { type: 'number' }
    }
  };
  
  const result = convertToRxDBSchema(testSchema);
  console.log('  - Exported function works:', result !== undefined);
  console.log('  - Has converted properties:', result.properties !== undefined);
} catch (error) {
  console.error('  - ERROR in exported function:', error.message);
}

console.log('\n=== Test Complete ===');
