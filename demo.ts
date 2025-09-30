// ABOUTME: Demo file to test the universal data generation system
// ABOUTME: Tests all generators and storage adapters to ensure proper functionality

import { UniversalDataGenerator } from './src/services/dataGeneration/UniversalDataGenerator';
import { DataGenerationConfig } from './src/services/dataGeneration/types';

async function runDemo() {
  console.log('🚀 Starting Universal Data Generation Demo');
  console.log('=' .repeat(50));

  // Test configuration for mock data storage
  const config: DataGenerationConfig = {
    storageType: 'mock',
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
      routes: 20
    },
    options: {
      generateRelationships: true,
      validateData: true,
      seedData: true
    }
  };

  try {
    // Initialize the universal data generator
    console.log('📊 Initializing Universal Data Generator...');
    const generator = new UniversalDataGenerator(config);
    await generator.initialize();

    // Generate data for all modules
    console.log('\n🔄 Generating data for all modules...');
    const startTime = Date.now();
    
    const stats = await generator.generateData();
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Display generation statistics
    console.log('\n✅ Data Generation Complete!');
    console.log('=' .repeat(50));
    console.log(`📈 Generation Statistics:`);
    console.log(`   • Total Records: ${stats.totalRecords}`);
    console.log(`   • Tables Generated: ${stats.tablesGenerated}`);
    console.log(`   • Generation Time: ${stats.generationTime}ms`);
    console.log(`   • Storage Type: ${stats.storageType}`);
    console.log(`   • Total Execution Time: ${totalTime}ms`);

    // Test different storage types
    console.log('\n🔄 Testing different storage types...');
    
    const storageTypes = [
      'sqlite-opfs',
      'sqlite-livestore',
      'pouchdb'
    ];

    for (const storageType of storageTypes) {
      console.log(`\n📦 Testing ${storageType} storage...`);
      
      const testConfig: DataGenerationConfig = {
        ...config,
        storageType,
        modules: ['administration'], // Test with just one module for speed
        counts: {
          students: 50,
          staff: 10
        }
      };

      try {
        const testGenerator = new UniversalDataGenerator(testConfig);
        await testGenerator.initialize();
        const testStats = await testGenerator.generateData();
        
        console.log(`   ✅ ${storageType}: ${testStats.totalRecords} records in ${testStats.generationTime}ms`);
      } catch (error) {
        console.log(`   ❌ ${storageType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log('\n🎉 Demo completed successfully!');
    console.log('=' .repeat(50));
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the demo
runDemo().catch(console.error);