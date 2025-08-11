// Test script to debug authentication issue
// Run this in the browser console

async function testAuthFlow() {
  console.log('=== TESTING AUTHENTICATION FLOW ===');
  
  // Test 1: Check if authService is available
  console.log('Test 1: Checking authService availability...');
  if (typeof window.authService !== 'undefined') {
    console.log('✅ authService is available on window');
  } else {
    console.log('❌ authService is NOT available on window');
  }
  
  // Test 2: Check if auth context is working
  console.log('\nTest 2: Checking auth context...');
  const authContextElement = document.querySelector('[data-auth-context]');
  if (authContextElement) {
    console.log('✅ Auth context element found');
  } else {
    console.log('⚠️ Auth context element not found');
  }
  
  // Test 3: Check localStorage for session
  console.log('\nTest 3: Checking localStorage for session...');
  const sessionKey = 'schoolpilot_auth_session';
  const session = localStorage.getItem(sessionKey);
  if (session) {
    try {
      const parsedSession = JSON.parse(session);
      console.log('✅ Session found:', parsedSession);
      console.log('  - User:', parsedSession.user?.username);
      console.log('  - Expires:', new Date(parsedSession.expiresAt));
      console.log('  - Is expired?', new Date(parsedSession.expiresAt) < new Date());
    } catch (e) {
      console.log('❌ Failed to parse session:', e);
    }
  } else {
    console.log('❌ No session found in localStorage');
  }
  
  // Test 4: Check database availability
  console.log('\nTest 4: Checking database availability...');
  if (typeof window.APP_DB !== 'undefined') {
    console.log('✅ APP_DB is available');
    console.log('  - Collections:', Object.keys(window.APP_DB.collections || {}).length);
  } else {
    console.log('❌ APP_DB is NOT available');
  }
  
  // Test 5: Try to get current user
  console.log('\nTest 5: Attempting to get current user...');
  try {
    // Check if authService is available through imports
    const authServiceModule = await import('./src/services/authService.ts');
    const authService = authServiceModule.authService;
    
    if (authService) {
      const isInit = authService.isInitialized();
      console.log('  - authService initialized?', isInit);
      
      const isAuth = authService.isAuthenticated();
      console.log('  - User authenticated?', isAuth);
      
      const user = await authService.getCurrentUser();
      if (user) {
        console.log('✅ Current user:', user);
      } else {
        console.log('❌ No current user');
      }
    }
  } catch (e) {
    console.log('❌ Failed to access authService:', e.message);
  }
  
  // Test 6: Try demo login
  console.log('\nTest 6: Attempting demo login...');
  try {
    const authServiceModule = await import('./src/services/authService.ts');
    const authService = authServiceModule.authService;
    
    if (authService) {
      const result = await authService.login({
        username: 'admin',
        password: 'admin123'
      });
      
      if (result.success) {
        console.log('✅ Demo login successful:', result);
        console.log('  - User:', result.user?.username);
        console.log('  - Role:', result.user?.role);
      } else {
        console.log('❌ Demo login failed:', result.message);
        console.log('  - Errors:', result.errors);
      }
    }
  } catch (e) {
    console.log('❌ Failed to perform demo login:', e);
    console.log('  - Error details:', e.message);
    console.log('  - Stack:', e.stack);
  }
  
  console.log('\n=== END OF AUTHENTICATION TEST ===');
}

// Run the test
testAuthFlow();
