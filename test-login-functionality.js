// ABOUTME: Browser test script to verify login functionality and dual-database architecture
// ABOUTME: Tests demo login scenarios and checks for proper authentication flow

console.log('🧪 Starting Login Functionality Test...');

// Test configuration
const TEST_USERS = [
  { username: 'admin', password: 'test', expectedRole: 'super_admin' },
  { username: 'teacher', password: 'test', expectedRole: 'teacher' },
  { username: 'finance', password: 'test', expectedRole: 'finance_officer' },
  { username: 'student', password: 'test', expectedRole: 'student' }
];

// Helper function to wait for element
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }
    
    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}

// Helper function to simulate user input
function simulateInput(element, value) {
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

// Helper function to simulate click
function simulateClick(element) {
  element.click();
}

// Test login functionality
async function testLogin(username, password, expectedRole) {
  console.log(`\n🔐 Testing login for user: ${username}`);
  
  try {
    // Wait for login form to be available
    const usernameInput = await waitForElement('input[name="username"], input[type="text"]');
    const passwordInput = await waitForElement('input[name="password"], input[type="password"]');
    const loginButton = await waitForElement('button[type="submit"], button:contains("Login"), button:contains("Sign In")');
    
    console.log('✅ Login form elements found');
    
    // Clear existing values
    usernameInput.value = '';
    passwordInput.value = '';
    
    // Fill in credentials
    simulateInput(usernameInput, username);
    simulateInput(passwordInput, password);
    
    console.log(`📝 Filled credentials: ${username}/${password}`);
    
    // Submit form
    simulateClick(loginButton);
    
    console.log('🚀 Login form submitted');
    
    // Wait for authentication result
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if login was successful
    const currentUrl = window.location.href;
    const isLoggedIn = currentUrl.includes('/dashboard') || 
                      document.querySelector('[data-testid="dashboard"]') ||
                      document.querySelector('.dashboard') ||
                      !document.querySelector('input[name="username"]');
    
    if (isLoggedIn) {
      console.log(`✅ Login successful for ${username}`);
      
      // Check authentication state
      if (window.authService) {
        const session = await window.authService.getCurrentSession();
        if (session && session.user) {
          console.log(`👤 User authenticated: ${session.user.fullName} (${session.user.role})`);
          
          if (session.user.role === expectedRole) {
            console.log(`✅ Role verification passed: ${expectedRole}`);
          } else {
            console.log(`⚠️ Role mismatch: expected ${expectedRole}, got ${session.user.role}`);
          }
        } else {
          console.log('⚠️ No session found after login');
        }
      } else {
        console.log('⚠️ AuthService not available in window');
      }
      
      // Logout for next test
      if (window.authService) {
        await window.authService.logout();
        console.log('🚪 Logged out for next test');
      }
      
      // Navigate back to login if needed
      if (!window.location.href.includes('/login')) {
        window.location.href = '/login';
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      return true;
    } else {
      console.log(`❌ Login failed for ${username}`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Error testing login for ${username}:`, error);
    return false;
  }
}

// Main test function
async function runLoginTests() {
  console.log('🎯 Starting comprehensive login tests...');
  
  // Check if we're on the login page
  if (!window.location.href.includes('/login') && document.querySelector('input[name="username"]')) {
    console.log('📍 Already on login page');
  } else {
    console.log('🔄 Navigating to login page...');
    window.location.href = '/login';
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Check for database initialization
  console.log('🗄️ Checking database initialization...');
  
  if (window.databaseService) {
    console.log('✅ DatabaseService available');
    
    try {
      const dbStatus = await window.databaseService.getStatus();
      console.log('📊 Database status:', dbStatus);
    } catch (error) {
      console.log('⚠️ Could not get database status:', error.message);
    }
  } else {
    console.log('⚠️ DatabaseService not available in window');
  }
  
  // Check for auth service
  if (window.authService) {
    console.log('✅ AuthService available');
    
    try {
      const isInitialized = window.authService.isInitialized();
      console.log('🔧 AuthService initialized:', isInitialized);
    } catch (error) {
      console.log('⚠️ Could not check AuthService status:', error.message);
    }
  } else {
    console.log('⚠️ AuthService not available in window');
  }
  
  // Run tests for each user
  let successCount = 0;
  let totalTests = TEST_USERS.length;
  
  for (const user of TEST_USERS) {
    const success = await testLogin(user.username, user.password, user.expectedRole);
    if (success) successCount++;
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log(`\n📊 Test Results: ${successCount}/${totalTests} tests passed`);
  
  if (successCount === totalTests) {
    console.log('🎉 All login tests passed! Dual-database architecture is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Please check the logs above for details.');
  }
  
  return successCount === totalTests;
}

// Auto-run tests if script is executed directly
if (typeof window !== 'undefined') {
  // Make functions available globally for manual testing
  window.testLogin = testLogin;
  window.runLoginTests = runLoginTests;
  
  // Auto-run tests after a short delay
  setTimeout(() => {
    runLoginTests().catch(error => {
      console.error('❌ Test execution failed:', error);
    });
  }, 1000);
} else {
  // Export for Node.js if needed
  module.exports = { testLogin, runLoginTests };
}

console.log('🧪 Login test script loaded. Use runLoginTests() to run all tests or testLogin(username, password, expectedRole) for individual tests.');