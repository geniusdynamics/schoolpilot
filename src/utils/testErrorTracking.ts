// ABOUTME: Utility functions for testing Bugsink error tracking integration
// ABOUTME: Provides methods to verify error reporting functionality

import { reportError, reportMessage, Sentry } from '../config/errorTracking';

// Test error tracking functionality
export const testErrorTracking = {
  // Test basic error reporting
  testBasicError: () => {
    try {
      const testError = new Error('Test error from SchoolPilot - Basic Error Test');
      testError.stack = `Error: Test error from SchoolPilot - Basic Error Test
    at testBasicError (testErrorTracking.ts:12:25)
    at onClick (ErrorTrackingTest.tsx:15:10)`;
      
      reportError(testError, {
        testType: 'basic-error',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      });
      
      console.log('✅ Basic error test sent to Bugsink');
      return true;
    } catch (error) {
      console.error('❌ Failed to send basic error test:', error);
      return false;
    }
  },

  // Test message reporting
  testMessage: (level: 'info' | 'warning' | 'error' = 'info') => {
    try {
      const message = `Test ${level} message from SchoolPilot - ${new Date().toISOString()}`;
      reportMessage(message, level);
      
      console.log(`✅ ${level} message test sent to Bugsink:`, message);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send ${level} message test:`, error);
      return false;
    }
  },

  // Test direct Sentry capture
  testDirectCapture: () => {
    try {
      Sentry.captureException(new Error('Direct Sentry capture test from SchoolPilot'));
      console.log('✅ Direct Sentry capture test sent to Bugsink');
      return true;
    } catch (error) {
      console.error('❌ Failed to send direct capture test:', error);
      return false;
    }
  },

  // Test breadcrumb functionality
  testBreadcrumb: () => {
    try {
      Sentry.addBreadcrumb({
        message: 'Test breadcrumb from SchoolPilot',
        level: 'info',
        category: 'test',
        data: {
          timestamp: new Date().toISOString(),
          component: 'testErrorTracking',
          action: 'testBreadcrumb',
        },
      });
      
      console.log('✅ Breadcrumb test added to Sentry');
      return true;
    } catch (error) {
      console.error('❌ Failed to add breadcrumb test:', error);
      return false;
    }
  },

  // Test user context
  testUserContext: () => {
    try {
      Sentry.setUser({
        id: 'test-user-123',
        email: 'test@schoolpilot.com',
        username: 'test-user',
        ip_address: '{{auto}}',
      });
      
      console.log('✅ User context test set in Sentry');
      return true;
    } catch (error) {
      console.error('❌ Failed to set user context test:', error);
      return false;
    }
  },

  // Test tags and extra data
  testTagsAndExtra: () => {
    try {
      Sentry.withScope((scope) => {
        scope.setTag('test-tag', 'schoolpilot-test');
        scope.setLevel('warning');
        scope.setContext('test-context', {
          feature: 'error-tracking',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
        });
        
        Sentry.captureMessage('Test message with tags and context from SchoolPilot');
      });
      
      console.log('✅ Tags and extra data test sent to Bugsink');
      return true;
    } catch (error) {
      console.error('❌ Failed to send tags and extra data test:', error);
      return false;
    }
  },

  // Run all tests
  runAllTests: async () => {
    console.group('🧪 Running Bugsink Error Tracking Tests');
    
    const results = {
      basicError: testErrorTracking.testBasicError(),
      infoMessage: testErrorTracking.testMessage('info'),
      warningMessage: testErrorTracking.testMessage('warning'),
      errorMessage: testErrorTracking.testMessage('error'),
      directCapture: testErrorTracking.testDirectCapture(),
      breadcrumb: testErrorTracking.testBreadcrumb(),
      userContext: testErrorTracking.testUserContext(),
      tagsAndExtra: testErrorTracking.testTagsAndExtra(),
    };
    
    const successCount = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n📊 Test Results: ${successCount}/${totalTests} tests passed`);
    console.log('Results:', results);
    
    if (successCount === totalTests) {
      console.log('🎉 All error tracking tests passed!');
    } else {
      console.warn('⚠️ Some error tracking tests failed. Check the logs above.');
    }
    
    console.groupEnd();
    return results;
  },
};

// Export for use in components
export default testErrorTracking;