// ABOUTME: Main entry point of the React application.
// ABOUTME: Initializes React DOM and renders the root App component with providers.

// Initialize error tracking first, before any other imports
import { initializeErrorTracking } from './config/errorTracking';
initializeErrorTracking();

import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import i18n, { initializeI18n } from './i18n/i18n'; // Import your i18n configuration
import { initializeUnifiedConfig } from './config/unifiedConfig';

// Initialize unified configuration
initializeUnifiedConfig();

// Wait for i18n to be ready before rendering
const initializeApp = async () => {
  try {
    // Wait for i18n to be ready
    await initializeI18n();
    console.log('✅ i18n initialized successfully');
  } catch (error) {
    console.warn('⚠️ i18n initialization failed, continuing with fallback:', error);
  }
  
  // Render the app after i18n is ready
  renderApp();
};

const renderApp = () => {

// Add global debug helpers
if (typeof window !== 'undefined') {
  (window as any).debugAuth = async () => {
    const { authService } = await import('./services/authService');
    return {
      initialized: authService.isInitialized(),
      authenticated: await authService.isAuthenticated(),
      session: authService.getCurrentSession(),
      user: await authService.getCurrentUser()
    };
  };
  
  (window as any).testLogin = async (username: string = 'admin', password: string = 'admin123') => {
    const { authService } = await import('./services/authService');
    const result = await authService.login({ username, password });
    console.log('Login result:', result);
    if (result.success) {
      console.log('Login successful! Refreshing page...');
      setTimeout(() => location.reload(), 1000);
    }
    return result;
  };
  
  (window as any).testAllDemoUsers = async () => {
    const { authService } = await import('./services/authService');
    const demoUsers = [
      { username: 'admin', password: 'admin123', role: 'Super Administrator' },
      { username: 'teacher', password: 'teacher123', role: 'Teacher' },
      { username: 'finance', password: 'finance123', role: 'Finance Officer' },
      { username: 'student', password: 'student123', role: 'Student' }
    ];
    
    console.log('🧪 Testing all demo user credentials...');
    let passedTests = 0;
    
    for (const user of demoUsers) {
      console.log(`\n🔐 Testing ${user.username} (${user.role})...`);
      
      try {
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
  };
  
  (window as any).testAuthState = async () => {
    const { authService } = await import('./services/authService');
    
    console.log('🔍 Testing authentication state management...');
    
    try {
      // Test 1: Initial state (logged out)
      console.log('\n1️⃣ Testing initial logged out state...');
      authService.logout();
      
      const initialAuth = await authService.isAuthenticated();
      const initialUser = await authService.getCurrentUser();
      const initialSession = authService.getCurrentSession();
      
      console.log(`   - isAuthenticated: ${initialAuth}`);
      console.log(`   - getCurrentUser: ${initialUser ? initialUser.username : 'null'}`);
      console.log(`   - getCurrentSession: ${initialSession ? 'exists' : 'null'}`);
      
      // Test 2: Login and check state
      console.log('\n2️⃣ Testing state after login...');
      const loginResult = await authService.login({
        username: 'admin',
        password: 'admin123'
      });
      
      if (loginResult.success) {
        const postLoginAuth = await authService.isAuthenticated();
        const postLoginUser = await authService.getCurrentUser();
        const postLoginSession = authService.getCurrentSession();
        
        console.log(`   - Login successful: ${loginResult.success}`);
        console.log(`   - isAuthenticated: ${postLoginAuth}`);
        console.log(`   - getCurrentUser: ${postLoginUser?.username}`);
        console.log(`   - getCurrentSession exists: ${!!postLoginSession}`);
        console.log(`   - Session isDemo: ${postLoginSession?.isDemo}`);
        
        // Test 3: Session persistence
        console.log('\n3️⃣ Testing session persistence...');
        const sessionData = localStorage.getItem('schoolpilot_auth_session');
        console.log(`   - Session in localStorage: ${!!sessionData}`);
        if (sessionData) {
          try {
            const parsed = JSON.parse(sessionData);
            console.log(`   - Stored username: ${parsed.username}`);
            console.log(`   - Stored isDemo: ${parsed.isDemo}`);
          } catch (e) {
            console.log(`   - Error parsing session data: ${e.message}`);
          }
        }
        
        // Test 4: Logout and verify cleanup
        console.log('\n4️⃣ Testing logout and state cleanup...');
        authService.logout();
        
        const postLogoutAuth = await authService.isAuthenticated();
        const postLogoutUser = await authService.getCurrentUser();
        const postLogoutSession = authService.getCurrentSession();
        const postLogoutStorage = localStorage.getItem('schoolpilot_auth_session');
        
        console.log(`   - isAuthenticated after logout: ${postLogoutAuth}`);
        console.log(`   - getCurrentUser after logout: ${postLogoutUser ? postLogoutUser.username : 'null'}`);
        console.log(`   - getCurrentSession after logout: ${postLogoutSession ? 'exists' : 'null'}`);
        console.log(`   - localStorage cleared: ${!postLogoutStorage}`);
        
        console.log('\n✅ Authentication state management test completed!');
        return true;
      } else {
        console.log(`❌ Login failed: ${loginResult.message}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Auth state test error:`, error);
      return false;
    }
  };
  
  console.log('🎉 Debug helpers available:');
  console.log('  - window.debugAuth() - Check auth status');
  console.log('  - window.testLogin(username, password) - Test login');
  console.log('  - window.testAllDemoUsers() - Test all demo user credentials');
  console.log('  - window.testAuthState() - Test authentication state management');
}

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite] w-12 h-12 border-4 text-indigo-600" role="status">
              <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                Loading...
              </span>
            </div>
            <p className="mt-4 text-gray-600">Loading translations...</p>
          </div>
        </div>
      }>
        <App />
      </Suspense>
    </React.StrictMode>
  );
};

// Initialize the app
initializeApp();