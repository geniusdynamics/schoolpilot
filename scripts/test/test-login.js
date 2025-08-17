// ABOUTME: Test script to verify login functionality and error reporting
// ABOUTME: Can be run in browser console to test demo credentials and error tracking

// Test all demo user credentials
async function testAllDemoUsers() {
  console.log('🧪 Testing all demo user credentials...');
  
  const demoUsers = [
    { username: 'admin', password: 'admin123', role: 'Super Administrator' },
    { username: 'teacher', password: 'teacher123', role: 'Teacher' },
    { username: 'finance', password: 'finance123', role: 'Finance Officer' },
    { username: 'student', password: 'student123', role: 'Student' }
  ];
  
  let passedTests = 0;
  
  for (const user of demoUsers) {
    console.log(`\n🔐 Testing ${user.username} (${user.role})...`);
    
    try {
      // Import authService dynamically
      const { authService } = await import('../../src/services/authService.js');
      
      // Clear any existing session
      authService.logout();
      
      // Test login
      const result = await authService.login({
        username: user.username,
        password: user.password
      });
      
      if (result.success) {
        console.log(`✅ ${user.username} login successful`);
        console.log(`   - User: ${result.user?.username}`);
        console.log(`   - Role: ${result.user?.role}`);
        console.log(`   - Demo mode: ${result.session?.isDemo}`);
        passedTests++;
      } else {
        console.log(`❌ ${user.username} login failed: ${result.message}`);
        if (result.errors) {
          console.log(`   - Errors: ${result.errors.join(', ')}`);
        }
      }
    } catch (error) {
      console.log(`❌ ${user.username} login error:`, error);
    }
  }
  
  console.log(`\n📊 Test Results: ${passedTests}/${demoUsers.length} tests passed`);
  
  if (passedTests === demoUsers.length) {
    console.log('🎉 All demo login tests passed!');
    return true;
  } else {
    console.log('⚠️  Some demo login tests failed!');
    return false;
  }
}

// Test invalid credentials (should trigger error reporting)
async function testInvalidCredentials() {
  console.log('🧪 Testing invalid credentials (should trigger error reporting)...');
  
  const invalidTests = [
    { username: 'invalid_user', password: 'password123', expected: 'Invalid username' },
    { username: 'admin', password: '', expected: 'Empty password' },
    { username: '', password: 'password123', expected: 'Empty username' }
  ];
  
  for (const test of invalidTests) {
    try {
      console.log(`🔐 Testing invalid: ${test.username || '[empty]'} / ${test.password || '[empty]'}`);
      
      const { authService } = await import('../../src/services/authService.js');
      const result = await authService.login({
        username: test.username,
        password: test.password
      });
      
      if (!result.success) {
        console.log(`✅ Expected failure: ${result.message}`);
      } else {
        console.log(`❌ Unexpected success for invalid credentials`);
      }
    } catch (error) {
      console.log(`✅ Expected error: ${error.message}`);
    }
  }
}

// Test error reporting manually
function testErrorReporting() {
  console.log('🧪 Testing manual error reporting...');
  
  try {
    // Import error tracking
    import('../../src/config/errorTracking.js').then(({ reportError, reportMessage }) => {
      // Test manual error reporting
      const testError = new Error('Test login error for Bugsink verification');
      reportError(testError, {
        testType: 'manual_login_test',
        username: 'test_user',
        loginType: 'demo',
        errorContext: 'manual_test',
        timestamp: new Date().toISOString()
      });
      
      reportMessage('Login test script executed', 'info');
      
      console.log('✅ Manual error and message sent to Bugsink');
    });
  } catch (error) {
    console.log('❌ Error reporting test failed:', error);
  }
}

// Export functions for browser console use
if (typeof window !== 'undefined') {
  window.testAllDemoUsers = testAllDemoUsers;
  window.testInvalidCredentials = testInvalidCredentials;
  window.testErrorReporting = testErrorReporting;
  
  console.log('🎉 Login test functions available:');
  console.log('  - window.testAllDemoUsers() - Test all demo user credentials');
  console.log('  - window.testInvalidCredentials() - Test invalid credentials');
  console.log('  - window.testErrorReporting() - Test manual error reporting');
}

// Run all tests if called directly
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testAllDemoUsers,
    testInvalidCredentials,
    testErrorReporting
  };
}