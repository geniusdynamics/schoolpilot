// ABOUTME: Main application component with unified configuration and module management
// ABOUTME: Handles authentication, routing, module loading, and global features

import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from './components/Layout';
import { UserProvider } from './contexts/UserContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UnifiedConfigProvider } from './contexts/UnifiedConfigContext';
import { useUnifiedConfig } from './hooks/useUnifiedConfig';
import { useDynamicNavigation } from './hooks/useDynamicNavigation';
import { useRBAC } from './hooks/useRBAC';
import { initializeModules } from './core/moduleLoader';
import { initializeTheme } from './hooks/useTheme';
import { useRoutePersistence } from './hooks/useRoutePersistence';
import { getCurrentUnifiedConfig } from './config/unifiedConfig';
import { debugLog } from './utils';
import Spinner from './components/ui/Spinner';
import { moduleRegistry } from './core/moduleRegistry';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import { UnifiedAppConfig } from './config/unifiedConfig';
import { usePerformanceMonitoring } from './hooks/usePerformanceMonitoring';
import { useMemoryManagement } from './hooks/useMemoryManagement';
import { StableActionProvider } from './contexts/StableActionProvider';
import { ToastProvider } from './hooks/useToast';

// Lazy load components
const GlobalNotifications = lazy(() => import('./components/GlobalNotifications'));
const LoginPage = lazy(() => import('./modules/core/pages/LoginPage'));
const DashboardPage = lazy(() => import('./modules/dashboard/pages/DashboardPage'));
const ErrorTrackingTest = lazy(() => import('./components/ErrorTrackingTest'));
const TabbedWorkspaceTestPage = lazy(() => import('./modules/settings/pages/TabbedWorkspaceTestPage'));
const TabbedModeTestPage = lazy(() => import('./modules/settings/pages/TabbedModeTestPage'));
const PerformanceMonitor = lazy(() => import('./components/PerformanceMonitor'));

// Vite will statically analyze all .tsx files in ./modules/*/pages
const pageModules = {
  ...import.meta.glob('./modules/*/pages/*.tsx'),
  ...import.meta.glob('./modules/*/pages/**/*.tsx'),
};
// Module loading completed

// Dashboard modules for dynamic loading
const dashboardModules = {
  ...import.meta.glob('./modules/*/pages/*Dashboard*.tsx'),
};

const getPageComponent = (navItem: any) => {
  console.error('🔍 [App] Looking up page component for:', navItem.page, 'path:', navItem.path);
  console.error('🔍 [App] Available keys:', Object.keys(pageModules));
  
  if (!navItem.page) {
    console.log('❌ [App] No page specified for nav item:', navItem);
    return null;
  }

  // Split path to determine module directory
  const pathSegments = navItem.path.split('/').filter(Boolean);
  const moduleDir = pathSegments[0] || 'dashboard';
  
  // Construct the modular key
  const modularKey = `./modules/${moduleDir}/pages/${navItem.page}.tsx`;
  console.log('🔍 [App] Checking modular key:', modularKey);
  console.log('🔍 [App] Key exists in pageModules:', modularKey in pageModules);
  
  if (pageModules[modularKey]) {
    console.log('✅ [App] Found component via modular key:', modularKey);
    return React.lazy(pageModules[modularKey]);
  }

  console.log('❌ [App] Component not found for:', navItem.page);
  console.log('❌ [App] Tried key:', modularKey);
  return null;
};

const DynamicRoutes = ({ modulesInitialized }: { modulesInitialized: boolean }) => {
  console.log('🔍 [DynamicRoutes] Component is rendering! modulesInitialized:', modulesInitialized);
  console.log('🔍 [DynamicRoutes] Modules initialized:', modulesInitialized);
  // Helper function to generate deprecated route redirects dynamically
  const generateDeprecatedRouteRedirects = (): React.ReactElement[] => {
    const deprecatedRoutes: React.ReactElement[] = [];
    
    // Get all enabled modules
    const enabledModules = moduleRegistry.getEnabledModules();
    
    enabledModules.forEach(module => {
      if (module.navigation) {
        module.navigation.forEach(navItem => {
          if (navItem.deprecated && navItem.path) {
            deprecatedRoutes.push(
              <Route 
                key={navItem.path} 
                path={navItem.path} 
                element={<Navigate to="/settings/data-management" replace />} 
              />
            );
          }
        });
      }
    });
    
    return deprecatedRoutes;
  };
  const { navigationItems } = useDynamicNavigation(true);
  const { accessibleModules } = useRBAC();
  const { t } = useTranslation();

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
      
      {/* Direct Dashboard Route */}
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

      {/* Test Routes */}
      <Route
        path="/test/error-tracking"
        element={
          <Suspense fallback={<div>Loading...</div>}>
            <ErrorTrackingTest />
          </Suspense>
        }
      />
      <Route
        path="/test/tabbed-workspace"
        element={
          <Suspense fallback={<div>Loading...</div>}>
            <TabbedWorkspaceTestPage />
          </Suspense>
        }
      />
      <Route
        path="/test/tabbed-mode"
        element={
          <Suspense fallback={<div>Loading...</div>}>
            <TabbedModeTestPage />
          </Suspense>
        }
      />

      {/* Dynamic Deprecated Routes -> Redirect to Data Management */}
      {generateDeprecatedRouteRedirects()}

      {/* Dynamic Module Dashboard Routes */}
      {moduleRegistry.getEnabledModules().map(module => {
        const dashboardPath = `/${module.id}/dashboard`;
        const dashboardKey = `./modules/${module.id}/pages/${module.id.charAt(0).toUpperCase() + module.id.slice(1)}DashboardPage.tsx`;
        
        const dashboardExport = dashboardModules[dashboardKey];
        if (dashboardExport) {
          const DashboardComponent = () => {
            const Component = dashboardExport.default || dashboardExport;
            return <Component />;
          };
          
          return (
            <Route
              key={module.path}
              path={dashboardPath}
              element={
                <ProtectedRoute requiredModule={module.id} requiredPermission={`${module.id}.view`}>
                  <Suspense fallback={
                    <div className="flex items-center justify-center h-screen">
                      <div className="text-center">
                        <Spinner size="lg" />
                        <p className="mt-4 text-gray-600">Loading {t(module.name)} dashboard...</p>
                      </div>
                    </div>
                  }>
                    <DashboardComponent />
                  </Suspense>
                </ProtectedRoute>
              }
            />
          );
        } else {
          return null;
        }
      })}
      
      {/* Register custom/dynamic routes from all enabled modules */}
      {moduleRegistry.getEnabledModules().flatMap(module =>
        (module.routes || []).map(route => {
          const pathSegments = route.path.split('/').filter(Boolean);
          let moduleDir = '';

          if (pathSegments.length > 0) {
            moduleDir = pathSegments[0];
          }
          let PageComponent = null;
          if (moduleDir) {
            const modularKey = `./modules/${moduleDir}/pages/${route.page}.tsx`;
            const modularImportFn = pageModules[modularKey];
            if (modularImportFn) PageComponent = lazy(modularImportFn as any);
          }
          if (!PageComponent) return null;
          
          const moduleName = moduleDir || module.id;
          const requiredPermission = moduleName ? `${moduleName}.view` : undefined;
          
          return (
            <Route
              key={route.path}
              path={route.path}
              element={
                <ProtectedRoute requiredModule={moduleName} requiredPermission={requiredPermission}>
                  <Suspense fallback={
                    <div className="flex items-center justify-center h-screen">
                      <div className="text-center">
                        <Spinner size="lg" />
                        <p className="mt-4 text-gray-600">Loading page...</p>
                      </div>
                    </div>
                  }>
                    <PageComponent />
                  </Suspense>
                </ProtectedRoute>
              }
            />
          );
        })
      )}
      
      {/* Dynamic Navigation Routes */}
      {navigationItems
        .filter(item => !item.modulePath || accessibleModules.includes(item.modulePath.replace('/', '')))
        .flatMap(module => {
          return (module.children || []).map(nav => {
            const PageComponent = getPageComponent(nav);
            if (!PageComponent) {
              return null;
            }
            
            const modulePath = nav.modulePath?.replace('/', '') || '';
            const moduleName = modulePath || nav.path.split('/')[1] || '';
            const requiredPermission = moduleName ? `${moduleName}.view` : undefined;
            
            return (
              <Route
                key={nav.path}
                path={nav.path}
                element={
                  <ProtectedRoute
                    requiredPermission={requiredPermission}
                    requiredModule={moduleName}
                  >
                    <Suspense fallback={
                      <div className="flex items-center justify-center h-screen">
                        <div className="text-center">
                          <Spinner size="lg" />
                          <p className="mt-4 text-gray-600">Loading page...</p>
                        </div>
                      </div>
                    }>
                      <PageComponent />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
            );
          });
        })
      }
    </Routes>
  );
};

// Enhanced app content with feature flag support
const AppContent: React.FC<{ modulesInitialized: boolean; config: UnifiedAppConfig }> = ({ modulesInitialized, config }) => {
  const location = useLocation();
  const authContext = useAuth();
  const { isAuthenticated, isLoading, user } = authContext;
  const { restoreRouteIfNeeded } = useRoutePersistence();
  
  // Debug authentication state
  useEffect(() => {
    debugLog('🔍 [AppContent] Auth state details:', { 
      isAuthenticated, 
      isLoading, 
      pathname: location.pathname,
      user: authContext.user,
      isDemoMode: authContext.isDemoMode 
    });
  }, [isAuthenticated, isLoading, location.pathname, authContext]);

  // Restore route after authentication is complete and modules are initialized
  useEffect(() => {
    if (isAuthenticated && modulesInitialized && !isLoading) {
      const restored = restoreRouteIfNeeded();
      if (restored) {
        debugLog('✅ [AppContent] Route restored after refresh');
      }
    }
  }, [isAuthenticated, modulesInitialized, isLoading, restoreRouteIfNeeded]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show login page
  if (!isAuthenticated) {
    debugLog('🔍 [AppContent] User not authenticated, showing login page');
    // Ensure lazy-loaded LoginPage renders with a proper fallback to avoid blank screen
    return (
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <Spinner size="lg" />
              <p className="mt-4 text-gray-600">Loading login page...</p>
            </div>
          </div>
        }
      >
        <LoginPage />
      </Suspense>
    );
  }

  debugLog('🔍 [AppContent] User authenticated, showing layout');
  
  return (
    <Layout>
      {/* Main content with error boundary */}
      <div className="flex-1">
        <ErrorBoundary key={location.pathname}>
          <DynamicRoutes modulesInitialized={modulesInitialized} />
        </ErrorBoundary>
      </div>
      
      {/* Global notifications (if enabled) */}
      {(config.features as any).enableNotifications && config.environment !== 'demo' && (
        <Suspense fallback={null}>
          <GlobalNotifications />
        </Suspense>
      )}
      
      {/* Performance Monitor (Feature Flag Controlled) */}
      {config.features.performanceMonitorWidget && (
        <Suspense fallback={null}>
          <PerformanceMonitor showDetails={true} />
        </Suspense>
      )}
    </Layout>
  );
};

// Data provider wrapper
const DataProviderWrapper: React.FC<{ config: UnifiedAppConfig; children: React.ReactNode }> = ({ config, children }) => {
  debugLog('🚀 [App] Using Consolidated Data Provider with environment:', config.environment, 'dataMode:', config.dataMode);
  
  const AppDataProvider = lazy(() => import('./contexts/AppDataContext').then(module => ({ default: module.AppDataProvider })));
  
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Loading data layer...</p>
        </div>
      </div>
    }>
      <AppDataProvider>{children}</AppDataProvider>
    </Suspense>
  );
};

// Main consolidated App component
const AppInner: React.FC = () => {
  const { config, applyPreset } = useUnifiedConfig();
  const [modulesInitialized, setModulesInitialized] = useState(false);
  const initializedRef = useRef(false);

  // Initialize theme system on app startup
  useEffect(() => {
    initializeTheme();
  }, []);
  
  // Performance monitoring for the main app
  const { measureAsync } = usePerformanceMonitoring({
    componentName: 'App',
    trackMounts: true
  });

  // Memory management for the main app
  const { isMemoryHigh, forceCleanup } = useMemoryManagement({
    componentName: 'App',
    trackLifecycle: true,
    enableAlerts: false
  });

  // Initialize modules with improved error handling
  useEffect(() => {
    const init = async () => {
      if (!initializedRef.current) {
        debugLog('🚀 [App] Initializing modules...');
        initializedRef.current = true;
        
        try {
          const emergencyTimeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Emergency module loading timeout')), 8000);
          });
          
          await measureAsync(
            () => Promise.race([initializeModules(), emergencyTimeout]),
            'module_initialization'
          );
          
          const registeredModules = moduleRegistry.getAllModules();
          const enabledModules = moduleRegistry.getEnabledModules();
          
          const navigationItems = moduleRegistry.getNavigationItems();
          
          console.log(`📊 [App] Module verification complete: ${registeredModules.length} total, ${enabledModules.length} enabled, ${navigationItems.length} nav items`);
          
          setModulesInitialized(true);
        } catch (error) {
          console.error('❌ [App] Module initialization failed:', error);
          setModulesInitialized(true);
        }
      }
    };
    
    init();
  }, [measureAsync]);

  return (
    <HashRouter>
      <DataProviderWrapper config={config}>
        <AuthProvider>
          <UserProvider>
            <ErrorBoundary>
              <StableActionProvider>
                <AppContent modulesInitialized={modulesInitialized} config={config} />
              </StableActionProvider>
            </ErrorBoundary>
          </UserProvider>
        </AuthProvider>
      </DataProviderWrapper>
    </HashRouter>
  );
};

// Main App component with unified config provider and i18n Suspense
const App: React.FC = () => {
  return (
    <UnifiedConfigProvider>
      <ToastProvider>
        <Suspense fallback={
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <Spinner size="lg" />
              <p className="mt-4 text-gray-600">Loading translations...</p>
            </div>
          </div>
        }>
          <AppInner />
        </Suspense>
      </ToastProvider>
    </UnifiedConfigProvider>
  );
};

export default App;