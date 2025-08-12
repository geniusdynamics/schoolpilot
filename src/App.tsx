// ABOUTME: Consolidated application entry point with feature flag support
// ABOUTME: Supports both standard and enhanced modes with backward compatibility
// ABOUTME: Simplified to resolve continuous loading issues

import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useRoutePersistence } from './hooks/useRoutePersistence';
import Layout from './components/Layout';
import { UserProvider } from './contexts/UserContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useDynamicNavigation } from './hooks/useDynamicNavigation';
import { useRBAC } from './hooks/useRBAC';
import Spinner from './components/ui/Spinner';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import { UnifiedConfigProvider, useUnifiedConfig, UnifiedAppConfig } from './contexts/UnifiedConfigContext';
import { moduleRegistry } from './core/moduleRegistry';
import { initializeModules } from './core/moduleLoader';
import { initializeTheme } from './hooks/useTheme';
import { ToastProvider } from './hooks/useToast';

// Enhanced components (lazy loaded to avoid bundle bloat when not needed)
const GlobalNotifications = lazy(() => import('./components/GlobalNotifications'));

// Lazy load the login page
const LoginPage = lazy(() => import('./modules/core/pages/LoginPage'));

// Lazy load the dashboard page
const DashboardPage = lazy(() => import('./modules/dashboard/pages/DashboardPage'));

// Error tracking test component
const ErrorTrackingTest = lazy(() => import('./components/ErrorTrackingTest'));

// Login test page component
const LoginTestPage = lazy(() => import('./pages/LoginTestPage'));

// Tabbed workspace test page component
const TabbedWorkspaceTestPage = lazy(() => import('./modules/settings/pages/TabbedWorkspaceTestPage'));

// Vite will statically analyze all .tsx files in ./modules/*/pages
// Using eager: true to avoid runtime module loading issues
const pageModules = {
  ...import.meta.glob('./modules/*/pages/*.tsx', { eager: false }),
  ...import.meta.glob('./modules/*/pages/**/*.tsx', { eager: false }),
};

// Debug logging helper
const debugLog = (message: string, ...args: any[]) => {
  // Simplified debug logging to avoid config dependency issues
  if (import.meta.env.DEV) {
    console.log(message, ...args);
  }
};

// Enhanced page component resolution with robust loading
import PageComponentLoader from './components/PageComponentLoader';
import { pageComponentResolver } from './services/pageComponentResolver';

const getPageComponent = (nav: any) => {
  console.log('🔍 [getPageComponent] Looking for page:', nav.page, 'for path:', nav.path);
  
  if (!nav.page) {
    console.log('❌ [getPageComponent] No page property found for nav item');
    return null;
  }

  const pathSegments = nav.path.split('/').filter(Boolean);
  if (pathSegments.length === 0) {
    console.log('❌ [getPageComponent] No path segments found');
    return null;
  }

  const moduleDir = pathSegments[0];
  const modularKey = `./modules/${moduleDir}/pages/${nav.page}.tsx`;
  const modularImportFn = pageModules[modularKey];
  
  if (!modularImportFn) {
    console.log('❌ [getPageComponent] No component found for key:', modularKey);
    console.log('Available keys:', Object.keys(pageModules).filter(key => key.includes(moduleDir)));
    return null;
  }

  console.log('✅ [getPageComponent] Found component for:', modularKey);
  
  // Return a component with comprehensive error handling using PageComponentLoader
  return React.memo(() => (
    <PageComponentLoader
      pageName={nav.name || nav.page || nav.path}
      componentLoader={async () => {
        // Use the static import function we found
        const module = await modularImportFn();
        return module;
      }}
      enableCaching={true}
      loadingTimeout={10000}
      retryAttempts={3}
      onLoadStart={() => {
        debugLog('🔄 [PageComponent] Starting to load:', nav.name || nav.page);
      }}
      onLoadComplete={(loadTime, fromCache) => {
        debugLog('✅ [PageComponent] Loaded:', nav.name || nav.page, `(${loadTime}ms, cached: ${fromCache})`);
      }}
      onLoadError={(error) => {
        debugLog('❌ [PageComponent] Failed to load:', nav.name || nav.page, error.message);
      }}
    />
  ));
};

// Simplified routing component
const DynamicRoutes = ({ modulesInitialized }: { modulesInitialized: boolean }) => {
  const { navigationItems } = useDynamicNavigation(modulesInitialized);
  const { accessibleModules } = useRBAC();

  useEffect(() => {
    if (modulesInitialized && navigationItems.length > 0) {
      debugLog('✅ [DynamicRoutes] Navigation loaded:', navigationItems.length, 'items');
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
      
      {/* Error Tracking Test Route */}
      <Route
        path="/error-test"
        element={
          <ProtectedRoute requiredModule="dashboard" requiredPermission="dashboard.view">
            <Suspense fallback={
              <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                  <Spinner size="lg" />
                  <p className="mt-4 text-gray-600">Loading error test...</p>
                </div>
              </div>
            }>
              <ErrorTrackingTest />
            </Suspense>
          </ProtectedRoute>
        }
      />
      
      {/* Login Test Route */}
      <Route
        path="/login-test"
        element={
          <ProtectedRoute requiredModule="dashboard" requiredPermission="dashboard.view">
            <Suspense fallback={
              <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                  <Spinner size="lg" />
                  <p className="mt-4 text-gray-600">Loading login test...</p>
                </div>
              </div>
            }>
              <LoginTestPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      
      {/* Tabbed Workspace Test Route */}
      <Route
        path="/tabbed-workspace-test"
        element={
          <ProtectedRoute requiredModule="dashboard" requiredPermission="dashboard.view">
            <Suspense fallback={
              <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                  <Spinner size="lg" />
                  <p className="mt-4 text-gray-600">Loading tabbed workspace test...</p>
                </div>
              </div>
            }>
              <TabbedWorkspaceTestPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      
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
            if (modularImportFn) {
              PageComponent = lazy(modularImportFn as any);
            }
          }
          
          if (!PageComponent) {
            debugLog('❌ [DynamicRoutes] No component found for route:', route.path);
            return null;
          }
          
          const moduleName = moduleDir || module.id;
          const requiredPermission = moduleName ? `${moduleName}.view` : undefined;
          
          return (
            <Route
              key={route.path}
              path={route.path}
              element={
                <ProtectedRoute requiredModule={moduleName} requiredPermission={requiredPermission}>
                  <PageErrorBoundary pageName={route.page || route.path}>
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
                  </PageErrorBoundary>
                </ProtectedRoute>
              }
            />
          );
        }).filter(Boolean)
      )}
      
      {/* Dynamic navigation routes */}
      {navigationItems
        .filter(item => !item.modulePath || accessibleModules.includes(item.modulePath.replace('/', '')))
        .flatMap(module => {
          debugLog('🔍 [DynamicRoutes] Processing module:', module.name, 'with children:', module.children?.length || 0);
          return (module.children || []).map(nav => {
            debugLog('🔍 [DynamicRoutes] Processing nav item:', nav.name, 'path:', nav.path, 'page:', nav.page);
            const PageComponent = getPageComponent(nav);
            if (!PageComponent) {
              debugLog('❌ [DynamicRoutes] No page component found for nav item:', nav.name);
              return null;
            }
            
            const modulePath = nav.modulePath?.replace('/', '') || '';
            const moduleName = modulePath || nav.path.split('/')[1] || '';
            const requiredPermission = moduleName ? `${moduleName}.view` : undefined;
            
            debugLog('✅ [DynamicRoutes] Creating route for:', nav.path, 'with permission:', requiredPermission);
            
            return (
              <Route
                key={nav.path}
                path={nav.path}
                element={
                  <ProtectedRoute
                    requiredPermission={requiredPermission}
                    requiredModule={moduleName}
                  >
                    <PageComponent />
                  </ProtectedRoute>
                }
              />
            );
          });
        }).filter(Boolean)}
    </Routes>
  );
};

// Enhanced app content with feature flag support
const AppContent: React.FC<{ modulesInitialized: boolean; config: UnifiedAppConfig }> = ({ modulesInitialized, config }) => {
  const location = useLocation();
  const authContext = useAuth();
  const { isAuthenticated, isLoading } = authContext;
  const { restoreRouteIfNeeded } = useRoutePersistence();

  // Debug authentication state
  useEffect(() => {
    console.log('🔍 [AppContent] Auth state:', authContext);
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
      // Try to restore the route the user was on before refresh
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
    return <LoginPage />;
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
      {config.features.enableNotifications && config.environment !== 'demo' && (
        <Suspense fallback={null}>
          <GlobalNotifications />
        </Suspense>
      )}
      
      {/* Performance Monitor (Feature Flag Controlled) */}
      {config.features.performanceMonitorWidget && (
        <PerformanceMonitor showDetails={true} />
      )}
    </Layout>
  );
};

// Data provider wrapper - uses the consolidated AppDataProvider which supports both modes
const DataProviderWrapper: React.FC<{ config: UnifiedAppConfig; children: React.ReactNode }> = ({ config, children }) => {
  debugLog('🚀 [App] Using Consolidated Data Provider with environment:', config.environment, 'dataMode:', config.dataMode);
  
  // The AppDataProvider already supports both standard and enhanced features
  // It automatically switches based on configuration and available services
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

// Import the new comprehensive error boundaries
import ApplicationErrorBoundary from './components/ApplicationErrorBoundary';
import ModuleErrorBoundary from './components/ModuleErrorBoundary';
import PageErrorBoundary from './components/PageErrorBoundary';
import ModuleLoadingProgress from './components/ModuleLoadingProgress';
import dynamicModuleLoader from './services/dynamicModuleLoader';
import PerformanceMonitor from './components/PerformanceMonitor';
import PerformanceMonitorWidget from './components/PerformanceMonitorWidget';
import { performanceMonitor } from './services/performanceMonitor';
import { usePerformanceMonitoring } from './hooks/usePerformanceMonitoring';
import { useMemoryManagement } from './hooks/useMemoryManagement';

// Main consolidated App component
const AppInner: React.FC = () => {
  const { config } = useUnifiedConfig();
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

  // Memory management for the main app (optimized to prevent flickering)
  const { isMemoryHigh, forceCleanup } = useMemoryManagement({
    componentName: 'App',
    trackLifecycle: true,
    enableAlerts: false // Disable alerts in main app to reduce noise
  });

  // Initialize modules with improved error handling
  useEffect(() => {
    const init = async () => {
      if (!initializedRef.current) {
        debugLog('🚀 [App] Initializing modules with config:', config);
        initializedRef.current = true;
        
        // Set a shorter safety timeout to prevent infinite loading
        const safetyTimeout = setTimeout(() => {
          console.warn('⚠️ [App] Module initialization safety timeout triggered - proceeding anyway');
          setModulesInitialized(true);
        }, 5000); // Reduced to 5 seconds
        
        try {
          // Track module initialization performance with measureAsync
          
          // Try to initialize modules, but don't block the app if it fails
          const initPromise = measureAsync(
            () => initializeModules(),
            'module_initialization'
          );
          const timeoutPromise = new Promise<void>((resolve) => {
            setTimeout(() => {
              console.warn('⚠️ [App] Module initialization taking too long, proceeding...');
              resolve();
            }, 3000); // 3 second timeout for module init
          });
          
          await Promise.race([initPromise, timeoutPromise]);
          debugLog('✅ [App] Modules initialized successfully');
        } catch (error) {
          console.error('❌ [App] Module initialization failed:', error);
          // Continue anyway - app should work with basic functionality
        } finally {
          clearTimeout(safetyTimeout);
          setModulesInitialized(true);
          
          // Application startup completed - modules initialized
        }
      }
    };
    
    // Start initialization immediately, don't wait for config changes
    init();
  }, []); // Remove config dependency to prevent re-initialization

  // Show loading screen while modules initialize
  if (!modulesInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center w-full max-w-md px-4">
          <Spinner size="lg" />
          <p className="mt-4 mb-6 text-gray-600">
            Initializing application modules...
            {config.useEnhancedFeatures && ' (Enhanced Mode)'}
          </p>
          <ModuleLoadingProgress 
            showDetails={true}
            timeoutMs={15000} // 15 seconds timeout
            onComplete={() => {
              console.log('✅ [App] Module loading progress complete, proceeding to application');
              setModulesInitialized(true);
            }}
          />
          {/* Add a manual continue button as a last resort */}
          <div className="mt-6">
            <button
              onClick={() => {
                console.warn('⚠️ [App] Manual continue triggered by user');
                // Force the module loader to complete
                try {
                  dynamicModuleLoader.forceCompleteLoading();
                } catch (error) {
                  console.error('Failed to force complete loading:', error);
                }
                setModulesInitialized(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Continue to Application
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Click to continue if loading appears to be stuck
            </p>
          </div>
        </div>
      </div>
    );
  }

  debugLog('🚀 [App] Rendering with config:', {
    environment: config.environment,
    dataMode: config.dataMode,
    enabledFeatures: Object.entries(config.features).filter(([, enabled]) => enabled).map(([name]) => name)
  });

  return (
    <ApplicationErrorBoundary 
      onError={(error, errorInfo, errorId) => {
        // Log critical application errors
        console.error('🚨 Critical Application Error:', { errorId, error, errorInfo });
      }}
      maxRetries={3}
    >
      <HashRouter>
        <AuthProvider>
          <UserProvider>
            <ToastProvider maxToasts={5} position="top-right">
              <DataProviderWrapper config={config}>
                <ModuleErrorBoundary moduleName="Core Application">
                  <AppContent modulesInitialized={modulesInitialized} config={config} />
                </ModuleErrorBoundary>
              </DataProviderWrapper>
            </ToastProvider>
          </UserProvider>
        </AuthProvider>
      </HashRouter>
      
      {/* Performance Monitor Widget (Feature Flag Controlled) */}
      {config.features.performanceMonitorWidget && (
        <PerformanceMonitorWidget 
          position="bottom-right"
          showDetails={true}
          refreshInterval={15000}
        />
      )}
    </ApplicationErrorBoundary>
  );
};

// Main App component with unified config provider
const App: React.FC = () => {
  return (
    <UnifiedConfigProvider>
      <AppInner />
    </UnifiedConfigProvider>
  );
};

export default App;

