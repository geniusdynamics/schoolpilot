// Simple test runner to debug issues
import { execSync } from 'child_process';

try {
  console.log('Starting test execution...');
  const result = execSync('npx vitest run src/tests/integration/BackupSettingsPage.test.tsx --reporter=verbose', {
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log('Test output:', result);
} catch (error) {
  console.error('Test failed with error:');
  console.error('Exit code:', error.status);
  console.error('Stdout:', error.stdout);
  console.error('Stderr:', error.stderr);
  console.error('Error message:', error.message);
}