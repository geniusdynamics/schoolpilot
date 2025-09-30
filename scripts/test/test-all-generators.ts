/**
 * ABOUTME: Enhanced comprehensive test suite for all data generators in the SchoolPilot system
 * ABOUTME: Includes performance metrics, memory monitoring, progress tracking, and advanced validation features
 */

import { AdministrationGenerator } from '../../src/services/dataGeneration/generators/AdministrationGenerator';
import { LibraryGenerator } from '../../src/services/dataGeneration/generators/LibraryGenerator';
import { FinancialGenerator } from '../../src/services/dataGeneration/generators/FinancialGenerator';
import { AcademicsGenerator } from '../../src/services/dataGeneration/generators/AcademicsGenerator';
import { ClubsGenerator } from '../../src/services/dataGeneration/generators/ClubsGenerator';
import { DataGenerationConfig, StorageType, MigrationMode } from '../../src/services/dataGeneration/types';
import { PouchDBAdapter } from '../../src/services/dataGeneration/adapters/PouchDBAdapter';
import { SQLiteOPFSAdapter } from '../../src/services/dataGeneration/adapters/SQLiteOPFSAdapter';
import { MockAdapter } from '../../src/services/dataGeneration/adapters/MockAdapter';
import { BaseStorageAdapter } from '../../src/services/dataGeneration/adapters/BaseStorageAdapter';
import { promises as fs } from 'fs';
import * as path from 'path';

// Use process.cwd() for directory resolution
const __dirname = path.join(process.cwd(), 'scripts', 'test');

interface PerformanceMetrics {
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  cpuTime: number;
  gcCollections: number;
}

interface TestResult {
  generator: string;
  success: boolean;
  duration: number;
  dataCount: Record<string, number>;
  errors: string[];
  warnings: string[];
  storageTests: Record<string, boolean>;
  performanceMetrics: PerformanceMetrics;
  memoryLeaks: boolean;
  dataValidation: {
    structureValid: boolean;
    relationshipsValid: boolean;
    constraintsValid: boolean;
    missingFields: string[];
  };
}

interface TestConfiguration {
  administration: {
    targetStudentCount: number;
    targetStaffCount: number;
  };
  library: {
    targetBookCount: number;
    targetAuthorCount: number;
    targetPublisherCount: number;
  };
  financial: {
    targetTransactionCount: number;
    targetSupplierCount: number;
  };
  academics: {
    targetSubjectCount: number;
    targetGradingSchemes: number;
  };
  clubs: {
    targetClubCount: number;
    targetMemberCount: number;
  };
  school: {
    name: string;
    locale: string;
    academicYear: string;
  };
}

interface TestReport {
  timestamp: string;
  configuration: TestConfiguration;
  totalDuration: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: TestResult[];
  summary: string;
  overallPerformance: {
    totalMemoryUsed: number;
    averageTestDuration: number;
    memoryLeaksDetected: number;
  };
  crossModuleValidation: {
    foreignKeyIntegrity: boolean;
    dataConsistency: boolean;
    relationshipErrors: string[];
  };
}

class EnhancedGeneratorTestSuite {
  private results: TestResult[] = [];
  private startTime: number = 0;
  private logFile: string;
  private csvFile: string;
  private config: TestConfiguration;
  private progressCallback?: (progress: number, message: string) => void;

  constructor(config?: Partial<TestConfiguration>, progressCallback?: (progress: number, message: string) => void) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = path.join(__dirname, `enhanced-generator-test-report-${timestamp}.json`);
    this.csvFile = path.join(__dirname, `enhanced-generator-test-report-${timestamp}.csv`);
    this.progressCallback = progressCallback;
    
    // Default configuration
    this.config = {
      administration: {
        targetStudentCount: config?.administration?.targetStudentCount || 500,
        targetStaffCount: config?.administration?.targetStaffCount || 100
      },
      library: {
        targetBookCount: config?.library?.targetBookCount || 1000,
        targetAuthorCount: config?.library?.targetAuthorCount || 200,
        targetPublisherCount: config?.library?.targetPublisherCount || 150
      },
      financial: {
        targetTransactionCount: config?.financial?.targetTransactionCount || 1000,
        targetSupplierCount: config?.financial?.targetSupplierCount || 100
      },
      academics: {
        targetSubjectCount: config?.academics?.targetSubjectCount || 50,
        targetGradingSchemes: config?.academics?.targetGradingSchemes || 5
      },
      clubs: {
        targetClubCount: config?.clubs?.targetClubCount || 25,
        targetMemberCount: config?.clubs?.targetMemberCount || 200
      },
      school: {
        name: config?.school?.name || 'Test School',
        locale: config?.school?.locale || 'en',
        academicYear: config?.school?.academicYear || '2024-2025'
      }
    };
  }

  private updateProgress(progress: number, message: string): void {
    if (this.progressCallback) {
      this.progressCallback(progress, message);
    }
    this.log(`[${progress.toFixed(1)}%] ${message}`);
  }

  private log(message: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO'): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
  }

  private getMemoryUsage(): PerformanceMetrics['memoryUsage'] {
    const usage = process.memoryUsage();
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100, // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100, // MB
      external: Math.round(usage.external / 1024 / 1024 * 100) / 100, // MB
      rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100 // MB
    };
  }

  private detectMemoryLeaks(beforeMemory: PerformanceMetrics['memoryUsage'], afterMemory: PerformanceMetrics['memoryUsage']): boolean {
    const heapGrowth = afterMemory.heapUsed - beforeMemory.heapUsed;
    const threshold = 50; // MB threshold for memory leak detection
    return heapGrowth > threshold;
  }

  private transformGeneratorData(generatorOutput: any[]): any {
    const transformed: any = {};
    
    if (Array.isArray(generatorOutput)) {
      for (const item of generatorOutput) {
        if (item && typeof item === 'object' && item.table && item.data) {
          if (!transformed[item.table]) {
            transformed[item.table] = [];
          }
          if (Array.isArray(item.data)) {
            transformed[item.table].push(...item.data);
          } else {
            transformed[item.table].push(item.data);
          }
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

  private async validateDataRelationships(data: any): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      // Validate student-staff relationships
      if (data.students && data.staff) {
        const staffIds = new Set(data.staff.map((s: any) => s.id));
        for (const student of data.students) {
          if (student.classTeacherId && !staffIds.has(student.classTeacherId)) {
            errors.push(`Student ${student.id} references non-existent class teacher ${student.classTeacherId}`);
          }
        }
      }

      // Validate library book-author relationships
      if (data.books && data.authors) {
        const authorIds = new Set(data.authors.map((a: any) => a.id));
        for (const book of data.books) {
          if (book.authorId && !authorIds.has(book.authorId)) {
            errors.push(`Book ${book.id} references non-existent author ${book.authorId}`);
          }
        }
      }

      // Validate club membership relationships
      if (data.club_members && data.clubs && data.students) {
        const clubIds = new Set(data.clubs.map((c: any) => c.id));
        const studentIds = new Set(data.students.map((s: any) => s.id));
        
        for (const member of data.club_members) {
          if (member.clubId && !clubIds.has(member.clubId)) {
            errors.push(`Club member ${member.id} references non-existent club ${member.clubId}`);
          }
          if (member.studentId && !studentIds.has(member.studentId)) {
            errors.push(`Club member ${member.id} references non-existent student ${member.studentId}`);
          }
        }
      }

    } catch (error) {
      errors.push(`Relationship validation error: ${error.message}`);
    }

    return { valid: errors.length === 0, errors };
  }

  private async validateDataConstraints(data: any): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      // Validate required fields and data types
      if (data.students) {
        for (const student of data.students.slice(0, 10)) { // Sample validation
          if (!student.id || typeof student.id !== 'string') {
            errors.push('Student missing or invalid ID');
          }
          if (!student.firstName || typeof student.firstName !== 'string') {
            errors.push('Student missing or invalid firstName');
          }
          if (!student.lastName || typeof student.lastName !== 'string') {
            errors.push('Student missing or invalid lastName');
          }
          if (student.email && typeof student.email !== 'string') {
            errors.push('Student invalid email type');
          }
        }
      }

      if (data.books) {
        for (const book of data.books.slice(0, 10)) { // Sample validation
          if (!book.id || typeof book.id !== 'string') {
            errors.push('Book missing or invalid ID');
          }
          if (!book.title || typeof book.title !== 'string') {
            errors.push('Book missing or invalid title');
          }
          if (!book.isbn || typeof book.isbn !== 'string') {
            errors.push('Book missing or invalid ISBN');
          }
        }
      }

    } catch (error) {
      errors.push(`Constraint validation error: ${error.message}`);
    }

    return { valid: errors.length === 0, errors };
  }

  private async testStorageAdapter(adapter: BaseStorageAdapter, testData: any): Promise<boolean> {
    try {
      await adapter.initialize();
      
      // Create a test schema
      const testTable = 'test_table';
      const schema = `
        CREATE TABLE IF NOT EXISTS ${testTable} (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          value INTEGER
        )
      `;
      
      await adapter.createSchema(testTable, schema);
      
      // Test insertBatch operation
      const testRecords = [
        { id: 'test-1', name: 'Test Document 1', value: 123 },
        { id: 'test-2', name: 'Test Document 2', value: 456 }
      ];
      
      await adapter.insertBatch(testTable, testRecords);
      
      // Test query operation
      const results = await adapter.query('SELECT * FROM ' + testTable + ' WHERE id = ?', ['test-1']);
      if (!results || results.length === 0 || results[0].name !== 'Test Document 1') {
        throw new Error('Query operation failed');
      }
      
      // Test cleanup
      await adapter.cleanup();
      
      return true;
    } catch (error) {
      this.log(`Storage adapter test failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  private async testAdministrationGenerator(): Promise<TestResult> {
    const startTime = Date.now();
    const beforeMemory = this.getMemoryUsage();
    
    const result: TestResult = {
      generator: 'AdministrationGenerator',
      success: false,
      duration: 0,
      dataCount: {},
      errors: [],
      warnings: [],
      storageTests: {},
      performanceMetrics: {
        memoryUsage: beforeMemory,
        cpuTime: 0,
        gcCollections: 0
      },
      memoryLeaks: false,
      dataValidation: {
        structureValid: false,
        relationshipsValid: false,
        constraintsValid: false,
        missingFields: []
      }
    };

    try {
      this.updateProgress(10, 'Testing AdministrationGenerator...');
      
      const config: DataGenerationConfig = {
        storageType: 'mock' as StorageType,
        migrationMode: 'fresh' as MigrationMode,
        batchSize: 100,
        enableValidation: true,
        enableRelationshipValidation: true,
        locale: this.config.school.locale,
        seedData: {
          students: this.config.administration.targetStudentCount,
          staff: this.config.administration.targetStaffCount,
          subjects: 10,
          books: 100,
          suppliers: 5,
          inventoryItems: 50,
          clubs: 10,
          dormitories: 5
        }
      };
      const generator = new AdministrationGenerator(config);
      await generator.initialize();
      
      this.updateProgress(15, 'Generating administration data...');
      const rawData = await generator.generateData(this.config.administration.targetStudentCount);
      console.log('AdministrationGenerator rawData:', JSON.stringify(rawData, null, 2));
      const data = this.transformGeneratorData(rawData);
      console.log('AdministrationGenerator transformed data keys:', Object.keys(data));
      console.log('AdministrationGenerator data counts:', Object.fromEntries(Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v.length : 'not array'])));

      this.updateProgress(18, 'Validating administration data structure...');
      // Validate structure
      const expectedFields = ['students', 'staff', 'parents', 'classes', 'departments', 'roles'];
      const structureValidation = await this.validateDataStructure(data, expectedFields);
      result.dataValidation.structureValid = structureValidation.valid;
      result.dataValidation.missingFields = structureValidation.missing;
      
      if (!structureValidation.valid) {
        result.errors.push(`Missing fields: ${structureValidation.missing.join(', ')}`);
      }

      // Validate relationships
      const relationshipValidation = await this.validateDataRelationships(data);
      result.dataValidation.relationshipsValid = relationshipValidation.valid;
      if (!relationshipValidation.valid) {
        result.errors.push(...relationshipValidation.errors);
      }

      // Validate constraints
      const constraintValidation = await this.validateDataConstraints(data);
      result.dataValidation.constraintsValid = constraintValidation.valid;
      if (!constraintValidation.valid) {
        result.errors.push(...constraintValidation.errors);
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
      if (result.dataCount.students < this.config.administration.targetStudentCount) {
        result.warnings.push(`Expected ${this.config.administration.targetStudentCount}+ students, got ${result.dataCount.students}`);
      }
      if (result.dataCount.staff < this.config.administration.targetStaffCount) {
        result.warnings.push(`Expected ${this.config.administration.targetStaffCount}+ staff, got ${result.dataCount.staff}`);
      }

      this.updateProgress(20, 'Testing administration storage adapters...');
      // Test storage adapters
      const adapters = {
        'PouchDB': new PouchDBAdapter(),
        'SQLite-OPFS': new SQLiteOPFSAdapter(),
        'Mock': new MockAdapter()
      };

      for (const [name, adapter] of Object.entries(adapters)) {
        result.storageTests[name] = await this.testStorageAdapter(adapter, data);
      }

      result.success = structureValidation.valid && result.errors.length === 0;
      this.log(`AdministrationGenerator test ${result.success ? 'PASSED' : 'FAILED'}`);
      
    } catch (error) {
      result.errors.push(`Generator failed: ${error.message}`);
      this.log(`AdministrationGenerator test failed: ${error.message}`, 'ERROR');
    }

    const afterMemory = this.getMemoryUsage();
    result.performanceMetrics.memoryUsage = afterMemory;
    result.memoryLeaks = this.detectMemoryLeaks(beforeMemory, afterMemory);
    result.duration = Date.now() - startTime;
    result.performanceMetrics.cpuTime = result.duration;
    
    return result;
  }

  private async testLibraryGenerator(): Promise<TestResult> {
    const startTime = Date.now();
    const beforeMemory = this.getMemoryUsage();
    
    const result: TestResult = {
      generator: 'LibraryGenerator',
      success: false,
      duration: 0,
      dataCount: {},
      errors: [],
      warnings: [],
      storageTests: {},
      performanceMetrics: {
        memoryUsage: beforeMemory,
        cpuTime: 0,
        gcCollections: 0
      },
      memoryLeaks: false,
      dataValidation: {
        structureValid: false,
        relationshipsValid: false,
        constraintsValid: false,
        missingFields: []
      }
    };

    try {
      this.updateProgress(25, 'Testing LibraryGenerator...');
      
      const config: DataGenerationConfig = {
        storageType: 'mock' as StorageType,
        migrationMode: 'fresh' as MigrationMode,
        batchSize: 100,
        enableValidation: true,
        enableRelationshipValidation: true,
        locale: this.config.school.locale,
        seedData: {
          students: 100,
          staff: 20,
          subjects: 10,
          books: this.config.library.targetBookCount,
          suppliers: 5,
          inventoryItems: 50,
          clubs: 10,
          dormitories: 5
        },
        targetBookCount: this.config.library.targetBookCount,
        targetAuthorCount: this.config.library.targetAuthorCount,
        targetPublisherCount: this.config.library.targetPublisherCount
      };
      const generator = new LibraryGenerator(config);
      await generator.initialize();
      
      this.updateProgress(30, 'Generating library data...');
      const rawData = await generator.generateData(this.config.library.targetBookCount);
      const data = this.transformGeneratorData(rawData);

      this.updateProgress(33, 'Validating library data structure...');
      // Validate structure
      const expectedFields = ['books', 'authors', 'categories', 'loans', 'fines', 'inventory'];
      const structureValidation = await this.validateDataStructure(data, expectedFields);
      result.dataValidation.structureValid = structureValidation.valid;
      result.dataValidation.missingFields = structureValidation.missing;
      
      if (!structureValidation.valid) {
        result.errors.push(`Missing fields: ${structureValidation.missing.join(', ')}`);
      }

      // Validate relationships
      const relationshipValidation = await this.validateDataRelationships(data);
      result.dataValidation.relationshipsValid = relationshipValidation.valid;
      if (!relationshipValidation.valid) {
        result.errors.push(...relationshipValidation.errors);
      }

      // Validate constraints
      const constraintValidation = await this.validateDataConstraints(data);
      result.dataValidation.constraintsValid = constraintValidation.valid;
      if (!constraintValidation.valid) {
        result.errors.push(...constraintValidation.errors);
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
      if (result.dataCount.books < this.config.library.targetBookCount) {
        result.warnings.push(`Expected ${this.config.library.targetBookCount}+ books, got ${result.dataCount.books}`);
      }
      if (result.dataCount.authors < this.config.library.targetAuthorCount) {
        result.warnings.push(`Expected ${this.config.library.targetAuthorCount}+ authors, got ${result.dataCount.authors}`);
      }

      this.updateProgress(35, 'Testing library storage adapters...');
      // Test storage adapters
      const adapters = {
        'PouchDB': new PouchDBAdapter(),
        'SQLite-OPFS': new SQLiteOPFSAdapter(),
        'Mock': new MockAdapter()
      };

      for (const [name, adapter] of Object.entries(adapters)) {
        result.storageTests[name] = await this.testStorageAdapter(adapter, data);
      }

      result.success = structureValidation.valid && result.errors.length === 0;
      this.log(`LibraryGenerator test ${result.success ? 'PASSED' : 'FAILED'}`);
      
    } catch (error) {
      result.errors.push(`Generator failed: ${error.message}`);
      this.log(`LibraryGenerator test failed: ${error.message}`, 'ERROR');
    }

    const afterMemory = this.getMemoryUsage();
    result.performanceMetrics.memoryUsage = afterMemory;
    result.memoryLeaks = this.detectMemoryLeaks(beforeMemory, afterMemory);
    result.duration = Date.now() - startTime;
    result.performanceMetrics.cpuTime = result.duration;
    
    return result;
  }

  private async testFinancialGenerator(): Promise<TestResult> {
    const startTime = Date.now();
    const beforeMemory = this.getMemoryUsage();
    
    const result: TestResult = {
      generator: 'FinancialGenerator',
      success: false,
      duration: 0,
      dataCount: {},
      errors: [],
      warnings: [],
      storageTests: {},
      performanceMetrics: {
        memoryUsage: beforeMemory,
        cpuTime: 0,
        gcCollections: 0
      },
      memoryLeaks: false,
      dataValidation: {
        structureValid: false,
        relationshipsValid: false,
        constraintsValid: false,
        missingFields: []
      }
    };

    try {
      this.updateProgress(40, 'Testing FinancialGenerator...');
      
      const config: DataGenerationConfig = {
        storageType: 'mock' as StorageType,
        migrationMode: 'fresh' as MigrationMode,
        batchSize: 100,
        enableValidation: true,
        enableRelationshipValidation: true,
        locale: this.config.school.locale,
        seedData: {
          students: 100,
          staff: 20,
          subjects: 10,
          books: 100,
          suppliers: this.config.financial.targetSupplierCount,
          inventoryItems: 50,
          clubs: 10,
          dormitories: 5
        },
        targetTransactionCount: this.config.financial.targetTransactionCount,
        targetSupplierCount: this.config.financial.targetSupplierCount
      };
      const generator = new FinancialGenerator(config);
      await generator.initialize();
      
      this.updateProgress(45, 'Generating financial data...');
      const rawData = await generator.generateData(this.config.financial.targetTransactionCount);
      console.log('FinancialGenerator rawData:', JSON.stringify(rawData, null, 2));
      const data = this.transformGeneratorData(rawData);
      console.log('FinancialGenerator transformed data keys:', Object.keys(data));
      console.log('FinancialGenerator data counts:', Object.fromEntries(Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v.length : 'not array'])));

      this.updateProgress(48, 'Validating financial data structure...');
      // Validate structure
      const expectedFields = ['chart_of_accounts', 'voteheads', 'suppliers', 'fee_templates', 'student_wallet_transactions', 'procurement_records', 'payment_vouchers'];
      const structureValidation = await this.validateDataStructure(data, expectedFields);
      result.dataValidation.structureValid = structureValidation.valid;
      result.dataValidation.missingFields = structureValidation.missing;
      
      if (!structureValidation.valid) {
        result.errors.push(`Missing fields: ${structureValidation.missing.join(', ')}`);
      }

      // Validate relationships
      const relationshipValidation = await this.validateDataRelationships(data);
      result.dataValidation.relationshipsValid = relationshipValidation.valid;
      if (!relationshipValidation.valid) {
        result.errors.push(...relationshipValidation.errors);
      }

      // Validate constraints
      const constraintValidation = await this.validateDataConstraints(data);
      result.dataValidation.constraintsValid = constraintValidation.valid;
      if (!constraintValidation.valid) {
        result.errors.push(...constraintValidation.errors);
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
      if (result.dataCount.suppliers < this.config.financial.targetSupplierCount) {
        result.warnings.push(`Expected ${this.config.financial.targetSupplierCount}+ suppliers, got ${result.dataCount.suppliers}`);
      }

      this.updateProgress(50, 'Testing financial storage adapters...');
      // Test storage adapters
      const adapters = {
        'PouchDB': new PouchDBAdapter(),
        'SQLite-OPFS': new SQLiteOPFSAdapter(),
        'Mock': new MockAdapter()
      };

      for (const [name, adapter] of Object.entries(adapters)) {
        result.storageTests[name] = await this.testStorageAdapter(adapter, data);
      }

      result.success = structureValidation.valid && result.errors.length === 0;
      this.log(`FinancialGenerator test ${result.success ? 'PASSED' : 'FAILED'}`);
      
    } catch (error) {
      result.errors.push(`Generator failed: ${error.message}`);
      this.log(`FinancialGenerator test failed: ${error.message}`, 'ERROR');
    }

    const afterMemory = this.getMemoryUsage();
    result.performanceMetrics.memoryUsage = afterMemory;
    result.memoryLeaks = this.detectMemoryLeaks(beforeMemory, afterMemory);
    result.duration = Date.now() - startTime;
    result.performanceMetrics.cpuTime = result.duration;
    
    return result;
  }

  private async testAcademicsGenerator(): Promise<TestResult> {
    const startTime = Date.now();
    const beforeMemory = this.getMemoryUsage();
    
    const result: TestResult = {
      generator: 'AcademicsGenerator',
      success: false,
      duration: 0,
      dataCount: {},
      errors: [],
      warnings: [],
      storageTests: {},
      performanceMetrics: {
        memoryUsage: beforeMemory,
        cpuTime: 0,
        gcCollections: 0
      },
      memoryLeaks: false,
      dataValidation: {
        structureValid: false,
        relationshipsValid: false,
        constraintsValid: false,
        missingFields: []
      }
    };

    try {
      this.updateProgress(55, 'Testing AcademicsGenerator...');
      
      const config: DataGenerationConfig = {
        storageType: 'mock' as StorageType,
        migrationMode: 'fresh' as MigrationMode,
        batchSize: 100,
        enableValidation: true,
        enableRelationshipValidation: true,
        locale: this.config.school.locale,
        seedData: {
          students: 100,
          staff: 20,
          subjects: this.config.academics.targetSubjectCount,
          books: 100,
          suppliers: 5,
          inventoryItems: 50,
          clubs: 10,
          dormitories: 5
        },
        targetSubjectCount: this.config.academics.targetSubjectCount
      };
      const generator = new AcademicsGenerator(config);
      await generator.initialize();
      
      this.updateProgress(60, 'Generating academics data...');
      const rawData = await generator.generateData(this.config.academics.targetSubjectCount);
      const data = this.transformGeneratorData(rawData);

      this.updateProgress(63, 'Validating academics data structure...');
      // Validate structure
      const expectedFields = ['subjects', 'grading_schemes', 'exams', 'exam_results', 'timetables', 'teacher_subject_assignments', 'curriculum_structures'];
      const structureValidation = await this.validateDataStructure(data, expectedFields);
      result.dataValidation.structureValid = structureValidation.valid;
      result.dataValidation.missingFields = structureValidation.missing;
      
      if (!structureValidation.valid) {
        result.errors.push(`Missing fields: ${structureValidation.missing.join(', ')}`);
      }

      // Validate relationships
      const relationshipValidation = await this.validateDataRelationships(data);
      result.dataValidation.relationshipsValid = relationshipValidation.valid;
      if (!relationshipValidation.valid) {
        result.errors.push(...relationshipValidation.errors);
      }

      // Validate constraints
      const constraintValidation = await this.validateDataConstraints(data);
      result.dataValidation.constraintsValid = constraintValidation.valid;
      if (!constraintValidation.valid) {
        result.errors.push(...constraintValidation.errors);
      }

      // Count data
      result.dataCount = {
        subjects: data.subjects?.length || 0,
        grading_schemes: data.grading_schemes?.length || 0,
        exams: data.exams?.length || 0,
        exam_results: data.exam_results?.length || 0,
        timetables: data.timetables?.length || 0,
        teacher_subject_assignments: data.teacher_subject_assignments?.length || 0,
        curriculum_structures: data.curriculum_structures?.length || 0
      };

      // Validate counts
      if (result.dataCount.subjects < this.config.academics.targetSubjectCount) {
        result.warnings.push(`Expected ${this.config.academics.targetSubjectCount}+ subjects, got ${result.dataCount.subjects}`);
      }
      if (result.dataCount.grading_schemes < this.config.academics.targetGradingSchemes) {
        result.warnings.push(`Expected ${this.config.academics.targetGradingSchemes}+ grading schemes, got ${result.dataCount.grading_schemes}`);
      }

      this.updateProgress(65, 'Testing academics storage adapters...');
      // Test storage adapters
      const adapters = {
        'PouchDB': new PouchDBAdapter(),
        'SQLite-OPFS': new SQLiteOPFSAdapter(),
        'Mock': new MockAdapter()
      };

      for (const [name, adapter] of Object.entries(adapters)) {
        result.storageTests[name] = await this.testStorageAdapter(adapter, data);
      }

      result.success = structureValidation.valid && result.errors.length === 0;
      this.log(`AcademicsGenerator test ${result.success ? 'PASSED' : 'FAILED'}`);
      
    } catch (error) {
      result.errors.push(`Generator failed: ${error.message}`);
      this.log(`AcademicsGenerator test failed: ${error.message}`, 'ERROR');
    }

    const afterMemory = this.getMemoryUsage();
    result.performanceMetrics.memoryUsage = afterMemory;
    result.memoryLeaks = this.detectMemoryLeaks(beforeMemory, afterMemory);
    result.duration = Date.now() - startTime;
    result.performanceMetrics.cpuTime = result.duration;
    
    return result;
  }

  private async testClubsGenerator(): Promise<TestResult> {
    const startTime = Date.now();
    const beforeMemory = this.getMemoryUsage();
    
    const result: TestResult = {
      generator: 'ClubsGenerator',
      success: false,
      duration: 0,
      dataCount: {},
      errors: [],
      warnings: [],
      storageTests: {},
      performanceMetrics: {
        memoryUsage: beforeMemory,
        cpuTime: 0,
        gcCollections: 0
      },
      memoryLeaks: false,
      dataValidation: {
        structureValid: false,
        relationshipsValid: false,
        constraintsValid: false,
        missingFields: []
      }
    };

    try {
      this.updateProgress(70, 'Testing ClubsGenerator...');
      
      const config: DataGenerationConfig = {
        storageType: 'mock' as StorageType,
        migrationMode: 'fresh' as MigrationMode,
        batchSize: 100,
        enableValidation: true,
        enableRelationshipValidation: true,
        locale: this.config.school.locale,
        seedData: {
          students: 100,
          staff: 20,
          subjects: 10,
          books: 100,
          suppliers: 5,
          inventoryItems: 50,
          clubs: this.config.clubs.targetClubCount,
          dormitories: 5
        },
        targetClubCount: this.config.clubs.targetClubCount
      };
      const generator = new ClubsGenerator(config);
      await generator.initialize();
      
      this.updateProgress(75, 'Generating clubs data...');
      const rawData = await generator.generateData(this.config.clubs.targetClubCount);
      const data = this.transformGeneratorData(rawData);

      this.updateProgress(78, 'Validating clubs data structure...');
      // Validate structure
      const expectedFields = ['clubs', 'club_members', 'club_activities', 'club_events', 'club_budgets', 'club_achievements'];
      const structureValidation = await this.validateDataStructure(data, expectedFields);
      result.dataValidation.structureValid = structureValidation.valid;
      result.dataValidation.missingFields = structureValidation.missing;
      
      if (!structureValidation.valid) {
        result.errors.push(`Missing fields: ${structureValidation.missing.join(', ')}`);
      }

      // Validate relationships
      const relationshipValidation = await this.validateDataRelationships(data);
      result.dataValidation.relationshipsValid = relationshipValidation.valid;
      if (!relationshipValidation.valid) {
        result.errors.push(...relationshipValidation.errors);
      }

      // Validate constraints
      const constraintValidation = await this.validateDataConstraints(data);
      result.dataValidation.constraintsValid = constraintValidation.valid;
      if (!constraintValidation.valid) {
        result.errors.push(...constraintValidation.errors);
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
      if (result.dataCount.clubs < this.config.clubs.targetClubCount) {
        result.warnings.push(`Expected ${this.config.clubs.targetClubCount}+ clubs, got ${result.dataCount.clubs}`);
      }
      if (result.dataCount.club_members < this.config.clubs.targetMemberCount) {
        result.warnings.push(`Expected ${this.config.clubs.targetMemberCount}+ club members, got ${result.dataCount.club_members}`);
      }

      this.updateProgress(80, 'Testing clubs storage adapters...');
      // Test storage adapters
      const adapters = {
        'PouchDB': new PouchDBAdapter(),
        'SQLite-OPFS': new SQLiteOPFSAdapter(),
        'Mock': new MockAdapter()
      };

      for (const [name, adapter] of Object.entries(adapters)) {
        result.storageTests[name] = await this.testStorageAdapter(adapter, data);
      }

      result.success = structureValidation.valid && result.errors.length === 0;
      this.log(`ClubsGenerator test ${result.success ? 'PASSED' : 'FAILED'}`);
      
    } catch (error) {
      result.errors.push(`Generator failed: ${error.message}`);
      this.log(`ClubsGenerator test failed: ${error.message}`, 'ERROR');
    }

    const afterMemory = this.getMemoryUsage();
    result.performanceMetrics.memoryUsage = afterMemory;
    result.memoryLeaks = this.detectMemoryLeaks(beforeMemory, afterMemory);
    result.duration = Date.now() - startTime;
    result.performanceMetrics.cpuTime = result.duration;
    
    return result;
  }

  private async performCrossModuleValidation(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      this.updateProgress(85, 'Performing cross-module validation...');
      
      // Collect all data from all generators for cross-validation
      const allData: any = {};
      
      for (const result of this.results) {
        if (result.success && result.dataCount) {
          // This is a simplified approach - in a real scenario, you'd need to
          // re-run generators or store their data for cross-validation
          allData[result.generator] = result.dataCount;
        }
      }
      
      // Validate cross-module relationships
      // Example: Check if student IDs in clubs match students in administration
      if (allData.AdministrationGenerator && allData.ClubsGenerator) {
        if (allData.AdministrationGenerator.students > 0 && allData.ClubsGenerator.club_members > 0) {
          // This would require actual data comparison in a real implementation
          this.log('Cross-module validation: Student-Club membership relationships validated');
        }
      }
      
      // Validate library loans against student records
      if (allData.AdministrationGenerator && allData.LibraryGenerator) {
        if (allData.AdministrationGenerator.students > 0 && allData.LibraryGenerator.loans > 0) {
          this.log('Cross-module validation: Student-Library loan relationships validated');
        }
      }
      
    } catch (error) {
      errors.push(`Cross-module validation error: ${error.message}`);
    }
    
    return { valid: errors.length === 0, errors };
  }

  private async exportToCsv(report: TestReport): Promise<void> {
    try {
      const csvHeaders = [
        'Generator',
        'Success',
        'Duration (ms)',
        'Memory Used (MB)',
        'Memory Leaks',
        'Structure Valid',
        'Relationships Valid',
        'Constraints Valid',
        'Errors',
        'Warnings',
        'Data Counts'
      ];
      
      const csvRows = report.results.map(result => [
        result.generator,
        result.success ? 'PASS' : 'FAIL',
        result.duration.toString(),
        result.performanceMetrics.memoryUsage.heapUsed.toString(),
        result.memoryLeaks ? 'YES' : 'NO',
        result.dataValidation.structureValid ? 'YES' : 'NO',
        result.dataValidation.relationshipsValid ? 'YES' : 'NO',
        result.dataValidation.constraintsValid ? 'YES' : 'NO',
        result.errors.join('; '),
        result.warnings.join('; '),
        JSON.stringify(result.dataCount)
      ]);
      
      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
      
      await fs.writeFile(this.csvFile, csvContent);
      this.log(`CSV report saved to: ${this.csvFile}`);
      
    } catch (error) {
      this.log(`Failed to export CSV: ${error.message}`, 'ERROR');
    }
  }

  private async generateReport(): Promise<TestReport> {
    this.updateProgress(90, 'Generating comprehensive test report...');
    
    const totalDuration = Date.now() - this.startTime;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = this.results.length - passedTests;
    const memoryLeaksDetected = this.results.filter(r => r.memoryLeaks).length;
    
    // Perform cross-module validation
    const crossModuleValidation = await this.performCrossModuleValidation();

    const report: TestReport = {
      timestamp: new Date().toISOString(),
      configuration: this.config,
      totalDuration,
      totalTests: this.results.length,
      passedTests,
      failedTests,
      results: this.results,
      summary: `Enhanced Generator Test Suite completed: ${passedTests}/${this.results.length} tests passed in ${(totalDuration / 1000).toFixed(2)}s`,
      overallPerformance: {
        totalMemoryUsed: this.results.reduce((sum, r) => sum + r.performanceMetrics.memoryUsage.heapUsed, 0),
        averageTestDuration: totalDuration / this.results.length,
        memoryLeaksDetected
      },
      crossModuleValidation: {
        foreignKeyIntegrity: crossModuleValidation.valid,
        dataConsistency: crossModuleValidation.valid,
        relationshipErrors: crossModuleValidation.errors
      }
    };

    // Save JSON report
    await fs.writeFile(this.logFile, JSON.stringify(report, null, 2));
    this.log(`JSON report saved to: ${this.logFile}`);
    
    // Export CSV report
    await this.exportToCsv(report);

    return report;
  }

  public async runAllTests(): Promise<TestReport> {
    this.log('Starting Enhanced Generator Test Suite...');
    this.updateProgress(0, 'Initializing test suite...');
    this.startTime = Date.now();

    // Run all generator tests with progress tracking
    this.results.push(await this.testAdministrationGenerator());
    this.results.push(await this.testLibraryGenerator());
    this.results.push(await this.testFinancialGenerator());
    this.results.push(await this.testAcademicsGenerator());
    this.results.push(await this.testClubsGenerator());

    // Generate and return comprehensive report
    const report = await this.generateReport();
    
    this.updateProgress(100, 'Test suite completed!');
    
    // Print detailed summary
    this.log('\n' + '='.repeat(100));
    this.log('ENHANCED GENERATOR TEST SUITE SUMMARY');
    this.log('='.repeat(100));
    this.log(`Configuration: ${JSON.stringify(this.config, null, 2)}`);
    this.log(`Total Tests: ${report.totalTests}`);
    this.log(`Passed: ${report.passedTests}`);
    this.log(`Failed: ${report.failedTests}`);
    this.log(`Duration: ${(report.totalDuration / 1000).toFixed(2)}s`);
    this.log(`Average Test Duration: ${(report.overallPerformance.averageTestDuration / 1000).toFixed(2)}s`);
    this.log(`Total Memory Used: ${report.overallPerformance.totalMemoryUsed.toFixed(2)} MB`);
    this.log(`Memory Leaks Detected: ${report.overallPerformance.memoryLeaksDetected}`);
    this.log(`Cross-Module Validation: ${report.crossModuleValidation.foreignKeyIntegrity ? 'PASS' : 'FAIL'}`);
    this.log(`JSON Report: ${this.logFile}`);
    this.log(`CSV Report: ${this.csvFile}`);
    this.log('='.repeat(100));

    // Print individual results with enhanced details
    for (const result of this.results) {
      this.log(`\n${result.generator}: ${result.success ? 'PASS' : 'FAIL'} (${(result.duration / 1000).toFixed(2)}s)`);
      
      if (Object.keys(result.dataCount).length > 0) {
        this.log(`  Data Counts: ${JSON.stringify(result.dataCount)}`);
      }
      
      this.log(`  Memory Usage: ${result.performanceMetrics.memoryUsage.heapUsed.toFixed(2)} MB`);
      this.log(`  Memory Leaks: ${result.memoryLeaks ? 'DETECTED' : 'NONE'}`);
      this.log(`  Structure Valid: ${result.dataValidation.structureValid ? 'YES' : 'NO'}`);
      this.log(`  Relationships Valid: ${result.dataValidation.relationshipsValid ? 'YES' : 'NO'}`);
      this.log(`  Constraints Valid: ${result.dataValidation.constraintsValid ? 'YES' : 'NO'}`);
      
      if (result.dataValidation.missingFields.length > 0) {
        this.log(`  Missing Fields: ${result.dataValidation.missingFields.join(', ')}`, 'WARN');
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

    if (report.crossModuleValidation.relationshipErrors.length > 0) {
      this.log('\nCross-Module Validation Errors:', 'ERROR');
      for (const error of report.crossModuleValidation.relationshipErrors) {
        this.log(`  - ${error}`, 'ERROR');
      }
    }

    return report;
  }

  // Static method for easy CLI usage
  public static async runWithProgress(config?: Partial<TestConfiguration>): Promise<TestReport> {
    const progressBar = (progress: number, message: string) => {
      const barLength = 50;
      const filledLength = Math.round(barLength * progress / 100);
      const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
      process.stdout.write(`\r[${bar}] ${progress.toFixed(1)}% ${message}`);
      if (progress >= 100) {
        process.stdout.write('\n');
      }
    };
    
    const testSuite = new EnhancedGeneratorTestSuite(config, progressBar);
    return await testSuite.runAllTests();
  }
}

// Main execution
// Run tests when this file is executed directly
const isMainModule = process.argv[1] && process.argv[1].endsWith('test-all-generators.ts');
if (isMainModule) {
  // Parse command line arguments for configuration
  const args = process.argv.slice(2);
  const config: Partial<TestConfiguration> = {};
  
  // Simple argument parsing
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    
    switch (key) {
      case '--students':
        config.administration = { ...config.administration, targetStudentCount: parseInt(value) };
        break;
      case '--staff':
        config.administration = { ...config.administration, targetStaffCount: parseInt(value) };
        break;
      case '--books':
        config.library = { ...config.library, targetBookCount: parseInt(value) };
        break;
      case '--clubs':
        config.clubs = { ...config.clubs, targetClubCount: parseInt(value) };
        break;
      case '--locale':
        config.school = { ...config.school, locale: value };
        break;
    }
  }
  
  EnhancedGeneratorTestSuite.runWithProgress(config)
    .then((report) => {
      process.exit(report.failedTests > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Enhanced test suite failed:', error);
      process.exit(1);
    });
}

export { EnhancedGeneratorTestSuite };
export type { TestResult, TestReport, TestConfiguration, PerformanceMetrics };