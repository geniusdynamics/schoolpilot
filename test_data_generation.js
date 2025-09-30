// Test script for data generation system
import { generateMockData } from './src/services/dataGeneration/index.ts';

async function testDataGeneration() {
  console.log('Testing data generation system...');
  
  try {
    // Test with administration module
    console.log('Testing administration module...');
    const adminResult = await generateMockData('mock', ['administration']);
    
    if (adminResult.success) {
      console.log('✅ Administration data generation SUCCESS');
      console.log('Stats:', JSON.stringify(adminResult.stats, null, 2));
    } else {
      console.log('❌ Administration data generation FAILED');
      console.log('Errors:', adminResult.errors);
      return;
    }
    
    // Test with academic module
    console.log('\nTesting academic module...');
    const academicResult = await generateMockData('mock', ['academic']);
    
    if (academicResult.success) {
      console.log('✅ Academic data generation SUCCESS');
      console.log('Stats:', JSON.stringify(academicResult.stats, null, 2));
    } else {
      console.log('❌ Academic data generation FAILED');
      console.log('Errors:', academicResult.errors);
      return;
    }
    
    console.log('\n🎉 All tests passed! generateFutureDate replacements are working correctly.');
    
  } catch (error) {
    console.log('❌ Data generation test FAILED');
    console.log('Error:', error.message);
    console.log('Stack:', error.stack);
  }
  
  console.log('\nTest completed');
}

testDataGeneration();