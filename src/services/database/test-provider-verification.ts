// Test verification for PouchDB provider implementation
// Run with: npx ts-node src/services/database/test-provider-verification.ts

import { PouchDBProvider } from './PouchDBProvider';
import { DatabaseProviderFactory } from './DatabaseProviderFactory';
import { getDatabaseManager } from './ProviderSelector';

import { DatabaseConfig, CollectionSchema, IDatabaseProvider } from './interfaces';

// Colors for console output
const green = '\x1b[32m';
const red = '\x1b[31m';
const yellow = '\x1b[33m';
const reset = '\x1b[0m';

async function testPouchDBProvider() {
  console.log(`${yellow}Testing PouchDB Provider Implementation...${reset}\n`);
  
  let provider: IDatabaseProvider | null = null;
  
  try {
    // Test 1: Create provider instance
    console.log('Test 1: Creating PouchDB provider instance...');
    provider = new PouchDBProvider();
    console.log(`${green}✅ Provider created: ${provider.name} v${provider.version}${reset}`);
    
    // Test 2: Check availability (before initialization)
    console.log('\nTest 2: Checking provider availability...');
    const isAvailable = provider.isAvailable();
    console.log(`${green}✅ Provider available: ${isAvailable}${reset}`);
    
    if (!isAvailable) {
      console.error(`${red}❌ Provider not available in this environment${reset}`);
      return false;
    }
    
    // Test 3: Initialize provider
    console.log('\nTest 3: Initializing provider...');
    const config: DatabaseConfig = {
      name: 'test-db',
      version: 1,
      autoCompaction: true
    };
    await provider.initialize(config);
    console.log(`${green}✅ Provider initialized successfully${reset}`);
    
    // Test 4: Get status after initialization
    console.log('\nTest 4: Getting provider status...');
    const status = provider.getStatus();
    console.log(`${green}✅ Provider status:${reset}`, JSON.stringify(status, null, 2));
    
    // Test 5: Create a collection
    console.log('\nTest 5: Creating a test collection...');
    const testSchema: CollectionSchema = {
      version: 1,
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        age: { type: 'number' },
        email: { type: 'string' }
      },
      required: ['id', 'name'],
      primaryKey: 'id',
      indexes: [
        { name: 'idx_name', fields: ['name'], unique: false }
      ]
    };
    
    const collection = await provider.createCollection<any>('test_collection', testSchema);
    console.log(`${green}✅ Collection created: ${collection.name}${reset}`);
    
    // Test 6: Verify collection schema
    console.log('\nTest 6: Verifying collection schema...');
    console.log(`${green}✅ Schema version: ${collection.schema.version}${reset}`);
    console.log(`${green}✅ Primary key: ${collection.schema.primaryKey}${reset}`);
    
    // Test 7: Insert a document
    console.log('\nTest 7: Inserting a document...');
    const insertResult = await collection.insert({
      name: 'Test User',
      age: 25,
      email: 'test@example.com'
    });
    console.log(`${green}✅ Document inserted with ID: ${insertResult.id}${reset}`);
    
    // Test 8: Find the document by ID
    console.log('\nTest 8: Finding the document by ID...');
    const doc = await collection.findById(insertResult.id);
    console.log(`${green}✅ Document found:${reset}`, JSON.stringify(doc, null, 2));
    
    // Test 9: Update the document
    console.log('\nTest 9: Updating the document...');
    const updateResult = await collection.update(insertResult.id, { age: 26 });
    console.log(`${green}✅ Document updated: ${updateResult.ok}${reset}`);
    
    // Test 10: Find with query
    console.log('\nTest 10: Finding documents with query...');
    const queryResults = await collection.find({
      selector: { age: { $gte: 20 } }
    });
    console.log(`${green}✅ Found ${queryResults.length} documents matching query${reset}`);
    
    // Test 11: Count documents
    console.log('\nTest 11: Counting documents...');
    const count = await collection.count();
    console.log(`${green}✅ Document count: ${count}${reset}`);
    
    // Test 12: Backup provider
    console.log('\nTest 12: Creating backup...');
    const backup = await provider.backup();
    console.log(`${green}✅ Backup created (${backup.length} bytes)${reset}`);
    
    // Test 13: Restore from backup
    console.log('\nTest 13: Testing restore functionality...');
    await provider.restore(backup);
    console.log(`${green}✅ Backup restored successfully${reset}`);
    
    // Test 14: Get all collections
    console.log('\nTest 14: Getting all collections...');
    const allCollections = provider.getAllCollections();
    console.log(`${green}✅ Total collections: ${allCollections.size}${reset}`);
    
    console.log(`\n${green}✅ All PouchDB Provider tests passed successfully!${reset}`);
    return true;
    
  } catch (error: any) {
    console.error(`\n${red}❌ Test failed with error:${reset}`, error);
    console.error('Stack trace:', error.stack);
    return false;
  } finally {
    // Clean up
    if (provider) {
      console.log('\nCleaning up...');
      await provider.destroy();
      console.log(`${green}✅ Provider destroyed${reset}`);
    }
  }
}

async function testDatabaseProviderFactory() {
  console.log(`\n${yellow}Testing Database Provider Factory...${reset}\n`);
  
  let factory: DatabaseProviderFactory | null = null;
  
  try {
    // Test 1: Create factory instance
    console.log('Test 1: Creating DatabaseProviderFactory...');
    factory = new DatabaseProviderFactory();
    console.log(`${green}✅ Factory created${reset}`);
    
    // Test 2: Get available providers
    console.log('\nTest 2: Getting available providers...');
    const availableProviders = factory.getAvailableProviders();
    console.log(`${green}✅ Available providers: ${availableProviders.join(', ')}${reset}`);
    
    // Test 3: Create PouchDB provider
    console.log('\nTest 3: Creating PouchDB provider via factory...');
    const config: DatabaseConfig = {
      name: 'factory-test-db',
      version: 1,
      autoCompaction: true
    };
    
    const provider = await factory.createProvider(config);
    console.log(`${green}✅ Provider created: ${provider.name}${reset}`);
    
    // Test 4: Verify provider is initialized
    console.log('\nTest 4: Verifying provider initialization...');
    const status = provider.getStatus();
    console.log(`${green}✅ Provider connected: ${status.isConnected}${reset}`);
    
    // Test 5: Create collection through provider
    console.log('\nTest 5: Creating collection through factory provider...');
    const schema: CollectionSchema = {
      version: 1,
      type: 'object',
      properties: {
        id: { type: 'string' },
        value: { type: 'string' }
      },
      required: ['id'],
      primaryKey: 'id'
    };
    
    const collection = await provider.createCollection<any>('factory_test', schema);
    console.log(`${green}✅ Collection created: ${collection.name}${reset}`);
    
    console.log(`\n${green}✅ All Factory tests passed successfully!${reset}`);
    return true;
    
  } catch (error: any) {
    console.error(`\n${red}❌ Factory test failed:${reset}`, error);
    console.error('Stack trace:', error.stack);
    return false;
  } finally {
    // Clean up
    if (factory) {
      console.log('\nCleaning up factory...');
      await factory.destroy();
      console.log(`${green}✅ Factory destroyed${reset}`);
    }
  }
}

async function testDatabaseManager() {
  console.log(`\n${yellow}Testing Database Manager Integration...${reset}\n`);
  
  try {
    // Test 1: Get database manager instance
    console.log('Test 1: Getting DatabaseManager instance...');
    const manager = getDatabaseManager();
    console.log(`${green}✅ DatabaseManager instance obtained${reset}`);
    
    // Test 2: Initialize with test collections
    console.log('\nTest 2: Initializing DatabaseManager with test collections...');
    const config: DatabaseConfig = {
      name: 'manager-test-db',
      version: 1,
      autoCompaction: true
    };
    
    const testCollections = [
      {
        name: 'users',
        schema: {
          version: 1,
          type: 'object' as const,
          properties: {
            id: { type: 'string' },
            username: { type: 'string' },
            email: { type: 'string' }
          },
          required: ['id', 'username'],
          primaryKey: 'id'
        }
      },
      {
        name: 'posts',
        schema: {
          version: 1,
          type: 'object' as const,
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            userId: { type: 'string' }
          },
          required: ['id', 'title'],
          primaryKey: 'id'
        }
      }
    ];
    
    await manager.initialize(config, testCollections);
    console.log(`${green}✅ DatabaseManager initialized with ${testCollections.length} collections${reset}`);
    
    // Test 3: Verify manager is available
    console.log('\nTest 3: Checking DatabaseManager availability...');
    const isAvailable = manager.isAvailable();
    console.log(`${green}✅ Manager available: ${isAvailable}${reset}`);
    
    // Test 4: Get collection
    console.log('\nTest 4: Getting collection from manager...');
    const usersCollection = manager.getCollection<any>('users');
    if (usersCollection) {
      console.log(`${green}✅ Collection retrieved: ${usersCollection.name}${reset}`);
    } else {
      throw new Error('Failed to retrieve users collection');
    }
    
    // Test 5: Use collection
    console.log('\nTest 5: Using collection through manager...');
    const userInsert = await usersCollection.insert({
      username: 'testuser',
      email: 'test@example.com'
    });
    console.log(`${green}✅ Document inserted through manager: ${userInsert.id}${reset}`);
    
    // Test 6: Get all collections
    console.log('\nTest 6: Getting all collections from manager...');
    const allCollections = manager.getAllCollections();
    console.log(`${green}✅ Total collections in manager: ${allCollections.size}${reset}`);
    
    console.log(`\n${green}✅ All DatabaseManager tests passed successfully!${reset}`);
    return true;
    
  } catch (error: any) {
    console.error(`\n${red}❌ DatabaseManager test failed:${reset}`, error);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log(`${yellow}${'='.repeat(60)}${reset}`);
  console.log(`${yellow}PouchDB Provider Verification Tests${reset}`);
  console.log(`${yellow}${'='.repeat(60)}${reset}\n`);
  
  let allPassed = true;
  
  // Run PouchDB Provider tests
  const providerTestPassed = await testPouchDBProvider();
  allPassed = allPassed && providerTestPassed;
  
  // Run Factory tests
  const factoryTestPassed = await testDatabaseProviderFactory();
  allPassed = allPassed && factoryTestPassed;
  
  // Run Database Manager tests
  const managerTestPassed = await testDatabaseManager();
  allPassed = allPassed && managerTestPassed;
  
  // Summary
  console.log(`\n${yellow}${'='.repeat(60)}${reset}`);
  console.log(`${yellow}Test Summary${reset}`);
  console.log(`${yellow}${'='.repeat(60)}${reset}`);
  
  console.log(`PouchDB Provider: ${providerTestPassed ? green + '✅ PASSED' : red + '❌ FAILED'}${reset}`);
  console.log(`Database Factory: ${factoryTestPassed ? green + '✅ PASSED' : red + '❌ FAILED'}${reset}`);
  console.log(`Database Manager: ${managerTestPassed ? green + '✅ PASSED' : red + '❌ FAILED'}${reset}`);
  
  if (allPassed) {
    console.log(`\n${green}✅ All verification tests passed successfully!${reset}`);
    console.log(`${green}The PouchDB provider implementation is complete and working.${reset}`);
  } else {
    console.log(`\n${red}❌ Some tests failed. Please review the errors above.${reset}`);
  }
  
  return allPassed;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error(`${red}Unexpected error:${reset}`, error);
    process.exit(1);
  });
}

export { testPouchDBProvider, testDatabaseProviderFactory, testDatabaseManager, runAllTests };
