// ABOUTME: Load transformed data to SchoolPilot database
// ABOUTME: Uses chunk processing for safe data loading with rollback capability

import { MigrationManager } from './chunk_processor';
import { databaseManager } from './database_manager';
import { createLogger } from './migration-logger';
import { rxdbService } from '../../src/services/rxdbService';
import fs from 'fs';

const logger = createLogger('DataLoader');

async function loadData() {
  try {
    logger.info('Initializing RxDB connection...');
    const db = await rxdbService.getDatabase(); // Initialize RxDB
    databaseManager.setRxDBInstance(db);

    logger.info('Reading transformed data...');
    const examinations = JSON.parse(fs.readFileSync('data/transformed/examinations.json', 'utf-8'));
    const subjects = JSON.parse(fs.readFileSync('data/transformed/subjects.json', 'utf-8'));
    const examResults = JSON.parse(fs.readFileSync('data/transformed/exam_results.json', 'utf-8'));

    const migrationManager = new MigrationManager(db, {
      chunkSize: 1000,
      maxRetries: 3,
      rollbackOnError: true,
      validateBeforeCommit: true,
      logLevel: 'info'
    });

    logger.info('Loading examinations...');
    await migrationManager.processInChunks(examinations, async (batch) => {
      return batch.map((exam: any) => ({
        id: exam.id,
        collectionName: 'exam_sessions',
        data: exam,
        operation: 'insert' as const
      }));
    });

    logger.info('Loading subjects...');
    await migrationManager.processInChunks(subjects, async (batch) => {
      return batch.map((subject: any) => ({
        id: subject.id,
        collectionName: 'subjects',
        data: subject,
        operation: 'insert' as const
      }));
    });

    logger.info('Loading exam results...');
    await migrationManager.processInChunks(examResults, async (batch) => {
      return batch.map((result: any) => ({
        id: result.id,
        collectionName: 'student_exam_results',
        data: result,
        operation: 'insert' as const
      }));
    });

    logger.info('Data loading complete successfully!');
    const stats = migrationManager.getStats();
    logger.info(`Total processed items: ${stats.processedItems}`);

    process.exit(0);
  } catch (error) {
    logger.error('Data loading failed:', error);
    process.exit(1);
  } finally {
    await databaseManager.closeAllConnections();
  }
}

loadData().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
