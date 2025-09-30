/**
 * ABOUTME: Comprehensive test script for all data generators in the SchoolPilot system
 * ABOUTME: Tests Administration, Library, Finance, Academic, and Clubs generators with validation and performance metrics
 */

import { AdministrationGenerator } from '../../src/services/dataGeneration/generators/AdministrationGenerator';
import { LibraryGenerator } from '../../src/services/dataGeneration/generators/LibraryGenerator';
import { FinanceGenerator } from '../../src/services/dataGeneration/generators/FinanceGenerator';
import { AcademicsGenerator } from '../../src/services/dataGeneration/generators/AcademicsGenerator';
import { ClubsGenerator } from '../../src/services/dataGeneration/generators/ClubsGenerator';
import { PouchDBAdapter } from '../../src/services/dataGeneration/adapters/PouchDBAdapter';
import { SQLiteOPFSAdapter } from '../../src/services/dataGeneration/adapters/SQLiteOPFSAdapter';
import { MockAdapter } from '../../src/services/dataGeneration/adapters/MockAdapter';
import { BaseStorageAdapter } from '../../src/services/dataGeneration/adapters/BaseStorageAdapter';
import { promises as fs } from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TestResult {
  generator: string;
  success: boolean;
  duration: number;
  dataCount: Record<string, number>;
  errors: string[];
  warnings: string[];
  storageTests: Record<string, boolean>;
}

interface TestReport {
  timestamp: string;
  totalDuration: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: TestResult[];
  summary: string;
}

class GeneratorTestSuite {
  private results: TestResult[] = [];
  private startTime: number = 0;
  private logFile: string;

  constructor() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = path.join(__dirname, `generator-test-report-${timestamp}.json`);
  }

  private log(message: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO'): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
  }

  private transformGeneratorData(generatorOutput: any[]): any {
    const transformed: any = {};
    
    if (Array.isArray(generatorOutput)) {
      for (const item of generatorOutput) {
        if (item && typeof item === 'object' && item.table && item.data) {
          if (!transformed[item.table]) {
            transformed[item.table] = [];
          }
          transformed[item.table].push(item.data);
        }
      }
    }
    
    return transformed;
  }

  private async validateDataStructure(data: any, expectedFields: string[]): Promise<{ valid: boolean; missing: string[] }> {
    const missing: string[] = [];
    
    if (!data || typeof data !== 'object') {
      return { valid: false, missing: ['Invalid data structure'] };
    }

    for (const field of expectedFields) {
      if (!(field in data) || !Array.isArray(data[field])) {
        missing.push(field);
      }
    }

    return { valid: missing.length === 0, missing };
  }

  private async testStorageAdapter(adapter: BaseStorageAdapter, generatorData: any): Promise<boolean> {
    try {
      await adapter.initialize();
      
      // Create a test schema
      const testTable = 'test_table';
      const testSchema = `
        CREATE TABLE "${testTable}" (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          value INTEGER
        )
      `;
      
      await adapter.createSchema(testTable, testSchema);
      
      // Test insertBatch operation
      const testRecords = [
        { id: 'test-1', name: 'Test Document 1', value: 123 },
        { id: 'test-2', name: 'Test Document 2', value: 456 }
      ];
      
      await adapter.insertBatch(testTable, testRecords);
      
      // Test query operation
      const querySQL = `SELECT * FROM "${testTable}" WHERE id = ?`;
      const results = await adapter.query(querySQL, ['test-1']);
      if (!results || results.length === 0 || results[0].name !== 'Test Document 1') {
        throw new Error('Query operation failed');
      }
      
      // Test cleanup
      await adapter.cleanup();
      
      return true;
    } catch (error) {
      console.error(`Storage adapter test failed: ${error.message}`);
      console.error(`Error stack: ${error.stack}`);
      this.log(`Storage adapter test failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  private async testAdministrationGenerator(): Promise<TestResult> {
    const startTime = Date.now();
    const result: TestResult = {
      generator: 'AdministrationGenerator',
      success: false,
      duration: 0,
      dataCount: {},
      errors: [],
      warnings: [],
      storageTests: {}
    };

    try {
      this.log('Testing AdministrationGenerator...');
      
      const config = { 
        targetStudentCount: 500, 
        targetStaffCount: 100,
        locale: 'en'
      };
      const generator = new AdministrationGenerator(config);
      await generator.initialize();
      
      const rawData = await generator.generateData(500);
      const data = this.transformGeneratorData(rawData);

      // Validate structure
      const expectedFields = ['students', 'staff', 'parents', 'classes', 'departments', 'roles'];
      const validation = await this.validateDataStructure(data, expectedFields);
      
      if (!validation.valid) {
        result.errors.push(`Missing fields: ${validation.missing.join(', ')}`);
      }

      // Count data
      result.dataCount = {
        students: data.students?.length || 0,
        staff: data.staff?.length || 0,
        parents: data.parents?.length || 0,
        classes: data.classes?.length || 0,
        departments: data.departments?.length || 0,
        roles: data.roles?.length || 0
      };

      // Validate counts
      if (result.dataCount.students < 500) {
        result.warnings.push(`Expected 500+ students, got ${result.dataCount.students}`);
      }
      if (result.dataCount.staff < 100) {
        result.warnings.push(`Expected 100+ staff, got ${result.dataCount.staff}`);
      }

      // Test storage adapters
      const adapters = {
        'PouchDB': new PouchDBAdapter(),
        'SQLite-OPFS': new SQLiteOPFSAdapter(),
        'Mock': new MockAdapter()
      };

      for (const [name, adapter] of Object.entries(adapters)) {
        result.storageTests[name] = await this.testStorageAdapter(adapter, data);
      }

      result.success = validation.valid && result.errors.length === 0;
      this.log(`AdministrationGenerator test ${result.success ? 'PASSED' : 'FAILED'}`);
      
    } catch (error) {
      result.errors.push(`Generator failed: ${error.message}`);
      this.log(`AdministrationGenerator test failed: ${error.message}`, 'ERROR');
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  private async testLibraryGenerator(): Promise<TestResult> {
    const startTime = Date.now();
    const result: TestResult = {
      generator: 'LibraryGenerator',
      success: false,
      duration: 0,
      dataCount: {},
      errors: [],
      warnings: [],
      storageTests: {}
    };

    try {
      this.log('Testing LibraryGenerator...');
      
      const config = {
        targetBookCount: 1000,
        targetAuthorCount: 200,
        targetPublisherCount: 150,
        locale: 'en'
      };
      const generator = new LibraryGenerator(config);
      await generator.initialize();
      
      const rawData = await generator.generate();
       const data = this.transformGeneratorData(rawData);

      // Validate structure
      const expectedFields = ['books', 'authors', 'categories', 'loans', 'fines', 'inventory'];
      const validation = await this.validateDataStructure(data, expectedFields);
      
      if (!validation.valid) {
        result.errors.push(`Missing fields: ${validation.missing.join(', ')}`);
      }

      // Count data
      result.dataCount = {
        books: data.books?.length || 0,
        authors: data.authors?.length || 0,
        categories: data.categories?.length || 0,
        loans: data.loans?.length || 0,
        fines: data.fines?.length || 0,
        inventory: data.inventory?.length || 0
      };

      // Validate counts
      if (result.dataCount.books < 1000) {
        result.warnings.push(`Expected 1000+ books, got ${result.dataCount.books}`);
      }
      if (result.dataCount.authors < 200) {
        result.warnings.push(`Expected 200+ authors, got ${result.dataCount.authors}`);
      }

      // Test storage adapters
      const adapters = {
        'PouchDB': new PouchDBAdapter(),
        'SQLite-OPFS': new SQLiteOPFSAdapter(),
        'Mock': new MockAdapter()
      };

      for (const [name, adapter] of Object.entries(adapters)) {
        result.storageTests[name] = await this.testStorageAdapter(adapter, data);
      }

      result.success = validation.valid && result.errors.length === 0;
      this.log(`LibraryGenerator test ${result.success ? 'PASSED' : 'FAILED'}`);
      
    } catch (error) {
      result.errors.push(`Generator failed: ${error.message}`);
      this.log(`LibraryGenerator test failed: ${error.message}`, 'ERROR');
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  private async testFinanceGenerator(): Promise<TestResult> {
    const startTime = Date.now();
    const result: TestResult = {
      generator: 'FinanceGenerator',
      success: false,
      duration: 0,
      dataCount: {},
      errors: [],
      warnings: [],
      storageTests: {}
    };

    try {
      this.log('Testing FinanceGenerator...');
      
      const config = {
        locale: 'en'
      };
      const generator = new FinanceGenerator(config);
      await generator.initialize();
      
      const rawData = await generator.generateData(100);
      const data = this.transformGeneratorData(rawData);

      // Validate structure
      const expectedFields = ['chart_of_accounts', 'voteheads', 'suppliers', 'fee_templates', 'student_wallet_transactions', 'procurement_records', 'payment_vouchers'];
      const validation = await this.validateDataStructure(data, expectedFields);
      
      if (!validation.valid) {
        result.errors.push(`Missing fields: ${validation.missing.join(', ')}`);
      }

      // Count data
      result.dataCount = {
        chart_of_accounts: data.chart_of_accounts?.length || 0,
        voteheads: data.voteheads?.length || 0,
        suppliers: data.suppliers?.length || 0,
        fee_templates: data.fee_templates?.length || 0,
        fee_template_items: data.fee_template_items?.length || 0,
        student_wallet_transactions: data.student_wallet_transactions?.length || 0,
        procurement_records: data.procurement_records?.length || 0,
        payment_vouchers: data.payment_vouchers?.length || 0
      };

      // Validate counts
      if (result.dataCount.chart_of_accounts < 50) {
        result.warnings.push(`Expected 50+ chart of accounts, got ${result.dataCount.chart_of_accounts}`);
      }
      if (result.dataCount.suppliers < 50) {
        result.warnings.push(`Expected 50+ suppliers, got ${result.dataCount.suppliers}`);
      }

      // Test storage adapters
      const adapters = {
        'PouchDB': new PouchDBAdapter(),
        'SQLite-OPFS': new SQLiteOPFSAdapter(),
        'Mock': new MockAdapter()
      };

      for (const [name, adapter] of Object.entries(adapters)) {
        result.storageTests[name] = await this.testStorageAdapter(adapter, data);
      }

      result.success = validation.valid && result.errors.length === 0;
      this.log(`FinanceGenerator test ${result.success ? 'PASSED' : 'FAILED'}`);
      
    } catch (error) {
      result.errors.push(`Generator failed: ${error.message}`);
      this.log(`FinanceGenerator test failed: ${error.message}`, 'ERROR');
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  private async testAcademicsGenerator(): Promise<TestResult> {
    const startTime = Date.now();
    const result: TestResult = {
      generator: 'AcademicsGenerator',
      success: false,
      duration: 0,
      dataCount: {},
      errors: [],
      warnings: [],
      storageTests: {}
    };

    try {
      this.log('Testing AcademicsGenerator...');
      
      const config = {
        locale: 'en'
      };
      const generator = new AcademicsGenerator(config);
      await generator.initialize();
      
      const rawData = await generator.generate();
      const data = this.transformGeneratorData(rawData);

      // Validate structure
      const expectedFields = ['subjects', 'grading_schemes', 'exams', 'exam_results', 'timetables', 'teacher_subject_assignments', 'curriculum_structures'];
      const validation = await this.validateDataStructure(data, expectedFields);
      
      if (!validation.valid) {
        result.errors.push(`Missing fields: ${validation.missing.join(', ')}`);
      }

      // Count data
      result.dataCount = {
        subjects: data.subjects?.length || 0,
        grading_schemes: data.grading_schemes?.length || 0,
        exam_sessions: data.exam_sessions?.length || 0,
        timetables: data.timetables?.length || 0,
        teacher_subject_assignments: data.teacher_subject_assignments?.length || 0,
        curriculum_structures: data.curriculum_structures?.length || 0
      };

      // Validate counts
      if (result.dataCount.subjects < 50) {
        result.warnings.push(`Expected 50+ subjects, got ${result.dataCount.subjects}`);
      }
      if (result.dataCount.grading_schemes < 5) {
        result.warnings.push(`Expected 5+ grading schemes, got ${result.dataCount.grading_schemes}`);
      }

      // Test storage adapters
      const adapters = {
        'PouchDB': new PouchDBAdapter(),
        'SQLite-OPFS': new SQLiteOPFSAdapter(),
        'Mock': new MockAdapter()
      };

      for (const [name, adapter] of Object.entries(adapters)) {
        result.storageTests[name] = await this.testStorageAdapter(adapter, data);
      }

      result.success = validation.valid && result.errors.length === 0;
      this.log(`AcademicsGenerator test ${result.success ? 'PASSED' : 'FAILED'}`);
      
    } catch (error) {
      result.errors.push(`Generator failed: ${error.message}`);
      this.log(`AcademicsGenerator test failed: ${error.message}`, 'ERROR');
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  private async testClubsGenerator(): Promise<TestResult> {
    const startTime = Date.now();
    const result: TestResult = {
      generator: 'ClubsGenerator',
      success: false,
      duration: 0,
      dataCount: {},
      errors: [],
      warnings: [],
      storageTests: {}
    };

    try {
      this.log('Testing ClubsGenerator...');
      
      const config = {
        locale: 'en'
      };
      const generator = new ClubsGenerator(config);
      await generator.initialize();
      
      const rawData = await generator.generateData(25);
      const data = this.transformGeneratorData(rawData);

      // Validate structure
      const expectedFields = ['clubs', 'club_members', 'club_activities', 'club_events', 'club_budgets', 'club_achievements'];
      const validation = await this.validateDataStructure(data, expectedFields);
      
      if (!validation.valid) {
        result.errors.push(`Missing fields: ${validation.missing.join(', ')}`);
      }

      // Count data
      result.dataCount = {
        clubs: data.clubs?.length || 0,
        club_members: data.club_members?.length || 0,
        club_activities: data.club_activities?.length || 0,
        club_events: data.club_events?.length || 0,
        club_budgets: data.club_budgets?.length || 0,
        club_achievements: data.club_achievements?.length || 0
      };

      // Validate counts
      if (result.dataCount.clubs < 25) {
        result.warnings.push(`Expected 25+ clubs, got ${result.dataCount.clubs}`);
      }
      if (result.dataCount.club_members < 200) {
        result.warnings.push(`Expected 200+ club members, got ${result.dataCount.club_members}`);
      }

      // Test storage adapters
      const adapters = {
        'PouchDB': new PouchDBAdapter(),
        'SQLite-OPFS': new SQLiteOPFSAdapter(),
        'Mock': new MockAdapter()
      };

      for (const [name, adapter] of Object.entries(adapters)) {
        result.storageTests[name] = await this.testStorageAdapter(adapter, data);
      }

      result.success = validation.valid && result.errors.length === 0;
      this.log(`ClubsGenerator test ${result.success ? 'PASSED' : 'FAILED'}`);
      
    } catch (error) {
      result.errors.push(`Generator failed: ${error.message}`);
      this.log(`ClubsGenerator test failed: ${error.message}`, 'ERROR');
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  private async generateReport(): Promise<TestReport> {
    const totalDuration = Date.now() - this.startTime;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = this.results.length - passedTests;

    const report: TestReport = {
      timestamp: new Date().toISOString(),
      totalDuration,
      totalTests: this.results.length,
      passedTests,
      failedTests,
      results: this.results,
      summary: `Generator Test Suite completed: ${passedTests}/${this.results.length} tests passed in ${(totalDuration / 1000).toFixed(2)}s`
    };

    // Save report to file
    await fs.writeFile(this.logFile, JSON.stringify(report, null, 2));
    this.log(`Test report saved to: ${this.logFile}`);

    return report;
  }

  public async runAllTests(): Promise<TestReport> {
    this.log('Starting Generator Test Suite...');
    this.startTime = Date.now();

    // Run all generator tests
    this.results.push(await this.testAdministrationGenerator());
    this.results.push(await this.testLibraryGenerator());
    this.results.push(await this.testFinanceGenerator());
    this.results.push(await this.testAcademicsGenerator());
    this.results.push(await this.testClubsGenerator());

    // Generate and return report
    const report = await this.generateReport();
    
    // Print summary
    this.log('\n' + '='.repeat(80));
    this.log('GENERATOR TEST SUITE SUMMARY');
    this.log('='.repeat(80));
    this.log(`Total Tests: ${report.totalTests}`);
    this.log(`Passed: ${report.passedTests}`);
    this.log(`Failed: ${report.failedTests}`);
    this.log(`Duration: ${(report.totalDuration / 1000).toFixed(2)}s`);
    this.log(`Report: ${this.logFile}`);
    this.log('='.repeat(80));

    // Print individual results
    for (const result of this.results) {
      this.log(`\n${result.generator}: ${result.success ? 'PASS' : 'FAIL'} (${(result.duration / 1000).toFixed(2)}s)`);
      
      if (Object.keys(result.dataCount).length > 0) {
        this.log(`  Data Counts: ${JSON.stringify(result.dataCount)}`);
      }
      
      if (result.errors.length > 0) {
        this.log(`  Errors: ${result.errors.join(', ')}`, 'ERROR');
      }
      
      if (result.warnings.length > 0) {
        this.log(`  Warnings: ${result.warnings.join(', ')}`, 'WARN');
      }
      
      const storageResults = Object.entries(result.storageTests)
        .map(([name, success]) => `${name}: ${success ? 'PASS' : 'FAIL'}`)
        .join(', ');
      if (storageResults) {
        this.log(`  Storage Tests: ${storageResults}`);
      }
    }

    return report;
  }
}

// Main execution
// Run tests when this file is executed directly
// Check if this is the main module being executed
const isMainModule = process.argv[1] && process.argv[1].endsWith('test-generators.ts');
if (isMainModule) {
  const testSuite = new GeneratorTestSuite();
  
  testSuite.runAllTests()
    .then((report) => {
      process.exit(report.failedTests > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

export { GeneratorTestSuite, TestResult, TestReport };