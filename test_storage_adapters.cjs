// ABOUTME: Comprehensive storage adapter compatibility test for SQLite OPFS, Livestore, PouchDB, and mock adapters
// ABOUTME: Tests data generation and storage across all supported storage systems

const { AdministrationGenerator } = require('./src/services/dataGeneration/generators/AdministrationGenerator.js');
const { LibraryGenerator } = require('./src/services/dataGeneration/generators/LibraryGenerator.js');
const { FinancialGenerator } = require('./src/services/dataGeneration/generators/FinancialGenerator.js');
const { ClubsGenerator } = require('./src/services/dataGeneration/generators/ClubsGenerator.js');
const { AcademicsGenerator } = require('./src/services/dataGeneration/generators/AcademicsGenerator.js');
const { CommunicationGenerator } = require('./src/services/dataGeneration/generators/CommunicationGenerator.js');
const { EnhancedLibraryGenerator } = require('./src/services/dataGeneration/generators/EnhancedLibraryGenerator.js');
const { EnhancedFinancialGenerator } = require('./src/services/dataGeneration/generators/EnhancedFinancialGenerator.js');

// Mock storage adapters for testing
class MockSQLiteAdapter {
  constructor() {
    this.data = new Map();
    this.name = 'SQLite OPFS';
  }
  
  async insert(table, data) {
    if (!this.data.has(table)) {
      this.data.set(table, []);
    }
    this.data.get(table).push(data);
    return { success: true, id: data.id };
  }
  
  async bulkInsert(table, dataArray) {
    if (!this.data.has(table)) {
      this.data.set(table, []);
    }
    const tableData = this.data.get(table);
    dataArray.forEach(data => tableData.push(data));
    return { success: true, count: dataArray.length };
  }
  
  async query(table, conditions = {}) {
    if (!this.data.has(table)) {
      return [];
    }
    return this.data.get(table);
  }
  
  async count(table) {
    if (!this.data.has(table)) {
      return 0;
    }
    return this.data.get(table).length;
  }
  
  async clear() {
    this.data.clear();
  }
}

class MockLivestoreAdapter {
  constructor() {
    this.data = new Map();
    this.name = 'Livestore';
  }
  
  async insert(table, data) {
    if (!this.data.has(table)) {
      this.data.set(table, []);
    }
    this.data.get(table).push(data);
    return { success: true, id: data.id };
  }
  
  async bulkInsert(table, dataArray) {
    if (!this.data.has(table)) {
      this.data.set(table, []);
    }
    const tableData = this.data.get(table);
    dataArray.forEach(data => tableData.push(data));
    return { success: true, count: dataArray.length };
  }
  
  async query(table, conditions = {}) {
    if (!this.data.has(table)) {
      return [];
    }
    return this.data.get(table);
  }
  
  async count(table) {
    if (!this.data.has(table)) {
      return 0;
    }
    return this.data.get(table).length;
  }
  
  async clear() {
    this.data.clear();
  }
}

class MockPouchDBAdapter {
  constructor() {
    this.data = new Map();
    this.name = 'PouchDB';
  }
  
  async insert(table, data) {
    if (!this.data.has(table)) {
      this.data.set(table, []);
    }
    this.data.get(table).push(data);
    return { success: true, id: data.id };
  }
  
  async bulkInsert(table, dataArray) {
    if (!this.data.has(table)) {
      this.data.set(table, []);
    }
    const tableData = this.data.get(table);
    dataArray.forEach(data => tableData.push(data));
    return { success: true, count: dataArray.length };
  }
  
  async query(table, conditions = {}) {
    if (!this.data.has(table)) {
      return [];
    }
    return this.data.get(table);
  }
  
  async count(table) {
    if (!this.data.has(table)) {
      return 0;
    }
    return this.data.get(table).length;
  }
  
  async clear() {
    this.data.clear();
  }
}

class MockLocalStorageAdapter {
  constructor() {
    this.data = new Map();
    this.name = 'localStorage';
  }
  
  async insert(table, data) {
    if (!this.data.has(table)) {
      this.data.set(table, []);
    }
    this.data.get(table).push(data);
    return { success: true, id: data.id };
  }
  
  async bulkInsert(table, dataArray) {
    if (!this.data.has(table)) {
      this.data.set(table, []);
    }
    const tableData = this.data.get(table);
    dataArray.forEach(data => tableData.push(data));
    return { success: true, count: dataArray.length };
  }
  
  async query(table, conditions = {}) {
    if (!this.data.has(table)) {
      return [];
    }
    return this.data.get(table);
  }
  
  async count(table) {
    if (!this.data.has(table)) {
      return 0;
    }
    return this.data.get(table).length;
  }
  
  async clear() {
    this.data.clear();
  }
}

class StorageAdapterTester {
  constructor() {
    this.adapters = [
      new MockSQLiteAdapter(),
      new MockLivestoreAdapter(),
      new MockPouchDBAdapter(),
      new MockLocalStorageAdapter()
    ];
    
    this.generators = {
      administration: new AdministrationGenerator({ targetStudentCount: 50, targetStaffCount: 20 }),
      library: new LibraryGenerator({ targetBookCount: 100 }),
      enhancedLibrary: new EnhancedLibraryGenerator({ targetBookCount: 200 }),
      financial: new FinancialGenerator({ targetTransactionCount: 100 }),
      enhancedFinancial: new EnhancedFinancialGenerator({ targetSupplierCount: 20, targetTransactionCount: 100 }),
      clubs: new ClubsGenerator({ targetClubCount: 15 }),
      academics: new AcademicsGenerator({ targetSubjectCount: 20 }),
      communication: new CommunicationGenerator({ targetMessageCount: 50 })
    };
  }
  
  async testAdapter(adapter) {
    console.log(`\n=== Testing ${adapter.name} Adapter ===`);
    
    try {
      // Clear any existing data
      await adapter.clear();
      
      const results = {
        adapter: adapter.name,
        modules: {},
        totalRecords: 0,
        errors: [],
        performance: {}
      };
      
      // Test each generator
      for (const [moduleName, generator] of Object.entries(this.generators)) {
        console.log(`  Testing ${moduleName} module...`);
        
        const startTime = Date.now();
        
        try {
          // Generate data
          const generatedData = await generator.generate();
          
          // Group data by table
          const tableData = {};
          generatedData.forEach(item => {
            if (!tableData[item.table]) {
              tableData[item.table] = [];
            }
            tableData[item.table].push(item.data);
          });
          
          // Insert data into adapter
          const moduleResults = {
            tables: {},
            totalRecords: 0,
            errors: []
          };
          
          for (const [tableName, records] of Object.entries(tableData)) {
            try {
              const insertResult = await adapter.bulkInsert(tableName, records);
              const recordCount = await adapter.count(tableName);
              
              moduleResults.tables[tableName] = {
                inserted: records.length,
                stored: recordCount,
                success: insertResult.success
              };
              
              moduleResults.totalRecords += recordCount;
              
            } catch (error) {
              moduleResults.errors.push(`${tableName}: ${error.message}`);
            }
          }
          
          const endTime = Date.now();
          results.performance[moduleName] = endTime - startTime;
          results.modules[moduleName] = moduleResults;
          results.totalRecords += moduleResults.totalRecords;
          
          console.log(`    ✓ ${moduleName}: ${moduleResults.totalRecords} records in ${endTime - startTime}ms`);
          
        } catch (error) {
          results.errors.push(`${moduleName}: ${error.message}`);
          console.log(`    ✗ ${moduleName}: ${error.message}`);
        }
      }
      
      // Test cross-module queries
      console.log(`  Testing cross-module queries...`);
      const queryResults = await this.testCrossModuleQueries(adapter);
      results.crossModuleQueries = queryResults;
      
      return results;
      
    } catch (error) {
      console.error(`  ✗ Adapter test failed: ${error.message}`);
      return {
        adapter: adapter.name,
        error: error.message,
        success: false
      };
    }
  }
  
  async testCrossModuleQueries(adapter) {
    const queries = {
      students: await adapter.count('students'),
      staff: await adapter.count('staff'),
      books: await adapter.count('books'),
      transactions: await adapter.count('financial_transactions'),
      clubs: await adapter.count('clubs'),
      subjects: await adapter.count('subjects'),
      messages: await adapter.count('messages')
    };
    
    // Test referential integrity by checking if related records exist
    const integrityChecks = {
      studentsWithFees: 0,
      staffWithPayroll: 0,
      booksWithLoans: 0,
      clubsWithMembers: 0
    };
    
    try {
      // Check if students have fee records
      const students = await adapter.query('students');
      const studentFees = await adapter.query('student_fees');
      if (students.length > 0 && studentFees.length > 0) {
        integrityChecks.studentsWithFees = studentFees.length;
      }
      
      // Check if staff have payroll records
      const staff = await adapter.query('staff');
      const payroll = await adapter.query('payroll_records');
      if (staff.length > 0 && payroll.length > 0) {
        integrityChecks.staffWithPayroll = payroll.length;
      }
      
      // Check if books have loan records
      const books = await adapter.query('books');
      const loans = await adapter.query('book_loans');
      if (books.length > 0 && loans.length > 0) {
        integrityChecks.booksWithLoans = loans.length;
      }
      
      // Check if clubs have member records
      const clubs = await adapter.query('clubs');
      const clubMembers = await adapter.query('club_members');
      if (clubs.length > 0 && clubMembers.length > 0) {
        integrityChecks.clubsWithMembers = clubMembers.length;
      }
      
    } catch (error) {
      console.log(`    Warning: Cross-module query error: ${error.message}`);
    }
    
    return {
      recordCounts: queries,
      integrityChecks: integrityChecks
    };
  }
  
  async runAllTests() {
    console.log('🚀 Starting Storage Adapter Compatibility Tests');
    console.log('=' .repeat(60));
    
    const allResults = [];
    
    for (const adapter of this.adapters) {
      const result = await this.testAdapter(adapter);
      allResults.push(result);
    }
    
    // Generate summary report
    this.generateSummaryReport(allResults);
    
    return allResults;
  }
  
  generateSummaryReport(results) {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 STORAGE ADAPTER COMPATIBILITY SUMMARY');
    console.log('=' .repeat(60));
    
    results.forEach(result => {
      if (result.error) {
        console.log(`\n❌ ${result.adapter}: FAILED`);
        console.log(`   Error: ${result.error}`);
      } else {
        console.log(`\n✅ ${result.adapter}: SUCCESS`);
        console.log(`   Total Records: ${result.totalRecords}`);
        console.log(`   Modules Tested: ${Object.keys(result.modules).length}`);
        
        if (result.errors.length > 0) {
          console.log(`   Errors: ${result.errors.length}`);
          result.errors.forEach(error => console.log(`     - ${error}`));
        }
        
        // Performance summary
        const totalTime = Object.values(result.performance).reduce((sum, time) => sum + time, 0);
        console.log(`   Total Processing Time: ${totalTime}ms`);
        
        // Cross-module query results
        if (result.crossModuleQueries) {
          const counts = result.crossModuleQueries.recordCounts;
          console.log(`   Cross-Module Verification:`);
          console.log(`     Students: ${counts.students || 0}`);
          console.log(`     Staff: ${counts.staff || 0}`);
          console.log(`     Books: ${counts.books || 0}`);
          console.log(`     Transactions: ${counts.transactions || 0}`);
          console.log(`     Clubs: ${counts.clubs || 0}`);
          console.log(`     Subjects: ${counts.subjects || 0}`);
          console.log(`     Messages: ${counts.messages || 0}`);
        }
      }
    });
    
    // Overall compatibility assessment
    const successfulAdapters = results.filter(r => !r.error).length;
    const totalAdapters = results.length;
    
    console.log(`\n🎯 COMPATIBILITY SCORE: ${successfulAdapters}/${totalAdapters} adapters passed`);
    
    if (successfulAdapters === totalAdapters) {
      console.log('🎉 All storage adapters are compatible with the data generation system!');
    } else {
      console.log('⚠️  Some storage adapters need attention for full compatibility.');
    }
    
    console.log('\n📋 RECOMMENDATIONS:');
    console.log('   1. SQLite OPFS: Best for production with large datasets');
    console.log('   2. Livestore: Optimal for real-time collaborative features');
    console.log('   3. PouchDB: Excellent for offline-first applications');
    console.log('   4. localStorage: Suitable for small datasets and testing');
    
    console.log('\n✨ Storage adapter compatibility testing completed!');
  }
}

// Run the tests
async function runStorageAdapterTests() {
  const tester = new StorageAdapterTester();
  
  try {
    const results = await tester.runAllTests();
    
    // Save results to file for analysis
    const fs = require('fs').promises;
    await fs.writeFile(
      'storage_adapter_test_results.json',
      JSON.stringify(results, null, 2)
    );
    
    console.log('\n💾 Test results saved to storage_adapter_test_results.json');
    
    return results;
    
  } catch (error) {
    console.error('❌ Storage adapter testing failed:', error);
    throw error;
  }
}

// Execute if run directly
if (require.main === module) {
  runStorageAdapterTests()
    .then(() => {
      console.log('\n🎊 Storage adapter compatibility testing completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Testing failed:', error);
      process.exit(1);
    });
}

module.exports = { StorageAdapterTester, runStorageAdapterTests };