const { execSync } = require('child_process');
const fs = require('fs');

const timestamp = new Date().toISOString();
let output = `React 19 Compatibility Test Results - ${timestamp}\n`;
output += '='.repeat(60) + '\n\n';

try {
  // Test 1: React 19 Environment Check
  output += '1. React 19 Environment Check\n';
  output += '-'.repeat(30) + '\n';
  try {
    const result1 = execSync('npx vitest run src/tests/react19-check.test.tsx --reporter=basic', { 
      encoding: 'utf8', 
      timeout: 30000 
    });
    output += '✅ PASSED\n';
    output += result1 + '\n\n';
  } catch (error) {
    output += '❌ FAILED\n';
    output += `Exit code: ${error.status}\n`;
    output += `Output: ${error.stdout}\n`;
    output += `Error: ${error.stderr}\n\n`;
  }

  // Test 2: Simple Render Test
  output += '2. Simple Component Render Test\n';
  output += '-'.repeat(30) + '\n';
  try {
    const result2 = execSync('npx vitest run src/tests/simple-render.test.tsx --reporter=basic', { 
      encoding: 'utf8', 
      timeout: 30000 
    });
    output += '✅ PASSED\n';
    output += result2 + '\n\n';
  } catch (error) {
    output += '❌ FAILED\n';
    output += `Exit code: ${error.status}\n`;
    output += `Output: ${error.stdout}\n`;
    output += `Error: ${error.stderr}\n\n`;
  }

  // Test 3: Overall Test Status
  output += '3. Overall Test Status\n';
  output += '-'.repeat(30) + '\n';
  try {
    const result3 = execSync('npx vitest run --reporter=basic', { 
      encoding: 'utf8', 
      timeout: 60000 
    });
    output += '✅ ALL TESTS PASSED\n';
    output += result3 + '\n\n';
  } catch (error) {
    output += '❌ SOME TESTS FAILED\n';
    output += `Exit code: ${error.status}\n`;
    output += `Output: ${error.stdout}\n`;
    output += `Error: ${error.stderr}\n\n`;
  }

} catch (error) {
  output += `Unexpected error: ${error.message}\n`;
}

fs.writeFileSync('react19-test-results.txt', output);
console.log('Test results written to react19-test-results.txt');
console.log('\nSummary written to file. Check react19-test-results.txt for details.');