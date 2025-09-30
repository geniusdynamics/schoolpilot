const { execSync } = require('child_process');
const fs = require('fs');

function runTest(testName, command) {
  console.log(`\n=== ${testName} ===`);
  try {
    const result = execSync(command, { 
      encoding: 'utf8', 
      cwd: process.cwd(),
      timeout: 60000
    });
    console.log('✅ PASSED');
    console.log(result);
    return { success: true, output: result };
  } catch (error) {
    console.log('❌ FAILED');
    console.log('Exit code:', error.status);
    console.log('STDOUT:', error.stdout);
    console.log('STDERR:', error.stderr);
    return { success: false, output: error.stdout + error.stderr };
  }
}

function main() {
  console.log('React 19 Compatibility Test Suite');
  console.log('==================================');
  
  const tests = [
    {
      name: 'React 19 Environment Check',
      command: 'npx vitest run src/tests/react19-check.test.tsx --reporter=verbose'
    },
    {
      name: 'Simple Component Render Test',
      command: 'npx vitest run src/tests/simple-render.test.tsx --reporter=verbose'
    },
    {
      name: 'All Tests Summary',
      command: 'npx vitest run --reporter=basic'
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const result = runTest(test.name, test.command);
    results.push({ ...test, ...result });
  }
  
  console.log('\n\n=== FINAL SUMMARY ===');
  results.forEach(result => {
    console.log(`${result.success ? '✅' : '❌'} ${result.name}`);
  });
  
  const passedTests = results.filter(r => r.success).length;
  const totalTests = results.length;
  
  console.log(`\nOverall: ${passedTests}/${totalTests} test suites passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All React 19 compatibility tests are passing!');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests are still failing. Check the output above for details.');
    process.exit(1);
  }
}

main();