// Enhanced main App component with backend integration using dynamic modular architecture
import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { UserProvider } from './contexts/UserContext';
import { EnhancedAppDataProvider, useAppData } from './contexts/EnhancedAppDataContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useDynamicNavigation } from './hooks/useDynamicNavigation';
import { useRBAC } from './hooks/useRBAC';
import { initializeModules } from './core/moduleLoader';
import Spinner from './components/ui/Spinner';
import { moduleRegistry } from './core/moduleRegistry';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import { NetworkStatusIndicator, SyncStatusComponent } from './components/OfflineCapability';
import { APP_MODE } from './contexts/config';

// Lazy load the login page
const LoginPage = lazy(() => import('./modules/core/pages/LoginPage'));

// Lazy load the dashboard page
const DashboardPage = lazy(() => import('./modules/dashboard/pages/DashboardPage'));

// Vite will statically analyze all .tsx files in ./modules/*/pages
const pageModules = {
  ...import.meta.glob('./modules/*/pages/*.tsx'),
  ...import.meta.glob('./modules/*/pages/**/*.tsx'),
};

console.log('🚀 [EnhancedApp] Available page modules:', Object.keys(pageModules).length);

// Modular getPageComponent: Try src/modules/<module>/pages/<PageName>.tsx
const getPageComponent = (nav: any) => {
  console.log('🔍 [getPageComponent] Looking for page:', nav.page, 'for path:', nav.path);
  
  if (nav.page) {
    const pathSegments = nav.path.split('/').filter(Boolean);
    let moduleDir = '';

    // Determine moduleDir based on pathSegments
    if (pathSegments.length > 0) {
      // The first segment of the path is always the module directory, if it exists
      moduleDir = pathSegments[0];
    }
    
    console.log('🔍 [getPageComponent] Segments:', pathSegments, 'ModuleDir:', moduleDir);
    
    // Try modular location
    if (moduleDir) {
      const modularKey = `./modules/${moduleDir}/pages/${nav.page}.tsx`;
      console.log('🔍 [getPageComponent] Looking for key:', modularKey);
      const modularImportFn = pageModules[modularKey];
      if (modularImportFn) {
        console.log('✅ [getPageComponent] Found modular key:', modularKey);
        return lazy(modularImportFn as any);
      } else {
        console.log('❌ [getPageComponent] Key not found:', modularKey);
      }
    }
    
    console.warn('⚠️ [getPageComponent] No page component found for:', nav.page);
    return null;
  }
  
  console.warn('⚠️ [getPageComponent] No page component found for fallback path:', nav.path);
  return null;
};

// Enhanced navigation with offline awareness
const EnhancedNavigation: React.FC = () => {
  const { isOnline, backendAvailable, dataSource, syncStatus } = useAppData();
  
  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">SchoolPilot3</h1>
            </div>
            <div className="ml-4 text-sm text-gray-500">
              {APP_MODE === 'demo' && '(Demo Mode)'}
              {APP_MODE === 'production' && `(${dataSource})`}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <NetworkStatusIndicator showDetails={true} />
            
            {/* Sync indicator */}
            {syncStatus.state === 'syncing' && (
              <div className="flex items-center space-x-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">Syncing...</span>
              </div>
            )}
            
            {syncStatus.state === 'error' && (
              <div className="flex items-center space-x-2 text-red-600">
                <span className="text-sm">Sync Error</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DynamicRoutes = ({ modulesInitialized }: { modulesInitialized: boolean }) => {
  const { navigationItems } = useDynamicNavigation(true);
  const { accessibleModules } = useRBAC();
  const { user } = useAuth();

  // Only log essential information once
  useEffect(() => {
    if (modulesInitialized && navigationItems.length > 0) {
      console.log('✅ [DynamicRoutes] Navigation loaded:', navigationItems.length, 'items');
    }
  }, [modulesInitialized, navigationItems.length]);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      {/* Login Route */}
      <Route
        path="/login"
        element={
          <Suspense fallback={
            <div className="flex items-center justify-center h-screen">
              <div className="text-center">
                <Spinner size="lg" />
                <p className="mt-4 text-gray-600">Loading login page...</p>
              </div>
            </div>
          }>
            <LoginPage />
          </Suspense>
        }
      />
      
      {/* Direct Dashboard Route - Always Available */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requiredModule="dashboard" requiredPermission="dashboard.view">
            <Suspense fallback={
              <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                  <Spinner size="lg" />
                  <p className="mt-4 text-gray-600">Loading dashboard...</p>
                </div>
              </div>
            }>
              <DashboardPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      
      {/* Register custom/dynamic routes from all enabled modules */}
      {moduleRegistry.getEnabledModules().flatMap(module =>
        (module.routes || []).map(route => {
          // Use the same dynamic import logic as getPageComponent
          const pathSegments = route.path.split('/').filter(Boolean);
          let moduleDir = '';

          // Determine moduleDir based on pathSegments
          if (pathSegments.length > 0) {
            // The first segment of the path is always the module directory, if it exists
            moduleDir = pathSegments[0];
          }
          let PageComponent = null;
          // Try modular location
          if (moduleDir) {
            const modularKey = `./modules/${moduleDir}/pages/${route.page}.tsx`;
            const modularImportFn = pageModules[modularKey];
            if (modularImportFn) {
              PageComponent = lazy(modularImportFn as any);
            }
          }

          if (!PageComponent) {
            console.warn(`⚠️ [DynamicRoutes] No component found for route: ${route.path} (${route.page})`);
            return null;
          }

          return (
            <Route
              key={route.path}
              path={route.path}
              element={
                <ProtectedRoute 
                  requiredModule={route.requiredModule} 
                  requiredPermission={route.requiredPermission}
                >
                  <Suspense fallback={
                    <div className="flex items-center justify-center h-screen">
                      <div className="text-center">
                        <Spinner size="lg" />
                        <p className="mt-4 text-gray-600">Loading {route.page}...</p>
                      </div>
                    </div>
                  }>
                    <PageComponent />
                  </Suspense>
                </ProtectedRoute>
              }
            />
          );
        }).filter(Boolean)
      )}

      {/* Dynamic navigation routes */}
      {navigationItems
        .filter(nav => nav.path !== '/dashboard' && nav.path !== '/login')
        .map(nav => {
          const PageComponent = getPageComponent(nav);
          
          if (!PageComponent) {
            console.warn(`⚠️ [DynamicRoutes] No component found for navigation: ${nav.path} (${nav.page})`);
            return null;
          }

          return (
            <Route
              key={nav.path}
              path={nav.path}
              element={
                <ProtectedRoute 
                  requiredModule={nav.requiredModule} 
                  requiredPermission={nav.requiredPermission}
                >
                  <Suspense fallback={
                    <div className="flex items-center justify-center h-screen">
                      <div className="text-center">
                        <Spinner size="lg" />
                        <p className="mt-4 text-gray-600">Loading {nav.label}...</p>
                      </div>
                    </div>
                  }>
                    <PageComponent />
                  </Suspense>
                </ProtectedRoute>
              }
            />
          );
        }).filter(Boolean)}
    </Routes>
  );
};

// Enhanced app content with sync status
const EnhancedAppContent: React.FC = () => {
  const { 
    isOnline, 
    backendAvailable, 
    syncStatus, 
    pendingSyncCount 
  } = useAppData();
  
  const [modulesInitialized, setModulesInitialized] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      console.log('🚀 [EnhancedApp] Initializing modules...');
      initializeModules()
        .then(() => {
          console.log('✅ [EnhancedApp] Modules initialized successfully');
          setModulesInitialized(true);
        })
        .catch(error => {
          console.error('❌ [EnhancedApp] Module initialization failed:', error);
          setModulesInitialized(true); // Still allow app to load
        });
    }
  }, []);

  // Show sync status in development mode
  const showSyncStatus = APP_MODE !== 'demo' && (
    syncStatus.state !== 'idle' || 
    pendingSyncCount > 0 || 
    !isOnline || 
    !backendAvailable
  );

  if (!modulesInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Initializing application modules...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      {/* Enhanced navigation header */}
      <EnhancedNavigation />
      
      {/* Sync status panel */}
      {showSyncStatus && (
        <div className="p-4 bg-gray-50">
          <SyncStatusComponent />
        </div>
      )}
      
      {/* Main content */}
      <div className="flex-1">
        <DynamicRoutes modulesInitialized={modulesInitialized} />
      </div>
      
      {/* Global notifications */}
      <GlobalNotifications />
    </Layout>
  );
};

// Global notification system
const GlobalNotifications: React.FC = () => {
  const { 
    isOnline, 
    backendAvailable, 
    syncStatus, 
    pendingSyncCount 
  } = useAppData();
  
  const [notifications, setNotifications] = React.useState<Array<{
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    message: string;
    persistent?: boolean;
  }>>([]);
  
  // Manage notifications based on app state
  useEffect(() => {
    const newNotifications: typeof notifications = [];
    
    // Offline notification
    if (!isOnline) {
      newNotifications.push({
        id: 'offline',
        type: 'warning',
        message: 'You are currently offline. Some features may be limited.',
        persistent: true
      });
    }
    
    // Backend unavailable notification
    if (isOnline && !backendAvailable) {
      newNotifications.push({
        id: 'backend-unavailable',
        type: 'info',
        message: 'Backend server is unavailable. Working with local data.',
        persistent: true
      });
    }
    
    // Sync error notification
    if (syncStatus.state === 'error') {
      newNotifications.push({
        id: 'sync-error',
        type: 'error',
        message: `Sync failed: ${syncStatus.lastError?.message || 'Unknown error'}`,
        persistent: false
      });
    }
    
    // Pending sync notification
    if (pendingSyncCount > 5) {
      newNotifications.push({
        id: 'pending-sync',
        type: 'info',
        message: `${pendingSyncCount} items waiting to sync`,
        persistent: false
      });
    }
    
    setNotifications(newNotifications);
  }, [isOnline, backendAvailable, syncStatus, pendingSyncCount]);
  
  // Auto-dismiss non-persistent notifications
  useEffect(() => {
    const timer = setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.persistent));
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [notifications]);
  
  if (notifications.length === 0) return null;
  
  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50">
      {notifications.map(({ id, type, message, persistent }) => (
        <div
          key={id}
          className={`max-w-sm p-4 rounded-lg shadow-lg ${
            type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
            type === 'warning' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
            type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
            'bg-blue-100 text-blue-800 border border-blue-200'
          }`}
        >
          <div className="flex justify-between items-start">
            <p className="text-sm font-medium">{message}</p>
            {!persistent && (
              <button
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== id))}
                className="ml-2 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Error boundary for the entire app
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                Application Error
              </h1>
              <p className="text-gray-600 mb-4">
                Something went wrong. Please refresh the page to try again.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Refresh Page
              </button>
              
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500">
                    Error Details
                  </summary>
                  <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto">
                    {this.state.error?.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// Main Enhanced App component using your existing architecture
const EnhancedApp: React.FC = () => {
  return (
    <AppErrorBoundary>
      <HashRouter>
        <AuthProvider>
          <UserProvider>
            <EnhancedAppDataProvider>
              <ErrorBoundary>
                <EnhancedAppContent />
              </ErrorBoundary>
            </EnhancedAppDataProvider>
          </UserProvider>
        </AuthProvider>
      </HashRouter>
    </AppErrorBoundary>
  );
};

export default EnhancedApp;