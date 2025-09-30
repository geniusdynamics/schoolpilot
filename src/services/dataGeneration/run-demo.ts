// ABOUTME: Runner script to execute comprehensive data generation demo
// ABOUTME: Imports and runs all demo functions from demo.ts

import { runComprehensiveDemo, testStorageAdapters, performanceBenchmark } from './demo';

async function main() {
  console.log('Starting comprehensive data generation demo...');
  
  try {
    console.log('\n=== Running Comprehensive Demo ===');
    await runComprehensiveDemo();
    
    console.log('\n=== Testing Storage Adapters ===');
    await testStorageAdapters();
    
    console.log('\n=== Performance Benchmark ===');
    await performanceBenchmark();
    
    console.log('\n✅ All demos completed successfully!');
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

main();