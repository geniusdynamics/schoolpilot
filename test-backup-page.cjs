const { execSync } = require('child_process');

try {
  console.log('Testing BackupSettingsPage...');
  const result = execSync('npx vitest run src/tests/integration/BackupSettingsPage.test.tsx --reporter=basic', {
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log('SUCCESS:');
  console.log(result);
} catch (error) {
  console.log('ERROR:');
  console.log('Exit code:', error.status);
  console.log('STDOUT:', error.stdout);
  console.log('STDERR:', error.stderr);
}

try {
  console.log('\nTesting React 19 environment...');
  const result = execSync('npx vitest run src/tests/react19-environment.test.tsx --reporter=basic', {
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log('SUCCESS:');
  console.log(result);
} catch (error) {
  console.log('ERROR:');
  console.log('Exit code:', error.status);
  console.log('STDOUT:', error.stdout);
  console.log('STDERR:', error.stderr);
}