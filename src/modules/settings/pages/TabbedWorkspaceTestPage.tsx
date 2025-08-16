// ABOUTME: Test component for verifying tabbed workspace functionality
// ABOUTME: Tests module navigation and tab creation scenarios

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTabStore } from '../../../stores/tabStore';
import { useDynamicNavigation } from '../../../hooks/useDynamicNavigation';

const TabbedWorkspaceTestPage: React.FC = () => {
  const navigate = useNavigate();
  const { tabs, createTab, activateTab, closeTab } = useTabStore();
  const { navigationItems } = useDynamicNavigation(true);

  // Test creating tabs
  const testCreateTab = async () => {
    try {
      const tabId = await createTab({
        title: 'Test Tab',
        module: 'dashboard',
        path: '/test',
        content: {
          type: 'component',
          component: 'DynamicPageComponent'
        },
        permissions: [],
        canClose: true,
        pinned: false
      });
      console.log('✅ Created test tab:', tabId);
    } catch (error) {
      console.error('❌ Error creating test tab:', error);
    }
  };

  // Test activating a tab
  const testActivateTab = async (tabId: string) => {
    try {
      await activateTab(tabId);
      console.log('✅ Activated tab:', tabId);
    } catch (error) {
      console.error('❌ Error activating tab:', error);
    }
  };

  // Test closing a tab
  const testCloseTab = (tabId: string) => {
    try {
      closeTab(tabId);
      console.log('✅ Closed tab:', tabId);
    } catch (error) {
      console.error('❌ Error closing tab:', error);
    }
  };

  // Test navigation to a module
  const testNavigateToModule = (modulePath: string) => {
    console.log('🔍 Navigating to module:', modulePath);
    navigate(modulePath);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Tabbed Workspace Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Navigation Items</h2>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {navigationItems.map((item, index) => (
              <div key={index} className="border-b pb-2">
                <div className="font-medium">{item.name}</div>
                <div className="text-sm text-gray-600">Path: {item.path}</div>
                {item.children && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children.map((child, childIndex) => (
                      <div key={childIndex} className="flex justify-between items-center">
                        <span>{child.name}</span>
                        <button
                          onClick={() => testNavigateToModule(child.path)}
                          className="text-xs bg-blue-500 text-white px-2 py-1 rounded"
                        >
                          Go
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Tab Management</h2>
          <div className="space-y-4">
            <div>
              <button
                onClick={testCreateTab}
                className="bg-green-500 text-white px-4 py-2 rounded mr-2"
              >
                Create Test Tab
              </button>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Current Tabs ({tabs.length})</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {tabs.map(tab => (
                  <div key={tab.id} className="flex justify-between items-center border-b pb-1">
                    <div>
                      <span className={tab.id === useTabStore.getState().activeTabId ? 'font-bold' : ''}>
                        {tab.title}
                      </span>
                      <div className="text-xs text-gray-500">{tab.path}</div>
                    </div>
                    <div>
                      <button
                        onClick={() => testActivateTab(tab.id)}
                        className="text-xs bg-blue-500 text-white px-2 py-1 rounded mr-1"
                      >
                        Activate
                      </button>
                      {tab.canClose && (
                        <button
                          onClick={() => testCloseTab(tab.id)}
                          className="text-xs bg-red-500 text-white px-2 py-1 rounded"
                        >
                          Close
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabbedWorkspaceTestPage;