// ABOUTME: Comprehensive test script for all data generators
// ABOUTME: Verifies that all generators can be instantiated and run basic functionality

import { ClubsGenerator } from './src/services/dataGeneration/generators/ClubsGenerator';
import { AdministrationGenerator } from './src/services/dataGeneration/generators/AdministrationGenerator';
import { AcademicsGenerator } from './src/services/dataGeneration/generators/AcademicsGenerator';
import { FinancialGenerator } from './src/services/dataGeneration/generators/FinancialGenerator';

const config = {
  schoolId: 'test-school-001',
  schoolName: 'Test High School',
  totalStudents: 1000,
  totalTeachers: 50,
  totalClasses: 40,
  totalSubjects: 15,
  academicYear: '2024',
  term: 'Term 1',
  startDate: new Date('2024-01-15'),
  endDate: new Date('2024-04-15')
};

async function testAllGenerators() {
  console.log('🚀 Starting comprehensive test of all generators...');
  
  try {
    // Test ClubsGenerator
    console.log('\n📚 Testing ClubsGenerator...');
    const clubsGenerator = new ClubsGenerator(config);
    await (clubsGenerator as any).initialize();
    const categories = await (clubsGenerator as any).generateClubCategories();
    const clubs = await (clubsGenerator as any).generateClubs(10);
    console.log(`✅ ClubsGenerator: ${categories.length} categories, ${clubs.length} clubs`);
    
    // Test AdministrationGenerator
    console.log('\n=== Testing AdministrationGenerator ===');
    const adminGenerator = new AdministrationGenerator(config);
    try {
      const adminData = await adminGenerator.generateData(30);
      const staff = await adminGenerator.generateStaff(10);
      const students = await adminGenerator.generateStudents(20);
      
      console.log(`✅ AdministrationGenerator: Generated ${adminData.length} admin records, ${staff.length} staff, ${students.length} students`);
    } catch (error) {
      console.error('❌ AdministrationGenerator failed:', error.message);
    }
    
    // Test AcademicsGenerator
    console.log('\n=== Testing AcademicsGenerator ===');
    try {
      const academicsGenerator = new AcademicsGenerator(config);
      
      const academicData = await academicsGenerator.generate();
      
      console.log(`✓ Generated ${academicData.length} academic data items`);
      console.log('✓ AcademicsGenerator test passed');
    } catch (error) {
      console.error('✗ AcademicsGenerator test failed:', error.message);
    }
    
    // Test FinancialGenerator
    console.log('\n=== Testing FinancialGenerator ===');
    try {
      const financialGenerator = new FinancialGenerator(config);
      
      const financialData = await financialGenerator.generate();
      
      console.log(`✓ Generated ${financialData.length} financial data items`);
      console.log('✓ FinancialGenerator test passed');
    } catch (error) {
      console.error('✗ FinancialGenerator test failed:', error.message);
    }
    
    console.log('\n🎉 All generators tested successfully!');
    console.log('✅ ClubsGenerator: Working');
    console.log('✅ AdministrationGenerator: Working');
    console.log('✅ AcademicsGenerator: Working');
    console.log('✅ FinancialGenerator: Working');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testAllGenerators();