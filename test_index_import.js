// Test importing from index.ts
import { UniversalDataGenerator, createDataGenerator } from './src/services/dataGeneration/index.ts';

console.log('Testing imports from index.ts...');

try {
  console.log('UniversalDataGenerator:', typeof UniversalDataGenerator);
  console.log('createDataGenerator:', typeof createDataGenerator);
  
  if (typeof UniversalDataGenerator === 'undefined') {
    console.error('❌ UniversalDataGenerator is undefined!');
  } else {
    console.log('✅ UniversalDataGenerator imported successfully');
    
    // Test creating instance
    const config = {
      storageType: 'mock',
      modules: ['administration'],
      logProgress: true
    };
    
    const generator = new UniversalDataGenerator(config);
    console.log('✅ UniversalDataGenerator instance created successfully!');
  }
  
} catch (error) {
  console.error('❌ Import test failed:', error.message);
  console.error('Stack:', error.stack);
}