// ABOUTME: Demo script for testing comprehensive data generation across all modules
// ABOUTME: Tests different storage adapters and validates data generation capabilities

import { UniversalDataGenerator, UniversalDataGenerationConfig } from './UniversalDataGenerator';

/**
 * Comprehensive demo configuration for testing all modules
 */
const comprehensiveConfig: UniversalDataGenerationConfig = {
  storageType: 'mock',
  locale: 'en_KE', // Kenya locale for realistic data
  batchSize: 50,
  logProgress: true,
  validateData: true,
  generateRelationships: true,
  modules: [
    'administration',
    'academic',
    'finance',
    'clubs',
    'dormitory',
    'library',
    'nutrition',
    'payroll',
    'transport',
    'communication',
    'inventory',
    'health'
  ],
  counts: {
    students: 500,
    staff: 100,
    subjects: 50,
    classes: 30,
    dormitories: 10,
    clubs: 25,
    books: 1000,
    suppliers: 50,
    vehicles: 15,
    routes: 20,
    inventoryItems: 200,
    mealPlans: 10,
    healthRecords: 500
  },
  seedData: {
    useRealisticData: true,
    includeTestData: false
  }
};

/**
 * Test different storage adapters
 */
const storageAdapterTests = [
  { name: 'Mock Adapter', storageType: 'mock' as const },
  { name: 'SQLite OPFS', storageType: 'sqlite-opfs' as const },
  { name: 'SQLite Livestore', storageType: 'sqlite-livestore' as const },
  { name: 'PouchDB', storageType: 'pouchdb' as const }
];

/**
 * Run comprehensive data generation demo
 */
export async function runComprehensiveDemo(config?: Partial<UniversalDataGenerationConfig>): Promise<void> {
  const finalConfig = { ...comprehensiveConfig, ...config };
  console.log('🚀 Starting Comprehensive Data Generation Demo');
  console.log('=' .repeat(60));

  try {
    const generator = new UniversalDataGenerator(finalConfig);
    await generator.initialize();
    
    console.log('📊 Generating comprehensive school data...');
    const startTime = Date.now();
    
    const result = await generator.generateData();
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n✅ Data Generation Complete!');
    console.log(`⏱️  Duration: ${duration.toFixed(2)} seconds`);
    console.log('📈 Generation Summary:');
    
    // Display results
    Object.entries(result.results).forEach(([module, moduleResult]) => {
      console.log(`  ${module}: ${moduleResult.recordsGenerated} records`);
    });
    
    console.log(`\n🔗 Total Relationships: ${result.relationships?.length || 0}`);
    console.log(`✅ Validation Passed: ${result.validationResults?.isValid ? 'Yes' : 'No'}`);
    
    if (result.validationResults && !result.validationResults.isValid) {
      console.log('❌ Validation Errors:');
      result.validationResults.errors.forEach(error => {
        console.log(`  - ${error}`);
      });
    }
    
    await generator.cleanup();
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    throw error;
  }
}

/**
 * Test different storage adapters
 */
export async function testStorageAdapters(baseConfig: UniversalDataGenerationConfig): Promise<void> {
  console.log('\n🔧 Testing Storage Adapters');
  console.log('=' .repeat(60));
  
  for (const test of storageAdapterTests) {
    console.log(`\n📦 Testing ${test.name}...`);
    
    try {
      const config = {
        ...baseConfig,
        storageType: test.storageType,
        modules: ['administration'], // Test with smaller dataset
        counts: {
          students: 50,
          staff: 10
        }
      };
      
      const generator = new UniversalDataGenerator(config);
      await generator.initialize();
      
      const result = await generator.generateData();
      
      console.log(`  ✅ ${test.name}: ${result.results.administration?.recordsGenerated || 0} records`);
      
      await generator.cleanup();
      
    } catch (error) {
      console.error(`  ❌ ${test.name} failed:`, error.message);
    }
  }
}

/**
 * Performance benchmark for data generation
 */
export async function performanceBenchmark(baseConfig: UniversalDataGenerationConfig): Promise<void> {
  console.log('\n⚡ Performance Benchmark');
  console.log('=' .repeat(60));
  
  const benchmarkConfigs = [
    { name: 'Small Dataset', students: 100, staff: 20, books: 200 },
    { name: 'Medium Dataset', students: 300, staff: 50, books: 500 },
    { name: 'Large Dataset', students: 500, staff: 100, books: 1000 }
  ];
  
  for (const benchmark of benchmarkConfigs) {
    console.log(`\n📊 Testing ${benchmark.name}...`);
    
    const config = {
      ...baseConfig,
      storageType: 'mock' as const,
      counts: {
        students: benchmark.students,
        staff: benchmark.staff,
        books: benchmark.books,
        subjects: 30,
        classes: 20,
        dormitories: 5,
        clubs: 15
      }
    };
    
    try {
      const startTime = Date.now();
      
      const generator = new UniversalDataGenerator(config);
      await generator.initialize();
      
      const result = await generator.generateData();
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      const totalRecords = Object.values(result.results)
        .reduce((sum, moduleResult) => sum + (moduleResult?.recordsGenerated || 0), 0);
      
      console.log(`  ⏱️  Duration: ${duration.toFixed(2)}s`);
      console.log(`  📊 Total Records: ${totalRecords}`);
      console.log(`  🚀 Records/sec: ${(totalRecords / duration).toFixed(0)}`);
      
      await generator.cleanup();
      
    } catch (error) {
      console.error(`  ❌ ${benchmark.name} failed:`, error.message);
    }
  }
}

/**
 * Main demo function
 */
async function main() {
  try {
    console.log('🎯 School Management System - Data Generation Demo');
    console.log('🏫 Comprehensive Data Generation Testing');
    console.log('=' .repeat(80));
    
    // Run comprehensive demo
    await runComprehensiveDemo();
    
    // Test storage adapters
    await testStorageAdapters(comprehensiveConfig);
    
    // Performance benchmark
    await performanceBenchmark(comprehensiveConfig);
    
    console.log('\n🎉 All demos completed successfully!');
    
  } catch (error) {
    console.error('\n💥 Demo suite failed:', error);
    process.exit(1);
  }
}

// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  comprehensiveConfig
};