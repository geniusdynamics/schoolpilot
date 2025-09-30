const { execSync } = require('child_process');
const fs = require('fs');

// Check if we can run a simple test
try {
  console.log('Testing React 19 environment...');
  const output = execSync('npx vitest run src/tests/react19-environment.test.tsx --reporter=verbose', {
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: 30000
  });
  console.log('React 19 test SUCCESS:');
  console.log(output);
} catch (error) {
  console.log('React 19 test ERROR:');
  console.log('Exit code:', error.status);
  console.log('STDOUT:', error.stdout);
  console.log('STDERR:', error.stderr);
}

// Check BackupSettingsPage test specifically
try {
  console.log('\n\nTesting BackupSettingsPage...');
  const output = execSync('npx vitest run src/tests/integration/BackupSettingsPage.test.tsx --reporter=verbose', {
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: 30000
  });
  console.log('BackupSettingsPage test SUCCESS:');
  console.log(output);
} catch (error) {
  console.log('BackupSettingsPage test ERROR:');
  console.log('Exit code:', error.status);
  console.log('STDOUT:', error.stdout);
  console.log('STDERR:', error.stderr);
}

// Check a simple test
try {
  console.log('\n\nTesting simple render...');
  const output = execSync('npx vitest run src/tests/simple-render.test.tsx --reporter=verbose', {
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: 30000
  });
  console.log('Simple render test SUCCESS:');
  console.log(output);
} catch (error) {
  console.log('Simple render test ERROR:');
  console.log('Exit code:', error.status);
  console.log('STDOUT:', error.stdout);
  console.log('STDERR:', error.stderr);
}