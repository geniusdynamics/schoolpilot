// Test integration with actual RxDB collections
import { getRxDBIntegrationHelper } from './ProviderSelector';
import { collectionsDefinition } from '../rxdbService';

async function testIntegration() {
  console.log('🚀 Testing RxDB Integration with hardened schema conversion...\n');
  
  const integrationHelper = getRxDBIntegrationHelper();
  
  try {
    console.log(`📦 Found ${Object.keys(collectionsDefinition).length} collections to process\n`);
    
    // Test the integration with actual collections
    await integrationHelper.initializeWithRxDBCollections(
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
