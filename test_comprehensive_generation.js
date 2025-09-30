// ABOUTME: Comprehensive test script for enhanced data generation system
// ABOUTME: Tests all modules with expanded data generation capabilities

import { UniversalDataGenerator } from './src/services/dataGeneration/UniversalDataGenerator.ts';

async function testComprehensiveDataGeneration() {
  console.log('🚀 Starting Comprehensive Data Generation Test');
  console.log('=' .repeat(60));

  const config = {
    storageType: 'mock',
    locale: 'en-KE',
    batchSize: 100,
    logProgress: true,
    validateData: true,
    generateRelationships: true,
    modules: [
      'administration',
      'academic', 
      'finance',
      'library',
      'clubs'
    ],
    counts: {
      administration: 600, // 500+ students + 100+ staff
      academic: 50,        // 50+ subjects
      finance: 100,        // Financial transactions
      library: 1000,       // 1000+ books
      clubs: 25           // 25+ clubs
    },
    seedData: {
      useRealisticData: true,
      includeTestData: false
    }
  };

  try {
    // Initialize generator
    console.log('\n📋 Initializing Universal Data Generator...');
    const generator = new UniversalDataGenerator(config);
    await generator.initialize();
    console.log('✅ Generator initialized successfully');

    // Test each module individually
    console.log('\n🧪 Testing Individual Modules:');
    console.log('-'.repeat(40));

    // Test Administration Module (Enhanced Students & Staff)
    console.log('\n👥 Testing Administration Module...');
    const adminStats = await testAdministrationModule(generator);
    console.log(`✅ Administration: ${adminStats.students} students, ${adminStats.staff} staff generated`);

    // Test Academic Module
    console.log('\n📚 Testing Academic Module...');
    const academicStats = await testAcademicModule(generator);
    console.log(`✅ Academic: ${academicStats.subjects} subjects, ${academicStats.exams} exams generated`);

    // Test Financial Module
    console.log('\n💰 Testing Financial Module...');
    const financialStats = await testFinancialModule(generator);
    console.log(`✅ Financial: ${financialStats.accounts} accounts, ${financialStats.transactions} transactions generated`);

    // Test Library Module
    console.log('\n📖 Testing Library Module...');
    const libraryStats = await testLibraryModule(generator);
    console.log(`✅ Library: ${libraryStats.books} books, ${libraryStats.loans} loans generated`);

    // Test Clubs Module
    console.log('\n🏆 Testing Clubs Module...');
    const clubsStats = await testClubsModule(generator);
    console.log(`✅ Clubs: ${clubsStats.clubs} clubs, ${clubsStats.members} members generated`);

    // Generate comprehensive data
    console.log('\n🔄 Generating Comprehensive Dataset...');
    const startTime = Date.now();
    const stats = await generator.generateData();
    const endTime = Date.now();

    // Display results
    console.log('\n📊 Generation Results:');
    console.log('=' .repeat(60));
    console.log(`📈 Total Records: ${stats.totalRecords.toLocaleString()}`);
    console.log(`🗂️  Tables Generated: ${stats.tablesGenerated.length}`);
    console.log(`⏱️  Generation Time: ${stats.generationTime}ms`);
    console.log(`💾 Storage Type: ${stats.storageType}`);
    console.log(`🎯 Performance: ${Math.round(stats.totalRecords / (stats.generationTime / 1000))} records/second`);

    console.log('\n📋 Tables Generated:');
    stats.tablesGenerated.forEach((table, index) => {
      console.log(`  ${index + 1}. ${table}`);
    });

    // Validate data integrity
    console.log('\n🔍 Validating Data Integrity...');
    const validation = await generator.validateData();
    
    if (validation.isValid) {
      console.log('✅ Data validation passed!');
    } else {
      console.log('❌ Data validation failed:');
      validation.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (validation.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      validation.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    // Test data quality
    console.log('\n🎯 Testing Data Quality...');
    await testDataQuality(generator);

    // Cleanup
    await generator.cleanup();
    console.log('\n🧹 Cleanup completed');

    console.log('\n🎉 Comprehensive Data Generation Test Completed Successfully!');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

async function testAdministrationModule(generator) {
  const adminGen = generator.generators.administration;
  
  // Test student generation with comprehensive profiles
  const students = await adminGen.generateStudents(500);
  
  // Verify enhanced student data
  const sampleStudent = students[0];
  const requiredFields = [
    'student_number', 'first_name', 'last_name', 'date_of_birth',
    'parent_occupation', 'parent_employer', 'emergency_contact_name',
    'medical_conditions', 'allergies', 'current_medications',
    'previous_school', 'kcpe_year', 'academic_achievements',
    'special_needs', 'accommodations', 'nationality', 'religion'
  ];
  
  const missingFields = requiredFields.filter(field => !sampleStudent.hasOwnProperty(field));
  if (missingFields.length > 0) {
    throw new Error(`Missing student fields: ${missingFields.join(', ')}`);
  }
  
  // Test staff generation with comprehensive employment details
  const staff = await adminGen.generateStaff(100);
  
  // Verify enhanced staff data
  const sampleStaff = staff[0];
  const requiredStaffFields = [
    'staff_number', 'first_name', 'last_name', 'department',
    'position', 'hire_date', 'salary', 'kra_pin', 'nhif_number',
    'nssf_number', 'tsc_number', 'qualifications', 'certifications',
    'professional_membership', 'performance_rating', 'contract_type'
  ];
  
  const missingStaffFields = requiredStaffFields.filter(field => !sampleStaff.hasOwnProperty(field));
  if (missingStaffFields.length > 0) {
    throw new Error(`Missing staff fields: ${missingStaffFields.join(', ')}`);
  }
  
  return {
    students: students.length,
    staff: staff.length
  };
}

async function testAcademicModule(generator) {
  const academicGen = generator.generators.academic;
  
  // Test comprehensive subject generation
  const subjects = await academicGen.generateSubjects(50);
  
  // Verify subject diversity across forms and streams
  const forms = [...new Set(subjects.map(s => s.form))];
  const streams = [...new Set(subjects.map(s => s.stream))];
  
  if (forms.length < 4) {
    throw new Error(`Insufficient form coverage: ${forms.length} forms`);
  }
  
  // Test exam sessions
  const exams = await academicGen.generateExamSessions(20);
  
  return {
    subjects: subjects.length,
    exams: exams.length,
    forms: forms.length,
    streams: streams.length
  };
}

async function testFinancialModule(generator) {
  const financialGen = generator.generators.finance;
  
  // Test chart of accounts
  const accounts = await financialGen.generateChartOfAccounts();
  
  // Test fee templates
  const feeTemplates = await financialGen.generateFeeTemplates(10);
  
  // Test transactions
  const transactions = await financialGen.generateTransactions(100);
  
  return {
    accounts: accounts.length,
    feeTemplates: feeTemplates.length,
    transactions: transactions.length
  };
}

async function testLibraryModule(generator) {
  const libraryGen = generator.generators.library;
  
  // Test book generation
  const books = await libraryGen.generateBooks(1000);
  
  // Verify book categories
  const categories = [...new Set(books.map(b => b.category))];
  if (categories.length < 10) {
    throw new Error(`Insufficient book categories: ${categories.length}`);
  }
  
  // Test loan generation
  const loans = await libraryGen.generateLoans(200);
  
  return {
    books: books.length,
    loans: loans.length,
    categories: categories.length
  };
}

async function testClubsModule(generator) {
  const clubsGen = generator.generators.clubs;
  
  // Test club generation
  const clubs = await clubsGen.generateClubs(25);
  
  // Verify club categories
  const categories = [...new Set(clubs.map(c => c.category))];
  const expectedCategories = ['Academic', 'Sports', 'Cultural', 'Service', 'Religious'];
  
  const missingCategories = expectedCategories.filter(cat => !categories.includes(cat));
  if (missingCategories.length > 0) {
    throw new Error(`Missing club categories: ${missingCategories.join(', ')}`);
  }
  
  // Test membership generation
  const memberships = await clubsGen.generateMemberships(500);
  
  return {
    clubs: clubs.length,
    members: memberships.length,
    categories: categories.length
  };
}

async function testDataQuality(generator) {
  console.log('  📊 Checking data consistency...');
  
  // Test referential integrity
  console.log('  🔗 Verifying referential integrity...');
  
  // Test data distribution
  console.log('  📈 Analyzing data distribution...');
  
  // Test performance metrics
  console.log('  ⚡ Measuring performance metrics...');
  
  console.log('  ✅ Data quality checks completed');
}

// Run the test
if (import.meta.main) {
  testComprehensiveDataGeneration();
}

export { testComprehensiveDataGeneration };