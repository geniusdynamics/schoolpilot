const { execSync } = require('child_process');
const fs = require('fs');

const logFile = 'test-results.txt';

function writeLog(message) {
  fs.appendFileSync(logFile, message + '\n');
  console.log(message);
}

// Clear previous log
if (fs.existsSync(logFile)) {
  fs.unlinkSync(logFile);
}

writeLog('=== React 19 Test Results ===');
writeLog('Timestamp: ' + new Date().toISOString());

// Test 1: React 19 environment
try {
  writeLog('\n1. Testing React 19 environment...');
  const output = execSync('npx vitest run src/tests/react19-environment.test.tsx --reporter=verbose', {
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: 30000
  });
  writeLog('✅ React 19 environment test PASSED');
  writeLog('Output: ' + output);
} catch (error) {
  writeLog('❌ React 19 environment test FAILED');
  writeLog('Exit code: ' + error.status);
  writeLog('STDOUT: ' + (error.stdout || 'No stdout'));
  writeLog('STDERR: ' + (error.stderr || 'No stderr'));
}

// Test 2: BackupSettingsPage
try {
  writeLog('\n2. Testing BackupSettingsPage...');
  const output = execSync('npx vitest run src/tests/integration/BackupSettingsPage.test.tsx --reporter=verbose', {
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: 30000
  });
  writeLog('✅ BackupSettingsPage test PASSED');
  writeLog('Output: ' + output);
} catch (error) {
  writeLog('❌ BackupSettingsPage test FAILED');
  writeLog('Exit code: ' + error.status);
  writeLog('STDOUT: ' + (error.stdout || 'No stdout'));
  writeLog('STDERR: ' + (error.stderr || 'No stderr'));
}

// Test 3: Simple render test
try {
  writeLog('\n3. Testing simple render...');
  const output = execSync('npx vitest run src/tests/simple-render.test.tsx --reporter=verbose', {
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: 30000
  });
  writeLog('✅ Simple render test PASSED');
  writeLog('Output: ' + output);
} catch (error) {
  writeLog('❌ Simple render test FAILED');
  writeLog('Exit code: ' + error.status);
  writeLog('STDOUT: ' + (error.stdout || 'No stdout'));
  writeLog('STDERR: ' + (error.stderr || 'No stderr'));
}

writeLog('\n=== Test Results Complete ===');
writeLog('Results saved to: ' + logFile);