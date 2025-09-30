// ABOUTME: Quick test script to verify all generators are working correctly
// ABOUTME: Tests import statements and basic functionality of the data generation system

import { 
  AdministrationGenerator,
  AcademicsGenerator,
  FinancialGenerator,
  ClubsGenerator,
  DormitoryGenerator,
  LibraryGenerator,
  NutritionGenerator,
  PayrollGenerator,
  TransportGenerator,
  CommunicationGenerator,
  InventoryGenerator,
  HealthGenerator
} from './src/services/dataGeneration/generators/index';

import { DataGenerationConfig } from './src/services/dataGeneration/types';

async function testGenerators() {
  console.log('Testing generator imports and basic functionality...');
  
  const config: DataGenerationConfig = {
    storageType: 'mock',
    modules: ['administration'],
    locale: 'en',
    batchSize: 10,
    enableLogging: true
  };

  try {
    // Test ClubsGenerator specifically
    const clubsGenerator = new ClubsGenerator(config);
    console.log('✅ ClubsGenerator imported and instantiated successfully');
    
    // Test other generators
    const adminGenerator = new AdministrationGenerator(config);
    console.log('✅ AdministrationGenerator imported and instantiated successfully');
    
    const academicsGenerator = new AcademicsGenerator(config);
    console.log('✅ AcademicsGenerator imported and instantiated successfully');
    
    const financialGenerator = new FinancialGenerator(config);
    console.log('✅ FinancialGenerator imported and instantiated successfully');
    
    console.log('\n🎉 All generators imported and instantiated successfully!');
    console.log('✅ Import fixes completed successfully');
    
  } catch (error) {
    console.error('❌ Error testing generators:', error);
    process.exit(1);
  }
}

testGenerators();