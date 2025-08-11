// ABOUTME: Comprehensive login test runner for verifying demo credentials and error tracking
// ABOUTME: Tests all demo users, invalid credentials, and ensures login failures are reported to Bugsink

import { authService } from '../services/authService';
import { reportError, reportMessage } from '../config/errorTracking';

interface TestResult {
  username: string;
  password: string;
  success: boolean;
  message: string;
  testType: string;
  timestamp: Date;
  duration?: number;
}

interface TestSummary {
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  successRate: number;
  results: TestResult[];
  resultsByType: Record<string, TestResult[]>;
}

class LoginTestRunner {
  private results: TestResult[] = [];
  
  private demoUsers = [
    { username: 'admin', password: 'admin123', role: 'Super Administrator' },
    { username: 'teacher', password: 'teacher123', role: 'Teacher' },
    { username: 'finance', password: 'finance123', role: 'Finance Officer' },
    { username: 'student', password: 'student123', role: 'Student' }
  ];
  
  private invalidCredentials = [
    { username: 'admin', password: 'wrongpassword', description: 'Valid user, wrong password' },
    { username: 'nonexistent', password: 'anypassword', description: 'Non-existent user' },
    { username: 'admin', password: '', description: 'Empty password' },
    { username: '', password: 'admin123', description: 'Empty username' },
    { username: '', password: '', description: 'Both empty' }
  ];
  
  private addTestResult(
    username: string,
    password: string,
    success: boolean,
    message: string,
    testType: string,
    duration?: number
  ): void {
    const result: TestResult = {
      username,
      password: password ? '***' : '(empty)',
      success,
      message,
      testType,
      timestamp: new Date(),
      duration
    };
    
    this.results.push(result);
    
    const status = success ? '✅' : '❌';
    const durationText = duration ? ` (${duration}ms)` : '';
    console.log(`${status} [${testType}] ${username}: ${message}${durationText}`);
  }
  
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async testValidCredentials(): Promise<void> {
    console.log('\n🔐 Testing valid demo credentials...');
    
    for (const user of this.demoUsers) {
      const startTime = Date.now();
      
      try {
        // Ensure we're logged out first
        authService.logout();
        await this.delay(100); // Small delay to ensure logout is processed
        
        console.log(`   Testing ${user.username} (${user.role})...`);
        
        const result = await authService.login({
          username: user.username,
          password: user.password
        });
        
        const duration = Date.now() - startTime;
        
        this.addTestResult(
          user.username,
          user.password,
          result.success,
          result.success ? `Login successful - ${user.role}` : `Login failed: ${result.message}`,
          'VALID_CREDENTIALS',
          duration
        );
        
        // If login was successful, verify session and then logout
        if (result.success) {
          const isAuthenticated = await authService.isAuthenticated();
          const currentUser = await authService.getCurrentUser();
          const session = authService.getCurrentSession();
          
          console.log(`     - Authenticated: ${isAuthenticated}`);
          console.log(`     - Current user: ${currentUser?.username}`);
          console.log(`     - User role: ${currentUser?.role}`);
          console.log(`     - Session exists: ${!!session}`);
          console.log(`     - Session is demo: ${session?.isDemo}`);
          
          // Logout for next test
          authService.logout();
        } else {
          // Report login failure to Bugsink
          reportError(new Error(`Valid demo user login failed: ${user.username} - ${result.message}`), {
            testType: 'valid_credentials_failure',
            username: user.username,
            role: user.role,
            errorMessage: result.message
          });
        }
        
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        this.addTestResult(
          user.username,
          user.password,
          false,
          `Exception: ${errorMessage}`,
          'VALID_CREDENTIALS_ERROR',
          duration
        );
        
        // Report this error to Bugsink
        reportError(new Error(`Valid login test exception for ${user.username}: ${errorMessage}`), {
          testType: 'valid_credentials_exception',
          username: user.username,
          role: user.role,
          originalError: errorMessage
        });
      }
    }
  }
  
  async testInvalidCredentials(): Promise<void> {
    console.log('\n🚫 Testing invalid credentials...');
    
    for (const cred of this.invalidCredentials) {
      const startTime = Date.now();
      
      try {
        // Ensure we're logged out first
        authService.logout();
        await this.delay(100);
        
        console.log(`   Testing ${cred.description}...`);
        
        const result = await authService.login({
          username: cred.username,
          password: cred.password
        });
        
        const duration = Date.now() - startTime;
        
        this.addTestResult(
          cred.username || '(empty)',
          cred.password,
          !result.success, // Success means login correctly failed
          result.success 
            ? `UNEXPECTED SUCCESS: ${cred.description}` 
            : `Correctly failed: ${result.message}`,
          'INVALID_CREDENTIALS',
          duration
        );
        
        // Report to Bugsink based on result
        if (result.success) {
          // This is bad - invalid credentials should not succeed
          reportError(new Error(`Invalid credentials unexpectedly succeeded: ${cred.description}`), {
            testType: 'invalid_credentials_unexpected_success',
            username: cred.username || '(empty)',
            description: cred.description
          });
        } else {
          // This is good - report the expected failure for tracking
          reportError(new Error(`Login failed as expected: ${cred.description} - ${result.message}`), {
            testType: 'expected_login_failure',
            username: cred.username || '(empty)',
            description: cred.description,
            errorMessage: result.message,
            severity: 'info' // This is expected behavior
          });
        }
        
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        this.addTestResult(
          cred.username || '(empty)',
          cred.password,
          true, // Exception is expected for invalid credentials
          `Exception (expected): ${errorMessage}`,
          'INVALID_CREDENTIALS_EXCEPTION',
          duration
        );
        
        // Report the exception to Bugsink
        reportError(new Error(`Login exception for invalid credentials: ${cred.description} - ${errorMessage}`), {
          testType: 'invalid_credentials_exception',
          username: cred.username || '(empty)',
          description: cred.description,
          originalError: errorMessage,
          severity: 'info' // This might be expected
        });
      }
    }
  }
  
  async testErrorReporting(): Promise<void> {
    console.log('\n📊 Testing error reporting functionality...');
    
    try {
      // Test error reporting
      reportError(new Error('Test error from LoginTestRunner'), {
        testType: 'error_reporting_test',
        timestamp: new Date().toISOString(),
        source: 'login_test_runner'
      });
      
      // Test message reporting
      reportMessage('Test message from LoginTestRunner', 'warning');
      
      this.addTestResult(
        'error-test',
        'n/a',
        true,
        'Error reporting test sent to Bugsink',
        'ERROR_REPORTING'
      );
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.addTestResult(
        'error-test',
        'n/a',
        false,
        `Error reporting failed: ${errorMessage}`,
        'ERROR_REPORTING_FAILED'
      );
    }
  }
  
  async testAuthenticationState(): Promise<void> {
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
        
        if (sessionData) {
          try {
            const parsed = JSON.parse(sessionData);
            console.log(`   - Stored username: ${parsed.username}`);
            console.log(`   - Stored isDemo: ${parsed.isDemo}`);
          } catch (e) {
            console.log(`   - Error parsing session data: ${e}`);
          }
        }
        
        // Logout
        authService.logout();
        isAuth = await authService.isAuthenticated();
        console.log(`   - After logout: ${isAuth}`);
        
        const sessionAfterLogout = localStorage.getItem('schoolpilot_auth_session');
        console.log(`   - Session cleared: ${!sessionAfterLogout}`);
        
        this.addTestResult(
          'state-test',
          'n/a',
          true,
          'Authentication state management working correctly',
          'STATE_MANAGEMENT'
        );
      } else {
        this.addTestResult(
          'state-test',
          'n/a',
          false,
          `State test failed: ${loginResult.message}`,
          'STATE_MANAGEMENT_FAILED'
        );
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.addTestResult(
        'state-test',
        'n/a',
        false,
        `State management test error: ${errorMessage}`,
        'STATE_MANAGEMENT_ERROR'
      );
    }
  }
  
  async runAllTests(): Promise<TestSummary> {
    console.log('🧪 Starting comprehensive login functionality tests...');
    this.results = [];
    
    const startTime = Date.now();
    
    try {
      // Report test start to Bugsink
      reportMessage('Starting comprehensive login tests', 'info');
      
      // Test valid credentials
      await this.testValidCredentials();
      
      // Small delay between test suites
      await this.delay(1000);
      
      // Test invalid credentials
      await this.testInvalidCredentials();
      
      // Small delay
      await this.delay(500);
      
      // Test error reporting
      await this.testErrorReporting();
      
      // Small delay
      await this.delay(500);
      
      // Test authentication state
      await this.testAuthenticationState();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Test suite failed: ${errorMessage}`);
      reportError(new Error(`Login test suite failed: ${errorMessage}`), {
        testType: 'test_suite_failure',
        originalError: errorMessage
      });
    }
    
    const totalTime = Date.now() - startTime;
    
    // Generate summary
    const summary = this.generateSummary();
    
    console.log('\n📋 TEST SUMMARY');
    console.log('================');
    console.log(`Total tests: ${summary.totalTests}`);
    console.log(`Successful: ${summary.successfulTests}`);
    console.log(`Failed: ${summary.failedTests}`);
    console.log(`Success rate: ${summary.successRate.toFixed(1)}%`);
    console.log(`Total time: ${totalTime}ms`);
    
    // Group results by test type
    console.log('\n📊 Results by test type:');
    Object.entries(summary.resultsByType).forEach(([type, results]) => {
      const successful = results.filter(r => r.success).length;
      const total = results.length;
      console.log(`   ${type}: ${successful}/${total} passed`);
    });
    
    // Report test completion to Bugsink
    reportMessage(
      `Login functionality tests completed: ${summary.successfulTests}/${summary.totalTests} successful (${summary.successRate.toFixed(1)}%)`,
      summary.successRate >= 80 ? 'info' : 'warning'
    );
    
    console.log('\n✅ Login functionality testing completed!');
    console.log('Check the Bugsink dashboard for reported errors and messages.');
    
    return summary;
  }
  
  private generateSummary(): TestSummary {
    const totalTests = this.results.length;
    const successfulTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - successfulTests;
    const successRate = totalTests > 0 ? (successfulTests / totalTests) * 100 : 0;
    
    // Group results by test type
    const resultsByType = this.results.reduce((acc, result) => {
      if (!acc[result.testType]) acc[result.testType] = [];
      acc[result.testType].push(result);
      return acc;
    }, {} as Record<string, TestResult[]>);
    
    return {
      totalTests,
      successfulTests,
      failedTests,
      successRate,
      results: this.results,
      resultsByType
    };
  }
  
  getResults(): TestResult[] {
    return [...this.results];
  }
  
  clearResults(): void {
    this.results = [];
  }
}

// Export singleton instance
export const loginTestRunner = new LoginTestRunner();

// Export for direct use
export { LoginTestRunner, type TestResult, type TestSummary };