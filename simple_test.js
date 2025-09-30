// Simple test to check basic imports
import { MockAdapter } from './src/services/dataGeneration/adapters/MockAdapter.ts';

console.log('Testing MockAdapter import...');

try {
  const adapter = new MockAdapter();
  console.log('MockAdapter created successfully!');
  console.log('Test passed!');
} catch (error) {
  console.error('Test failed:', error.message);
}