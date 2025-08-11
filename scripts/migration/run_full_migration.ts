// ABOUTME: Run the full migration process from extraction to verification
// ABOUTME: Includes extraction, transformation, loading, and verification

import { createLogger } from './migration-logger';
import { spawn } from 'child_process';
import path from 'path';

const logger = createLogger('FullMigration');

async function executeCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: true });
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
  });
}

async function runFullMigration() {
  try {
    logger.info('Running full migration process...');

    // Step 1: Extract data
    logger.info('Step 1: Extracting data...');
    await executeCommand('npm', ['run', 'migration:extract']);

    // Step 2: Transform data
    logger.info('Step 2: Transforming data...');
    await executeCommand('npm', ['run', 'migration:transform']);

    // Step 3: Load data
    logger.info('Step 3: Loading data...');
    await executeCommand('npm', ['run', 'migration:load']);

    // Step 4: Verify migration
    logger.info('Step 4: Verifying migration...');
    await executeCommand('npm', ['run', 'migration:verify']);

    logger.info('✅ Full migration process completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Full migration process failed:', error);
    process.exit(1);
  }
}

runFullMigration().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

