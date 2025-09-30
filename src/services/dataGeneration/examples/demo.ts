// ABOUTME: This file demonstrates how to use the universal data generation system
// ABOUTME: Provides examples for different storage types and configuration options

import { 
  generateMockData, 
  createDataGenerator, 
  UniversalDataGenerator,
  MockAdapter
} from '../index';
import type { DataGenerationConfig } from '../index';

/**
 * Demo 1: Quick mock data generation
 * This is the simplest way to generate mock data for testing
 */
export async function quickMockDataDemo() {
  console.log('🚀 Starting Quick Mock Data Generation Demo...');
  
  try {
    const result = await generateMockData('mock', ['administration', 'academic']);
    
    if (result.success) {
      console.log('✅ Data generation completed successfully!');
      console.log(`📊 Generated ${result.stats.totalRecords} records`);
      console.log(`📋 Tables created: ${result.stats.tablesGenerated.join(', ')}`);
      console.log(`⏱️ Generation time: ${result.stats.generationTime}ms`);
    } else {
      console.error('❌ Data generation failed:', result.errors);
    }
  } catch (error) {
    console.error('💥 Demo failed:', error);
  }
}

/**
 * Demo 2: Advanced configuration with custom settings
 */
export async function advancedConfigDemo() {
  console.log('🔧 Starting Advanced Configuration Demo...');
  
  const config: DataGenerationConfig = {
    storageType: 'mock',
    locale: 'en',
    batchSize: 50,
    logProgress: true,
    validateData: true,
    modules: [
      'administration',
      'academic', 
      'finance',
      'clubs',
      'dormitory',
      'library',
      'nutrition'
    ]
  };
  
  let generator: UniversalDataGenerator | null = null;
  
  try {
    generator = await createDataGenerator(config);
    
    console.log('🏗️ Generator initialized, starting data generation...');
    const result = await generator.generateData();
    
    console.log('✅ Data generation completed!');
    console.log(`📊 Total records: ${result.totalRecords}`);
    console.log(`📋 Tables: ${result.tablesGenerated.length}`);
    console.log(`⏱️ Time: ${result.generationTime}ms`);
    
    // Validate the generated data
    console.log('🔍 Validating data integrity...');
    const isValid = await generator.validateData();
    console.log(`✅ Data validation: ${isValid ? 'PASSED' : 'FAILED'}`);
    
  } catch (error) {
    console.error('💥 Advanced demo failed:', error);
  } finally {
    if (generator) {
      await generator.cleanup();
      console.log('🧹 Cleanup completed');
    }
  }
}

/**
 * Demo 3: Working directly with MockAdapter
 */
export async function mockAdapterDemo() {
  console.log('🗄️ Starting MockAdapter Direct Usage Demo...');
  
  const adapter = new MockAdapter();
  
  try {
    await adapter.initialize();
    console.log('✅ MockAdapter initialized');
    
    // Create a simple schema
    const schema = `
      CREATE TABLE demo_users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await adapter.createSchema('demo_users', schema);
    console.log('📋 Schema created for demo_users table');
    
    // Insert some data
    const users = [
      { name: 'John Doe', email: 'john@example.com', role: 'admin' },
      { name: 'Jane Smith', email: 'jane@example.com', role: 'teacher' },
      { name: 'Bob Johnson', email: 'bob@example.com', role: 'student' }
    ];
    
    await adapter.insertBatch('demo_users', users);
    console.log(`📝 Inserted ${users.length} users`);
    
    // Query the data
    const allUsers = await adapter.query('SELECT * FROM demo_users');
    console.log(`📊 Total users: ${allUsers.length}`);
    
    const admins = await adapter.query('SELECT * FROM demo_users WHERE role = "admin"');
    console.log(`👑 Admin users: ${admins.length}`);
    
    // Use mock-specific methods
    const tables = adapter.getAllTables();
    console.log(`📋 Available tables: ${tables.join(', ')}`);
    
    const stats = adapter.getTableStats('demo_users');
    console.log(`📊 Table stats:`, stats);
    
    // Export data
    const exportedData = adapter.exportData();
    console.log(`💾 Exported data contains ${Object.keys(exportedData).length} tables`);
    
  } catch (error) {
    console.error('💥 MockAdapter demo failed:', error);
  } finally {
    await adapter.cleanup();
    console.log('🧹 MockAdapter cleanup completed');
  }
}

/**
 * Demo 4: Module-specific data generation
 */
export async function moduleSpecificDemo() {
  console.log('🎯 Starting Module-Specific Generation Demo...');
  
  const modules = ['administration', 'academic', 'finance', 'library', 'nutrition'];
  
  for (const module of modules) {
    console.log(`\n📚 Generating data for ${module} module...`);
    
    try {
      const result = await generateMockData('mock', [module]);
      
      if (result.success) {
        console.log(`✅ ${module}: ${result.stats.totalRecords} records in ${result.stats.generationTime}ms`);
        console.log(`   Tables: ${result.stats.tablesGenerated.join(', ')}`);
      } else {
        console.error(`❌ ${module} failed:`, result.errors[0]);
      }
    } catch (error) {
      console.error(`💥 ${module} error:`, error);
    }
  }
}

/**
 * Demo 5: Performance testing
 */
export async function performanceDemo() {
  console.log('⚡ Starting Performance Demo...');
  
  const testConfigs = [
    { batchSize: 10, modules: ['administration'] },
    { batchSize: 50, modules: ['administration'] },
    { batchSize: 100, modules: ['administration'] },
    { batchSize: 50, modules: ['administration', 'academic', 'finance'] }
  ];
  
  for (const testConfig of testConfigs) {
    console.log(`\n🧪 Testing: batch=${testConfig.batchSize}, modules=${testConfig.modules.length}`);
    
    const startTime = Date.now();
    
    try {
      const result = await generateMockData('mock', testConfig.modules);
      const endTime = Date.now();
      
      if (result.success) {
        console.log(`✅ Generated ${result.stats.totalRecords} records in ${endTime - startTime}ms`);
        console.log(`   Throughput: ${Math.round(result.stats.totalRecords / (endTime - startTime) * 1000)} records/sec`);
      } else {
        console.error(`❌ Test failed:`, result.errors[0]);
      }
    } catch (error) {
      console.error(`💥 Performance test error:`, error);
    }
  }
}

/**
 * Run all demos
 */
export async function runAllDemos() {
  console.log('🎪 Starting All Data Generation Demos...');
  console.log('=' .repeat(50));
  
  await quickMockDataDemo();
  console.log('\n' + '='.repeat(50));
  
  await advancedConfigDemo();
  console.log('\n' + '='.repeat(50));
  
  await mockAdapterDemo();
  console.log('\n' + '='.repeat(50));
  
  await moduleSpecificDemo();
  console.log('\n' + '='.repeat(50));
  
  await performanceDemo();
  console.log('\n' + '='.repeat(50));
  
  console.log('🎉 All demos completed!');
}

// Run demos if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllDemos().catch(console.error);
}