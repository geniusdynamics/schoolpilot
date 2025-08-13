import React, { useEffect, useState } from 'react';
import { TabbedWorkspace } from '@/components/tabbedWorkspace';
import { useTabStore } from '@/stores/tabStore';
import { useActionRegistry } from '@/services/actionRegistry';
import { registerAllModuleActions } from '@/services/moduleActions';
import { Tab, TabType } from '@/types/tabbedWorkspace';

const TabbedWorkspaceTestPage: React.FC = () => {
  console.log('TabbedWorkspaceTestPage: Component rendering');
  const { createTab } = useTabStore();
  const { registerAction } = useActionRegistry();
  console.log('TabbedWorkspaceTestPage: Hooks initialized');

  useEffect(() => {
    let isInitialized = false;
    
    const initializeWorkspace = async () => {
      if (isInitialized) return;
      isInitialized = true;
      
      try {
        // Register all module actions
        registerAllModuleActions(registerAction);

        // Create some sample tabs for testing with minimal permissions
        const sampleTabs: Partial<Tab>[] = [
          {
            title: 'Welcome Tab',
            content: {
              type: 'text',
              text: 'Welcome to the Tabbed Workspace! This is a demonstration of the tab system.'
            },
            module: 'general',
            permissions: [],
            icon: 'Home'
          },
          {
            title: 'Test Tab 1',
            content: {
              type: 'text',
              text: 'This is the first test tab. You can interact with it to test the workspace functionality.'
            },
            module: 'general',
            permissions: [],
            icon: 'FileText'
          },
          {
            title: 'Test Tab 2',
            content: {
              type: 'text',
              text: 'This is the second test tab. Try dragging, pinning, and closing tabs to test the features.'
            },
            module: 'general',
            permissions: [],
            icon: 'Settings'
          }
        ];

        // Create tabs synchronously to avoid re-render loops
        let successfulTabs = 0;
        for (const tabData of sampleTabs) {
          try {
            console.log('Creating tab:', tabData.title);
            const tabId = await createTab({
              title: tabData.title || 'New Tab',
              content: tabData.content || { type: 'empty' },
              module: tabData.module || 'general',
              permissions: tabData.permissions || [],
              icon: tabData.icon || 'FileText',
              canClose: true,
              isPinned: false,
              isDirty: false
            });
            console.log('Tab created with ID:', tabId);
            successfulTabs++;
          } catch (error) {
            console.error('Failed to create tab:', tabData.title, error);
            // Continue with next tab even if one fails
          }
        }
        
        console.log(`Successfully created ${successfulTabs} out of ${sampleTabs.length} tabs`);
        
        // If no tabs were created successfully, create a fallback tab
        if (successfulTabs === 0) {
          try {
            console.log('Creating fallback tab...');
            await createTab({
              title: 'Fallback Tab',
              content: {
                type: 'text',
                text: 'This is a fallback tab created when other tabs failed to load due to permission restrictions.'
              },
              module: 'general',
              permissions: [],
              icon: 'AlertCircle',
              canClose: true,
              isPinned: false,
              isDirty: false
            });
            console.log('Fallback tab created successfully');
          } catch (fallbackError) {
            console.error('Failed to create fallback tab:', fallbackError);
          }
        }
      } catch (error) {
        console.error('Failed to initialize workspace:', error);
      }
    };

    initializeWorkspace();
  }, []); // Empty dependency array to run only once

  const handleTabContentRender = (tab: Tab) => {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-green-600 text-xl">📋</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{tab.title}</h1>
                <p className="text-gray-600">Module: {tab.module}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Tab Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">ID:</span>
                    <span className="ml-2 text-gray-600">{tab.id}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Module:</span>
                    <span className="ml-2 text-gray-600">{tab.module}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Pinned:</span>
                    <span className="ml-2 text-gray-600">{tab.isPinned ? 'Yes' : 'No'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Dirty:</span>
                    <span className="ml-2 text-gray-600">{tab.isDirty ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Content</h3>
                {tab.content.type === 'text' && tab.content.text && (
                  <p className="text-gray-700">{tab.content.text}</p>
                )}
                {tab.content.type === 'empty' && (
                  <p className="text-gray-500 italic">This tab has no content.</p>
                )}
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Permissions</h3>
                <div className="flex flex-wrap gap-2">
                  {tab.permissions.map((permission, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Features to Test</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  <li>Right-click on tabs to see context menu</li>
                  <li>Drag tabs to reorder them</li>
                  <li>Pin/unpin tabs using the context menu</li>
                  <li>Close tabs and restore from recently closed</li>
                  <li>Use action bar buttons for module-specific actions</li>
                  <li>Test overflow behavior with many tabs</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleSettingsClick = () => {
    alert('Settings clicked! This would open the workspace settings.');
  };

  return (
    <div className="h-screen bg-gray-100">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Tabbed Workspace Test Page</h1>
        <p className="text-gray-600 mt-1">
          This page demonstrates the comprehensive tabbed workspace system with RBAC integration.
        </p>
      </div>
      
      <div className="h-full">
        <TabbedWorkspace
          showActionBar={true}
          showSettings={true}
          onTabContentRender={handleTabContentRender}
          onSettingsClick={handleSettingsClick}
          maxTabs={10}
          enableTabGroups={true}
          enableTabPersistence={true}
          theme="green"
          userRole="super_admin"
          userPermissions={[
            'academics.students.read',
            'academics.courses.manage',
            'finance.reports.read',
            'library.catalog.read',
            'workspace.settings',
            'workspace.refresh'
          ]}
          moduleContext="academics"
          onTabChange={(tab) => console.log('Tab changed:', tab)}
          onTabClose={(tab) => console.log('Tab closed:', tab)}
          onTabCreate={(tab) => console.log('Tab created:', tab)}
          onError={(error) => console.error('Workspace error:', error)}
        />
      </div>
    </div>
  );
};

export default TabbedWorkspaceTestPage;