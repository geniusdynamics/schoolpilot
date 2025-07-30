// ABOUTME: Extract data from legacy databases
// ABOUTME: Utilizes SQL scripts to pull data for transformation

import { databaseManager } from './database_manager';
import { createLogger } from './migration-logger';
import fs from 'fs';

const logger = createLogger('DataExtractor');

async function extractData() {
  const akademicoConnection = await databaseManager.getAkademicoConnection();
  const schoolPilotConnection = await databaseManager.getSchoolPilotConnection();

  try {
    logger.info('Starting data extraction from Akademico...');

    const examinations = await akademicoConnection.query(fs.readFileSync('scripts/migration/extract_legacy_examinations.sql', 'utf8'));
    const subjects = await akademicoConnection.query(fs.readFileSync('scripts/migration/extract_legacy_subjects.sql', 'utf8'));
    const examResults = await akademicoConnection.query(fs.readFileSync('scripts/migration/extract_legacy_exam_results.sql', 'utf8'));

    logger.info('Data extraction from Akademico complete.');
    logger.info(`Examinations: ${examinations.length} rows`);
    logger.info(`Subjects: ${subjects.length} rows`);
    logger.info(`Exam Results: ${examResults.length} rows`);

    logger.info('Starting data extraction from SchoolPilot...');

    // Example: Fetch some initial entities from SchoolPilot for setup or verification
    const initialSchoolPilotData = await schoolPilotConnection.query('SELECT 1'); // Replace with an actual query
    logger.info('Data extraction from SchoolPilot complete.');

    process.exit(0);
  } catch (error) {
    logger.error('Data extraction failed:', error);
    process.exit(1);
  } finally {
    await databaseManager.closeAllConnections();
  }
}

extractData().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

