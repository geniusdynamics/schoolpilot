// ABOUTME: Consolidated application entry point with feature flag support
// ABOUTME: Supports both standard and enhanced modes with backward compatibility
// ABOUTME: Unified from App.tsx, EnhancedApp.tsx, and AppUnified.tsx for single entry point

import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { UserProvider } from './contexts/UserContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useDynamicNavigation } from './hooks/useDynamicNavigation';
import { useRBAC } from './hooks/useRBAC';
import { initializeModulesOptimized } from './core/optimizedModuleLoader';
import Spinner from './components/ui/Spinner';
import { moduleRegistry } from './core/moduleRegistry';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import { getAppConfig, subscribeToConfig, AppConfig } from './config/appConfig';

// Enhanced components (lazy loaded to avoid bundle bloat when not needed)
const EnhancedNavigation = lazy(() => import('./components/EnhancedNavigation'));
const GlobalNotifications = lazy(() => import('./components/GlobalNotifications'));
const NetworkStatusIndicator = lazy(() => import('./components/OfflineCapability').then(module => ({ default: module.NetworkStatusIndicator })));
const SyncStatusComponent = lazy(() => import('./components/OfflineCapability').then(module => ({ default: module.SyncStatusComponent })));

// Lazy load the login page
const LoginPage = lazy(() => import('./modules/core/pages/LoginPage'));

// Lazy load the dashboard page
const DashboardPage = lazy(() => import('./modules/dashboard/pages/DashboardPage'));

// Vite will statically analyze all .tsx files in ./modules/*/pages
const pageModules = {
  ...import.meta.glob('./modules/*/pages/*.tsx'),
  ...import.meta.glob('./modules/*/pages/**/*.tsx'),
};

// Debug logging helper
const debugLog = (message: string, ...args: any[]) => {
  const config = getAppConfig();
  if (config.development.enableDebugLogging) {
    console.log(message, ...args);
  }
};

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

// Enhanced routing component with feature flag support
const DynamicRoutes = ({ modulesInitialized, config }: { modulesInitialized: boolean; config: AppConfig }) => {
  const { navigationItems } = useDynamicNavigation(true);
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
                    <PageErrorBoundary pageName={nav.name || nav.path}>
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
          });
        }).filter(Boolean)}
    </Routes>
  );
};

// Enhanced app content with feature flag support
const AppContent: React.FC<{ modulesInitialized: boolean; config: AppConfig }> = ({ modulesInitialized, config }) => {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  // Debug authentication state
  useEffect(() => {
    debugLog('🔍 [AppContent] Auth state:', { isAuthenticated, isLoading, pathname: location.pathname });
  }, [isAuthenticated, isLoading, location.pathname]);

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
          <DynamicRoutes modulesInitialized={modulesInitialized} config={config} />
        </ErrorBoundary>
      </div>
      
      {/* Global notifications (if enabled) */}
      {config.features.globalNotifications && config.useEnhancedFeatures && (
        <Suspense fallback={null}>
          <GlobalNotifications />
        </Suspense>
      )}
    </Layout>
  );
};

// Data provider wrapper - uses the consolidated AppDataProvider which supports both modes
const DataProviderWrapper: React.FC<{ config: AppConfig; children: React.ReactNode }> = ({ config, children }) => {
  debugLog('🚀 [App] Using Consolidated Data Provider with enhanced features:', config.useEnhancedFeatures);
  
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

// Main consolidated App component
const App: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>(getAppConfig());
  const [modulesInitialized, setModulesInitialized] = useState(false);
  const initializedRef = useRef(false);

  // Subscribe to configuration changes
  useEffect(() => {
    const unsubscribe = subscribeToConfig(setConfig);
    return unsubscribe;
  }, []);

  // Initialize modules
  useEffect(() => {
    const init = async () => {
      if (!initializedRef.current) {
        debugLog('🚀 [App] Initializing modules with config:', config);
        
        // Set a safety timeout to prevent the app from getting stuck on initialization
        const safetyTimeout = setTimeout(() => {
          console.warn('⚠️ [App] Module initialization safety timeout triggered');
          setModulesInitialized(true);
          initializedRef.current = true;
        }, 15000); // 15 seconds safety timeout
        
        try {
          await initializeModulesOptimized();
          setModulesInitialized(true);
          debugLog('✅ [App] Modules initialized successfully');
        } catch (error) {
          console.error('❌ [App] Module initialization failed:', error);
          // Still allow app to load with degraded functionality
          setModulesInitialized(true);
        }
        
        clearTimeout(safetyTimeout);
        initializedRef.current = true;
      }
    };
    init();
  }, [config]);

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
    mode: config.mode,
    useEnhancedFeatures: config.useEnhancedFeatures,
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
            <DataProviderWrapper config={config}>
              <ModuleErrorBoundary moduleName="Core Application">
                <AppContent modulesInitialized={modulesInitialized} config={config} />
              </ModuleErrorBoundary>
            </DataProviderWrapper>
          </UserProvider>
        </AuthProvider>
      </HashRouter>
    </ApplicationErrorBoundary>
  );
};

export default App;

