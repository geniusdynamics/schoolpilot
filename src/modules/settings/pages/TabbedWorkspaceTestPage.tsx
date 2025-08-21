// ABOUTME: Tabbed workspace test page component
// ABOUTME: Provides UI for testing tabbed workspace functionality

import React from 'react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { useTabNavigation } from '../../../hooks/useTabNavigation';

const TabbedWorkspaceTestPage: React.FC = () => {
  // const { t } = useTranslation(['settings', 'common']);
  const { navigateToTab, tabs, closeTab, closeAllTabs } = useTabNavigation();

  const testTabCreation = async () => {
    try {
      // Create a test tab
      const result = await navigateToTab('/dashboard', {
        title: 'Dashboard Test',
        module: 'dashboard',
        contentType: 'url',
        activateImmediately: true
      });
      
      console.log('Test tab created:', result);
    } catch (error) {
      console.error('Failed to create test tab:', error);
    }
  };

  const testMultipleTabs = async () => {
    try {
      // Create multiple test tabs
      await navigateToTab('/academics/dashboard', {
        title: 'Academics Dashboard',
        module: 'academics',
        contentType: 'url'
      });
      
      await navigateToTab('/finance/dashboard', {
        title: 'Finance Dashboard',
        module: 'finance',
        contentType: 'url'
      });
      
      await navigateToTab('/hr/dashboard', {
        title: 'HR Dashboard',
        module: 'hr',
        contentType: 'url'
      });
    } catch (error) {
      console.error('Failed to create multiple test tabs:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Tabbed Workspace Test
        </h1>
        <p className="text-gray-600">
          Test tabbed workspace functionality
        </p>
      </div>
      
      {/* Test Controls */}
      <Card title="Test Controls" className="shadow-sm">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={testTabCreation} variant="primary">
              Create Test Tab
            </Button>
            <Button onClick={testMultipleTabs} variant="secondary">
              Create Multiple Tabs
            </Button>
            <Button onClick={closeAllTabs} variant="danger">
              Close All Tabs
            </Button>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">Current Tabs</h4>
            <p className="text-sm text-blue-700">
              0 active tabs
            </p>
          </div>
        </div>
      </Card>
      
      {/* Tab Information */}
      <Card title="Tab Information" className="shadow-sm">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Active Tabs
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <div className="text-center py-8 text-gray-500">
                  No active tabs
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Tab Statistics
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Total Tabs</span>
                  <span className="font-medium">0</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Active Tab</span>
                  <span className="font-medium">
                    None
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Help Information */}
      <Card title="Help and Support" className="shadow-sm">
        <div className="prose max-w-none">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Tabbed Workspace Test Help
          </h3>
          <ul className="space-y-2 text-gray-600">
            <li>
              <strong>Creating Test Tabs:</strong> Use the buttons above to create test tabs and verify tabbed navigation functionality
            </li>
            <li>
              <strong>Managing Tabs:</strong> You can close individual tabs or close all tabs at once using the control buttons
            </li>
            <li>
              <strong>Tab Information:</strong> The tab information panel shows details about all currently active tabs
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default TabbedWorkspaceTestPage;