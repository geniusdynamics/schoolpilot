// Test createDataGenerator function
import { createDataGenerator } from './src/services/dataGeneration/index.ts';

console.log('Testing createDataGenerator function...');

async function testCreateGenerator() {
  try {
    const config = {
      storageType: 'mock',
      modules: ['administration'],
      logProgress: true
    };
    
    console.log('Creating generator with config:', config);
    const generator = await createDataGenerator(config);
    console.log('✅ createDataGenerator succeeded!');
    console.log('Generator type:', typeof generator);
    
    // Test data generation
    console.log('\nTesting data generation...');
    const result = await generator.generateData();
    console.log('✅ Data generation succeeded!');
    console.log('Result:', JSON.stringify(result, null, 2));
    
    await generator.cleanup();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testCreateGenerator();