// ABOUTME: Verify migration data integrity and completeness
// ABOUTME: Compares source and destination data counts and validates relationships

import { databaseManager } from './database_manager';
import { createLogger } from './migration-logger';
import { rxdbService } from '../../src/services/rxdbService';
import fs from 'fs';

const logger = createLogger('MigrationVerifier');

interface VerificationResult {
  entity: string;
  source_count: number;
  target_count: number;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
}

async function verifyMigration() {
  const results: VerificationResult[] = [];
  
  try {
    logger.info('Starting migration verification...');
    
    const akademicoConnection = await databaseManager.getAkademicoConnection();
    const db = await rxdbService;
    databaseManager.setRxDBInstance(db);

    // Verify examinations
    logger.info('Verifying examinations...');
    const sourceExaminationsCount = await akademicoConnection.query(
      "SELECT COUNT(*) as count FROM examinations"
    );
    const targetExaminationsCount = await db.exam_sessions.count().exec();
    
    results.push({
      entity: 'examinations',
      source_count: sourceExaminationsCount[0].count,
      target_count: targetExaminationsCount,
      status: sourceExaminationsCount[0].count === targetExaminationsCount ? 'PASS' : 'FAIL',
      message: sourceExaminationsCount[0].count === targetExaminationsCount 
        ? 'Counts match perfectly' 
        : `Source: ${sourceExaminationsCount[0].count}, Target: ${targetExaminationsCount}`
    });

    // Verify subjects
    logger.info('Verifying subjects...');
    const sourceSubjectsCount = await akademicoConnection.query(
      "SELECT COUNT(*) as count FROM subjects"
    );
    const targetSubjectsCount = await db.subjects.count().exec();
    
    results.push({
      entity: 'subjects',
      source_count: sourceSubjectsCount[0].count,
      target_count: targetSubjectsCount,
      status: sourceSubjectsCount[0].count === targetSubjectsCount ? 'PASS' : 'FAIL',
      message: sourceSubjectsCount[0].count === targetSubjectsCount 
        ? 'Counts match perfectly' 
        : `Source: ${sourceSubjectsCount[0].count}, Target: ${targetSubjectsCount}`
    });

    // Verify exam results
    logger.info('Verifying exam results...');
    const sourceExamResultsCount = await akademicoConnection.query(
      "SELECT COUNT(*) as count FROM exam_results"
    );
    const targetExamResultsCount = await db.student_exam_results.count().exec();
    
    results.push({
      entity: 'exam_results',
      source_count: sourceExamResultsCount[0].count,
      target_count: targetExamResultsCount,
      status: sourceExamResultsCount[0].count === targetExamResultsCount ? 'PASS' : 'FAIL',
      message: sourceExamResultsCount[0].count === targetExamResultsCount 
        ? 'Counts match perfectly' 
        : `Source: ${sourceExamResultsCount[0].count}, Target: ${targetExamResultsCount}`
    });

    // Additional data integrity checks
    logger.info('Performing data integrity checks...');
    
    // Check for orphaned records
    const orphanedResults = await db.student_exam_results.find({
      selector: {
        exam_session_id: { $exists: false }
      }
    }).exec();
    
    if (orphanedResults.length > 0) {
      results.push({
        entity: 'orphaned_exam_results',
        source_count: 0,
        target_count: orphanedResults.length,
        status: 'WARNING',
        message: `Found ${orphanedResults.length} exam results without valid exam session ID`
      });
    }

    // Generate verification report
    logger.info('Generating verification report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      overall_status: results.every(r => r.status === 'PASS') ? 'PASS' : 
                     results.some(r => r.status === 'FAIL') ? 'FAIL' : 'WARNING',
      results: results,
      summary: {
        total_entities: results.length,
        passed: results.filter(r => r.status === 'PASS').length,
        failed: results.filter(r => r.status === 'FAIL').length,
        warnings: results.filter(r => r.status === 'WARNING').length
      }
    };

    // Save report to file
    if (!fs.existsSync('data/reports')) {
      fs.mkdirSync('data/reports', { recursive: true });
    }
    
    fs.writeFileSync(
      `data/reports/migration-verification-${Date.now()}.json`, 
      JSON.stringify(report, null, 2)
    );

    // Log results
    logger.info('📊 Verification Results:');
    results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      logger.info(`${icon} ${result.entity}: ${result.message}`);
    });

    logger.info(`\n📋 Summary:`);
    logger.info(`Total entities verified: ${report.summary.total_entities}`);
    logger.info(`Passed: ${report.summary.passed}`);
    logger.info(`Failed: ${report.summary.failed}`);
    logger.info(`Warnings: ${report.summary.warnings}`);
    logger.info(`Overall status: ${report.overall_status}`);

    if (report.overall_status === 'FAIL') {
      logger.error('❌ Migration verification failed! Please review the issues above.');
      process.exit(1);
    } else {
      logger.info('✅ Migration verification completed successfully!');
      process.exit(0);
    }

  } catch (error) {
    logger.error('Migration verification failed:', error);
    process.exit(1);
  } finally {
    await databaseManager.closeAllConnections();
  }
}

verifyMigration().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
