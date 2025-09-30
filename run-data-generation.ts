// ABOUTME: Script to run comprehensive data generation for the school management system
// ABOUTME: Generates 500+ students, 100+ staff, 1000+ books and all other entities

import { runComprehensiveDemo } from './src/services/dataGeneration/demo.js';

async function main() {
  console.log('🎯 Starting Comprehensive Data Generation');
  console.log('🏫 School Management System - Full Dataset Creation');
  console.log('=' .repeat(80));
  
  try {
    await runComprehensiveDemo();
    console.log('\n🎉 Comprehensive data generation completed successfully!');
  } catch (error) {
    console.error('\n💥 Data generation failed:', error);
    process.exit(1);
  }
}

main();