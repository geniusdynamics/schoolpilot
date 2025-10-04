// ABOUTME: Database testing infrastructure and utilities
// ABOUTME: Provides test environments, fixtures, and utilities for database testing
import { UnifiedDatabaseManager } from '../UnifiedDatabaseManager';
import { DatabaseProviderFactory } from '../DatabaseProviderFactory';
import { IDatabaseProvider, DatabaseConfig } from '../interfaces';

export interface TestEnvironment {
  name: string;
  provider: string;
  config: DatabaseConfig;
  cleanup: () => Promise<void>;
}

export interface TestFixture {
  name: string;
  data: Record<string, any[]>;
  setup: (manager: UnifiedDatabaseManager) => Promise<void>;
  teardown: (manager: UnifiedDatabaseManager) => Promise<void>;
}

/**
 * Database Test Infrastructure
 * Provides utilities for setting up test environments and fixtures
 */
export class DatabaseTestInfrastructure {
  private static instance: DatabaseTestInfrastructure;
  private environments: Map<string, TestEnvironment> = new Map();
  private fixtures: Map<string, TestFixture> = new Map();
  private activeManagers: UnifiedDatabaseManager[] = [];

  public static getInstance(): DatabaseTestInfrastructure {
    if (!DatabaseTestInfrastructure.instance) {
      DatabaseTestInfrastructure.instance = new DatabaseTestInfrastructure();
    }
    return DatabaseTestInfrastructure.instance;
  }

  /**
   * Create test environment for specific provider
   */
  public async createTestEnvironment(
    name: string,
    provider: string,
    customConfig?: Partial<DatabaseConfig>
  ): Promise<TestEnvironment> {
    const baseConfig: DatabaseConfig = {
      name: `test-${name}-${Date.now()}`,
      version: 1,
      autoCompaction: false,
      debug: true,
    };

    let config: DatabaseConfig;
    let cleanup: () => Promise<void>;

    switch (provider) {
      case 'sqlite-file':
        config = {
          ...baseConfig,
          databasePath: ':memory:', // Use in-memory for tests
          enableWAL: false,
          enableForeignKeys: true,
          ...customConfig,
        };
        cleanup = async () => {
          // Memory databases are automatically cleaned up
        };
        break;

      case 'sqlite-wasm':
        config = {
          ...baseConfig,
          wasmUrl: '/test-sqlite3.wasm',
          enableOPFS: false, // Disable OPFS for tests
          ...customConfig,
        };
        cleanup = async () => {
          // WASM databases in memory are automatically cleaned up
        };
        break;

      case 'pouchdb':
        config = {
          ...baseConfig,
          localName: `test-${name}-${Date.now()}`,
          enableSync: false, // Disable sync for tests
          ...customConfig,
        };
        cleanup = async () => {
          // PouchDB test databases are cleaned up automatically
        };
        break;

      case 'backend-api':
        config = {
          ...baseConfig,
          apiBaseUrl: 'http://localhost:3001/test-api',
          apiKey: 'test-key',
          enableCaching: false,
          ...customConfig,
        };
        cleanup = async () => {
          // API provider cleanup
        };
        break;

      default:
        throw new Error(`Unsupported test provider: ${provider}`);
    }

    const environment: TestEnvironment = {
      name,
      provider,
      config,
      cleanup,
    };

    this.environments.set(name, environment);
    return environment;
  }

  /**
   * Get test environment by name
   */
  public getTestEnvironment(name: string): TestEnvironment | undefined {
    return this.environments.get(name);
  }

  /**
   * Create database manager for test environment
   */
  public async createTestManager(environmentName: string): Promise<UnifiedDatabaseManager> {
    const environment = this.environments.get(environmentName);
    if (!environment) {
      throw new Error(`Test environment not found: ${environmentName}`);
    }

    const manager = UnifiedDatabaseManager.getInstance();
    await manager.initialize({
      provider: environment.provider as any,
      config: environment.config,
    });

    this.activeManagers.push(manager);
    return manager;
  }

  /**
   * Register test fixture
   */
  public registerFixture(fixture: TestFixture): void {
    this.fixtures.set(fixture.name, fixture);
  }

  /**
   * Load test fixture
   */
  public async loadFixture(
    fixtureName: string,
    manager: UnifiedDatabaseManager
  ): Promise<void> {
    const fixture = this.fixtures.get(fixtureName);
    if (!fixture) {
      throw new Error(`Test fixture not found: ${fixtureName}`);
    }

    await fixture.setup(manager);
  }

  /**
   * Unload test fixture
   */
  public async unloadFixture(
    fixtureName: string,
    manager: UnifiedDatabaseManager
  ): Promise<void> {
    const fixture = this.fixtures.get(fixtureName);
    if (!fixture) {
      throw new Error(`Test fixture not found: ${fixtureName}`);
    }

    await fixture.teardown(manager);
  }

  /**
   * Cleanup all test environments and managers
   */
  public async cleanup(): Promise<void> {
    // Cleanup active managers
    for (const manager of this.activeManagers) {
      try {
        await manager.clearAllData();
        await manager.close();
      } catch (error) {
        console.warn('Error cleaning up test manager:', error);
      }
    }
    this.activeManagers = [];

    // Cleanup environments
    for (const environment of this.environments.values()) {
      try {
        await environment.cleanup();
      } catch (error) {
        console.warn(`Error cleaning up environment ${environment.name}:`, error);
      }
    }
    this.environments.clear();

    // Clear fixtures
    this.fixtures.clear();
  }

  /**
   * Create performance test data
   */
  public generatePerformanceTestData(recordCount: number): {
    students: any[];
    staff: any[];
    classes: any[];
  } {
    const students = Array.from({ length: recordCount }, (_, i) => ({
      id: `student-${i + 1}`,
      name: `Student ${i + 1}`,
      email: `student${i + 1}@test.edu`,
      age: 16 + (i % 4),
      grade: `${10 + (i % 3)}th`,
      enrollmentDate: new Date(2024, 0, 1 + (i % 365)).toISOString(),
      status: i % 10 === 0 ? 'inactive' : 'active',
    }));

    const staffCount = Math.max(1, Math.floor(recordCount / 20));
    const staff = Array.from({ length: staffCount }, (_, i) => ({
      id: `staff-${i + 1}`,
      name: `Staff Member ${i + 1}`,
      email: `staff${i + 1}@test.edu`,
      role: i % 3 === 0 ? 'admin' : 'teacher',
      department: ['Mathematics', 'English', 'Science', 'History'][i % 4],
      hireDate: new Date(2020 + (i % 4), i % 12, 1).toISOString(),
    }));

    const classCount = Math.max(1, Math.floor(recordCount / 30));
    const classes = Array.from({ length: classCount }, (_, i) => ({
      id: `class-${i + 1}`,
      name: `Class ${i + 1}`,
      subject: ['Mathematics', 'English', 'Science', 'History'][i % 4],
      teacherId: staff[i % staff.length].id,
      capacity: 25 + (i % 10),
      currentEnrollment: Math.floor(Math.random() * 25),
      schedule: `${['MWF', 'TTH'][i % 2]} ${9 + (i % 6)}:00-${10 + (i % 6)}:00`,
    }));

    return { students, staff, classes };
  }

  /**
   * Create test data with relationships
   */
  public generateRelationalTestData(): {
    students: any[];
    staff: any[];
    classes: any[];
    subjects: any[];
    exams: any[];
    grades: any[];
  } {
    const subjects = [
      { id: 'subj-1', name: 'Mathematics', code: 'MATH101', credits: 3 },
      { id: 'subj-2', name: 'English', code: 'ENG101', credits: 3 },
      { id: 'subj-3', name: 'Science', code: 'SCI101', credits: 4 },
      { id: 'subj-4', name: 'History', code: 'HIST101', credits: 3 },
    ];

    const staff = [
      {
        id: 'staff-1',
        name: 'Dr. Smith',
        email: 'smith@test.edu',
        role: 'teacher',
        department: 'Mathematics',
        subjectIds: ['subj-1'],
      },
      {
        id: 'staff-2',
        name: 'Ms. Johnson',
        email: 'johnson@test.edu',
        role: 'teacher',
        department: 'English',
        subjectIds: ['subj-2'],
      },
      {
        id: 'staff-3',
        name: 'Mr. Davis',
        email: 'davis@test.edu',
        role: 'teacher',
        department: 'Science',
        subjectIds: ['subj-3'],
      },
    ];

    const classes = [
      {
        id: 'class-1',
        name: 'Algebra I',
        subjectId: 'subj-1',
        teacherId: 'staff-1',
        capacity: 30,
        currentEnrollment: 0,
      },
      {
        id: 'class-2',
        name: 'English Literature',
        subjectId: 'subj-2',
        teacherId: 'staff-2',
        capacity: 25,
        currentEnrollment: 0,
      },
      {
        id: 'class-3',
        name: 'Biology',
        subjectId: 'subj-3',
        teacherId: 'staff-3',
        capacity: 20,
        currentEnrollment: 0,
      },
    ];

    const students = [
      {
        id: 'student-1',
        name: 'Alice Johnson',
        email: 'alice@test.edu',
        age: 16,
        grade: '10th',
        classId: 'class-1',
      },
      {
        id: 'student-2',
        name: 'Bob Smith',
        email: 'bob@test.edu',
        age: 17,
        grade: '11th',
        classId: 'class-2',
      },
      {
        id: 'student-3',
        name: 'Carol Davis',
        email: 'carol@test.edu',
        age: 16,
        grade: '10th',
        classId: 'class-3',
      },
    ];

    const exams = [
      {
        id: 'exam-1',
        name: 'Midterm Exam',
        subjectId: 'subj-1',
        classId: 'class-1',
        date: new Date().toISOString(),
        maxScore: 100,
        type: 'midterm',
      },
      {
        id: 'exam-2',
        name: 'Final Exam',
        subjectId: 'subj-2',
        classId: 'class-2',
        date: new Date().toISOString(),
        maxScore: 100,
        type: 'final',
      },
    ];

    const grades = [
      {
        id: 'grade-1',
        studentId: 'student-1',
        examId: 'exam-1',
        subjectId: 'subj-1',
        score: 85,
        maxScore: 100,
        percentage: 85,
        letterGrade: 'B',
      },
      {
        id: 'grade-2',
        studentId: 'student-2',
        examId: 'exam-2',
        subjectId: 'subj-2',
        score: 92,
        maxScore: 100,
        percentage: 92,
        letterGrade: 'A',
      },
    ];

    return { students, staff, classes, subjects, exams, grades };
  }

  /**
   * Measure operation performance
   */
  public async measurePerformance<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<{
    result: T;
    duration: number;
    memoryBefore: number;
    memoryAfter: number;
    memoryDelta: number;
  }> {
    const memoryBefore = process.memoryUsage().heapUsed;
    const startTime = Date.now();

    const result = await operation();

    const endTime = Date.now();
    const memoryAfter = process.memoryUsage().heapUsed;

    const performance = {
      result,
      duration: endTime - startTime,
      memoryBefore,
      memoryAfter,
      memoryDelta: memoryAfter - memoryBefore,
    };

    console.log(`Performance [${operationName}]:`, {
      duration: `${performance.duration}ms`,
      memory: `${Math.round(performance.memoryDelta / 1024)}KB`,
    });

    return performance;
  }

  /**
   * Assert performance thresholds
   */
  public assertPerformance(
    performance: { duration: number; memoryDelta: number },
    thresholds: { maxDuration?: number; maxMemory?: number }
  ): void {
    if (thresholds.maxDuration && performance.duration > thresholds.maxDuration) {
      throw new Error(
        `Performance threshold exceeded: ${performance.duration}ms > ${thresholds.maxDuration}ms`
      );
    }

    if (thresholds.maxMemory && performance.memoryDelta > thresholds.maxMemory) {
      throw new Error(
        `Memory threshold exceeded: ${Math.round(performance.memoryDelta / 1024)}KB > ${Math.round(thresholds.maxMemory / 1024)}KB`
      );
    }
  }

  /**
   * Create mock provider for testing
   */
  public createMockProvider(): IDatabaseProvider {
    const mockCollections = new Map();

    return {
      initialize: vi.fn().mockResolvedValue(undefined),
      createCollection: vi.fn().mockImplementation(async (name, schema) => {
        const mockCollection = {
          name,
          schema,
          data: new Map(),
          insert: vi.fn().mockImplementation(async (doc) => {
            const id = doc.id || `mock-${Date.now()}-${Math.random()}`;
            const newDoc = { ...doc, id };
            mockCollection.data.set(id, newDoc);
            return newDoc;
          }),
          insertMany: vi.fn().mockImplementation(async (docs) => {
            const results = [];
            for (const doc of docs) {
              const result = await mockCollection.insert(doc);
              results.push(result);
            }
            return { insertedCount: results.length, insertedIds: results.map(r => r.id) };
          }),
          find: vi.fn().mockImplementation(async (query = {}) => {
            return Array.from(mockCollection.data.values());
          }),
          findOne: vi.fn().mockImplementation(async (query) => {
            const results = await mockCollection.find(query);
            return results[0] || null;
          }),
          updateOne: vi.fn().mockImplementation(async (query, update) => {
            const doc = await mockCollection.findOne(query);
            if (doc) {
              Object.assign(doc, update.$set || {});
              return { modifiedCount: 1 };
            }
            return { modifiedCount: 0 };
          }),
          updateMany: vi.fn().mockImplementation(async (query, update) => {
            const docs = await mockCollection.find(query);
            docs.forEach(doc => Object.assign(doc, update.$set || {}));
            return { modifiedCount: docs.length };
          }),
          deleteOne: vi.fn().mockImplementation(async (query) => {
            const doc = await mockCollection.findOne(query);
            if (doc) {
              mockCollection.data.delete(doc.id);
              return { deletedCount: 1 };
            }
            return { deletedCount: 0 };
          }),
          deleteMany: vi.fn().mockImplementation(async (query) => {
            const docs = await mockCollection.find(query);
            docs.forEach(doc => mockCollection.data.delete(doc.id));
            return { deletedCount: docs.length };
          }),
          count: vi.fn().mockImplementation(async () => {
            return mockCollection.data.size;
          }),
          createIndex: vi.fn().mockResolvedValue({ result: 'created' }),
        };

        mockCollections.set(name, mockCollection);
        return mockCollection;
      }),
      getCollection: vi.fn().mockImplementation(async (name) => {
        return mockCollections.get(name) || null;
      }),
      close: vi.fn().mockResolvedValue(undefined),
    };
  }
}

// Pre-defined test fixtures
export const testInfrastructure = DatabaseTestInfrastructure.getInstance();

// Register common fixtures
testInfrastructure.registerFixture({
  name: 'basic-school-data',
  data: {},
  setup: async (manager) => {
    const data = testInfrastructure.generateRelationalTestData();
    
    // Load data into collections
    for (const [collectionName, records] of Object.entries(data)) {
      const collection = await manager.getCollection(collectionName);
      if (collection && records.length > 0) {
        await collection.insertMany(records);
      }
    }
  },
  teardown: async (manager) => {
    await manager.clearAllData();
  },
});

testInfrastructure.registerFixture({
  name: 'performance-test-data',
  data: {},
  setup: async (manager) => {
    const data = testInfrastructure.generatePerformanceTestData(1000);
    
    for (const [collectionName, records] of Object.entries(data)) {
      const collection = await manager.getCollection(collectionName);
      if (collection && records.length > 0) {
        await collection.insertMany(records);
      }
    }
  },
  teardown: async (manager) => {
    await manager.clearAllData();
  },
});

export default testInfrastructure;