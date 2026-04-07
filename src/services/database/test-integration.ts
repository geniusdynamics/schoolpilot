// Test integration with collections (RXDB removed - Phase 4)
import { getDatabaseIntegrationHelper } from './ProviderSelector';
// RXDB removed - Phase 2: Using provider-agnostic collections
import { collectionsDefinition } from './collections';

async function testIntegration() {
  console.log('🚀 Testing RxDB Integration with hardened schema conversion...\n');
  
  const integrationHelper = getDatabaseIntegrationHelper();
  
  try {
    console.log(`📦 Found ${Object.keys(collectionsDefinition).length} collections to process\n`);
    
    // Test the integration with actual collections
    await integrationHelper.initializeWithCollections(
      collectionsDefinition,
      'test-schoolpilot'
    );
    
    console.log('\n✅ Integration test completed successfully!');
    console.log('All collections were converted and initialized without errors.');
    
    // Check if we can get a collection
    const testCollection = integrationHelper.getCollection('students');
    if (testCollection) {
      console.log('\n✅ Successfully retrieved test collection: students');
    }
    
    // Get database manager to check status
    const dbManager = integrationHelper.getDatabaseManager();
    const status = dbManager.getStatus();
    
    if (status) {
      console.log('\n📊 Database Status:');
      console.log(`  Provider: ${status.name}`);
      console.log(`  Collections: ${status.collectionsCount}`);
      console.log(`  Connected: ${status.isConnected}`);
    }
    
  } catch (error) {
    console.error('\n❌ Integration test failed:', error);
    process.exit(1);
  }
}

// Run the test
testIntegration().catch(console.error);
