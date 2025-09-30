// ABOUTME: Test script to verify all data generators are working correctly
// ABOUTME: Tests ClubsGenerator, AdministrationGenerator, AcademicsGenerator, and FinancialGenerator

import { ClubsGenerator } from './generators/ClubsGenerator';
import { AdministrationGenerator } from './generators/AdministrationGenerator';
import { AcademicsGenerator } from './generators/AcademicsGenerator';
import { FinancialGenerator } from './generators/FinancialGenerator';
import { DataGenerationConfig } from './types';

async function testAllGenerators() {
  const config: DataGenerationConfig = {
    locale: 'en',
    outputFormat: 'json',
    includeRelationships: true,
    generateTimestamps: true
  };

  console.log('Testing all generators...');

  try {
    // Test ClubsGenerator
    console.log('\n=== Testing ClubsGenerator ===');
    const clubsGenerator = new ClubsGenerator(config);
    const clubsData = await clubsGenerator.generate();
    console.log(`✅ ClubsGenerator: Generated ${clubsData.length} records`);
    console.log('Sample club data:', clubsData.slice(0, 2));

    // Test AdministrationGenerator
    console.log('\n=== Testing AdministrationGenerator ===');
    const adminGenerator = new AdministrationGenerator(config);
    const adminData = await adminGenerator.generateData(30);
    console.log(`✅ AdministrationGenerator: Generated ${adminData.length} records`);
    console.log('Sample admin data:', adminData.slice(0, 2));

    const staffData = await adminGenerator.generateStaff(10);
    console.log(`✅ AdministrationGenerator Staff: Generated ${staffData.length} records`);

    const studentData = await adminGenerator.generateStudents(20);
    console.log(`✅ AdministrationGenerator Students: Generated ${studentData.length} records`);

    // Test AcademicsGenerator
    console.log('\n=== Testing AcademicsGenerator ===');
    const academicsGenerator = new AcademicsGenerator(config);
    const academicsData = await academicsGenerator.generate();
    console.log(`✅ AcademicsGenerator: Generated ${academicsData.length} records`);
    console.log('Sample academics data:', academicsData.slice(0, 2));

    // Test FinancialGenerator
    console.log('\n=== Testing FinancialGenerator ===');
    const financialGenerator = new FinancialGenerator(config);
    const financialData = await financialGenerator.generate();
    console.log(`✅ FinancialGenerator: Generated ${financialData.length} records`);
    console.log('Sample financial data:', financialData.slice(0, 2));

    console.log('\n🎉 All generators tested successfully!');

  } catch (error) {
    console.error('❌ Error testing generators:', error);
    process.exit(1);
  }
}

// Run the test
testAllGenerators();