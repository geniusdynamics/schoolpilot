// Direct test of UniversalDataGenerator
import { UniversalDataGenerator } from './src/services/dataGeneration/UniversalDataGenerator.ts';

console.log('Testing UniversalDataGenerator direct import...');

try {
  const config = {
    storageType: 'mock',
    modules: ['administration'],
    logProgress: true
  };
  
  const generator = new UniversalDataGenerator(config);
  console.log('✅ UniversalDataGenerator created successfully!');
  console.log('Generator:', typeof generator);
  console.log('Methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(generator)));
  
} catch (error) {
  console.error('❌ Failed to create UniversalDataGenerator:', error.message);
  console.error('Stack:', error.stack);
}