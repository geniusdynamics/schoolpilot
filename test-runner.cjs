const { execSync } = require('child_process');
const fs = require('fs');

try {
  console.log('Running BackupSettingsPage tests...');
  const output = execSync('npx vitest run src/tests/integration/BackupSettingsPage.test.tsx --reporter=verbose', {
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log('SUCCESS:');
  console.log(output);
} catch (error) {
  console.log('ERROR:');
  console.log('Exit code:', error.status);
  console.log('STDOUT:', error.stdout);
  console.log('STDERR:', error.stderr);
}

try {
  console.log('\n\nRunning all tests...');
  const output = execSync('npm test', {
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log('ALL TESTS SUCCESS:');
  console.log(output);
} catch (error) {
  console.log('ALL TESTS ERROR:');
  console.log('Exit code:', error.status);
  console.log('STDOUT:', error.stdout);
  console.log('STDERR:', error.stderr);
}