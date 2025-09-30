// ABOUTME: Simple runner script to execute the comprehensive data generation demo
// ABOUTME: Imports and runs the main demo function from the demo.ts file

import { runComprehensiveDemo, testStorageAdapters, performanceBenchmark } from './src/services/dataGeneration/demo.js';

async function main() {
  try {
    console.log('🎯 School Management System - Data Generation Demo');
    console.log('🏫 Comprehensive Data Generation Testing');
    console.log('=' .repeat(80));
    
    // Run comprehensive demo
    await runComprehensiveDemo();
    
    // Test storage adapters
    await testStorageAdapters();
    
    // Performance benchmark
    await performanceBenchmark();
    
    console.log('\n🎉 All demos completed successfully!');
    
  } catch (error) {
    console.error('\n💥 Demo suite failed:', error);
    process.exit(1);
  }
}

main();