// ABOUTME: Comprehensive test suite for database migration and seeding functionality
// ABOUTME: Tests migration accuracy, data integrity, rollback mechanisms, and performance
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UnifiedDatabaseManager } from '../UnifiedDatabaseManager';

// Mock dependencies
vi.mock('../providers/SQLiteFileProvider');
vi.mock('../providers/SQLiteWASMProvider');
vi.mock('../providers/PouchDBProvider');

describe('Database Migration and Seeding', () => {
  let databaseManager: UnifiedDatabaseManager;

  beforeEach(async () => {
    databaseManager = UnifiedDatabaseManager.getInstance();
    
    await databaseManager.initialize({
      provider: 'sqlite-file',
      config: {
        databasePath: ':memory:',
        enableWAL: false,
        enableForeignKeys: true,
      },
    });
  });

  afterEach(async () => {
    await databaseManager.clearAllData();
    await databaseManager.close();
  });

  describe('Mock Data Migration', () => {
    it('should migrate mock data to database accurately', async () => {
      const testData = {
        students: [
          { id: 'student1', name: 'Test Student 1', age: 16 },
          { id: 'student2', name: 'Test Student 2', age: 17 },
        ],
        staff: [
          { id: 'staff1', name: 'Test Teacher', role: 'teacher' },
        ],
      };

      const migrationResult = await databaseManager.seedDatabase(testData);

      expect(migrationResult.success).toBe(true);
      expect(migrationResult.errors).toHaveLength(0);

      const collections = await databaseManager.getAllCollections();
      expect(collections).toContain('students');
      expect(collections).toContain('staff');

      const studentCollection = await databaseManager.getCollection('students');
      const students = await studentCollection?.find();
      expect(students).toHaveLength(2);
    });

    it('should preserve data relationships during migration', async () => {
      const testData = {
        students: [
          { id: 'student1', name: 'Student 1', classId: 'class1' },
        ],
        classes: [
          { id: 'class1', name: 'Class 1', teacherId: 'teacher1' },
        ],
        staff: [
          { id: 'teacher1', name: 'Teacher 1', role: 'teacher' },
        ],
      };

      await databaseManager.seedDatabase(testData);

      const studentCollection = await databaseManager.getCollection('students');
      const students = await studentCollection?.find();
      
      const classCollection = await databaseManager.getCollection('classes');
      const classes = await classCollection?.find();
      const classIds = classes?.map(c => c.id) || [];

      students?.forEach(student => {
        if (student.classId) {
          expect(classIds).toContain(student.classId);
        }
      });
    });

    it('should handle migration errors gracefully', async () => {
      const invalidData = {
        students: [
          { id: 'student1', name: 'Test Student', classId: 'nonexistent-class' },
        ],
        classes: [],
      };

      const migrationResult = await databaseManager.seedDatabase(invalidData);

      expect(migrationResult.success).toBe(false);
      expect(migrationResult.errors.length).toBeGreaterThan(0);
    });

    it('should support partial migration rollback', async () => {
      const initialData = {
        students: [
          { id: 'student1', name: 'Initial Student' },
        ],
      };

      await databaseManager.seedDatabase(initialData);

      const initialStudentCount = (await databaseManager.getCollection('students'))?.count() || 0;

      const invalidData = {
        students: [
          { id: 'invalid-student', name: null },
        ],
      };

      const migrationResult = await databaseManager.seedDatabase(invalidData, {
        rollbackOnError: true,
      });

      expect(migrationResult.success).toBe(false);

      const finalStudentCount = (await databaseManager.getCollection('students'))?.count() || 0;
      expect(finalStudentCount).toBe(initialStudentCount);
    });
  });

  describe('Data Integrity Validation', () => {
    it('should validate data integrity after migration', async () => {
      const testData = {
        students: [
          { id: 'student1', name: 'Student 1', classId: 'class1' },
        ],
        classes: [
          { id: 'class1', name: 'Class 1' },
        ],
      };

      await databaseManager.seedDatabase(testData);

      const validationResult = await databaseManager.validateDataIntegrity();

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
      expect(validationResult.checks.referentialIntegrity).toBe(true);
      expect(validationResult.checks.dataConsistency).toBe(true);
    });

    it('should detect referential integrity violations', async () => {
      const brokenData = {
        students: [
          { id: 'student1', name: 'Student 1', classId: 'nonexistent-class' },
        ],
        classes: [],
      };

      await databaseManager.seedDatabase(brokenData, { skipValidation: true });

      const validationResult = await databaseManager.validateDataIntegrity();

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThan(0);
      expect(validationResult.checks.referentialIntegrity).toBe(false);
    });

    it('should validate schema compliance', async () => {
      const invalidSchemaData = {
        students: [
          { id: 'student1' }, // Missing required 'name' field
        ],
      };

      const migrationResult = await databaseManager.seedDatabase(invalidSchemaData);

      expect(migrationResult.success).toBe(false);
      expect(migrationResult.errors.some(e => e.includes('schema'))).toBe(true);
    });
  });

  describe('Seeding System Functionality', () => {
    it('should support configurable seeding volumes', async () => {
      const smallData = {
        students: Array.from({ length: 10 }, (_, i) => ({
          id: `student${i}`,
          name: `Student ${i}`,
        })),
      };

      await databaseManager.clearAllData();
      await databaseManager.seedDatabase(smallData);

      let studentCount = (await databaseManager.getCollection('students'))?.count() || 0;
      expect(studentCount).toBe(10);

      const mediumData = {
        students: Array.from({ length: 100 }, (_, i) => ({
          id: `student${i}`,
          name: `Student ${i}`,
        })),
      };

      await databaseManager.clearAllData();
      await databaseManager.seedDatabase(mediumData);

      studentCount = (await databaseManager.getCollection('students'))?.count() || 0;
      expect(studentCount).toBe(100);
    });

    it('should support selective module seeding', async () => {
      const adminData = {
        students: [{ id: 'student1', name: 'Student 1' }],
        staff: [{ id: 'staff1', name: 'Staff 1' }],
      };

      await databaseManager.seedDatabase(adminData);

      const collections = await databaseManager.getAllCollections();
      expect(collections).toContain('students');
      expect(collections).toContain('staff');

      const academicData = {
        exams: [{ id: 'exam1', name: 'Exam 1' }],
        grades: [{ id: 'grade1', studentId: 'student1', score: 85 }],
      };

      await databaseManager.seedDatabase(academicData, { append: true });

      const updatedCollections = await databaseManager.getAllCollections();
      expect(updatedCollections).toContain('exams');
      expect(updatedCollections).toContain('grades');
    });

    it('should track seeding progress and statistics', async () => {
      const progressEvents: any[] = [];
      
      databaseManager.onSeedingProgress((progress) => {
        progressEvents.push(progress);
      });

      const largeData = {
        students: Array.from({ length: 200 }, (_, i) => ({
          id: `student${i}`,
          name: `Student ${i}`,
        })),
      };

      const result = await databaseManager.seedDatabase(largeData, {
        trackProgress: true,
      });

      expect(result.success).toBe(true);
      expect(progressEvents.length).toBeGreaterThan(0);

      const firstEvent = progressEvents[0];
      const lastEvent = progressEvents[progressEvents.length - 1];

      expect(firstEvent.stage).toBe('initializing');
      expect(lastEvent.stage).toBe('completed');
      expect(lastEvent.progress).toBe(100);

      expect(result.statistics).toBeDefined();
      expect(result.statistics.totalRecords).toBeGreaterThan(0);
      expect(result.statistics.processingTime).toBeGreaterThan(0);
    });
  });

  describe('Rollback Functionality', () => {
    it('should support complete database rollback', async () => {
      const initialData = {
        students: Array.from({ length: 10 }, (_, i) => ({
          id: `student${i}`,
          name: `Student ${i}`,
        })),
      };

      await databaseManager.seedDatabase(initialData);
      const initialSnapshot = await databaseManager.createSnapshot();

      const additionalData = {
        students: Array.from({ length: 20 }, (_, i) => ({
          id: `student${i + 10}`,
          name: `Student ${i + 10}`,
        })),
      };

      await databaseManager.seedDatabase(additionalData, { append: true });

      let studentCount = (await databaseManager.getCollection('students'))?.count() || 0;
      expect(studentCount).toBe(30);

      await databaseManager.rollbackToSnapshot(initialSnapshot.id);

      studentCount = (await databaseManager.getCollection('students'))?.count() || 0;
      expect(studentCount).toBe(10);
    });

    it('should support transaction-based rollback', async () => {
      const transaction = await databaseManager.beginTransaction();

      try {
        const testData = {
          students: [{ id: 'student1', name: 'Student 1' }],
        };

        await databaseManager.seedDatabase(testData, { transaction });

        let studentCount = (await databaseManager.getCollection('students'))?.count() || 0;
        expect(studentCount).toBe(1);

        await databaseManager.rollbackTransaction(transaction);

        studentCount = (await databaseManager.getCollection('students'))?.count() || 0;
        expect(studentCount).toBe(0);
      } catch (error) {
        await databaseManager.rollbackTransaction(transaction);
        throw error;
      }
    });
  });

  describe('Performance Testing', () => {
    it('should handle large dataset seeding efficiently', async () => {
      const startTime = Date.now();

      const largeData = {
        students: Array.from({ length: 1000 }, (_, i) => ({
          id: `student${i}`,
          name: `Student ${i}`,
          age: 16 + (i % 5),
        })),
      };

      const result = await databaseManager.seedDatabase(largeData, {
        batchSize: 100,
      });

      const seedingTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(seedingTime).toBeLessThan(30000); // Less than 30 seconds

      expect(result.statistics.recordsPerSecond).toBeGreaterThan(10);
      expect(result.statistics.totalRecords).toBe(1000);

      console.log(`Performance Test Results:
        - Seeding Time: ${seedingTime}ms
        - Records/Second: ${result.statistics.recordsPerSecond}
        - Total Records: ${result.statistics.totalRecords}`);
    });

    it('should optimize memory usage during large operations', async () => {
      const initialMemory = process.memoryUsage();

      const largeData = {
        students: Array.from({ length: 2000 }, (_, i) => ({
          id: `student${i}`,
          name: `Student ${i}`,
          age: 16 + (i % 5),
        })),
      };

      await databaseManager.seedDatabase(largeData, {
        batchSize: 50,
        enableMemoryOptimization: true,
      });

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);

      console.log(`Memory Usage:
        - Initial: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB
        - Final: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB
        - Increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
    });

    it('should handle concurrent seeding operations', async () => {
      const concurrentOperations = 3;
      const promises: Promise<any>[] = [];

      for (let i = 0; i < concurrentOperations; i++) {
        const data = {
          [`test_${i}_students`]: Array.from({ length: 50 }, (_, j) => ({
            id: `student${j}`,
            name: `Student ${j}`,
          })),
        };

        const promise = databaseManager.seedDatabase(data, {
          namespace: `test_${i}`,
        });

        promises.push(promise);
      }

      const results = await Promise.all(promises);

      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      for (let i = 0; i < concurrentOperations; i++) {
        const collection = await databaseManager.getCollection(`test_${i}_students`);
        const count = await collection?.count();
        expect(count).toBe(50);
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle database connection failures gracefully', async () => {
      vi.spyOn(databaseManager, 'getProvider').mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const testData = {
        students: [{ id: 'student1', name: 'Student 1' }],
      };

      const result = await databaseManager.seedDatabase(testData);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('connection'))).toBe(true);
    });

    it('should recover from partial seeding failures', async () => {
      const mixedData = {
        students: [
          { id: 'student1', name: 'Valid Student' },
          { id: 'student2', name: null }, // Invalid data
          { id: 'student3', name: 'Another Valid Student' },
        ],
        staff: [
          { id: 'staff1', name: 'Valid Staff' },
        ],
      };

      const result = await databaseManager.seedDatabase(mixedData, {
        continueOnError: true,
        skipInvalidRecords: true,
      });

      expect(result.success).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);

      const studentCollection = await databaseManager.getCollection('students');
      const students = await studentCollection?.find();
      expect(students?.length).toBe(2); // Only valid students

      const staffCollection = await databaseManager.getCollection('staff');
      const staff = await staffCollection?.find();
      expect(staff?.length).toBe(1);
    });
  });
});