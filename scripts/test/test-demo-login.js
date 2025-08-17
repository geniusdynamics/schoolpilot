// ABOUTME: Test script to verify all demo user credentials work correctly
// ABOUTME: Tests each demo user login and reports results

const demoUsers = [
  { username: 'admin', password: 'admin123', role: 'Super Administrator' },
  { username: 'teacher', password: 'teacher123', role: 'Teacher' },
  { username: 'finance', password: 'finance123', role: 'Finance Officer' },
  { username: 'student', password: 'student123', role: 'Student' }
];

async function testDemoLogin() {
  console.log('🧪 Starting demo login tests...');
  
  // Import authService dynamically
  const { authService } = await import('../../src/services/authService.js');
  
  let passedTests = 0;
  let totalTests = demoUsers.length;
  
  for (const user of demoUsers) {
    console.log(`\n🔐 Testing login for ${user.username} (${user.role})...`);
    
    try {
      // Clear any existing session
      authService.logout();
      
      // Attempt login
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
      console.log(`❌ ${user.username} login error: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All demo login tests passed!');
  } else {
    console.log('⚠️  Some demo login tests failed!');
  }
  
  return passedTests === totalTests;
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testDemoLogin = testDemoLogin;
  console.log('🎯 Demo login test function available: window.testDemoLogin()');
}

// Run if called directly
if (typeof module !== 'undefined' && require.main === module) {
  testDemoLogin().catch(console.error);
}