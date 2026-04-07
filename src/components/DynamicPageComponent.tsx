// ABOUTME: Dynamic page component that resolves and renders pages based on route
// ABOUTME: Used by the tab system to render actual page content instead of placeholders

import React, { Suspense, useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { pageComponentResolver } from '../services/ui/pageComponentResolver';
import { useDynamicNavigation } from '../hooks/useDynamicNavigation';
import Spinner from './ui/Spinner';
import { AlertTriangleIcon } from './ui/icons';

interface DynamicPageComponentProps {
  path?: string;
  fallback?: React.ComponentType;
}

const DynamicPageComponent: React.FC<DynamicPageComponentProps> = ({ 
  path: overridePath, 
  fallback: FallbackComponent 
}) => {
  const location = useLocation();
  const { navigationItems } = useDynamicNavigation();
  const [PageComponent, setPageComponent] = useState<React.ComponentType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const currentPath = overridePath || location.pathname;
  
  // Force debug output
  console.log('🚨 [DynamicPageComponent] FORCE DEBUG - Current path:', currentPath);
  if (typeof window !== 'undefined') {
    (window as any).debugPath = currentPath;
  }
  
  // Find navigation item for current path
  const navigationItem = useMemo(() => {
    console.log('🔍 [DynamicPageComponent] Looking for navigation item for path:', currentPath);
    console.log('🔍 [DynamicPageComponent] Available navigation items:', navigationItems);
    
    for (const module of navigationItems) {
      console.log('🔍 [DynamicPageComponent] Checking module:', module.name, 'path:', module.path);
      if (module.children) {
        for (const child of module.children) {
          console.log('🔍 [DynamicPageComponent] Checking child:', child.name, 'path:', child.path);
          if (child.path === currentPath) {
            console.log('✅ [DynamicPageComponent] Found matching child navigation item:', child);
            return { module, child };
          }
        }
      }
      // Check if this is a module dashboard path
      // Extract module ID from module.path instead of module.name
      const moduleId = module.path.replace('/', ''); // Extract module ID from path like '/administration' -> 'administration'
      if (currentPath === `/${moduleId}` || 
          currentPath === `/${moduleId}/dashboard`) {
        console.log('✅ [DynamicPageComponent] Found matching module dashboard:', module);
        return { module, child: null };
      }
    }
    console.log('❌ [DynamicPageComponent] No navigation item found for path:', currentPath);
    return null;
  }, [navigationItems, currentPath]);

  useEffect(() => {
    const resolvePageComponent = async () => {
      setLoading(true);
      setError(null);
      
      try {
        if (!navigationItem) {
          throw new Error(`No navigation item found for path: ${currentPath}`);
        }
        
        const { module, child } = navigationItem;
        
        // For module dashboards, construct the expected page name
        let pageInfo;
        if (!child) {
          // This is a module dashboard
          const moduleId = module.path.replace('/', ''); // Extract module ID from path like '/administration' -> 'administration'
          const dashboardPageName = `${moduleId.charAt(0).toUpperCase() + moduleId.slice(1)}DashboardPage`;
          pageInfo = {
            path: currentPath,
            page: dashboardPageName,
            name: `${moduleId}-dashboard`,
            modulePath: `/${moduleId}`
          };
        } else {
          // This is a regular page
          pageInfo = {
            path: child.path,
            page: child.page,
            name: child.name,
            modulePath: child.modulePath
          };
        }
        
        console.log('🔍 [DynamicPageComponent] Resolving page for:', pageInfo);
        
        const result = await pageComponentResolver.resolvePageComponent(pageInfo);
        
        if (result.component) {
          setPageComponent(() => result.component);
          console.log('✅ [DynamicPageComponent] Successfully resolved component using strategy:', result.strategy);
        } else {
          throw new Error(result.error?.message || 'Failed to resolve page component');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error('❌ [DynamicPageComponent] Error resolving page component:', errorMessage);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    resolvePageComponent();
  }, [currentPath, navigationItem]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Loading page content...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    if (FallbackComponent) {
      return <FallbackComponent />;
    }
    
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <AlertTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Page Not Found</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // Render the resolved component
  if (PageComponent) {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600">Loading page...</p>
          </div>
        </div>
      }>
        <PageComponent />
      </Suspense>
    );
  }

  // Fallback if no component could be resolved
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="text-6xl mb-4">📄</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Page Content</h3>
        <p className="text-gray-500">Unable to load page content for {currentPath}</p>
      </div>
    </div>
  );
};

export default DynamicPageComponent;