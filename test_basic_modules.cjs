// ABOUTME: Basic module functionality test to verify generators are working
// ABOUTME: Simple test to check if each generator can be imported and instantiated

console.log('🔍 Testing Basic Module Functionality...');
console.log('=' .repeat(50));

try {
  // Test AdministrationGenerator
  console.log('\n1. Testing AdministrationGenerator import...');
  const { AdministrationGenerator } = require('./src/services/dataGeneration/generators/AdministrationGenerator.js');
  const adminGen = new AdministrationGenerator({ batchSize: 10 });
  console.log('   ✅ AdministrationGenerator imported and instantiated');
  
  // Test LibraryGenerator
  console.log('\n2. Testing LibraryGenerator import...');
  const { LibraryGenerator } = require('./src/services/dataGeneration/generators/LibraryGenerator.js');
  const libraryGen = new LibraryGenerator({ batchSize: 10 });
  console.log('   ✅ LibraryGenerator imported and instantiated');
  
  // Test FinancialGenerator
  console.log('\n3. Testing FinancialGenerator import...');
  const { FinancialGenerator } = require('./src/services/dataGeneration/generators/FinancialGenerator.js');
  const financialGen = new FinancialGenerator({ batchSize: 10 });
  console.log('   ✅ FinancialGenerator imported and instantiated');
  
  // Test ClubsGenerator
  console.log('\n4. Testing ClubsGenerator import...');
  const { ClubsGenerator } = require('./src/services/dataGeneration/generators/ClubsGenerator.js');
  const clubsGen = new ClubsGenerator({ batchSize: 10 });
  console.log('   ✅ ClubsGenerator imported and instantiated');
  
  // Test AcademicsGenerator
  console.log('\n5. Testing AcademicsGenerator import...');
  const { AcademicsGenerator } = require('./src/services/dataGeneration/generators/AcademicsGenerator.js');
  const academicsGen = new AcademicsGenerator({ batchSize: 10 });
  console.log('   ✅ AcademicsGenerator imported and instantiated');
  
  // Test CommunicationGenerator
  console.log('\n6. Testing CommunicationGenerator import...');
  const { CommunicationGenerator } = require('./src/services/dataGeneration/generators/CommunicationGenerator.js');
  const commGen = new CommunicationGenerator({ batchSize: 10 });
  console.log('   ✅ CommunicationGenerator imported and instantiated');
  
  console.log('\n🎉 All modules imported successfully!');
  console.log('✅ Basic module functionality test passed');
  
} catch (error) {
  console.error('❌ Module test failed:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}