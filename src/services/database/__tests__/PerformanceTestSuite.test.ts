// ABOUTME: Comprehensive performance testing suite for database operations
// ABOUTME: Includes benchmarks, load testing, stress testing, and regression detection

import { UnifiedDatabaseManager } from '../UnifiedDatabaseManager';
import { UniversalDataGenerator } from '../../dataGeneration/UniversalDataGenerator';
import { DatabasePerformanceOptimizer } from '../performance/DatabasePerformanceOptimizer';

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  singleInsert: 100, // ms
  batchInsert: 1000, // ms for 100 records
  singleQuery: 50, // ms
  complexQuery: 200, // ms
  bulkUpdate: 500, // ms for 100 records
  bulkDelete: 300, // ms for 100 records
  memoryUsage: 100 * 1024 * 1024, // 100MB
  concurrentOperations: 2000, // ms for 10 concurrent operations
};

interface PerformanceMetrics {
  operation: string;
  duration: number;
  recordCount: number;
  memoryBefore: number;
  memoryAfter: number;
  memoryDelta: number;
  throughput: number; // records per second
  timestamp: Date;
}

interface LoadTestResult {
  operation: string;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  throughput: number;
  errorRate: number;
  memoryUsage: {
    initial: number;
    peak: number;
    final: number;
  };
}

interface StressTestResult {
  operation: string;
  breakingPoint: number;
  maxThroughput: number;
  degradationPoint: number;
  recoveryTime: number;
  errorPatterns: string[];
}

describe('Database Performance Test Suite', () => {
  let databaseManager: UnifiedDatabaseManager;
  let dataGenerator: UniversalDataGenerator;

  let performanceMetrics: PerformanceMetrics[] = [];

  beforeEach(async () => {
    // Initialize test environment
    databaseManager = UnifiedDatabaseManager.getInstance();
    dataGenerator = new UniversalDataGenerator();
    performanceOptimizer = new DatabasePerformanceOptimizer();

    // Use in-memory database for consistent performance testing
    await databaseManager.initialize({
      provider: 'sqlite-file',
      config: {
        databasePath: ':memory:',
        enableWAL: true,
        enableForeignKeys: true,
        cacheSize: 10000,
        busyTimeout: 30000,
      },
    });

    performanceMetrics = [];
  });

  afterEach(async () => {
    await databaseManager.clearAllData();
    await databaseManager.close();
  });

  /**
   * Record performance metrics for analysis
   */
  const recordMetrics = (
    operation: string,
    startTime: number,
    recordCount: number,
    memoryBefore: number,
    memoryAfter: number
  ): PerformanceMetrics => {
    const duration = Date.now() - startTime;
    const memoryDelta = memoryAfter - memoryBefore;
    const throughput = recordCount > 0 ? (recordCount / duration) * 1000 : 0;

    const metrics: PerformanceMetrics = {
      operation,
      duration,
      recordCount,
      memoryBefore,
      memoryAfter,
      memoryDelta,
      throughput,
      timestamp: new Date(),
    };

    performanceMetrics.push(metrics);
    return metrics;
  };

  describe('Basic Operation Benchmarks', () => {
    it('should perform single record insert within threshold', async () => {
      const testData = await dataGenerator.generateStudents(1);
      const student = testData[0];

      const memoryBefore = process.memoryUsage().heapUsed;
      const startTime = Date.now();

      const collection = await databaseManager.getCollection('students');
      await collection?.insert(student);

      const memoryAfter = process.memoryUsage().heapUsed;
      const metrics = recordMetrics('single_insert', startTime, 1, memoryBefore, memoryAfter);

      expect(metrics.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.singleInsert);
      expect(metrics.memoryDelta).toBeLessThan(1024 * 1024); // Less than 1MB

      console.log(`Single Insert: ${metrics.duration}ms, Memory: ${metrics.memoryDelta} bytes`);
    });

    it('should perform batch insert within threshold', async () => {
      const testData = await dataGenerator.generateStudents(100);

      const memoryBefore = process.memoryUsage().heapUsed;
      const startTime = Date.now();

      const collection = await databaseManager.getCollection('students');
      await collection?.insertMany(testData);

      const memoryAfter = process.memoryUsage().heapUsed;
      const metrics = recordMetrics('batch_insert', startTime, 100, memoryBefore, memoryAfter);

      expect(metrics.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.batchInsert);
      expect(metrics.throughput).toBeGreaterThan(50); // At least 50 records/second

      console.log(`Batch Insert: ${metrics.duration}ms, Throughput: ${metrics.throughput.toFixed(2)} records/sec`);
    });

    it('should perform single record query within threshold', async () => {
      // Setup test data
      const testData = await dataGenerator.generateStudents(100);
      const collection = await databaseManager.getCollection('students');
      await collection?.insertMany(testData);

      const targetStudent = testData[0];

      const memoryBefore = process.memoryUsage().heapUsed;
      const startTime = Date.now();

      const result = await collection?.findOne({ id: targetStudent.id });

      const memoryAfter = process.memoryUsage().heapUsed;
      const metrics = recordMetrics('single_query', startTime, 1, memoryBefore, memoryAfter);

      expect(result).toBeDefined();
      expect(metrics.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.singleQuery);

      console.log(`Single Query: ${metrics.duration}ms`);
    });

    it('should perform complex query within threshold', async () => {
      // Setup test data with relationships
      const testData = await dataGenerator.generateAllData({
        studentCount: 200,
        staffCount: 20,
        classCount: 10,
        subjectCount: 15,
        includeRelationships: true,
      });

      await databaseManager.seedDatabase(testData);

      const memoryBefore = process.memoryUsage().heapUsed;
      const startTime = Date.now();

      // Complex query: Find all students in a specific class with their grades
      const studentCollection = await databaseManager.getCollection('students');
      const students = await studentCollection?.find({ classId: { $exists: true } });

      const memoryAfter = process.memoryUsage().heapUsed;
      const metrics = recordMetrics('complex_query', startTime, students?.length || 0, memoryBefore, memoryAfter);

      expect(metrics.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.complexQuery);

      console.log(`Complex Query: ${metrics.duration}ms, Records: ${students?.length}`);
    });

    it('should perform bulk update within threshold', async () => {
      // Setup test data
      const testData = await dataGenerator.generateStudents(100);
      const collection = await databaseManager.getCollection('students');
      await collection?.insertMany(testData);

      const memoryBefore = process.memoryUsage().heapUsed;
      const startTime = Date.now();

      // Bulk update: Add a new field to all students
      const updateResult = await collection?.updateMany(
        {},
        { $set: { lastUpdated: new Date() } }
      );

      const memoryAfter = process.memoryUsage().heapUsed;
      const metrics = recordMetrics('bulk_update', startTime, updateResult?.modifiedCount || 0, memoryBefore, memoryAfter);

      expect(metrics.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.bulkUpdate);
      expect(updateResult?.modifiedCount).toBe(100);

      console.log(`Bulk Update: ${metrics.duration}ms, Updated: ${updateResult?.modifiedCount}`);
    });

    it('should perform bulk delete within threshold', async () => {
      // Setup test data
      const testData = await dataGenerator.generateStudents(100);
      const collection = await databaseManager.getCollection('students');
      await collection?.insertMany(testData);

      // Mark half for deletion
      const toDelete = testData.slice(0, 50).map(s => s.id);

      const memoryBefore = process.memoryUsage().heapUsed;
      const startTime = Date.now();

      const deleteResult = await collection?.deleteMany({ id: { $in: toDelete } });

      const memoryAfter = process.memoryUsage().heapUsed;
      const metrics = recordMetrics('bulk_delete', startTime, deleteResult?.deletedCount || 0, memoryBefore, memoryAfter);

      expect(metrics.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.bulkDelete);
      expect(deleteResult?.deletedCount).toBe(50);

      console.log(`Bulk Delete: ${metrics.duration}ms, Deleted: ${deleteResult?.deletedCount}`);
    });
  });

  describe('Load Testing', () => {
    it('should handle sustained read operations', async () => {
      // Setup large dataset
      const testData = await dataGenerator.generateStudents(1000);
      const collection = await databaseManager.getCollection('students');
      await collection?.insertMany(testData);

      const loadTestResult = await performLoadTest(
        'sustained_reads',
        async () => {
          const randomId = testData[Math.floor(Math.random() * testData.length)].id;
          return await collection?.findOne({ id: randomId });
        },
        100, // 100 operations
        10   // 10 concurrent operations
      );

      expect(loadTestResult.errorRate).toBeLessThan(0.01); // Less than 1% error rate
      expect(loadTestResult.averageDuration).toBeLessThan(100); // Average under 100ms

      console.log(`Load Test - Sustained Reads:
        Operations: ${loadTestResult.totalOperations}
        Success Rate: ${((1 - loadTestResult.errorRate) * 100).toFixed(2)}%
        Average Duration: ${loadTestResult.averageDuration.toFixed(2)}ms
        Throughput: ${loadTestResult.throughput.toFixed(2)} ops/sec`);
    });

    it('should handle sustained write operations', async () => {
      const loadTestResult = await performLoadTest(
        'sustained_writes',
        async () => {
          const student = (await dataGenerator.generateStudents(1))[0];
          const collection = await databaseManager.getCollection('students');
          return await collection?.insert(student);
        },
        50,  // 50 operations
        5    // 5 concurrent operations
      );

      expect(loadTestResult.errorRate).toBeLessThan(0.05); // Less than 5% error rate
      expect(loadTestResult.averageDuration).toBeLessThan(200); // Average under 200ms

      console.log(`Load Test - Sustained Writes:
        Operations: ${loadTestResult.totalOperations}
        Success Rate: ${((1 - loadTestResult.errorRate) * 100).toFixed(2)}%
        Average Duration: ${loadTestResult.averageDuration.toFixed(2)}ms
        Throughput: ${loadTestResult.throughput.toFixed(2)} ops/sec`);
    });

    it('should handle mixed read/write workload', async () => {
      // Setup initial data
      const initialData = await dataGenerator.generateStudents(500);
      const collection = await databaseManager.getCollection('students');
      await collection?.insertMany(initialData);

      const loadTestResult = await performLoadTest(
        'mixed_workload',
        async () => {
          const operation = Math.random();
          
          if (operation < 0.7) {
            // 70% reads
            const randomId = initialData[Math.floor(Math.random() * initialData.length)].id;
            return await collection?.findOne({ id: randomId });
          } else if (operation < 0.9) {
            // 20% updates
            const randomStudent = initialData[Math.floor(Math.random() * initialData.length)];
            return await collection?.updateOne(
              { id: randomStudent.id },
              { $set: { lastAccessed: new Date() } }
            );
          } else {
            // 10% inserts
            const newStudent = (await dataGenerator.generateStudents(1))[0];
            return await collection?.insert(newStudent);
          }
        },
        100, // 100 operations
        8    // 8 concurrent operations
      );

      expect(loadTestResult.errorRate).toBeLessThan(0.05);
      expect(loadTestResult.averageDuration).toBeLessThan(150);

      console.log(`Load Test - Mixed Workload:
        Operations: ${loadTestResult.totalOperations}
        Success Rate: ${((1 - loadTestResult.errorRate) * 100).toFixed(2)}%
        Average Duration: ${loadTestResult.averageDuration.toFixed(2)}ms
        Throughput: ${loadTestResult.throughput.toFixed(2)} ops/sec`);
    });
  });

  describe('Stress Testing', () => {
    it('should identify breaking point for concurrent connections', async () => {
      const stressTestResult = await performStressTest(
        'concurrent_connections',
        async (concurrency: number) => {
          const promises = [];
          for (let i = 0; i < concurrency; i++) {
            promises.push(
              (async () => {
                const student = (await dataGenerator.generateStudents(1))[0];
                const collection = await databaseManager.getCollection('students');
                return await collection?.insert(student);
              })()
            );
          }
          
          const results = await Promise.allSettled(promises);
          const successful = results.filter(r => r.status === 'fulfilled').length;
          return { successful, total: concurrency };
        },
        [1, 5, 10, 20, 50, 100], // Test different concurrency levels
        0.95 // 95% success rate threshold
      );

      expect(stressTestResult.breakingPoint).toBeGreaterThan(10);
      expect(stressTestResult.maxThroughput).toBeGreaterThan(0);

      console.log(`Stress Test - Concurrent Connections:
        Breaking Point: ${stressTestResult.breakingPoint} concurrent operations
        Max Throughput: ${stressTestResult.maxThroughput.toFixed(2)} ops/sec
        Degradation Point: ${stressTestResult.degradationPoint}`);
    });

    it('should handle memory pressure gracefully', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      let peakMemory = initialMemory;

      // Generate increasingly large datasets
      const dataSizes = [100, 500, 1000, 2000, 5000];
      const results: Array<{ size: number; duration: number; memoryUsage: number }> = [];

      for (const size of dataSizes) {
        const startTime = Date.now();
        const memoryBefore = process.memoryUsage().heapUsed;

        try {
          const testData = await dataGenerator.generateStudents(size);
          const collection = await databaseManager.getCollection('students');
          await collection?.insertMany(testData);

          const duration = Date.now() - startTime;
          const memoryAfter = process.memoryUsage().heapUsed;
          peakMemory = Math.max(peakMemory, memoryAfter);

          results.push({
            size,
            duration,
            memoryUsage: memoryAfter - memoryBefore,
          });

          // Clear data for next iteration
          await collection?.deleteMany({});

          console.log(`Memory Test - Size: ${size}, Duration: ${duration}ms, Memory: ${((memoryAfter - memoryBefore) / 1024 / 1024).toFixed(2)}MB`);
        } catch (error) {
          console.error(`Memory test failed at size ${size}:`, error);
          break;
        }
      }

      // Verify memory usage is reasonable
      const totalMemoryIncrease = peakMemory - initialMemory;
      expect(totalMemoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryUsage);

      // Verify performance doesn't degrade exponentially
      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1];
        const curr = results[i];
        const sizeRatio = curr.size / prev.size;
        const durationRatio = curr.duration / prev.duration;

        // Duration should not increase more than 3x the size ratio
        expect(durationRatio).toBeLessThan(sizeRatio * 3);
      }
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions in query operations', async () => {
      // Establish baseline performance
      const baselineMetrics = await measureBaselinePerformance();
      
      // Simulate performance regression (artificially slow down operations)
      const regressionMetrics = await measurePerformanceWithRegression();

      // Detect regressions
      const regressions = detectPerformanceRegressions(baselineMetrics, regressionMetrics);

      expect(regressions.length).toBeGreaterThan(0);
      expect(regressions[0].degradationPercentage).toBeGreaterThan(50); // At least 50% slower

      console.log('Performance Regressions Detected:');
      regressions.forEach(regression => {
        console.log(`  ${regression.operation}: ${regression.degradationPercentage.toFixed(2)}% slower`);
      });
    });

    it('should track performance trends over time', async () => {
      const trendData: Array<{ timestamp: Date; metrics: PerformanceMetrics[] }> = [];

      // Simulate multiple test runs over time
      for (let i = 0; i < 5; i++) {
        const runMetrics: PerformanceMetrics[] = [];
        
        // Perform standard operations
        const testData = await dataGenerator.generateStudents(100);
        const collection = await databaseManager.getCollection('students');

        // Insert operation
        const insertStart = Date.now();
        await collection?.insertMany(testData);
        runMetrics.push({
          operation: 'batch_insert',
          duration: Date.now() - insertStart,
          recordCount: 100,
          memoryBefore: 0,
          memoryAfter: 0,
          memoryDelta: 0,
          throughput: 100 / ((Date.now() - insertStart) / 1000),
          timestamp: new Date(),
        });

        // Query operation
        const queryStart = Date.now();
        await collection?.find({});
        runMetrics.push({
          operation: 'full_scan',
          duration: Date.now() - queryStart,
          recordCount: 100,
          memoryBefore: 0,
          memoryAfter: 0,
          memoryDelta: 0,
          throughput: 100 / ((Date.now() - queryStart) / 1000),
          timestamp: new Date(),
        });

        trendData.push({
          timestamp: new Date(),
          metrics: runMetrics,
        });

        // Clear data for next run
        await collection?.deleteMany({});

        // Small delay between runs
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Analyze trends
      const trends = analyzePerfomanceTrends(trendData);
      
      expect(trends.length).toBeGreaterThan(0);
      trends.forEach(trend => {
        console.log(`Trend for ${trend.operation}: ${trend.direction} (${trend.changePercentage.toFixed(2)}%)`);
      });
    });
  });

  describe('Database-Specific Performance Tests', () => {
    it('should test SQLite-specific optimizations', async () => {
      // Test WAL mode performance
      const walMetrics = await testWALModePerformance();
      
      // Test index performance
      const indexMetrics = await testIndexPerformance();
      
      // Test transaction performance
      const transactionMetrics = await testTransactionPerformance();

      expect(walMetrics.throughput).toBeGreaterThan(0);
      expect(indexMetrics.improvementFactor).toBeGreaterThan(2); // At least 2x improvement with index
      expect(transactionMetrics.batchThroughput).toBeGreaterThan(transactionMetrics.individualThroughput);

      console.log(`SQLite Performance Tests:
        WAL Mode Throughput: ${walMetrics.throughput.toFixed(2)} ops/sec
        Index Improvement: ${indexMetrics.improvementFactor.toFixed(2)}x
        Transaction Batch Improvement: ${(transactionMetrics.batchThroughput / transactionMetrics.individualThroughput).toFixed(2)}x`);
    });
  });

  // Helper functions for performance testing

  async function performLoadTest(
    operation: string,
    testFunction: () => Promise<any>,
    totalOperations: number,
    concurrency: number
  ): Promise<LoadTestResult> {
    const results: Array<{ duration: number; success: boolean }> = [];
    const memoryInitial = process.memoryUsage().heapUsed;
    let memoryPeak = memoryInitial;

    const startTime = Date.now();

    // Execute operations in batches to control concurrency
    for (let i = 0; i < totalOperations; i += concurrency) {
      const batch = Math.min(concurrency, totalOperations - i);
      const promises = [];

      for (let j = 0; j < batch; j++) {
        promises.push(
          (async () => {
            const opStart = Date.now();
            try {
              await testFunction();
              const duration = Date.now() - opStart;
              results.push({ duration, success: true });
            } catch (error) {
              const duration = Date.now() - opStart;
              results.push({ duration, success: false });
            }
            
            // Track peak memory
            const currentMemory = process.memoryUsage().heapUsed;
            memoryPeak = Math.max(memoryPeak, currentMemory);
          })()
        );
      }

      await Promise.all(promises);
    }

    const totalDuration = Date.now() - startTime;
    const memoryFinal = process.memoryUsage().heapUsed;
    
    const successfulOperations = results.filter(r => r.success).length;
    const failedOperations = results.length - successfulOperations;
    const durations = results.map(r => r.duration);
    
    return {
      operation,
      totalOperations: results.length,
      successfulOperations,
      failedOperations,
      averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      throughput: (successfulOperations / totalDuration) * 1000,
      errorRate: failedOperations / results.length,
      memoryUsage: {
        initial: memoryInitial,
        peak: memoryPeak,
        final: memoryFinal,
      },
    };
  }

  async function performStressTest(
    operation: string,
    testFunction: (load: number) => Promise<{ successful: number; total: number }>,
    loadLevels: number[],
    successThreshold: number
  ): Promise<StressTestResult> {
    let breakingPoint = 0;
    let maxThroughput = 0;
    let degradationPoint = 0;
    const errorPatterns: string[] = [];

    for (const load of loadLevels) {
      try {
        const startTime = Date.now();
        const result = await testFunction(load);
        const duration = Date.now() - startTime;
        
        const successRate = result.successful / result.total;
        const throughput = (result.successful / duration) * 1000;
        
        maxThroughput = Math.max(maxThroughput, throughput);
        
        if (successRate >= successThreshold) {
          breakingPoint = load;
        } else if (degradationPoint === 0) {
          degradationPoint = load;
        }

        if (successRate < successThreshold) {
          errorPatterns.push(`Load ${load}: ${((1 - successRate) * 100).toFixed(2)}% failure rate`);
        }

        console.log(`Stress Test - Load ${load}: ${(successRate * 100).toFixed(2)}% success, ${throughput.toFixed(2)} ops/sec`);
      } catch (error) {
        errorPatterns.push(`Load ${load}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        break;
      }
    }

    return {
      operation,
      breakingPoint,
      maxThroughput,
      degradationPoint,
      recoveryTime: 0, // Would need additional testing to measure
      errorPatterns,
    };
  }

  async function measureBaselinePerformance(): Promise<PerformanceMetrics[]> {
    const metrics: PerformanceMetrics[] = [];
    
    // Standard operations for baseline
    const testData = await dataGenerator.generateStudents(100);
    const collection = await databaseManager.getCollection('students');

    // Insert baseline
    const insertStart = Date.now();
    await collection?.insertMany(testData);
    metrics.push({
      operation: 'baseline_insert',
      duration: Date.now() - insertStart,
      recordCount: 100,
      memoryBefore: 0,
      memoryAfter: 0,
      memoryDelta: 0,
      throughput: 100 / ((Date.now() - insertStart) / 1000),
      timestamp: new Date(),
    });

    // Query baseline
    const queryStart = Date.now();
    await collection?.find({});
    metrics.push({
      operation: 'baseline_query',
      duration: Date.now() - queryStart,
      recordCount: 100,
      memoryBefore: 0,
      memoryAfter: 0,
      memoryDelta: 0,
      throughput: 100 / ((Date.now() - queryStart) / 1000),
      timestamp: new Date(),
    });

    return metrics;
  }

  async function measurePerformanceWithRegression(): Promise<PerformanceMetrics[]> {
    const metrics: PerformanceMetrics[] = [];
    
    // Simulate regression by adding artificial delays
    const testData = await dataGenerator.generateStudents(100);
    const collection = await databaseManager.getCollection('students');

    // Insert with regression
    const insertStart = Date.now();
    await new Promise(resolve => setTimeout(resolve, 100)); // Artificial delay
    await collection?.insertMany(testData);
    metrics.push({
      operation: 'baseline_insert',
      duration: Date.now() - insertStart,
      recordCount: 100,
      memoryBefore: 0,
      memoryAfter: 0,
      memoryDelta: 0,
      throughput: 100 / ((Date.now() - insertStart) / 1000),
      timestamp: new Date(),
    });

    // Query with regression
    const queryStart = Date.now();
    await new Promise(resolve => setTimeout(resolve, 50)); // Artificial delay
    await collection?.find({});
    metrics.push({
      operation: 'baseline_query',
      duration: Date.now() - queryStart,
      recordCount: 100,
      memoryBefore: 0,
      memoryAfter: 0,
      memoryDelta: 0,
      throughput: 100 / ((Date.now() - queryStart) / 1000),
      timestamp: new Date(),
    });

    return metrics;
  }

  function detectPerformanceRegressions(
    baseline: PerformanceMetrics[],
    current: PerformanceMetrics[]
  ): Array<{ operation: string; degradationPercentage: number }> {
    const regressions: Array<{ operation: string; degradationPercentage: number }> = [];

    baseline.forEach(baselineMetric => {
      const currentMetric = current.find(m => m.operation === baselineMetric.operation);
      if (currentMetric) {
        const degradation = ((currentMetric.duration - baselineMetric.duration) / baselineMetric.duration) * 100;
        if (degradation > 20) { // More than 20% slower
          regressions.push({
            operation: baselineMetric.operation,
            degradationPercentage: degradation,
          });
        }
      }
    });

    return regressions;
  }

  function analyzePerfomanceTrends(
    trendData: Array<{ timestamp: Date; metrics: PerformanceMetrics[] }>
  ): Array<{ operation: string; direction: 'improving' | 'degrading' | 'stable'; changePercentage: number }> {
    const trends: Array<{ operation: string; direction: 'improving' | 'degrading' | 'stable'; changePercentage: number }> = [];

    if (trendData.length < 2) return trends;

    const operations = new Set<string>();
    trendData.forEach(data => {
      data.metrics.forEach(metric => operations.add(metric.operation));
    });

    operations.forEach(operation => {
      const operationData = trendData
        .map(data => data.metrics.find(m => m.operation === operation))
        .filter(Boolean) as PerformanceMetrics[];

      if (operationData.length >= 2) {
        const first = operationData[0];
        const last = operationData[operationData.length - 1];
        const changePercentage = ((last.duration - first.duration) / first.duration) * 100;

        let direction: 'improving' | 'degrading' | 'stable';
        if (Math.abs(changePercentage) < 5) {
          direction = 'stable';
        } else if (changePercentage < 0) {
          direction = 'improving';
        } else {
          direction = 'degrading';
        }

        trends.push({ operation, direction, changePercentage });
      }
    });

    return trends;
  }

  async function testWALModePerformance(): Promise<{ throughput: number }> {
    const testData = await dataGenerator.generateStudents(500);
    const collection = await databaseManager.getCollection('students');

    const startTime = Date.now();
    await collection?.insertMany(testData);
    const duration = Date.now() - startTime;

    return {
      throughput: (testData.length / duration) * 1000,
    };
  }

  async function testIndexPerformance(): Promise<{ improvementFactor: number }> {
    const testData = await dataGenerator.generateStudents(1000);
    const collection = await databaseManager.getCollection('students');
    await collection?.insertMany(testData);

    // Query without index
    const noIndexStart = Date.now();
    await collection?.find({ name: testData[500].name });
    const noIndexDuration = Date.now() - noIndexStart;

    // Create index
    await collection?.createIndex({ name: 1 });

    // Query with index
    const indexStart = Date.now();
    await collection?.find({ name: testData[500].name });
    const indexDuration = Date.now() - indexStart;

    return {
      improvementFactor: noIndexDuration / Math.max(indexDuration, 1),
    };
  }

  async function testTransactionPerformance(): Promise<{ 
    individualThroughput: number; 
    batchThroughput: number; 
  }> {
    const testData = await dataGenerator.generateStudents(100);
    const collection = await databaseManager.getCollection('students');

    // Individual inserts
    const individualStart = Date.now();
    for (const student of testData.slice(0, 50)) {
      await collection?.insert(student);
    }
    const individualDuration = Date.now() - individualStart;
    const individualThroughput = (50 / individualDuration) * 1000;

    // Batch insert (simulates transaction)
    const batchStart = Date.now();
    await collection?.insertMany(testData.slice(50));
    const batchDuration = Date.now() - batchStart;
    const batchThroughput = (50 / batchDuration) * 1000;

    return {
      individualThroughput,
      batchThroughput,
    };
  }
});