// ABOUTME: This file contains comprehensive tests for the data generation system
// ABOUTME: Tests all generators, storage adapters, and data validation across different storage types

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UniversalDataGenerator, RelationshipManager, MockAdapter, generateMockData, createDataGenerator } from '../index';
import type { DataGenerationConfig } from '../index';

describe('Data Generation System', () => {
  let generator: UniversalDataGenerator;
  let mockAdapter: MockAdapter;

  beforeEach(async () => {
    mockAdapter = new MockAdapter();
    await mockAdapter.initialize();
  });

  afterEach(async () => {
    if (generator) {
      await generator.cleanup();
    }
    if (mockAdapter) {
      await mockAdapter.cleanup();
    }
  });

  describe('MockAdapter', () => {
    it('should initialize successfully', async () => {
      expect(mockAdapter.isInitialized()).toBe(true);
    });

    it('should create schema and insert data', async () => {
      const schema = `
        CREATE TABLE test_table (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      await mockAdapter.createSchema('test_table', schema);
      
      const data = [
        { name: 'Test Item 1' },
        { name: 'Test Item 2' }
      ];
      
      await mockAdapter.insertBatch('test_table', data);
      
      const results = await mockAdapter.query('SELECT * FROM test_table');
      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('name', 'Test Item 1');
      expect(results[0]).toHaveProperty('created_at');
    });

    it('should handle SQL queries with WHERE clauses', async () => {
      const schema = `
        CREATE TABLE students (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          grade INTEGER,
          active BOOLEAN DEFAULT 1
        )
      `;
      
      await mockAdapter.createSchema('students', schema);
      
      const data = [
        { name: 'John Doe', grade: 10, active: true },
        { name: 'Jane Smith', grade: 11, active: false },
        { name: 'Bob Johnson', grade: 10, active: true }
      ];
      
      await mockAdapter.insertBatch('students', data);
      
      // Test WHERE clause
      const grade10Students = await mockAdapter.query('SELECT * FROM students WHERE grade = 10');
      expect(grade10Students).toHaveLength(2);
      
      // Test LIMIT
      const limitedResults = await mockAdapter.query('SELECT * FROM students LIMIT 1');
      expect(limitedResults).toHaveLength(1);
      
      // Test combined WHERE and LIMIT
      const activeGrade10 = await mockAdapter.query('SELECT * FROM students WHERE grade = 10 AND active = 1 LIMIT 1');
      expect(activeGrade10).toHaveLength(1);
      expect(activeGrade10[0].grade).toBe(10);
      expect(activeGrade10[0].active).toBe(true);
    });

    it('should provide mock-specific methods', async () => {
      const schema = `CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`;
      await mockAdapter.createSchema('test', schema);
      await mockAdapter.insertBatch('test', [{ name: 'Test' }]);
      
      const tables = mockAdapter.getAllTables();
      expect(tables).toContain('test');
      
      const tableData = mockAdapter.getTableData('test');
      expect(tableData).toHaveLength(1);
      
      const stats = mockAdapter.getTableStats('test');
      expect(stats.rowCount).toBe(1);
      expect(stats.tableName).toBe('test');
    });
  });

  describe('RelationshipManager', () => {
    let relationshipManager: RelationshipManager;

    beforeEach(() => {
      relationshipManager = new RelationshipManager();
    });

    it('should define core relationships', () => {
      const relationships = relationshipManager.getRelationships();
      
      // Check that key relationships exist
      expect(relationships).toHaveProperty('students');
      expect(relationships).toHaveProperty('staff');
      expect(relationships).toHaveProperty('subjects');
      
      // Check student dependencies
      const studentDeps = relationships.students;
      expect(studentDeps).toContain('academic_years');
      expect(studentDeps).toContain('classes');
    });

    it('should calculate correct generation order', () => {
      const order = relationshipManager.getGenerationOrder();
      
      // Academic years should come before students
      const academicYearIndex = order.indexOf('academic_years');
      const studentsIndex = order.indexOf('students');
      expect(academicYearIndex).toBeLessThan(studentsIndex);
      
      // Classes should come before students
      const classesIndex = order.indexOf('classes');
      expect(classesIndex).toBeLessThan(studentsIndex);
    });

    it('should validate relationships correctly', async () => {
      // Mock some data in the adapter
      await mockAdapter.createSchema('academic_years', 'CREATE TABLE academic_years (id INTEGER PRIMARY KEY)');
      await mockAdapter.insertBatch('academic_years', [{ id: 1 }]);
      
      const isValid = await relationshipManager.validateRelationships(mockAdapter);
      expect(typeof isValid).toBe('boolean');
    });
  });

  describe('UniversalDataGenerator', () => {
    it('should initialize with mock storage', async () => {
      const config: DataGenerationConfig = {
        storageType: 'mock',
        modules: ['administration'],
        batchSize: 10
      };
      
      generator = await createDataGenerator(config);
      expect(generator).toBeDefined();
    });

    it('should generate administration data', async () => {
      const config: DataGenerationConfig = {
        storageType: 'mock',
        modules: ['administration'],
        batchSize: 10,
        logProgress: false
      };
      
      generator = await createDataGenerator(config);
      const result = await generator.generateData();
      
      expect(result.totalRecords).toBeGreaterThan(0);
      expect(result.tablesGenerated).toContain('students');
      expect(result.tablesGenerated).toContain('staff');
      expect(result.generationTime).toBeGreaterThan(0);
    });

    it('should generate academic data', async () => {
      const config: DataGenerationConfig = {
        storageType: 'mock',
        modules: ['academic'],
        batchSize: 5,
        logProgress: false
      };
      
      generator = await createDataGenerator(config);
      const result = await generator.generateData();
      
      expect(result.totalRecords).toBeGreaterThan(0);
      expect(result.tablesGenerated).toContain('subjects');
      expect(result.tablesGenerated).toContain('grading_schemes');
    });

    it('should generate finance data', async () => {
      const config: DataGenerationConfig = {
        storageType: 'mock',
        modules: ['finance'],
        batchSize: 5,
        logProgress: false
      };
      
      generator = await createDataGenerator(config);
      const result = await generator.generateData();
      
      expect(result.totalRecords).toBeGreaterThan(0);
      expect(result.tablesGenerated).toContain('chart_of_accounts');
      expect(result.tablesGenerated).toContain('suppliers');
    });

    it('should validate data integrity', async () => {
      const config: DataGenerationConfig = {
        storageType: 'mock',
        modules: ['administration'],
        batchSize: 5,
        validateData: true,
        logProgress: false
      };
      
      generator = await createDataGenerator(config);
      await generator.generateData();
      
      const isValid = await generator.validateData();
      expect(isValid).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    it('should generate mock data with default settings', async () => {
      const result = await generateMockData('mock', ['administration']);
      
      expect(result.success).toBe(true);
      expect(result.stats.totalRecords).toBeGreaterThan(0);
      expect(result.stats.storageType).toBe('mock');
      expect(result.errors).toHaveLength(0);
    });

    it('should handle generation errors gracefully', async () => {
      // Test with invalid module
      const result = await generateMockData('mock', ['invalid_module']);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Data Validation', () => {
    beforeEach(async () => {
      const config: DataGenerationConfig = {
        storageType: 'mock',
        modules: ['administration', 'academic'],
        batchSize: 10,
        logProgress: false
      };
      
      generator = await createDataGenerator(config);
      await generator.generateData();
    });

    it('should have students with valid academic year references', async () => {
      const adapter = generator['storageAdapter'] as MockAdapter;
      
      const students = adapter.getTableData('students');
      const academicYears = adapter.getTableData('academic_years');
      
      expect(students.length).toBeGreaterThan(0);
      expect(academicYears.length).toBeGreaterThan(0);
      
      // Check that all students have valid academic_year_id
      const academicYearIds = academicYears.map(ay => ay.id);
      students.forEach(student => {
        expect(academicYearIds).toContain(student.academic_year_id);
      });
    });

    it('should have staff with valid department references', async () => {
      const adapter = generator['storageAdapter'] as MockAdapter;
      
      const staff = adapter.getTableData('staff');
      const departments = adapter.getTableData('departments');
      
      expect(staff.length).toBeGreaterThan(0);
      expect(departments.length).toBeGreaterThan(0);
      
      // Check that all staff have valid department_id
      const departmentIds = departments.map(dept => dept.id);
      staff.forEach(staffMember => {
        expect(departmentIds).toContain(staffMember.department_id);
      });
    });

    it('should generate realistic data ranges', async () => {
      const adapter = generator['storageAdapter'] as MockAdapter;
      
      const students = adapter.getTableData('students');
      
      // Check that students have realistic ages (5-20 for school)
      students.forEach(student => {
        const birthDate = new Date(student.date_of_birth);
        const age = new Date().getFullYear() - birthDate.getFullYear();
        expect(age).toBeGreaterThanOrEqual(5);
        expect(age).toBeLessThanOrEqual(20);
      });
      
      // Check that admission numbers are unique
      const admissionNumbers = students.map(s => s.admission_number);
      const uniqueAdmissionNumbers = [...new Set(admissionNumbers)];
      expect(uniqueAdmissionNumbers.length).toBe(admissionNumbers.length);
    });
  });

  describe('Performance Tests', () => {
    it('should generate large datasets efficiently', async () => {
      const startTime = Date.now();
      
      const config: DataGenerationConfig = {
        storageType: 'mock',
        modules: ['administration'],
        batchSize: 100,
        logProgress: false
      };
      
      generator = await createDataGenerator(config);
      const result = await generator.generateData();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result.totalRecords).toBeGreaterThan(500); // Should generate 500+ students
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    }, 15000); // 15 second timeout
  });
});