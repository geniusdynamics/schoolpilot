// ABOUTME: Tabbed mode test page component
// ABOUTME: Provides UI for testing tabbed mode functionality

import React, { useState } from 'react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { useTabNavigation } from '../../../hooks/useTabNavigation';
import { isTabbedModeEnabled, setTabbedModeModuleOverride, updateTabbedModeConfig } from '../../../services/tabbedModeFeatureFlag';

const TabbedModeTestPage: React.FC = () => {
  // const { t } = useTranslation(['settings', 'common']);
  const { navigateToTab, tabs } = useTabNavigation();
  const [testPath, setTestPath] = useState('/academics/dashboard');
  const [testTitle, setTestTitle] = useState('Academics Dashboard');
  const [testModule, setTestModule] = useState('academics');
  const [testResults, setTestResults] = useState<string[]>([]);

  const logResult = (message: string) => {
    setTestResults(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const testBasicNavigation = async () => {
    try {
      logResult('Testing basic tabbed navigation...');
      
      const result = await navigateToTab(testPath, {
        title: testTitle,
        module: testModule,
        contentType: 'url',
        activateImmediately: true
      });
      
      logResult(`✓ Success: Created tab ${result.tabId} for ${testPath}`);
    } catch (error) {
      logResult(`✗ Failed: ${error.message}`);
      console.error('Basic navigation test failed:', error);
    }
  };

  const testFeatureFlag = () => {
    try {
      logResult('Testing tabbed mode feature flag...');
      
      const globalEnabled = isTabbedModeEnabled('global');
      const moduleEnabled = isTabbedModeEnabled(testModule);
      
      logResult(`✓ Global tabbed mode enabled: ${globalEnabled}`);
      logResult(`✓ Module ${testModule} tabbed mode enabled: ${moduleEnabled}`);
    } catch (error) {
      logResult(`✗ Feature flag test failed: ${error.message}`);
      console.error('Feature flag test failed:', error);
    }
  };

  const testConfiguration = () => {
    try {
      logResult('Testing tabbed mode configuration...');
      
      // This is just a test - in a real implementation we would have proper config
      updateTabbedModeConfig({
        globalEnabled: true,
        enablePerModuleControl: true
      });
      
      setTabbedModeModuleOverride(testModule, true);
      
      logResult('✓ Configuration updated successfully');
    } catch (error) {
      logResult(`✗ Configuration test failed: ${error.message}`);
      console.error('Configuration test failed:', error);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Tabbed Mode Test
        </h1>
        <p className="text-gray-600">
          Test tabbed mode functionality
        </p>
      </div>
      
      {/* Test Configuration */}
      <Card title="Test Configuration" className="shadow-sm">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Path"
              value={testPath}
              onChange={(e) => setTestPath(e.target.value)}
              placeholder="/academics/dashboard"
            />
            <Input
              label="Title"
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
              placeholder="Academics Dashboard"
            />
            <Input
              label="Module"
              value={testModule}
              onChange={(e) => setTestModule(e.target.value)}
              placeholder="academics"
            />
          </div>
        </div>
      </Card>
      
      {/* Test Controls */}
      <Card title="Test Controls" className="shadow-sm">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button onClick={testBasicNavigation} variant="primary">
              Test Basic Navigation
            </Button>
            <Button onClick={testFeatureFlag} variant="secondary">
              Test Feature Flag
            </Button>
            <Button onClick={testConfiguration} variant="warning">
              Test Configuration
            </Button>
            <Button onClick={clearResults} variant="danger">
              Clear Results
            </Button>
          </div>
        </div>
      </Card>
      
      {/* Test Results */}
      <Card title="Test Results" className="shadow-sm">
        <div className="space-y-2">
          {testResults.length > 0 ? (
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div 
                  key={index} 
                  className={`font-mono text-sm ${result.includes('✓') ? 'text-green-600' : result.includes('✗') ? 'text-red-600' : 'text-gray-600'}`}
                >
                  {result}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No test results yet
            </div>
          )}
        </div>
      </Card>
      
      {/* Current Tabs */}
      <Card title="Current Tabs" className="shadow-sm">
        <div className="space-y-2">
          {tabs && tabs.length > 0 ? (
            <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
              <ul className="space-y-2">
                {tabs.map((tab) => (
                  <li key={tab.id} className="flex items-center justify-between p-2 bg-white rounded border">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{tab.title}</div>
                      <div className="text-sm text-gray-500">{tab.path}</div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {tab.module && <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">{tab.module}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No tabs are currently open
            </div>
          )}
        </div>
      </Card>
      
      {/* Help Information */}
      <Card title="Help and Support" className="shadow-sm">
        <div className="prose max-w-none">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Tabbed Mode Test Help
          </h3>
          <ul className="space-y-2 text-gray-600">
            <li>
              <strong>Basic Navigation Test:</strong> Test basic tabbed navigation by creating tabs with different paths and titles
            </li>
            <li>
              <strong>Feature Flag Test:</strong> Verify that tabbed mode feature flags are working correctly for different modules
            </li>
            <li>
              <strong>Configuration Test:</strong> Test tabbed mode configuration updates and module-specific overrides
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default TabbedModeTestPage;