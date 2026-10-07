import { logger } from '@/utils/logging';

// ABOUTME: Test component for verifying Bugsink error tracking integration
// ABOUTME: Provides buttons to trigger different types of errors for testing

import React, { useState } from 'react';
import { reportError } from '@/config/errorTracking';
import testErrorTracking from '@/utils/testErrorTracking';

const ErrorTrackingTest: React.FC = () => {
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [isRunningTests, setIsRunningTests] = useState(false);

  const updateTestResult = (testName: string, success: boolean) => {
    setTestResults(prev => ({ ...prev, [testName]: success }));
  };

  const triggerJavaScriptError = () => {
    try {
      throw new Error('Test JavaScript error for Bugsink integration - thrown from ErrorTrackingTest component');
    } catch (error) {
      // This will be caught by the error boundary
      throw error;
    }
  };

  const triggerAsyncError = async () => {
    try {
      // Simulate an async operation that fails
      await new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Test async error for Bugsink integration'));
        }, 100);
      });
    } catch (error) {
      const success = reportError(error as Error, {
        testType: 'async-error',
        timestamp: new Date().toISOString(),
        userAction: 'manual-test',
        component: 'ErrorTrackingTest'
      });
      updateTestResult('asyncError', true);
      logger.info('✅ Async error sent to Bugsink');
    }
  };

  const triggerCustomMessage = () => {
    const success = testErrorTracking.testMessage('info');
    updateTestResult('customMessage', success);
  };

  const triggerWarning = () => {
    const success = testErrorTracking.testMessage('warning');
    updateTestResult('warning', success);
  };

  const triggerCaptureException = () => {
    const success = testErrorTracking.testDirectCapture();
    updateTestResult('directCapture', success);
  };

  const addBreadcrumb = () => {
    const success = testErrorTracking.testBreadcrumb();
    updateTestResult('breadcrumb', success);
  };

  const runAllTests = async () => {
    setIsRunningTests(true);
    try {
      const results = await testErrorTracking.runAllTests();
      setTestResults(results);
      logger.info('🎉 All tests completed! Check your Bugsink dashboard.');
    } catch (error) {
      logger.error('❌ Error running tests:', error);
    } finally {
      setIsRunningTests(false);
    }
  };

  const testUserContext = () => {
    const success = testErrorTracking.testUserContext();
    updateTestResult('userContext', success);
  };

  const testTagsAndExtra = () => {
    const success = testErrorTracking.testTagsAndExtra();
    updateTestResult('tagsAndExtra', success);
  };

  const getTestResultIcon = (testName: string) => {
    if (!(testName in testResults)) return '⚪';
    return testResults[testName] ? '✅' : '❌';
  };

  return (
    <div className="p-6 bg-surface-card rounded-lg shadow-md max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-surface-foreground">
        🐛 Bugsink Error Tracking Test Panel
      </h2>
      <p className="text-surface-muted-fg mb-6">
        Use these buttons to test Bugsink error tracking integration. Check your Bugsink dashboard to see the captured errors.
        <br />
        <span className="text-sm text-primary-600">✅ = Success, ❌ = Failed, ⚪ = Not tested</span>
      </p>
      
      {/* Quick Test Button */}
      <div className="mb-6">
        <button
          onClick={runAllTests}
          disabled={isRunningTests}
          className={`w-full py-3 px-6 rounded-lg font-medium text-white transition-colors ${
            isRunningTests 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {isRunningTests ? '🔄 Running All Tests...' : '🚀 Run All Tests'}
        </button>
      </div>
      
      {/* Individual Test Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <button
          onClick={triggerJavaScriptError}
          className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded transition-colors flex items-center justify-between"
        >
          <span>🚨 Trigger JS Error</span>
          <span>{getTestResultIcon('basicError')}</span>
        </button>
        
        <button
          onClick={triggerAsyncError}
          className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded transition-colors flex items-center justify-between"
        >
          <span>⏰ Async Error</span>
          <span>{getTestResultIcon('asyncError')}</span>
        </button>
        
        <button
          onClick={triggerCustomMessage}
          className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded transition-colors flex items-center justify-between"
        >
          <span>💬 Info Message</span>
          <span>{getTestResultIcon('infoMessage')}</span>
        </button>
        
        <button
          onClick={triggerWarning}
          className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded transition-colors flex items-center justify-between"
        >
          <span>⚠️ Warning</span>
          <span>{getTestResultIcon('warningMessage')}</span>
        </button>
        
        <button
          onClick={triggerCaptureException}
          className="bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded transition-colors flex items-center justify-between"
        >
          <span>🎯 Direct Exception</span>
          <span>{getTestResultIcon('directCapture')}</span>
        </button>
        
        <button
          onClick={addBreadcrumb}
          className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded transition-colors flex items-center justify-between"
        >
          <span>🍞 Breadcrumb</span>
          <span>{getTestResultIcon('breadcrumb')}</span>
        </button>
        
        <button
          onClick={testUserContext}
          className="bg-teal-500 hover:bg-teal-600 text-white font-medium py-2 px-4 rounded transition-colors flex items-center justify-between"
        >
          <span>👤 User Context</span>
          <span>{getTestResultIcon('userContext')}</span>
        </button>
        
        <button
          onClick={testTagsAndExtra}
          className="bg-pink-500 hover:bg-pink-600 text-white font-medium py-2 px-4 rounded transition-colors flex items-center justify-between"
        >
          <span>🏷️ Tags & Extra</span>
          <span>{getTestResultIcon('tagsAndExtra')}</span>
        </button>
      </div>
      
      {/* Test Results Summary */}
      {Object.keys(testResults).length > 0 && (
        <div className="mb-6 p-4 bg-surface-muted rounded-lg">
          <h3 className="font-medium text-surface-foreground mb-2">Test Results:</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            {Object.entries(testResults).map(([testName, success]) => (
              <div key={testName} className={`p-2 rounded ${success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <span className="mr-1">{success ? '✅' : '❌'}</span>
                {testName}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Instructions */}
      <div className="p-4 bg-surface-accent rounded">
        <h3 className="font-medium text-surface-foreground mb-2">Instructions:</h3>
        <ul className="text-sm text-surface-muted-fg space-y-1">
          <li>• Click "Run All Tests" to test all functionality at once</li>
          <li>• Or click individual buttons to test specific features</li>
          <li>• Check browser console for detailed logs</li>
          <li>• Verify errors appear in your Bugsink dashboard</li>
          <li>• Red button will trigger actual errors (caught by error boundary)</li>
          <li>• Network errors are expected if Bugsink server is not accessible</li>
        </ul>
      </div>
      
      {/* Connection Status */}
      <div className="mt-4 p-3 bg-primary-50 rounded">
        <p className="text-sm text-primary-800">
          <strong>Bugsink DSN:</strong> {import.meta.env.VITE_BUGSINK_DSN ? '✅ Configured' : '❌ Not configured'}
          <br />
          <strong>Environment:</strong> {import.meta.env.DEV ? 'Development' : 'Production'}
        </p>
      </div>
    </div>
  );
};

export default ErrorTrackingTest;