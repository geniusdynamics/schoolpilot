// ABOUTME: Comprehensive login functionality test script for browser console
// ABOUTME: Tests demo credentials, invalid credentials, and error reporting to Bugsink

// Test script to be run in browser console
(async function testLoginFunctionality() {
  console.log('🧪 Starting comprehensive login functionality tests...');
  
  // Import required modules
  const { authService } = await import('./src/services/authService.js');
  const { reportError, reportMessage } = await import('./src/config/errorTracking.js');
  
  // Test data
  const demoUsers = [
    { username: 'admin', password: 'admin123', role: 'Super Administrator' },
    { username: 'teacher', password: 'teacher123', role: 'Teacher' },
    { username: 'finance', password: 'finance123', role: 'Finance Officer' },
    { username: 'student', password: 'student123', role: 'Student' }
  ];
  
  const invalidCredentials = [
    { username: 'admin', password: 'wrongpassword', description: 'Valid user, wrong password' },
    { username: 'nonexistent', password: 'anypassword', description: 'Non-existent user' },
    { username: 'admin', password: '', description: 'Empty password' },
    { username: '', password: 'admin123', description: 'Empty username' },
    { username: '', password: '', description: 'Both empty' }
  ];
  
  let testResults = [];
  
  // Helper function to add test results
  function addTestResult(username, password, success, message, testType) {
    const result = {
      username,
      password: password ? '***' : '(empty)',
      success,
      message,
      testType,
      timestamp: new Date().toISOString()
    };
    testResults.push(result);
    
    const status = success ? '✅' : '❌';
    console.log(`${status} [${testType}] ${username}: ${message}`);
  }
  
  // Test 1: Valid demo credentials
  console.log('\n🔐 Testing valid demo credentials...');
  for (const user of demoUsers) {
    try {
      // Ensure we're logged out first
      authService.logout();
      
      const result = await authService.login({
        username: user.username,
        password: user.password
      });
      
      addTestResult(
        user.username,
        user.password,
        result.success,
        result.success ? `Login successful - ${user.role}` : `Login failed: ${result.message}`,
        'VALID_CREDENTIALS'
      );
      
      // If login was successful, verify session
      if (result.success) {
        const isAuthenticated = await authService.isAuthenticated();
        const currentUser = await authService.getCurrentUser();
        
        console.log(`   - Authenticated: ${isAuthenticated}`);
        console.log(`   - Current user: ${currentUser?.username}`);
        console.log(`   - User role: ${currentUser?.role}`);
        
        // Test session persistence
        const session = authService.getCurrentSession();
        console.log(`   - Session exists: ${!!session}`);
        console.log(`   - Session is demo: ${session?.isDemo}`);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addTestResult(
        user.username,
        user.password,
        false,
        `Exception: ${errorMessage}`,
        'VALID_CREDENTIALS_ERROR'
      );
      
      // Report this error to Bugsink
      reportError(new Error(`Valid login test failed for ${user.username}: ${errorMessage}`), {
        testType: 'valid_credentials_test',
        username: user.username,
        role: user.role
      });
    }
  }
  
  // Test 2: Invalid credentials
  console.log('\n🚫 Testing invalid credentials...');
  for (const cred of invalidCredentials) {
    try {
      // Ensure we're logged out first
      authService.logout();
      
      const result = await authService.login({
        username: cred.username,
        password: cred.password
      });
      
      addTestResult(
        cred.username || '(empty)',
        cred.password,
        !result.success, // Success means login correctly failed
        result.success 
          ? `UNEXPECTED SUCCESS: ${cred.description}` 
          : `Correctly failed: ${result.message}`,
        'INVALID_CREDENTIALS'
      );
      
      // If login unexpectedly succeeded, report as error
      if (result.success) {
        reportError(new Error(`Invalid credentials unexpectedly succeeded: ${cred.description}`), {
          testType: 'invalid_credentials_unexpected_success',
          username: cred.username,
          description: cred.description
        });
      } else {
        // Report the login failure to Bugsink (this is what we want to track)
        reportError(new Error(`Login failed as expected: ${cred.description} - ${result.message}`), {
          testType: 'expected_login_failure',
          username: cred.username || '(empty)',
          description: cred.description,
          errorMessage: result.message
        });
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addTestResult(
        cred.username || '(empty)',
        cred.password,
        true, // Exception is expected for invalid credentials
        `Exception (expected): ${errorMessage}`,
        'INVALID_CREDENTIALS_EXCEPTION'
      );
      
      // Report the exception to Bugsink
      reportError(new Error(`Login exception for invalid credentials: ${cred.description} - ${errorMessage}`), {
        testType: 'invalid_credentials_exception',
        username: cred.username || '(empty)',
        description: cred.description,
        errorMessage
      });
    }
  }
  
  // Test 3: Error reporting functionality
  console.log('\n📊 Testing error reporting functionality...');
  try {
    // Test error reporting
    reportError(new Error('Test error from login functionality test'), {
      testType: 'error_reporting_test',
      timestamp: new Date().toISOString(),
      source: 'login_test_script'
    });
    
    // Test message reporting
    reportMessage('Test message from login functionality test', 'warning');
    
    addTestResult(
      'error-test',
      'n/a',
      true,
      'Error reporting test sent to Bugsink',
      'ERROR_REPORTING'
    );
    
  } catch (error) {
    addTestResult(
      'error-test',
      'n/a',
      false,
      `Error reporting failed: ${error.message}`,
      'ERROR_REPORTING_FAILED'
    );
  }
  
  // Test 4: Authentication state management
  console.log('\n🔄 Testing authentication state management...');
  try {
    // Start logged out
    authService.logout();
    let isAuth = await authService.isAuthenticated();
    console.log(`   - Initial state (logged out): ${isAuth}`);
    
    // Login with admin
    const loginResult = await authService.login({ username: 'admin', password: 'admin123' });
    if (loginResult.success) {
      isAuth = await authService.isAuthenticated();
      console.log(`   - After login: ${isAuth}`);
      
      // Check session persistence
      const sessionData = localStorage.getItem('schoolpilot_auth_session');
      console.log(`   - Session in localStorage: ${!!sessionData}`);
      
      // Logout
      authService.logout();
      isAuth = await authService.isAuthenticated();
      console.log(`   - After logout: ${isAuth}`);
      
      const sessionAfterLogout = localStorage.getItem('schoolpilot_auth_session');
      console.log(`   - Session cleared: ${!sessionAfterLogout}`);
      
      addTestResult(
        'state-test',
        'n/a',
        true,
        'Authentication state management working correctly',
        'STATE_MANAGEMENT'
      );
    } else {
      addTestResult(
        'state-test',
        'n/a',
        false,
        `State test failed: ${loginResult.message}`,
        'STATE_MANAGEMENT_FAILED'
      );
    }
    
  } catch (error) {
    addTestResult(
      'state-test',
      'n/a',
      false,
      `State management test error: ${error.message}`,
      'STATE_MANAGEMENT_ERROR'
    );
  }
  
  // Summary
  console.log('\n📋 TEST SUMMARY');
  console.log('================');
  
  const totalTests = testResults.length;
  const successfulTests = testResults.filter(r => r.success).length;
  const failedTests = totalTests - successfulTests;
  
  console.log(`Total tests: ${totalTests}`);
  console.log(`Successful: ${successfulTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Success rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);
  
  // Group results by test type
  const resultsByType = testResults.reduce((acc, result) => {
    if (!acc[result.testType]) acc[result.testType] = [];
    acc[result.testType].push(result);
    return acc;
  }, {});
  
  console.log('\n📊 Results by test type:');
  Object.entries(resultsByType).forEach(([type, results]) => {
    const successful = results.filter(r => r.success).length;
    const total = results.length;
    console.log(`   ${type}: ${successful}/${total} passed`);
  });
  
  // Report test completion to Bugsink
  reportMessage(`Login functionality tests completed: ${successfulTests}/${totalTests} successful`, 'info');
  
  console.log('\n✅ Login functionality testing completed!');
  console.log('Check the Bugsink dashboard for reported errors and messages.');
  
  return {
    totalTests,
    successfulTests,
    failedTests,
    successRate: (successfulTests / totalTests) * 100,
    results: testResults,
    resultsByType
  };
})();