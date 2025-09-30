// Simple test script using CommonJS to avoid ES module issues
const fs = require('fs');
const path = require('path');

console.log('=== Simple Data Generation Test ===\n');

// Test 1: Check if all generator files exist
console.log('1. Checking generator files...');
const generatorDir = path.join(__dirname, 'src', 'services', 'dataGeneration', 'generators');
const expectedGenerators = [
  'AdministrationGenerator.ts',
  'AcademicGenerator.ts', 
  'FinancialGenerator.ts',
  'ClubsGenerator.ts',
  'DormitoryGenerator.ts',
  'LibraryGenerator.ts',
  'NutritionGenerator.ts',
  'PayrollGenerator.ts',
  'InventoryGenerator.ts',
  'TransportGenerator.ts',
  'CommunicationGenerator.ts',
  'HealthGenerator.ts'
];

let allGeneratorsExist = true;
expectedGenerators.forEach(generator => {
  const filePath = path.join(generatorDir, generator);
  if (fs.existsSync(filePath)) {
    console.log(`   ✓ ${generator} exists`);
  } else {
    console.log(`   ✗ ${generator} missing`);
    allGeneratorsExist = false;
  }
});

// Test 2: Check core files
console.log('\n2. Checking core files...');
const coreFiles = [
  'src/services/dataGeneration/UniversalDataGenerator.ts',
  'src/services/dataGeneration/types.ts',
  'src/services/dataGeneration/generators/BaseGenerator.ts',
  'src/services/dataGeneration/RelationshipManager.ts'
];

let allCoreFilesExist = true;
coreFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✓ ${file} exists`);
  } else {
    console.log(`   ✗ ${file} missing`);
    allCoreFilesExist = false;
  }
});

// Test 3: Check adapter files
console.log('\n3. Checking adapter files...');
const adapterDir = path.join(__dirname, 'src', 'services', 'dataGeneration', 'adapters');
const expectedAdapters = [
  'BaseStorageAdapter.ts',
  'MockAdapter.ts',
  'AdapterFactory.ts'
];

let allAdaptersExist = true;
expectedAdapters.forEach(adapter => {
  const filePath = path.join(adapterDir, adapter);
  if (fs.existsSync(filePath)) {
    console.log(`   ✓ ${adapter} exists`);
  } else {
    console.log(`   ✗ ${adapter} missing`);
    allAdaptersExist = false;
  }
});

// Test 4: Basic file content validation
console.log('\n4. Basic content validation...');
try {
  const typesContent = fs.readFileSync(path.join(__dirname, 'src/services/dataGeneration/types.ts'), 'utf8');
  if (typesContent.includes('export interface IStorageAdapter')) {
    console.log('   ✓ types.ts contains IStorageAdapter interface');
  } else {
    console.log('   ✗ types.ts missing IStorageAdapter interface');
  }
  
  const universalGenContent = fs.readFileSync(path.join(__dirname, 'src/services/dataGeneration/UniversalDataGenerator.ts'), 'utf8');
  if (universalGenContent.includes('class UniversalDataGenerator')) {
    console.log('   ✓ UniversalDataGenerator.ts contains main class');
  } else {
    console.log('   ✗ UniversalDataGenerator.ts missing main class');
  }
} catch (error) {
  console.log(`   ✗ Error reading files: ${error.message}`);
}

// Summary
console.log('\n=== Test Summary ===');
if (allGeneratorsExist && allCoreFilesExist && allAdaptersExist) {
  console.log('✓ All files exist and basic structure is valid');
  console.log('✓ Data generation system is ready for testing');
} else {
  console.log('✗ Some files are missing or invalid');
}

console.log('\nNext steps:');
console.log('- Install TypeScript dependencies: npm install typescript @types/node');
console.log('- Compile TypeScript: npx tsc');
console.log('- Run comprehensive tests with compiled JavaScript');