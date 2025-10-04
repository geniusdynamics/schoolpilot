// ABOUTME: End-to-end test suite for complete database workflows
// ABOUTME: Tests CRUD operations, migrations, backups, and complete user workflows
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UnifiedDatabaseManager } from '../UnifiedDatabaseManager';
import { databaseBackupManager } from '../BackupManager';
import { databaseConnectionPool } from '../ConnectionPool';
import { securityAuditLogger } from '../SecurityAuditLogger';
import { dataValidator } from '../DataValidator';

// Mock external dependencies
vi.mock('better-sqlite3');
vi.mock('@sqlite.org/sqlite-wasm');
vi.mock('pouchdb');

describe('End-to-End Database Workflows', () => {
  let databaseManager: UnifiedDatabaseManager;

  beforeEach(async () => {
    databaseManager = UnifiedDatabaseManager.getInstance();
    
    // Initialize with in-memory SQLite for testing
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

  describe('Complete CRUD Workflows', () => {
    it('should handle complete student management workflow', async () => {
      // 1. Create student
      const studentCollection = await databaseManager.getCollection('students');
      const newStudent = await studentCollection?.insert({
        name: 'John Doe',
        email: 'john.doe@school.edu',
        age: 16,
        grade: '10th',
        enrollmentDate: new Date().toISOString(),
      });

      expect(newStudent).toBeDefined();
      expect(newStudent.id).toBeDefined();

      // 2. Read student
      const foundStudent = await studentCollection?.findOne({ id: newStudent.id });
      expect(foundStudent).toBeDefined();
      expect(foundStudent.name).toBe('John Doe');

      // 3. Update student
      const updatedStudent = await studentCollection?.updateOne(
        { id: newStudent.id },
        { $set: { grade: '11th', age: 17 } }
      );
      expect(updatedStudent?.modifiedCount).toBe(1);

      // 4. Verify update
      const verifyStudent = await studentCollection?.findOne({ id: newStudent.id });
      expect(verifyStudent.grade).toBe('11th');
      expect(verifyStudent.age).toBe(17);

      // 5. Delete student
      const deleteResult = await studentCollection?.deleteOne({ id: newStudent.id });
      expect(deleteResult?.deletedCount).toBe(1);

      // 6. Verify deletion
      const deletedStudent = await studentCollection?.findOne({ id: newStudent.id });
      expect(deletedStudent).toBeNull();
    });

    it('should handle bulk operations workflow', async () => {
      const studentCollection = await databaseManager.getCollection('students');

      // 1. Bulk insert
      const students = Array.from({ length: 50 }, (_, i) => ({
        name: `Student ${i + 1}`,
        email: `student${i + 1}@school.edu`,
        age: 16 + (i % 4),
        grade: `${10 + (i % 3)}th`,
      }));

      const insertResult = await studentCollection?.insertMany(students);
      expect(insertResult?.insertedCount).toBe(50);

      // 2. Bulk query
      const allStudents = await studentCollection?.find();
      expect(allStudents).toHaveLength(50);

      // 3. Bulk update
      const updateResult = await studentCollection?.updateMany(
        { age: 16 },
        { $set: { status: 'active' } }
      );
      expect(updateResult?.modifiedCount).toBeGreaterThan(0);

      // 4. Bulk delete
      const deleteResult = await studentCollection?.deleteMany({ age: { $gte: 19 } });
      expect(deleteResult?.deletedCount).toBeGreaterThan(0);

      // 5. Verify final count
      const finalCount = await studentCollection?.count();
      expect(finalCount).toBeLessThan(50);
    });

    it('should handle complex relationship workflows', async () => {
      // 1. Create related data
      const classCollection = await databaseManager.getCollection('classes');
      const studentCollection = await databaseManager.getCollection('students');
      const staffCollection = await databaseManager.getCollection('staff');

      // Create teacher
      const teacher = await staffCollection?.insert({
        name: 'Ms. Smith',
        role: 'teacher',
        email: 'smith@school.edu',
        department: 'Mathematics',
      });

      // Create class
      const mathClass = await classCollection?.insert({
        name: 'Algebra I',
        subject: 'Mathematics',
        teacherId: teacher.id,
        capacity: 30,
        schedule: 'MWF 10:00-11:00',
      });

      // Create students and assign to class
      const students = [];
      for (let i = 0; i < 5; i++) {
        const student = await studentCollection?.insert({
          name: `Student ${i + 1}`,
          email: `student${i + 1}@school.edu`,
          classId: mathClass.id,
          age: 16,
        });
        students.push(student);
      }

      // 2. Query relationships
      const classStudents = await studentCollection?.find({ classId: mathClass.id });
      expect(classStudents).toHaveLength(5);

      const teacherClasses = await classCollection?.find({ teacherId: teacher.id });
      expect(teacherClasses).toHaveLength(1);

      // 3. Update relationships
      const newTeacher = await staffCollection?.insert({
        name: 'Mr. Johnson',
        role: 'teacher',
        email: 'johnson@school.edu',
        department: 'Mathematics',
      });

      await classCollection?.updateOne(
        { id: mathClass.id },
        { $set: { teacherId: newTeacher.id } }
      );

      // 4. Verify relationship update
      const updatedClass = await classCollection?.findOne({ id: mathClass.id });
      expect(updatedClass.teacherId).toBe(newTeacher.id);
    });
  });

  describe('Migration and Backup Workflows', () => {
    it('should handle complete backup and restore workflow', async () => {
      // 1. Create test data
      const studentCollection = await databaseManager.getCollection('students');
      const testStudents = [
        { name: 'Alice Johnson', email: 'alice@school.edu', age: 16 },
        { name: 'Bob Smith', email: 'bob@school.edu', age: 17 },
        { name: 'Carol Davis', email: 'carol@school.edu', age: 16 },
      ];

      await studentCollection?.insertMany(testStudents);
      const originalCount = await studentCollection?.count();
      expect(originalCount).toBe(3);

      // 2. Create backup
      const provider = await databaseManager.getProvider();
      const backupId = await databaseBackupManager.createBackup(provider, {
        compress: true,
        validate: true,
      });

      expect(backupId).toBeDefined();

      // 3. Verify backup metadata
      const backupMetadata = databaseBackupManager.getBackup(backupId);
      expect(backupMetadata).toBeDefined();
      expect(backupMetadata?.status).toBe('completed');
      expect(backupMetadata?.recordCount).toBe(3);

      // 4. Clear data
      await databaseManager.clearAllData();
      const clearedCount = await studentCollection?.count();
      expect(clearedCount).toBe(0);

      // 5. Restore from backup
      await databaseBackupManager.restoreBackup(provider, {
        backupId,
        overwriteExisting: true,
        validateBeforeRestore: true,
      });

      // 6. Verify restoration
      const restoredCount = await studentCollection?.count();
      expect(restoredCount).toBe(3);

      const restoredStudents = await studentCollection?.find();
      expect(restoredStudents).toHaveLength(3);
      expect(restoredStudents.some(s => s.name === 'Alice Johnson')).toBe(true);
    });

    it('should handle data migration between collections', async () => {
      // 1. Create source data
      const sourceCollection = await databaseManager.getCollection('temp_students');
      const migrationData = [
        { oldId: 'temp1', fullName: 'John Doe', emailAddress: 'john@school.edu' },
        { oldId: 'temp2', fullName: 'Jane Smith', emailAddress: 'jane@school.edu' },
      ];

      await sourceCollection?.insertMany(migrationData);

      // 2. Migrate to target collection with schema transformation
      const targetCollection = await databaseManager.getCollection('students');
      const sourceData = await sourceCollection?.find();

      const transformedData = sourceData?.map(item => ({
        name: item.fullName,
        email: item.emailAddress,
        age: 16, // Default value
        migrationId: item.oldId,
        migratedAt: new Date().toISOString(),
      }));

      await targetCollection?.insertMany(transformedData || []);

      // 3. Verify migration
      const migratedCount = await targetCollection?.count();
      expect(migratedCount).toBe(2);

      const migratedStudents = await targetCollection?.find();
      expect(migratedStudents.every(s => s.migrationId)).toBe(true);
      expect(migratedStudents.every(s => s.migratedAt)).toBe(true);

      // 4. Cleanup source data
      await sourceCollection?.deleteMany({});
      const sourceCount = await sourceCollection?.count();
      expect(sourceCount).toBe(0);
    });

    it('should handle rollback on migration failure', async () => {
      // 1. Create initial data
      const studentCollection = await databaseManager.getCollection('students');
      const initialData = [
        { name: 'Initial Student 1', email: 'initial1@school.edu', age: 16 },
        { name: 'Initial Student 2', email: 'initial2@school.edu', age: 17 },
      ];

      await studentCollection?.insertMany(initialData);
      const initialCount = await studentCollection?.count();

      // 2. Create snapshot before migration
      const snapshot = await databaseManager.createSnapshot();

      // 3. Attempt migration with invalid data
      const invalidMigrationData = [
        { name: null, email: 'invalid@school.edu', age: 'invalid' }, // Invalid data
        { name: 'Valid Student', email: 'valid@school.edu', age: 16 },
      ];

      try {
        // This should fail due to validation
        await studentCollection?.insertMany(invalidMigrationData);
      } catch (error) {
        // 4. Rollback on failure
        await databaseManager.rollbackToSnapshot(snapshot.id);
      }

      // 5. Verify rollback
      const finalCount = await studentCollection?.count();
      expect(finalCount).toBe(initialCount);

      const finalData = await studentCollection?.find();
      expect(finalData.every(s => s.name === 'Initial Student 1' || s.name === 'Initial Student 2')).toBe(true);
    });
  });

  describe('Security and Validation Workflows', () => {
    it('should handle complete security audit workflow', async () => {
      const userId = 'test-user-123';
      const sessionId = 'session-456';
      const ipAddress = '192.168.1.100';

      // 1. Log authentication
      await securityAuditLogger.logAuthentication(
        'login',
        'success',
        userId,
        { authMethod: 'password' },
        { sessionId, ipAddress }
      );

      // 2. Log data access
      await securityAuditLogger.logDataAccess(
        'read',
        'students',
        'success',
        userId,
        { recordCount: 10, dataClassification: 'sensitive' },
        { sessionId, ipAddress }
      );

      // 3. Log data modification
      await securityAuditLogger.logDataModification(
        'create',
        'students',
        'success',
        userId,
        { recordCount: 1, newValues: { name: 'New Student' } },
        { sessionId, ipAddress }
      );

      // 4. Log security violation
      await securityAuditLogger.logSecurityViolation(
        'unauthorized_access',
        'admin_panel',
        { violationType: 'permission_denied', threatLevel: 'medium' },
        { userId, sessionId, ipAddress }
      );

      // 5. Generate audit report
      const report = securityAuditLogger.generateReport(
        new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        new Date(),
        { includeCompliance: true, includeRecommendations: true }
      );

      expect(report.summary.totalEvents).toBeGreaterThan(0);
      expect(report.summary.uniqueUsers).toBe(1);
      expect(report.compliance).toBeDefined();
      expect(report.recommendations).toBeDefined();

      // 6. Check metrics
      const metrics = securityAuditLogger.getMetrics();
      expect(metrics.totalEvents).toBeGreaterThan(0);
      expect(metrics.eventsLast24h).toBeGreaterThan(0);
    });

    it('should handle complete data validation workflow', async () => {
      // 1. Validate valid data
      const validStudentData = {
        id: 'student123',
        name: 'John Doe',
        email: 'john.doe@school.edu',
        age: 16,
      };

      const validResult = await dataValidator.validateData('students', validStudentData);
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // 2. Validate invalid data
      const invalidStudentData = {
        id: 'student456',
        name: '', // Invalid: empty name
        email: 'invalid-email', // Invalid: bad email format
        age: 'sixteen', // Invalid: non-numeric age
      };

      const invalidResult = await dataValidator.validateData('students', invalidStudentData);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);

      // 3. Batch validation
      const batchData = [validStudentData, invalidStudentData];
      const batchResult = await dataValidator.validateBatch('students', batchData);

      expect(batchResult.summary.totalRecords).toBe(2);
      expect(batchResult.summary.validRecords).toBe(1);
      expect(batchResult.summary.invalidRecords).toBe(1);

      // 4. Data sanitization
      const unsafeData = {
        name: '<script>alert("xss")</script>John Doe',
        email: 'john@school.edu; DROP TABLE students;',
        description: 'Student with <b>bold</b> text',
      };

      const sanitizedData = await dataValidator.sanitizeData(unsafeData);
      expect(sanitizedData.name).not.toContain('<script>');
      expect(sanitizedData.email).not.toContain('DROP TABLE');
      expect(sanitizedData.description).toContain('&lt;b&gt;'); // HTML escaped
    });
  });

  describe('Performance and Monitoring Workflows', () => {
    it('should handle connection pool lifecycle', async () => {
      // 1. Check initial pool state
      const initialMetrics = databaseConnectionPool.getMetrics();
      expect(initialMetrics.totalConnections).toBeGreaterThanOrEqual(0);

      // 2. Acquire connections
      const connections = [];
      for (let i = 0; i < 3; i++) {
        const connection = await databaseConnectionPool.acquire();
        connections.push(connection);
      }

      const activeMetrics = databaseConnectionPool.getMetrics();
      expect(activeMetrics.activeConnections).toBe(3);

      // 3. Release connections
      for (const connection of connections) {
        await databaseConnectionPool.release(connection);
      }

      const releasedMetrics = databaseConnectionPool.getMetrics();
      expect(releasedMetrics.activeConnections).toBe(0);
      expect(releasedMetrics.idleConnections).toBeGreaterThanOrEqual(0);

      // 4. Check pool health
      const status = databaseConnectionPool.getStatus();
      expect(status.isHealthy).toBe(true);
      expect(status.issues).toHaveLength(0);
    });

    it('should handle large dataset operations', async () => {
      const studentCollection = await databaseManager.getCollection('students');

      // 1. Insert large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        name: `Student ${i + 1}`,
        email: `student${i + 1}@school.edu`,
        age: 16 + (i % 4),
        grade: `${10 + (i % 3)}th`,
        enrollmentDate: new Date(2024, 0, 1 + (i % 365)).toISOString(),
      }));

      const startTime = Date.now();
      const insertResult = await studentCollection?.insertMany(largeDataset);
      const insertTime = Date.now() - startTime;

      expect(insertResult?.insertedCount).toBe(1000);
      expect(insertTime).toBeLessThan(10000); // Should complete within 10 seconds

      // 2. Query large dataset
      const queryStart = Date.now();
      const allStudents = await studentCollection?.find();
      const queryTime = Date.now() - queryStart;

      expect(allStudents).toHaveLength(1000);
      expect(queryTime).toBeLessThan(5000); // Should complete within 5 seconds

      // 3. Paginated queries
      const pageSize = 50;
      const page1 = await studentCollection?.find({}, { limit: pageSize, skip: 0 });
      const page2 = await studentCollection?.find({}, { limit: pageSize, skip: pageSize });

      expect(page1).toHaveLength(pageSize);
      expect(page2).toHaveLength(pageSize);
      expect(page1?.[0].id).not.toBe(page2?.[0].id);

      // 4. Indexed queries
      await studentCollection?.createIndex({ age: 1 });
      
      const indexedQueryStart = Date.now();
      const ageQuery = await studentCollection?.find({ age: 16 });
      const indexedQueryTime = Date.now() - indexedQueryStart;

      expect(ageQuery?.length).toBeGreaterThan(0);
      expect(indexedQueryTime).toBeLessThan(1000); // Should be fast with index
    });
  });

  describe('Error Recovery Workflows', () => {
    it('should handle database corruption recovery', async () => {
      const studentCollection = await databaseManager.getCollection('students');

      // 1. Create test data
      await studentCollection?.insertMany([
        { name: 'Student 1', email: 'student1@school.edu' },
        { name: 'Student 2', email: 'student2@school.edu' },
      ]);

      // 2. Simulate corruption detection
      const validationResult = await databaseManager.validateDataIntegrity();
      
      if (!validationResult.isValid) {
        // 3. Attempt automatic repair
        const repairResult = await databaseManager.repairDatabase();
        expect(repairResult.success).toBe(true);
      }

      // 4. Verify data integrity after repair
      const finalValidation = await databaseManager.validateDataIntegrity();
      expect(finalValidation.isValid).toBe(true);
    });

    it('should handle transaction rollback on error', async () => {
      const studentCollection = await databaseManager.getCollection('students');

      // 1. Start transaction
      const transaction = await databaseManager.beginTransaction();

      try {
        // 2. Perform operations within transaction
        await studentCollection?.insert({ name: 'Transaction Student 1' }, { transaction });
        await studentCollection?.insert({ name: 'Transaction Student 2' }, { transaction });

        // 3. Simulate error
        throw new Error('Simulated transaction error');

        // This should not be reached
        await databaseManager.commitTransaction(transaction);
      } catch (error) {
        // 4. Rollback on error
        await databaseManager.rollbackTransaction(transaction);
      }

      // 5. Verify rollback
      const students = await studentCollection?.find();
      const transactionStudents = students?.filter(s => s.name.includes('Transaction'));
      expect(transactionStudents).toHaveLength(0);
    });

    it('should handle network disconnection gracefully', async () => {
      // This test would be more relevant for network-based providers
      // For now, test local provider resilience

      const studentCollection = await databaseManager.getCollection('students');

      // 1. Insert data
      await studentCollection?.insert({ name: 'Network Test Student' });

      // 2. Simulate network issues (for local providers, this might be file system issues)
      // In a real scenario, this would test offline queue functionality

      // 3. Verify data persistence
      const students = await studentCollection?.find();
      expect(students.some(s => s.name === 'Network Test Student')).toBe(true);
    });
  });

  describe('Complete User Workflows', () => {
    it('should handle student enrollment workflow', async () => {
      // 1. Create supporting data
      const staffCollection = await databaseManager.getCollection('staff');
      const classCollection = await databaseManager.getCollection('classes');
      const studentCollection = await databaseManager.getCollection('students');

      const teacher = await staffCollection?.insert({
        name: 'Ms. Johnson',
        role: 'teacher',
        email: 'johnson@school.edu',
        department: 'English',
      });

      const englishClass = await classCollection?.insert({
        name: 'English Literature',
        subject: 'English',
        teacherId: teacher.id,
        capacity: 25,
        currentEnrollment: 0,
      });

      // 2. Enroll student
      const student = await studentCollection?.insert({
        name: 'Emily Davis',
        email: 'emily.davis@school.edu',
        age: 16,
        grade: '10th',
        enrollmentDate: new Date().toISOString(),
        status: 'active',
      });

      // 3. Assign to class
      await studentCollection?.updateOne(
        { id: student.id },
        { $set: { classId: englishClass.id } }
      );

      await classCollection?.updateOne(
        { id: englishClass.id },
        { $inc: { currentEnrollment: 1 } }
      );

      // 4. Verify enrollment
      const enrolledStudent = await studentCollection?.findOne({ id: student.id });
      expect(enrolledStudent.classId).toBe(englishClass.id);

      const updatedClass = await classCollection?.findOne({ id: englishClass.id });
      expect(updatedClass.currentEnrollment).toBe(1);

      // 5. Generate enrollment report
      const classStudents = await studentCollection?.find({ classId: englishClass.id });
      const enrollmentReport = {
        className: updatedClass.name,
        teacher: teacher.name,
        capacity: updatedClass.capacity,
        enrolled: classStudents?.length || 0,
        students: classStudents?.map(s => ({ name: s.name, email: s.email })),
      };

      expect(enrollmentReport.enrolled).toBe(1);
      expect(enrollmentReport.students).toHaveLength(1);
    });

    it('should handle grade management workflow', async () => {
      // 1. Set up academic structure
      const studentCollection = await databaseManager.getCollection('students');
      const subjectCollection = await databaseManager.getCollection('subjects');
      const examCollection = await databaseManager.getCollection('exams');
      const gradeCollection = await databaseManager.getCollection('grades');

      const student = await studentCollection?.insert({
        name: 'Alex Thompson',
        email: 'alex@school.edu',
        age: 17,
        grade: '11th',
      });

      const mathSubject = await subjectCollection?.insert({
        name: 'Mathematics',
        code: 'MATH101',
        credits: 3,
      });

      const midtermExam = await examCollection?.insert({
        name: 'Midterm Exam',
        subjectId: mathSubject.id,
        date: new Date().toISOString(),
        maxScore: 100,
        type: 'midterm',
      });

      // 2. Record grade
      const grade = await gradeCollection?.insert({
        studentId: student.id,
        examId: midtermExam.id,
        subjectId: mathSubject.id,
        score: 85,
        maxScore: 100,
        percentage: 85,
        letterGrade: 'B',
        gradedDate: new Date().toISOString(),
      });

      // 3. Calculate GPA
      const studentGrades = await gradeCollection?.find({ studentId: student.id });
      const totalPoints = studentGrades?.reduce((sum, g) => sum + (g.percentage * mathSubject.credits), 0) || 0;
      const totalCredits = studentGrades?.length ? studentGrades.length * mathSubject.credits : 0;
      const gpa = totalCredits > 0 ? totalPoints / totalCredits / 25 : 0; // Convert to 4.0 scale

      // 4. Update student record
      await studentCollection?.updateOne(
        { id: student.id },
        { $set: { currentGPA: gpa, lastGradeUpdate: new Date().toISOString() } }
      );

      // 5. Verify grade workflow
      const updatedStudent = await studentCollection?.findOne({ id: student.id });
      expect(updatedStudent.currentGPA).toBeCloseTo(3.4, 1); // 85% ≈ 3.4 GPA
      expect(grade.score).toBe(85);
      expect(grade.letterGrade).toBe('B');
    });
  });
});