// ABOUTME: Browser console test script for login functionality and Bugsink error reporting
// ABOUTME: Run this script in the browser console to test demo credentials and error tracking

// Login Test Script for Browser Console
// Copy and paste this entire script into the browser console on the login page

console.log('🧪 Starting Login Functionality Test...');
console.log('📍 Make sure you are on the login page (/#/login) before running this test');

// Test configuration
const TEST_CONFIG = {
  demoUsers: [
    { username: 'admin', password: 'admin123', role: 'Super Administrator' },
    { username: 'teacher', password: 'teacher123', role: 'Teacher' },
    { username: 'finance', password: 'finance123', role: 'Finance Officer' },
    { username: 'student', password: 'student123', role: 'Student' }
  ],
  invalidCredentials: [
    { username: 'admin', password: 'wrongpassword', description: 'Valid user, wrong password' },
    { username: 'nonexistent', password: 'anypassword', description: 'Non-existent user' },
    { username: 'admin', password: '', description: 'Empty password' },
    { username: '', password: 'admin123', description: 'Empty username' }
  ],
  delay: 1000 // Delay between tests in milliseconds
};

// Helper function to wait
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to fill login form
function fillLoginForm(username, password) {
  const usernameInput = document.querySelector('input[name="username"], input[type="text"], input[placeholder*="username" i], input[placeholder*="user" i]');
  const passwordInput = document.querySelector('input[name="password"], input[type="password"]');
  
  if (!usernameInput || !passwordInput) {
    throw new Error('Could not find username or password input fields');
  }
  
  // Clear and fill inputs
  usernameInput.value = '';
  passwordInput.value = '';
  
  // Simulate user input with events
  usernameInput.focus();
  usernameInput.value = username;
  usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
  usernameInput.dispatchEvent(new Event('change', { bubbles: true }));
  
  passwordInput.focus();
  passwordInput.value = password;
  passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
  passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
  
  return { usernameInput, passwordInput };
}

// Helper function to submit login form
function submitLoginForm() {
  const submitButton = document.querySelector('button[type="submit"], button:contains("Sign In"), button:contains("Login"), .login-button, .submit-button');
  
  if (!submitButton) {
    // Try to find form and submit it
    const form = document.querySelector('form');
    if (form) {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      return true;
    }
    throw new Error('Could not find submit button or form');
  }
  
  submitButton.click();
  return true;
}

// Helper function to check for error messages
function checkForErrorMessage() {
  const errorSelectors = [
    '.error-message',
    '.alert-error',
    '.text-red-500',
    '.text-red-600',
    '[class*="error"]',
    '[class*="danger"]',
    '.invalid-feedback'
  ];
  
  for (const selector of errorSelectors) {
    const errorElement = document.querySelector(selector);
    if (errorElement && errorElement.textContent.trim()) {
      return errorElement.textContent.trim();
    }
  }
  
  return null;
}

// Helper function to check if logged in
function checkIfLoggedIn() {
  // Check URL change
  if (window.location.hash.includes('/dashboard') || window.location.hash.includes('/home')) {
    return true;
  }
  
  // Check for logout button or user menu
  const logoutButton = document.querySelector('button:contains("Logout"), button:contains("Sign Out"), .logout-button');
  if (logoutButton) {
    return true;
  }
  
  // Check localStorage for session
  const session = localStorage.getItem('schoolpilot_auth_session');
  if (session) {
    try {
      const parsed = JSON.parse(session);
      return parsed && parsed.username;
    } catch (e) {
      return false;
    }
  }
  
  return false;
}

// Helper function to logout
function logout() {
  // Clear session
  localStorage.removeItem('schoolpilot_auth_session');
  
  // Navigate back to login
  window.location.hash = '#/login';
  
  // Try to click logout button if exists
  const logoutButton = document.querySelector('button:contains("Logout"), button:contains("Sign Out"), .logout-button');
  if (logoutButton) {
    logoutButton.click();
  }
}

// Test valid credentials
async function testValidCredentials() {
  console.log('\n🔐 Testing Valid Demo Credentials...');
  
  for (const user of TEST_CONFIG.demoUsers) {
    console.log(`\n   Testing ${user.username} (${user.role})...`);
    
    try {
      // Ensure we're on login page and logged out
      logout();
      await wait(500);
      
      if (!window.location.hash.includes('/login')) {
        window.location.hash = '#/login';
        await wait(1000);
      }
      
      // Fill and submit form
      fillLoginForm(user.username, user.password);
      await wait(200);
      
      submitLoginForm();
      await wait(TEST_CONFIG.delay);
      
      // Check result
      const isLoggedIn = checkIfLoggedIn();
      const errorMessage = checkForErrorMessage();
      
      if (isLoggedIn) {
        console.log(`   ✅ ${user.username}: Login successful`);
        
        // Check session details
        const session = localStorage.getItem('schoolpilot_auth_session');
        if (session) {
          try {
            const parsed = JSON.parse(session);
            console.log(`      - Session user: ${parsed.username}`);
            console.log(`      - Session role: ${parsed.role}`);
            console.log(`      - Is demo: ${parsed.isDemo}`);
          } catch (e) {
            console.log(`      - Session parse error: ${e.message}`);
          }
        }
      } else {
        console.log(`   ❌ ${user.username}: Login failed`);
        if (errorMessage) {
          console.log(`      - Error: ${errorMessage}`);
        }
        
        // This is unexpected for valid credentials - report to Bugsink
        if (window.Sentry) {
          window.Sentry.captureException(new Error(`Valid demo user login failed: ${user.username}`), {
            tags: {
              testType: 'valid_credentials_failure',
              username: user.username,
              role: user.role
            },
            extra: {
              errorMessage: errorMessage || 'No error message displayed',
              currentUrl: window.location.href
            }
          });
        }
      }
      
    } catch (error) {
      console.log(`   ❌ ${user.username}: Exception - ${error.message}`);
      
      // Report exception to Bugsink
      if (window.Sentry) {
        window.Sentry.captureException(error, {
          tags: {
            testType: 'valid_credentials_exception',
            username: user.username,
            role: user.role
          }
        });
      }
    }
  }
}

// Test invalid credentials
async function testInvalidCredentials() {
  console.log('\n🚫 Testing Invalid Credentials...');
  
  for (const cred of TEST_CONFIG.invalidCredentials) {
    console.log(`\n   Testing ${cred.description}...`);
    
    try {
      // Ensure we're on login page and logged out
      logout();
      await wait(500);
      
      if (!window.location.hash.includes('/login')) {
        window.location.hash = '#/login';
        await wait(1000);
      }
      
      // Fill and submit form
      fillLoginForm(cred.username, cred.password);
      await wait(200);
      
      submitLoginForm();
      await wait(TEST_CONFIG.delay);
      
      // Check result
      const isLoggedIn = checkIfLoggedIn();
      const errorMessage = checkForErrorMessage();
      
      if (isLoggedIn) {
        console.log(`   ❌ ${cred.description}: UNEXPECTED SUCCESS - Invalid credentials should not work!`);
        
        // This is bad - report to Bugsink
        if (window.Sentry) {
          window.Sentry.captureException(new Error(`Invalid credentials unexpectedly succeeded: ${cred.description}`), {
            tags: {
              testType: 'invalid_credentials_unexpected_success',
              username: cred.username || '(empty)',
              description: cred.description
            }
          });
        }
      } else {
        console.log(`   ✅ ${cred.description}: Correctly failed`);
        if (errorMessage) {
          console.log(`      - Error message: ${errorMessage}`);
        }
        
        // Report expected failure to Bugsink for tracking
        if (window.Sentry) {
          window.Sentry.captureMessage(`Expected login failure: ${cred.description}`, 'info');
          window.Sentry.addBreadcrumb({
            message: `Login failed as expected: ${cred.description}`,
            category: 'auth.test',
            level: 'info',
            data: {
              username: cred.username || '(empty)',
              errorMessage: errorMessage || 'No error message',
              testType: 'expected_failure'
            }
          });
        }
      }
      
    } catch (error) {
      console.log(`   ⚠️  ${cred.description}: Exception - ${error.message}`);
      
      // Report exception to Bugsink
      if (window.Sentry) {
        window.Sentry.captureException(error, {
          tags: {
            testType: 'invalid_credentials_exception',
            username: cred.username || '(empty)',
            description: cred.description
          }
        });
      }
    }
  }
}

// Test error reporting functionality
function testErrorReporting() {
  console.log('\n📊 Testing Error Reporting to Bugsink...');
  
  if (!window.Sentry) {
    console.log('   ❌ Sentry not available - error reporting may not work');
    return;
  }
  
  try {
    // Test error reporting
    window.Sentry.captureException(new Error('Test error from browser login test'), {
      tags: {
        testType: 'error_reporting_test',
        source: 'browser_console_test'
      },
      extra: {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        currentUrl: window.location.href
      }
    });
    
    // Test message reporting
    window.Sentry.captureMessage('Test message from browser login test', 'warning');
    
    console.log('   ✅ Error reporting test sent to Bugsink');
    
  } catch (error) {
    console.log(`   ❌ Error reporting failed: ${error.message}`);
  }
}

// Main test function
async function runAllTests() {
  console.log('🧪 Starting Comprehensive Login Tests...');
  console.log('⏰ This will take approximately 30-60 seconds to complete');
  
  const startTime = Date.now();
  
  try {
    // Test error reporting first
    testErrorReporting();
    await wait(1000);
    
    // Test valid credentials
    await testValidCredentials();
    await wait(1000);
    
    // Test invalid credentials
    await testInvalidCredentials();
    
    const totalTime = Date.now() - startTime;
    
    console.log('\n✅ All tests completed!');
    console.log(`⏱️  Total time: ${(totalTime / 1000).toFixed(1)} seconds`);
    console.log('📊 Check the Bugsink dashboard for reported errors and messages');
    console.log('🔍 Check browser network tab for Sentry requests');
    
    // Final status report
    if (window.Sentry) {
      window.Sentry.captureMessage(`Login functionality tests completed in ${(totalTime / 1000).toFixed(1)}s`, 'info');
    }
    
  } catch (error) {
    console.log(`❌ Test suite failed: ${error.message}`);
    
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        tags: {
          testType: 'test_suite_failure'
        }
      });
    }
  }
}

// Instructions
console.log('\n📋 INSTRUCTIONS:');
console.log('1. Make sure you are on the login page (/#/login)');
console.log('2. Open browser developer tools (F12)');
console.log('3. Go to the Console tab');
console.log('4. Run: runAllTests()');
console.log('\n🚀 Ready to test! Type: runAllTests()');

// Make functions available globally
window.runAllTests = runAllTests;
window.testValidCredentials = testValidCredentials;
window.testInvalidCredentials = testInvalidCredentials;
window.testErrorReporting = testErrorReporting;

console.log('\n✅ Test functions loaded successfully!');
console.log('Available functions:');
console.log('- runAllTests() - Run all tests');
console.log('- testValidCredentials() - Test demo user logins');
console.log('- testInvalidCredentials() - Test invalid logins');
console.log('- testErrorReporting() - Test Bugsink reporting');