// ABOUTME: Test page for comprehensive login functionality testing
// ABOUTME: Provides UI to run login tests and view results with Bugsink error reporting

import React, { useState, useRef } from 'react';
import { loginTestRunner, type TestResult, type TestSummary } from '../utils/loginTestRunner';
import { Play, CheckCircle, XCircle, AlertCircle, Clock, Users, Shield, Bug } from 'lucide-react';

interface TestStatus {
  isRunning: boolean;
  currentTest: string;
  progress: number;
}

const LoginTestPage: React.FC = () => {
  const [testStatus, setTestStatus] = useState<TestStatus>({
    isRunning: false,
    currentTest: '',
    progress: 0
  });
  const [testSummary, setTestSummary] = useState<TestSummary | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev, logEntry]);
    
    // Auto-scroll to bottom
    setTimeout(() => {
      if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  const runTests = async () => {
    setTestStatus({ isRunning: true, currentTest: 'Initializing...', progress: 0 });
    setTestSummary(null);
    setLogs([]);
    
    addLog('🧪 Starting comprehensive login functionality tests...');
    
    // Override console.log to capture test output
    const originalConsoleLog = console.log;
    console.log = (...args) => {
      const message = args.join(' ');
      addLog(message);
      originalConsoleLog(...args);
    };
    
    try {
      // Update progress as we go
      setTestStatus(prev => ({ ...prev, currentTest: 'Testing valid credentials...', progress: 20 }));
      
      const summary = await loginTestRunner.runAllTests();
      
      setTestStatus(prev => ({ ...prev, currentTest: 'Tests completed!', progress: 100 }));
      setTestSummary(summary);
      
      addLog(`✅ All tests completed! Success rate: ${summary.successRate.toFixed(1)}%`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`❌ Test execution failed: ${errorMessage}`);
      setTestStatus(prev => ({ ...prev, currentTest: `Error: ${errorMessage}`, progress: 0 }));
    } finally {
      // Restore console.log
      console.log = originalConsoleLog;
      setTestStatus(prev => ({ ...prev, isRunning: false }));
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setTestSummary(null);
    loginTestRunner.clearResults();
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  const getTestTypeIcon = (testType: string) => {
    switch (testType) {
      case 'VALID_CREDENTIALS':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'INVALID_CREDENTIALS':
        return <Shield className="w-4 h-4 text-orange-500" />;
      case 'ERROR_REPORTING':
        return <Bug className="w-4 h-4 text-purple-500" />;
      case 'STATE_MANAGEMENT':
        return <Clock className="w-4 h-4 text-green-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Login Functionality Test Suite
              </h1>
              <p className="text-gray-600">
                Comprehensive testing of demo login credentials, error handling, and Bugsink reporting
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={clearLogs}
                disabled={testStatus.isRunning}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Clear Logs
              </button>
              <button
                onClick={runTests}
                disabled={testStatus.isRunning}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Play className="w-4 h-4" />
                {testStatus.isRunning ? 'Running Tests...' : 'Run All Tests'}
              </button>
            </div>
          </div>
          
          {/* Progress Bar */}
          {testStatus.isRunning && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>{testStatus.currentTest}</span>
                <span>{testStatus.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${testStatus.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Test Results Summary */}
          {testSummary && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Summary</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{testSummary.totalTests}</div>
                  <div className="text-sm text-gray-600">Total Tests</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{testSummary.successRate.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{testSummary.successfulTests}</div>
                  <div className="text-sm text-gray-600">Passed</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{testSummary.failedTests}</div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
              </div>

              {/* Results by Test Type */}
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">Results by Test Type</h3>
                {Object.entries(testSummary.resultsByType).map(([type, results]) => {
                  const successful = results.filter(r => r.success).length;
                  const total = results.length;
                  const successRate = total > 0 ? (successful / total) * 100 : 0;
                  
                  return (
                    <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        {getTestTypeIcon(type)}
                        <span className="font-medium text-sm">{type.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{successful}/{total}</span>
                        <div className={`w-2 h-2 rounded-full ${
                          successRate === 100 ? 'bg-green-500' : 
                          successRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Test Logs */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Logs</h2>
            <div 
              ref={logContainerRef}
              className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto"
            >
              {logs.length === 0 ? (
                <div className="text-gray-500 italic">No logs yet. Click "Run All Tests" to start testing.</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Detailed Results */}
        {testSummary && testSummary.results.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detailed Test Results</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-left py-2 px-3">Test Type</th>
                    <th className="text-left py-2 px-3">Username</th>
                    <th className="text-left py-2 px-3">Message</th>
                    <th className="text-left py-2 px-3">Duration</th>
                    <th className="text-left py-2 px-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {testSummary.results.map((result, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3">
                        {getStatusIcon(result.success)}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          {getTestTypeIcon(result.testType)}
                          <span className="text-xs">{result.testType}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 font-mono">{result.username}</td>
                      <td className="py-2 px-3 max-w-xs truncate" title={result.message}>
                        {result.message}
                      </td>
                      <td className="py-2 px-3 text-gray-500">
                        {result.duration ? `${result.duration}ms` : '-'}
                      </td>
                      <td className="py-2 px-3 text-gray-500 text-xs">
                        {result.timestamp.toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Demo Credentials Reference */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Demo User Credentials</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { username: 'admin', password: 'admin123', role: 'Super Administrator', color: 'red' },
              { username: 'teacher', password: 'teacher123', role: 'Teacher', color: 'blue' },
              { username: 'finance', password: 'finance123', role: 'Finance Officer', color: 'green' },
              { username: 'student', password: 'student123', role: 'Student', color: 'purple' }
            ].map((user) => (
              <div key={user.username} className={`p-4 border-l-4 border-${user.color}-500 bg-${user.color}-50 rounded-lg`}>
                <div className="font-medium text-gray-900">{user.role}</div>
                <div className="text-sm text-gray-600 mt-1">
                  <div><strong>Username:</strong> {user.username}</div>
                  <div><strong>Password:</strong> {user.password}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="w-4 h-4" />
              <strong>Note:</strong>
            </div>
            <p className="text-yellow-700 text-sm mt-1">
              These are demo credentials for testing purposes. In demo mode, any password will be accepted for these users.
              The tests above verify both valid credentials and proper error handling for invalid ones.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginTestPage;