// ABOUTME: Transform legacy data to new schema
// ABOUTME: Applies mapping rules and prepares for loading to SchoolPilot

import { AcademicsMigrationUtils } from '../../src/modules/academics/data/migration-utils';
import { createLogger } from './migration-logger';
import fs from 'fs';

const logger = createLogger('DataTransformer');

async function transformData() {
  try {
    logger.info('Reading extracted data from files...');
    
    const examinations = JSON.parse(fs.readFileSync('data/extracted/examinations.json', 'utf-8'));
    const subjects = JSON.parse(fs.readFileSync('data/extracted/subjects.json', 'utf-8'));
    const examResults = JSON.parse(fs.readFileSync('data/extracted/exam_results.json', 'utf-8'));

    logger.info('Transforming data...');

    const transformedExaminations = examinations.map((exam: any) =>
      AcademicsMigrationUtils.transformExaminationToExamSession(exam, 1) // Example schoolPeriodId
    );

    const transformedSubjects = subjects.map((subject: any) =>
      AcademicsMigrationUtils.transformLegacySubject(subject)
    );

    const transformedExamResults = examResults.map((result: any) =>
      AcademicsMigrationUtils.transformExamResultToStudentExamResult(result, 'studentId', 'sessionId')
    );

    logger.info('Saving transformed data to disk...');
    fs.writeFileSync('data/transformed/examinations.json', JSON.stringify(transformedExaminations, null, 2));
    fs.writeFileSync('data/transformed/subjects.json', JSON.stringify(transformedSubjects, null, 2));
    fs.writeFileSync('data/transformed/exam_results.json', JSON.stringify(transformedExamResults, null, 2));

    logger.info('Data transformation complete.');
    process.exit(0);
  } catch (error) {
    logger.error('Data transformation failed:', error);
    process.exit(1);
  }
}

transformData().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
