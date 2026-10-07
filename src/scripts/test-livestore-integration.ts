#!/usr/bin/env node

// ABOUTME: Test script to verify LiveStore integration with existing database interfaces
// ABOUTME: This script tests CRUD operations, reactive subscriptions, and compatibility

import { SQLiteWASMProvider } from '@/services/database/LiveStoreProvider';
import { LiveStoreSchema } from '../livestore/schema';
import type { Student } from '@/core/types';


interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

class SQLiteWASMIntegrationTest {
  private provider: SQLiteWASMProvider | null = null;
  private results: TestResult[] = [];

  async initialize(): Promise<void> {
    console.log('🧪 Initializing LiveStore Integration Test...');

    const config: DatabaseConfig = {
      name: 'schoolpilot_test',
      version: 1,
      collections: LiveStoreSchema.collections,
      options: {
        wasmSqlite: true,
        opfsStorage: true,
        crossTabPersistence: false, // Disable for testing
        debug: true
      }
    };

    try {
      this.provider = new SQLiteWASMProvider();
      await this.provider.initialize(config);
      console.log('✅ SQLite WASM provider initialized for testing');
    } catch (error) {
      throw new Error(`Failed to initialize LiveStore: ${error}`);
    }
  }

  async runTest(testName: string, testFn: () => Promise<any>): Promise<TestResult> {
    const startTime = Date.now();
    console.log(`\n🔬 Running test: ${testName}`);

    try {
      const details = await testFn();
      const duration = Date.now() - startTime;
      const result: TestResult = {
        testName,
        success: true,
        duration,
        details
      };
      
      console.log(`✅ ${testName} - PASSED (${duration}ms)`);
      this.results.push(result);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: TestResult = {
        testName,
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error)
      };
      
      console.log(`❌ ${testName} - FAILED (${duration}ms): ${result.error}`);
      this.results.push(result);
      return result;
    }
  }

  async testProviderStatus(): Promise<any> {
    if (!this.provider) throw new Error('Provider not initialized');
    
    const status = await this.provider.getStatus();
    
    if (status.status !== 'ready') {
      throw new Error(`Expected status 'ready', got '${status.status}'`);
    }
    
    return { status: status.status, collections: status.collections };
  }

  async testCollectionCreation(): Promise<any> {
    if (!this.provider) throw new Error('Provider not initialized');
    
    const collectionName = 'students';
    const collection = await this.provider.getCollection(collectionName);
    
    if (!collection) {
      throw new Error(`Failed to get collection '${collectionName}'`);
    }
    
    const stats = await collection.getStats();
    return { collectionName, stats };
  }

  async testCRUDOperations(): Promise<any> {
    if (!this.provider) throw new Error('Provider not initialized');
    
    const collection = await this.provider.getCollection('students');
    
    // Test data
    const testStudent: Partial<Student> = {
      id: 'test-student-001',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@test.com',
      student_number: 'STU001',
      date_of_birth: '2005-01-15',
      gender: 'male',
      status: 'active',
      enrollment_status: 'enrolled',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // CREATE
    const insertResult = await collection.insert(testStudent);
    if (!insertResult.success) {
      throw new Error(`Insert failed: ${insertResult.error}`);
    }

    // READ
    const findResult = await collection.findById(testStudent.id!);
    if (!findResult) {
      throw new Error('Failed to find inserted student');
    }

    // UPDATE
    const updateData = { first_name: 'Jane' };
    const updateResult = await collection.update(testStudent.id!, updateData);
    if (!updateResult.success) {
      throw new Error(`Update failed: ${updateResult.error}`);
    }

    // Verify update
    const updatedStudent = await collection.findById(testStudent.id!);
    if (updatedStudent?.first_name !== 'Jane') {
      throw new Error('Update verification failed');
    }

    // DELETE
    const deleteResult = await collection.delete(testStudent.id!);
    if (!deleteResult.success) {
      throw new Error(`Delete failed: ${deleteResult.error}`);
    }

    // Verify deletion
    const deletedStudent = await collection.findById(testStudent.id!);
    if (deletedStudent) {
      throw new Error('Delete verification failed - student still exists');
    }

    return {
      insert: insertResult,
      update: updateResult,
      delete: deleteResult
    };
  }

  async testQueryOperations(): Promise<any> {
    if (!this.provider) throw new Error('Provider not initialized');
    
    const collection = await this.provider.getCollection('students');
    
    // Insert test data
    const testStudents = [
      {
        id: 'query-test-001',
        first_name: 'Alice',
        last_name: 'Smith',
        email: 'alice@test.com',
        student_number: 'QT001',
        gender: 'female',
        status: 'active',
        enrollment_status: 'enrolled',
        created_at: new Date().toISOString()
      },
      {
        id: 'query-test-002',
        first_name: 'Bob',
        last_name: 'Johnson',
        email: 'bob@test.com',
        student_number: 'QT002',
        gender: 'male',
        status: 'inactive',
        enrollment_status: 'enrolled',
        created_at: new Date().toISOString()
      }
    ];

    // Insert test data
    const insertResults = await collection.insertMany(testStudents);
    if (insertResults.errors.length > 0) {
      throw new Error(`Insert errors: ${insertResults.errors.map(e => e.message).join(', ')}`);
    }

    try {
      // Test find with filter
      const activeStudents = await collection.find({
        filter: { status: 'active' },
        limit: 10
      });
      
      if (activeStudents.length !== 1) {
        throw new Error(`Expected 1 active student, found ${activeStudents.length}`);
      }

      // Test find with multiple filters
      const maleStudents = await collection.find({
        filter: { gender: 'male', enrollment_status: 'enrolled' },
        limit: 10
      });
      
      if (maleStudents.length !== 1) {
        throw new Error(`Expected 1 male enrolled student, found ${maleStudents.length}`);
      }

      // Test find all
      const allTestStudents = await collection.find({
        filter: { student_number: { $regex: '^QT' } },
        limit: 10
      });
      
      if (allTestStudents.length !== 2) {
        throw new Error(`Expected 2 test students, found ${allTestStudents.length}`);
      }

      return {
        activeStudents: activeStudents.length,
        maleStudents: maleStudents.length,
        totalTestStudents: allTestStudents.length
      };
    } finally {
      // Cleanup test data
      await collection.delete('query-test-001');
      await collection.delete('query-test-002');
    }
  }

  async testReactiveSubscriptions(): Promise<any> {
    if (!this.provider) throw new Error('Provider not initialized');
    
    const collection = await this.provider.getCollection('subjects');
    
    return new Promise((resolve, reject) => {
      let changeCount = 0;
      const changes: any[] = [];
      
      // Set up subscription
      const subscription = collection.subscribe({
        filter: { code: 'TEST' },
        limit: 10
      }, (change) => {
        changeCount++;
        changes.push(change);
        
        // Resolve after receiving expected changes
        if (changeCount >= 2) {
          subscription.unsubscribe();
          resolve({
            changeCount,
            changes: changes.map(c => ({ type: c.type, id: c.document?.id }))
          });
        }
      });

      // Trigger changes
      setTimeout(async () => {
        try {
          // Insert
          await collection.insert({
            id: 'reactive-test-001',
            name: 'Test Subject',
            code: 'TEST',
            created_at: new Date().toISOString()
          });
          
          // Update
          setTimeout(async () => {
            await collection.update('reactive-test-001', {
              name: 'Updated Test Subject'
            });
            
            // Cleanup after test
            setTimeout(async () => {
              await collection.delete('reactive-test-001');
            }, 100);
          }, 100);
        } catch (error) {
          subscription.unsubscribe();
          reject(error);
        }
      }, 100);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        subscription.unsubscribe();
        reject(new Error('Reactive test timeout'));
      }, 5000);
    });
  }

  async testPerformanceMetrics(): Promise<any> {
    if (!this.provider) throw new Error('Provider not initialized');
    
    const collection = await this.provider.getCollection('classes');
    
    // Insert test data for performance testing
    const testClasses = Array.from({ length: 50 }, (_, i) => ({
      id: `perf-test-${i.toString().padStart(3, '0')}`,
      name: `Test Class ${i + 1}`,
      code: `TC${i + 1}`,
      created_at: new Date().toISOString()
    }));

    const startTime = Date.now();
    
    try {
      // Bulk insert
      const insertResult = await collection.insertMany(testClasses);
      const insertTime = Date.now() - startTime;
      
      if (insertResult.errors.length > 0) {
        throw new Error(`Insert errors: ${insertResult.errors.length}`);
      }

      // Query performance
      const queryStartTime = Date.now();
      const results = await collection.find({
        filter: { code: { $regex: '^TC' } },
        limit: 100
      });
      const queryTime = Date.now() - queryStartTime;

      // Get performance metrics
      const metrics = await collection.getPerformanceMetrics();

      return {
        insertTime,
        queryTime,
        recordsInserted: insertResult.inserted.length,
        recordsQueried: results.length,
        metrics
      };
    } finally {
      // Cleanup
      for (const testClass of testClasses) {
        await collection.delete(testClass.id);
      }
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting LiveStore Integration Tests...');
    
    await this.runTest('Provider Status', () => this.testProviderStatus());
    await this.runTest('Collection Creation', () => this.testCollectionCreation());
    await this.runTest('CRUD Operations', () => this.testCRUDOperations());
    await this.runTest('Query Operations', () => this.testQueryOperations());
    await this.runTest('Reactive Subscriptions', () => this.testReactiveSubscriptions());
    await this.runTest('Performance Metrics', () => this.testPerformanceMetrics());
  }

  async cleanup(): Promise<void> {
    if (this.provider) {
      try {
        await this.provider.destroy();
        console.log('🧹 Test cleanup completed');
      } catch (error) {
        console.warn(`⚠️  Cleanup warning: ${error}`);
      }
    }
  }

  printSummary(): void {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log('\n📊 Test Summary:');
    console.log(`  📋 Total Tests: ${totalTests}`);
    console.log(`  ✅ Passed: ${passedTests}`);
    console.log(`  ❌ Failed: ${failedTests}`);
    console.log(`  ⏱️  Total Duration: ${totalDuration}ms`);
    console.log(`  📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`  - ${r.testName}: ${r.error}`);
        });
    }

    if (passedTests === totalTests) {
      console.log('\n🎉 All tests passed! LiveStore integration is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the errors above.');
    }
  }
}

export async function runIntegrationTests(): Promise<void> {

  
  try {
    await tester.initialize();
    await tester.runAllTests();
    tester.printSummary();
    
    const failedTests = tester.results.filter(r => !r.success).length;
    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Integration test failed:', error);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runIntegrationTests().catch(error => {
    console.error('💥 Unhandled test error:', error);
    process.exit(1);
  });
}

export { SQLiteWASMIntegrationTest, runIntegrationTests };
export type { TestResult };