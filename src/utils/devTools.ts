// ABOUTME: Development-only debugging tools.
// ABOUTME: Attached to window in development mode only.

import { logger } from './logging';
import { performanceEventManager } from '../services/performance/performanceEventManager';

/**
 * Initialize development tools and attach them to window.
 * Only runs in DEV mode.
 */
export function initializeDevTools() {
  if (!import.meta.env.DEV) return;

  (window as any).debugNavigationDiagnostics = () => {
    return performanceEventManager.getDiagnosticsSnapshot(100);
  };

  (window as any).debugAuth = async () => {
    const { authService } = await import('../services/auth/authService');
    return {
      initialized: authService.isInitialized(),
      authenticated: await authService.isAuthenticated(),
      session: authService.getCurrentSession(),
      user: await authService.getCurrentUser()
    };
  };

  (window as any).testLogin = async (username: string = 'admin', password: string = 'admin123') => {
    const { authService } = await import('../services/auth/authService');
    const result = await authService.login({ username, password });
    logger.debug('Login result:', result);
    if (result.success) {
      logger.debug('Login successful!');
    }
    return result;
  };

  (window as any).testAllDemoUsers = async () => {
    const { authService } = await import('../services/auth/authService');
    const demoUsers = [
      { username: 'admin', password: 'admin123', role: 'Super Administrator' },
      { username: 'teacher', password: 'teacher123', role: 'Teacher' },
      { username: 'finance', password: 'finance123', role: 'Finance Officer' },
      { username: 'student', password: 'student123', role: 'Student' }
    ];

    logger.debug('🧪 Testing all demo user credentials...');
    let passedTests = 0;

    for (const user of demoUsers) {
      logger.debug(`\n🔐 Testing ${user.username} (${user.role})...`);

      try {
        // Clear any existing session
        authService.logout();

        // Test login
        const result = await authService.login({
          username: user.username,
          password: user.password
        });

        if (result.success) {
          logger.debug(`✅ ${user.username} login successful`);
          logger.debug(`   - User: ${result.user?.username}`);
          logger.debug(`   - Role: ${result.user?.role}`);
          logger.debug(`   - Demo mode: ${result.session?.isDemo}`);
          passedTests++;
        } else {
          logger.debug(`❌ ${user.username} login failed: ${result.message}`);
          if (result.errors) {
            logger.debug(`   - Errors: ${result.errors.join(', ')}`);
          }
        }
      } catch (error) {
        logger.debug(`❌ ${user.username} login error:`, error);
      }
    }

    logger.debug(`\n📊 Test Results: ${passedTests}/${demoUsers.length} tests passed`);

    if (passedTests === demoUsers.length) {
      logger.debug('🎉 All demo login tests passed!');
      return true;
    } else {
      logger.debug('⚠️  Some demo login tests failed!');
      return false;
    }
  };

  (window as any).testAuthState = async () => {
    const { authService } = await import('../services/auth/authService');

    logger.debug('🔍 Testing authentication state management...');

    try {
      // Test 1: Initial state (logged out)
      logger.debug('\n1️⃣ Testing initial logged out state...');
      authService.logout();

      const initialAuth = await authService.isAuthenticated();
      const initialUser = await authService.getCurrentUser();
      const initialSession = authService.getCurrentSession();

      logger.debug(`   - isAuthenticated: ${initialAuth}`);
      logger.debug(`   - getCurrentUser: ${initialUser ? initialUser.username : 'null'}`);
      logger.debug(`   - getCurrentSession: ${initialSession ? 'exists' : 'null'}`);

      // Test 2: Login and check state
      logger.debug('\n2️⃣ Testing state after login...');
      const loginResult = await authService.login({
        username: 'admin',
        password: 'admin123'
      });

      if (loginResult.success) {
        const postLoginAuth = await authService.isAuthenticated();
        const postLoginUser = await authService.getCurrentUser();
        const postLoginSession = authService.getCurrentSession();

        logger.debug(`   - Login successful: ${loginResult.success}`);
        logger.debug(`   - isAuthenticated: ${postLoginAuth}`);
        logger.debug(`   - getCurrentUser: ${postLoginUser?.username}`);
        logger.debug(`   - getCurrentSession exists: ${!!postLoginSession}`);
        logger.debug(`   - Session isDemo: ${postLoginSession?.isDemo}`);

        // Test 3: Session persistence
        logger.debug('\n3️⃣ Testing session persistence...');
        const sessionData = localStorage.getItem('schoolpilot_auth_session');
        logger.debug(`   - Session in localStorage: ${!!sessionData}`);
        if (sessionData) {
          try {
            const parsed = JSON.parse(sessionData);
            logger.debug(`   - Stored username: ${parsed.username}`);
            logger.debug(`   - Stored isDemo: ${parsed.isDemo}`);
          } catch (e) {
            const err = e as Error;
            logger.debug(`   - Error parsing session data: ${err.message}`);
          }
        }

        // Test 4: Logout and verify cleanup
        logger.debug('\n4️⃣ Testing logout and state cleanup...');
        authService.logout();

        const postLogoutAuth = await authService.isAuthenticated();
        const postLogoutUser = await authService.getCurrentUser();
        const postLogoutSession = authService.getCurrentSession();
        const postLogoutStorage = localStorage.getItem('schoolpilot_auth_session');

        logger.debug(`   - isAuthenticated after logout: ${postLogoutAuth}`);
        logger.debug(`   - getCurrentUser after logout: ${postLogoutUser ? postLogoutUser.username : 'null'}`);
        logger.debug(`   - getCurrentSession after logout: ${postLogoutSession ? 'exists' : 'null'}`);
        logger.debug(`   - localStorage cleared: ${!postLogoutStorage}`);

        logger.debug('\n✅ Authentication state management test completed!');
        return true;
      } else {
        logger.debug(`❌ Login failed: ${loginResult.message}`);
        return false;
      }
    } catch (error) {
      logger.debug(`❌ Auth state test error:`, error);
      return false;
    }
  };

  logger.debug('🎉 Debug helpers available:');
  logger.debug('  - window.debugAuth() - Check auth status');
  logger.debug('  - window.testLogin(username, password) - Test login');
  logger.debug('  - window.testAllDemoUsers() - Test all demo user credentials');
  logger.debug('  - window.testAuthState() - Test authentication state management');
}
