// ABOUTME: TabContent component for rendering full-page tab content with layout integration
// ABOUTME: Supports multiple content types, RBAC validation, and responsive design

import React, { useCallback, useMemo } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Tab } from '../../types/tabbedWorkspace';
import { useTabStore } from '../../stores/tabStore';
import { cn } from '../../utils/cn';

interface TabContentProps {
  tab: Tab;
  className?: string;
  onContentRender?: (tab: Tab) => React.ReactNode;
  showHeader?: boolean;
  enableFullPageMode?: boolean;
  userRole?: string;
  userPermissions?: string[];
  moduleContext?: string;
}

export const TabContent: React.FC<TabContentProps> = ({
  tab,
  className,
  onContentRender,
  showHeader = true,
  enableFullPageMode = true,
  userRole = 'guest',
  userPermissions = [],
  moduleContext = 'dashboard'
}) => {
  const { validateTabAccess } = useTabStore();

  // Validate tab access permissions
  const hasAccess = useMemo(() => {
    return validateTabAccess(tab.id);
  }, [tab.id, validateTabAccess]);

  // Handle content loading states
  const isLoading = useMemo(() => {
    return tab.isLoading || (tab.content?.type === 'component' && !tab.content.component);
  }, [tab.isLoading, tab.content]);

  // Render access denied state
  const renderAccessDenied = useCallback(() => (
    <div className="flex-1 flex items-center justify-center bg-yellow-50 text-yellow-700 min-h-[400px]">
      <div className="text-center px-4">
        <AlertCircle className="w-12 h-12 mx-auto mb-4" />
        <p className="text-lg font-medium mb-2">Access Denied</p>
        <p className="text-sm">You don't have permission to view this tab</p>
        <p className="text-xs mt-2 text-yellow-600">
          Required role: {tab.requiredRole || 'Unknown'} | Your role: {userRole}
        </p>
      </div>
    </div>
  ), [tab.requiredRole, userRole]);

  // Render loading state
  const renderLoading = useCallback(() => (
    <div className="flex-1 flex items-center justify-center bg-gray-50 min-h-[400px]">
      <div className="text-center">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-gray-600">Loading content...</p>
        <p className="text-sm text-gray-500 mt-1">{tab.title}</p>
      </div>
    </div>
  ), [tab.title]);

  // Render tab content based on type
  const renderContent = useCallback(() => {
    if (!tab.content) {
      return (
        <div className="text-center text-gray-500 py-8 sm:py-12">
          <div className="text-4xl mb-4">📄</div>
          <p className="text-lg font-medium mb-2">No content available</p>
          <p className="text-sm">This tab doesn't have any content to display</p>
        </div>
      );
    }

    // Custom content renderer takes priority
    if (onContentRender) {
      return onContentRender(tab);
    }

    // Render based on content type
    switch (tab.content.type) {
      case 'component':
        if (tab.content.component) {
          const Component = tab.content.component;
          return (
            <div className="w-full h-full">
              <Component {...(tab.content.props || {})} />
            </div>
          );
        }
        return (
          <div className="text-center text-gray-500 py-8">
            <AlertCircle className="w-8 h-8 mx-auto mb-4" />
            <p className="text-sm">Component not found</p>
          </div>
        );

      case 'url':
        if (tab.content.url) {
          return (
            <iframe
              src={tab.content.url}
              className="w-full h-full border-0 rounded-lg"
              title={tab.title}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            />
          );
        }
        return (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">Invalid URL</p>
          </div>
        );

      case 'html':
        if (tab.content.html) {
          return (
            <div 
              className="w-full h-full prose prose-sm sm:prose max-w-none"
              dangerouslySetInnerHTML={{ __html: tab.content.html }}
            />
          );
        }
        return (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">No HTML content</p>
          </div>
        );

      case 'text':
        if (tab.content.text) {
          return (
            <div className="whitespace-pre-wrap text-gray-700 w-full text-sm sm:text-base leading-relaxed">
              {tab.content.text}
            </div>
          );
        }
        return (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">No text content</p>
          </div>
        );

      case 'empty':
      default:
        return (
          <div className="text-center text-gray-500 py-8 sm:py-12">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-lg font-medium mb-2">Empty Tab</p>
            <p className="text-sm">Add some content to get started</p>
          </div>
        );
    }
  }, [tab, onContentRender]);

  // Check access first
  if (!hasAccess) {
    return renderAccessDenied();
  }

  // Show loading state
  if (isLoading) {
    return renderLoading();
  }

  // Determine container styling based on full-page mode
  const containerClasses = cn(
    'flex flex-col w-full h-full',
    enableFullPageMode ? 'min-h-screen' : 'min-h-[400px]',
    className
  );

  const contentClasses = cn(
    'flex-1 overflow-auto',
    enableFullPageMode 
      ? 'px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8' 
      : 'px-2 py-3 sm:px-4 sm:py-4'
  );

  return (
    <div className={containerClasses}>
      {/* Tab Header */}
      {showHeader && (
        <div className="flex-shrink-0 border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {tab.icon && (
                <span className="text-gray-600 flex-shrink-0">
                  {tab.icon}
                </span>
              )}
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                  {tab.title}
                </h1>
                {tab.description && (
                  <p className="text-sm text-gray-600 mt-1">
                    {tab.description}
                  </p>
                )}
              </div>
            </div>
            
            {/* Tab Status Indicators */}
            <div className="flex items-center space-x-2">
              {tab.isDirty && (
                <span className="w-2 h-2 bg-orange-400 rounded-full" title="Unsaved changes" />
              )}
              {tab.pinned && (
                <span className="text-blue-500 text-xs" title="Pinned tab">📌</span>
              )}
              {tab.isLoading && (
                <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className={contentClasses}>
        <div className="w-full h-full">
          {renderContent()}
        </div>
      </div>

      {/* Tab Footer (if needed for status or actions) */}
      {tab.isDirty && (
        <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-2 sm:px-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              <span className="inline-block w-2 h-2 bg-orange-400 rounded-full mr-2" />
              You have unsaved changes
            </p>
            <div className="flex space-x-2">
              <button className="text-sm text-gray-600 hover:text-gray-800 transition-colors">
                Discard
              </button>
              <button className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabContent;