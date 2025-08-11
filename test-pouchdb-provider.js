// Test script to verify PouchDB provider implementation
const { PouchDBProvider } = require('./src/services/database/PouchDBProvider.ts');

async function testPouchDBProvider() {
  console.log('Testing PouchDB Provider Implementation...\n');
  
  try {
    // Test 1: Create provider instance
    console.log('Test 1: Creating PouchDB provider instance...');
    const provider = new PouchDBProvider();
    console.log(`✅ Provider created: ${provider.name} v${provider.version}`);
    
    // Test 2: Check availability
    console.log('\nTest 2: Checking provider availability...');
    const isAvailable = provider.isAvailable();
    console.log(`✅ Provider available: ${isAvailable}`);
    
    // Test 3: Initialize provider
    console.log('\nTest 3: Initializing provider...');
    await provider.initialize({
      name: 'test-db',
      version: 1,
      autoCompaction: true
    });
    console.log('✅ Provider initialized successfully');
    
    // Test 4: Get status
    console.log('\nTest 4: Getting provider status...');
    const status = provider.getStatus();
    console.log('✅ Provider status:', JSON.stringify(status, null, 2));
    
    // Test 5: Create a collection
    console.log('\nTest 5: Creating a test collection...');
    const testSchema = {
      version: 1,
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        age: { type: 'number' }
      },
      required: ['id', 'name'],
      primaryKey: 'id'
    };
    
    const collection = await provider.createCollection('test_collection', testSchema);
    console.log(`✅ Collection created: ${collection.name}`);
    
    // Test 6: Insert a document
    console.log('\nTest 6: Inserting a document...');
    const insertResult = await collection.insert({
      name: 'Test User',
      age: 25
    });
    console.log(`✅ Document inserted with ID: ${insertResult.id}`);
    
    // Test 7: Find the document
    console.log('\nTest 7: Finding the document...');
    const doc = await collection.findById(insertResult.id);
    console.log('✅ Document found:', JSON.stringify(doc, null, 2));
    
    // Test 8: Update the document
    console.log('\nTest 8: Updating the document...');
    const updateResult = await collection.update(insertResult.id, { age: 26 });
    console.log(`✅ Document updated: ${updateResult.ok}`);
    
    // Test 9: Count documents
    console.log('\nTest 9: Counting documents...');
    const count = await collection.count();
    console.log(`✅ Document count: ${count}`);
    
    // Test 10: Backup provider
    console.log('\nTest 10: Creating backup...');
    const backup = await provider.backup();
    console.log(`✅ Backup created (${backup.length} bytes)`);
    
    // Test 11: Clean up
    console.log('\nTest 11: Cleaning up...');
    await provider.destroy();
    console.log('✅ Provider destroyed successfully');
    
    console.log('\n✅ All tests passed successfully!');
    return true;
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run tests
testPouchDBProvider().then(success => {
  process.exit(success ? 0 : 1);
});
