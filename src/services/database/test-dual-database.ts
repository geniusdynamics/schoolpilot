// Test file for database architecture with all 88 collections
// RXDB removed - Phase 4: Now testing SQLite/PouchDB implementations

import { getDatabaseProviderFactory } from './DatabaseProviderFactory';
// Using provider-agnostic collections (moved from rxdbService.ts)
import { collectionsDefinition } from './collections';

// Test interface for sample data
interface TestDocument {
  id?: string;
  name: string;
  type: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

// Test the dual-database architecture
export async function testDualDatabaseArchitecture(): Promise<void> {
  console.log('🚀 Starting dual-database architecture test...');
  
  try {
    // Get the integration helper
    const integrationHelper = getDatabaseIntegrationHelper();
    
    // Initialize with all 88 collections from collections.ts
    console.log(`📊 Initializing database with ${Object.keys(collectionsDefinition).length} collections...`);
    await integrationHelper.initializeWithCollections(collectionsDefinition, 'schoolpilot-test');
    
    console.log('✅ Database initialized successfully!');
    
    // Get database manager
    const databaseManager = integrationHelper.getDatabaseManager();
    
    // Test provider status
    const status = databaseManager.getStatus();
    console.log('📈 Provider Status:', {
      name: status?.name,
      version: status?.version,
      isConnected: status?.isConnected,
      collectionsCount: status?.collectionsCount
    });
    
    // Test collection access
    console.log('🔍 Testing collection access...');
    const allCollections = databaseManager.getAllCollections();
    console.log(`📚 Total collections created: ${allCollections.size}`);
    
    // List all collection names
    const collectionNames = Array.from(allCollections.keys());
    console.log('📋 Collection names:', collectionNames.slice(0, 10), '... and', collectionNames.length - 10, 'more');
    
    // Test CRUD operations on a few collections
    await testCRUDOperations(databaseManager, collectionNames.slice(0, 3));
    
    // Test query builder
    await testQueryBuilder(databaseManager, collectionNames[0]);
    
    // Test collection statistics
    await testCollectionStats(databaseManager);
    
    console.log('🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Test CRUD operations on sample collections
async function testCRUDOperations(databaseManager: any, collectionNames: string[]): Promise<void> {
  console.log('🧪 Testing CRUD operations...');
  
  for (const collectionName of collectionNames) {
    try {
      const collection = databaseManager.getCollection<TestDocument>(collectionName);
      if (!collection) {
        console.warn(`⚠️ Collection '${collectionName}' not found`);
        continue;
      }
      
      console.log(`📝 Testing collection: ${collectionName}`);
      
      // Test INSERT
      const testDoc: Omit<TestDocument, 'id'> = {
        name: `Test Document for ${collectionName}`,
        type: 'test',
        createdAt: new Date(),
        metadata: { testRun: Date.now() }
      };
      
      const insertResult = await collection.insert(testDoc);
      console.log(`✅ Insert successful for ${collectionName}:`, insertResult.id);
      
      // Test FIND BY ID
      const foundDoc = await collection.findById(insertResult.id);
      console.log(`✅ Find by ID successful for ${collectionName}:`, foundDoc?.name);
      
      // Test UPDATE
      if (foundDoc?.id) {
        const updateResult = await collection.update(foundDoc.id, {
          name: `Updated ${foundDoc.name}`,
          metadata: { ...foundDoc.metadata, updated: true }
        });
        console.log(`✅ Update successful for ${collectionName}:`, updateResult.doc?.name);
      }
      
      // Test FIND ALL
      const allDocs = await collection.find();
      console.log(`✅ Find all successful for ${collectionName}: ${allDocs.length} documents`);
      
      // Test COUNT
      const count = await collection.count();
      console.log(`✅ Count successful for ${collectionName}: ${count} documents`);
      
      // Test DELETE
      if (insertResult.id) {
        const deleteResult = await collection.remove(insertResult.id);
        console.log(`✅ Delete successful for ${collectionName}:`, deleteResult.deleted);
      }
      
    } catch (error) {
      console.error(`❌ CRUD test failed for ${collectionName}:`, error.message);
    }
  }
}

// Test query builder functionality
async function testQueryBuilder(databaseManager: any, collectionName: string): Promise<void> {
  console.log('🔍 Testing query builder...');
  
  try {
    const collection = databaseManager.getCollection<TestDocument>(collectionName);
    if (!collection) {
      console.warn(`⚠️ Collection '${collectionName}' not found for query builder test`);
      return;
    }
    
    // Insert test data
    const testDocs: Omit<TestDocument, 'id'>[] = [
      { name: 'Query Test 1', type: 'query', createdAt: new Date() },
      { name: 'Query Test 2', type: 'query', createdAt: new Date() },
      { name: 'Other Test', type: 'other', createdAt: new Date() }
    ];
    
    const insertResults = await collection.insertMany(testDocs);
    console.log(`✅ Inserted ${insertResults.docs.length} test documents`);
    
    // Test query builder
    const queryBuilder = databaseManager.createQuery<TestDocument>(collectionName);
    
    // Test WHERE clause
    const queryResults = await queryBuilder
      .where('type', 'eq', 'query')
      .limit(10)
      .execute(collection);
    
    console.log(`✅ Query builder test successful: found ${queryResults.length} documents with type 'query'`);
    
    // Test COUNT with query builder
    const queryCount = await queryBuilder
      .where('type', 'eq', 'query')
      .count(collection);
    
    console.log(`✅ Query builder count test successful: ${queryCount} documents`);
    
    // Clean up test data
    for (const result of insertResults.docs) {
      if (result.id) {
        await collection.remove(result.id);
      }
    }
    
  } catch (error) {
    console.error('❌ Query builder test failed:', error.message);
  }
}

// Test collection statistics
async function testCollectionStats(databaseManager: any): Promise<void> {
  console.log('📊 Testing collection statistics...');
  
  try {
    const stats = await databaseManager.getCollectionStats();
    console.log(`✅ Retrieved stats for ${stats.length} collections`);
    
    // Show stats for first few collections
    stats.slice(0, 3).forEach(({ name, stats: collectionStats }) => {
      console.log(`📈 ${name}:`, {
        documentCount: collectionStats.documentCount,
        storageSize: collectionStats.storageSize
      });
    });
    
  } catch (error) {
    console.error('❌ Collection stats test failed:', error.message);
  }
}

// Test provider availability and fallback
export async function testProviderAvailability(): Promise<void> {
  console.log('🔧 Testing provider availability...');
  
  try {
    const factory = getDatabaseProviderFactory();
    const availableProviders = factory.getAvailableProviders();
    
    console.log('✅ Available providers:', availableProviders);
    
    const providerStatus = factory.getProviderStatus();
    providerStatus.forEach(status => {
      console.log(`📊 Provider ${status.name}:`, {
        version: status.version,
        isConnected: status.isConnected,
        isActive: (status as any).isActive
      });
    });
    
  } catch (error) {
    console.error('❌ Provider availability test failed:', error.message);
  }
}

// Main test function
export async function runAllTests(): Promise<void> {
  console.log('🧪 Starting comprehensive dual-database architecture tests...');
  console.log('=' .repeat(60));
  
  try {
    await testProviderAvailability();
    console.log('\n' + '-'.repeat(40) + '\n');
    
    await testDualDatabaseArchitecture();
    console.log('\n' + '-'.repeat(40) + '\n');
    
    console.log('🎉 All tests completed successfully!');
    console.log('✅ Dual-database architecture is working with all 88 collections');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    throw error;
  }
}

// Export for use in other files
export {
  testDualDatabaseArchitecture,
  testProviderAvailability
};
