// ABOUTME: Comprehensive test script to validate all data generation modules
// ABOUTME: Tests Administration, Academic, Financial, Library, and Clubs generators for consistency and integration

const fs = require('fs');
const path = require('path');

console.log('=== Comprehensive Data Generation Test ===\n');

// Test file existence and basic structure
function testFileExists(filePath, description) {
  const fullPath = path.resolve(filePath);
  const exists = fs.existsSync(fullPath);
  console.log(`✓ ${description}: ${exists ? 'EXISTS' : 'MISSING'} - ${fullPath}`);
  return exists;
}

// Test file content for key patterns
function testFileContent(filePath, patterns, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const results = patterns.map(pattern => {
      const found = content.includes(pattern);
      return { pattern, found };
    });
    
    const allFound = results.every(r => r.found);
    console.log(`✓ ${description}: ${allFound ? 'VALID' : 'INVALID'}`);
    
    results.forEach(r => {
      if (!r.found) {
        console.log(`  ❌ Missing: ${r.pattern}`);
      }
    });
    
    return allFound;
  } catch (error) {
    console.log(`❌ ${description}: ERROR - ${error.message}`);
    return false;
  }
}

// Test generator structure and methods
function testGeneratorStructure(filePath, generatorName, expectedMethods) {
  console.log(`\n--- Testing ${generatorName} Structure ---`);
  
  if (!testFileExists(filePath, `${generatorName} file`)) {
    return false;
  }
  
  const patterns = [
    `export class ${generatorName}`,
    'extends BaseGenerator',
    'async generateData(',
    ...expectedMethods
  ];
  
  return testFileContent(filePath, patterns, `${generatorName} structure`);
}

// Main test execution
function runComprehensiveTests() {
  console.log('Testing Core Infrastructure...');
  
  // Test base generator (abstract class)
  console.log('\n--- Testing BaseGenerator Structure ---');
  const baseGeneratorExists = testFileExists('src/services/dataGeneration/generators/BaseGenerator.ts', 'BaseGenerator file');
  const baseGeneratorValid = baseGeneratorExists && testFileContent(
    'src/services/dataGeneration/generators/BaseGenerator.ts',
    ['export abstract class BaseGenerator', 'abstract generateData(', 'protected generateId(', 'protected randomChoice<T>'],
    'BaseGenerator structure'
  );
  
  // Test types definition
  const typesValid = testFileContent(
    'src/services/dataGeneration/types.ts',
    ['IStorageAdapter', 'DataGenerationConfig'],
    'Types definition'
  );
  
  // Test universal data generator
  const universalValid = testFileContent(
    'src/services/dataGeneration/UniversalDataGenerator.ts',
    ['UniversalDataGenerator', 'async generateData()', 'async initialize()'],
    'Universal data generator'
  );
  
  console.log('\n=== Testing Individual Generators ===');
  
  // Test Administration Generator
  const adminValid = testGeneratorStructure(
    'src/services/dataGeneration/generators/AdministrationGenerator.ts',
    'AdministrationGenerator',
    ['generateStudents(', 'generateStaff(', 'generatePartners(']
  );
  
  // Test Academic Generator
  const academicValid = testGeneratorStructure(
    'src/services/dataGeneration/generators/AcademicGenerator.ts',
    'AcademicGenerator',
    ['generateSubjects(', 'generateGradingSchemes(', 'generateExamSessions(']
  );
  
  // Test Financial Generator
  const financialValid = testGeneratorStructure(
    'src/services/dataGeneration/generators/FinancialGenerator.ts',
    'FinancialGenerator',
    ['generateChartOfAccounts(', 'generateFeeTemplates(', 'generateTransactions(']
  );
  
  // Test Library Generator
  const libraryValid = testGeneratorStructure(
    'src/services/dataGeneration/generators/LibraryGenerator.ts',
    'LibraryGenerator',
    ['generateBooks(', 'generateAuthors(', 'generateLoans(']
  );
  
  // Test Clubs Generator
  const clubsValid = testGeneratorStructure(
    'src/services/dataGeneration/generators/ClubsGenerator.ts',
    'ClubsGenerator',
    ['generateClubs(', 'generateMemberships(', 'generateActivities(']
  );
  
  console.log('\n=== Testing Data Generation Capabilities ===');
  
  // Test data volume expectations
  const volumeTests = [
    {
      generator: 'AdministrationGenerator',
      file: 'src/services/dataGeneration/generators/AdministrationGenerator.ts',
      expectations: [
        'generateStudents(Math.max(500', // Should generate 500+ students
        'generateStaff(Math.max(100'     // Should generate 100+ staff
      ]
    },
    {
      generator: 'AcademicGenerator',
      file: 'src/services/dataGeneration/generators/AcademicGenerator.ts',
      expectations: [
        'generateSubjects(Math.max(50'   // Should generate 50+ subjects
      ]
    },
    {
      generator: 'LibraryGenerator',
      file: 'src/services/dataGeneration/generators/LibraryGenerator.ts',
      expectations: [
        'generateBooks(Math.max(1000', // Should generate 1000+ books
        'generateAuthors(200'          // Should generate 200+ authors
      ]
    },
    {
      generator: 'ClubsGenerator',
      file: 'src/services/dataGeneration/generators/ClubsGenerator.ts',
      expectations: [
        'generateClubs(Math.max(25'    // Should generate 25+ clubs
      ]
    }
  ];
  
  let volumeTestsPassed = 0;
  volumeTests.forEach(test => {
    console.log(`\nTesting ${test.generator} data volumes...`);
    const passed = testFileContent(test.file, test.expectations, `${test.generator} volume requirements`);
    if (passed) volumeTestsPassed++;
  });
  
  console.log('\n=== Testing Integration Points ===');
  
  // Test cross-module references
  const integrationTests = [
    {
      description: 'Student-Club integration',
      file: 'src/services/dataGeneration/generators/ClubsGenerator.ts',
      patterns: ['student', 'membership']
    },
    {
      description: 'Staff-Club patron assignment',
      file: 'src/services/dataGeneration/generators/ClubsGenerator.ts',
      patterns: ['patron_id', 'staff']
    },
    {
      description: 'Student-Library integration',
      file: 'src/services/dataGeneration/generators/LibraryGenerator.ts',
      patterns: ['student', 'loan']
    },
    {
      description: 'Academic-Financial integration',
      file: 'src/services/dataGeneration/generators/FinancialGenerator.ts',
      patterns: ['student', 'fee']
    }
  ];
  
  let integrationTestsPassed = 0;
  integrationTests.forEach(test => {
    const passed = testFileContent(test.file, test.patterns, test.description);
    if (passed) integrationTestsPassed++;
  });
  
  console.log('\n=== Test Summary ===');
  
  const coreTests = [baseGeneratorValid, typesValid, universalValid];
  const generatorTests = [adminValid, academicValid, financialValid, libraryValid, clubsValid];
  
  const coreTestsPassed = coreTests.filter(Boolean).length;
  const generatorTestsPassed = generatorTests.filter(Boolean).length;
  
  console.log(`Core Infrastructure: ${coreTestsPassed}/${coreTests.length} tests passed`);
  console.log(`Generator Structure: ${generatorTestsPassed}/${generatorTests.length} tests passed`);
  console.log(`Data Volume Requirements: ${volumeTestsPassed}/${volumeTests.length} tests passed`);
  console.log(`Integration Points: ${integrationTestsPassed}/${integrationTests.length} tests passed`);
  
  const totalTests = coreTests.length + generatorTests.length + volumeTests.length + integrationTests.length;
  const totalPassed = coreTestsPassed + generatorTestsPassed + volumeTestsPassed + integrationTestsPassed;
  
  console.log(`\n🎯 OVERALL RESULT: ${totalPassed}/${totalTests} tests passed (${Math.round(totalPassed/totalTests*100)}%)`);
  
  if (totalPassed === totalTests) {
    console.log('\n✅ ALL TESTS PASSED! Data generation system is comprehensive and ready.');
    return true;
  } else {
    console.log('\n⚠️  Some tests failed. Review the issues above.');
    return false;
  }
}

// Run the tests
runComprehensiveTests();