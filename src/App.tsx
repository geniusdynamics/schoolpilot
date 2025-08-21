// ABOUTME: Consolidated application entry point with feature flag support
// ABOUTME: Supports both standard and enhanced modes with backward compatibility
// ABOUTME: Simplified to resolve continuous loading issues

import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
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
import { getCurrentUnifiedConfig } from './config/unifiedConfig';
import { moduleRegistry } from './core/moduleRegistry';
import { initializeModules } from './core/moduleLoader';
import { initializeTheme } from './hooks/useTheme';
import { ToastProvider } from './hooks/useToast';
import { SyncProvider } from './contexts/SyncContext';
import { NetworkProvider } from './contexts/NetworkContext';

// Enhanced components (lazy loaded to avoid bundle bloat when not needed)
const GlobalNotifications = lazy(() => import('./components/GlobalNotifications'));

// Lazy load the login page
const LoginPage = lazy(() => import('./modules/core/pages/LoginPage'));

// Lazy load the dashboard page
const DashboardPage = lazy(() => import('./modules/dashboard/pages/DashboardPage'));

// Error tracking test component
const ErrorTrackingTest = lazy(() => import('./components/ErrorTrackingTest'));

// Tabbed workspace test page component
const TabbedWorkspaceTestPage = lazy(() => import('./modules/settings/pages/TabbedWorkspaceTestPage'));
// Tabbed mode test page component
const TabbedModeTestPage = lazy(() => import('./modules/settings/pages/TabbedModeTestPage'));
// Login test page component
const LoginTestPage = lazy(() => import('./pages/LoginTestPage'));



// Vite will statically analyze all .tsx files in ./modules/*/pages
// Using eager: true to avoid runtime module loading issues
const pageModules = {
  ...import.meta.glob('./modules/*/pages/*.tsx', { eager: true }),
  ...import.meta.glob('./modules/*/pages/**/*.tsx', { eager: true }),
};

// Debug: Log all available page modules
console.log('📦 [pageModules] All loaded modules:', Object.keys(pageModules));
console.log('📦 [pageModules] Academics modules:', Object.keys(pageModules).filter(key => key.includes('academics')));

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
  console.log('🔍 [getPageComponent] Looking for key:', modularKey);
  console.log('🔍 [getPageComponent] Available pageModules keys:', Object.keys(pageModules));
  console.log('🔍 [getPageComponent] Academics specific keys:', Object.keys(pageModules).filter(key => key.includes('academics')));
  
  const moduleExport = pageModules[modularKey];
  console.log('🔍 [getPageComponent] moduleExport for key:', modularKey, ':', moduleExport);
  
  if (!moduleExport) {
    console.log('❌ [getPageComponent] No component found for key:', modularKey);
    console.log('Available keys for module:', Object.keys(pageModules).filter(key => key.includes(moduleDir)));
    
    // Try alternative key patterns
    const altKey1 = `./modules/${moduleDir}/pages/${nav.page}/index.tsx`;
    const altKey2 = `./modules/${moduleDir}/pages/index.ts`;
    console.log('🔍 [getPageComponent] Trying alternative keys:', altKey1, altKey2);
    
    const altExport1 = pageModules[altKey1];
    const altExport2 = pageModules[altKey2];
    
    if (altExport1) {
      console.log('✅ [getPageComponent] Found component with alternative key:', altKey1);
      return altExport1.default || altExport1;
    }
    
    if (altExport2) {
      console.log('✅ [getPageComponent] Found component with alternative key:', altKey2);
      const indexExports = altExport2.default || altExport2;
      console.log('🔍 [getPageComponent] indexExports:', indexExports);
      if (indexExports && indexExports[nav.page]) {
        console.log('✅ [getPageComponent] Found component in index exports:', nav.page);
        return indexExports[nav.page];
      }
    }
    
    return null;
  }

  console.log('✅ [getPageComponent] Found component for:', modularKey);
  console.log('🔍 [getPageComponent] moduleExport.default:', moduleExport.default);
  console.log('🔍 [getPageComponent] moduleExport keys:', Object.keys(moduleExport));
  
  // Since modules are eagerly loaded, access the default export directly
  const component = moduleExport.default || moduleExport;
  console.log('🔍 [getPageComponent] Final component:', component);
  return component;
};

// Module Dashboard Placeholder Component
const ModuleDashboardPlaceholder: React.FC<{ moduleName: string }> = ({ moduleName }) => {
  const moduleNameClean = moduleName.replace('navigation:', '').replace('.title', '');
  const formattedName = moduleNameClean.charAt(0).toUpperCase() + moduleNameClean.slice(1);
  
  return (
    <div className="flex items-center justify-center h-full bg-gray-50">
      <div className="text-center p-8 max-w-md">
        <div className="text-6xl mb-4">📋</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{formattedName} Dashboard</h1>
        <p className="text-gray-600 mb-6">
          Welcome to the {formattedName} module. Select an option from the sidebar to get started.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
          <h2 className="font-semibold text-blue-800 mb-2">Quick Tips:</h2>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Use the sidebar to navigate through {formattedName} features</li>
            <li>• Tabs allow you to work on multiple pages simultaneously</li>
            <li>• Your work is automatically saved as you go</li>
          </ul>
        </div>
      </div>
    </div>
  );
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
      
      {/* Test Route for Academics Dashboard */}
      <Route
        path="/academics/dashboard"
        element={
          <ProtectedRoute requiredModule="academics" requiredPermission="academics.view">
            <div className="p-8">
              <h1 className="text-2xl font-bold mb-4">Academics Dashboard Test</h1>
              <p>This is a test route to verify academics routing is working.</p>
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                <h2 className="font-semibold">Debug Info:</h2>
                <p>Route: /academics/dashboard</p>
                <p>Module: academics</p>
                <p>Permission: academics.view</p>
              </div>
            </div>
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
      
      {/* Tabbed Mode Test Route */}
      <Route
        path="/tabbed-mode-test"
        element={
          <ProtectedRoute requiredModule="dashboard" requiredPermission="dashboard.view">
            <Suspense fallback={
              <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                  <Spinner size="lg" />
                  <p className="mt-4 text-gray-600">Loading tabbed mode test...</p>
                </div>
              </div>
            }>
              <TabbedModeTestPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      {/* Dynamic routes from navigation items */}
      {navigationItems.flatMap(navItem => {
        // Handle group items (modules) with children
        if (navItem.isGroup && navItem.children) {
          console.log('🔍 [DynamicRoutes] Processing group:', navItem.name, 'with', navItem.children.length, 'children');
          return navItem.children.map(childNav => {
            const pathSegments = childNav.path.split('/').filter(Boolean);
            const moduleDir = pathSegments[0] || '';
            
            console.log('🔍 [DynamicRoutes] Processing child nav:', childNav.name, 'path:', childNav.path, 'page:', childNav.page);
            
            let PageComponent = null;
            if (moduleDir && childNav.page) {
              const modularKey = `./modules/${moduleDir}/pages/${childNav.page}.tsx`;
              const moduleExport = pageModules[modularKey];
              if (moduleExport) {
                PageComponent = () => {
                  const Component = moduleExport.default || moduleExport;
                  return <Component />;
                };
                console.log('✅ [DynamicRoutes] Found component for:', childNav.path);
              } else {
                console.log('❌ [DynamicRoutes] No component found for key:', modularKey);
                console.log('Available keys:', Object.keys(pageModules).filter(key => key.includes(moduleDir)));
              }
            }
            
            if (!PageComponent) {
              console.log('❌ [DynamicRoutes] No component found for nav item:', childNav.name);
              return null;
            }
            
            const moduleName = moduleDir || navItem.name.toLowerCase();
            const requiredPermission = moduleName ? `${moduleName}.view` : undefined;
            
            return (
              <Route
                key={childNav.path}
                path={childNav.path}
                element={
                  <ProtectedRoute requiredModule={moduleName} requiredPermission={requiredPermission}>
                    <PageErrorBoundary pageName={childNav.page || childNav.path}>
                      <Suspense fallback={
                        <div className="flex items-center justify-center h-screen">
                          <div className="text-center">
                            <Spinner size="lg" />
                            <p className="mt-4 text-gray-600">Loading {childNav.name}...</p>
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
        }
        
        // Handle direct navigation items (non-group)
        if (!navItem.isGroup && navItem.path && navItem.page) {
          const pathSegments = navItem.path.split('/').filter(Boolean);
          const moduleDir = pathSegments[0] || '';
          
          console.log('🔍 [DynamicRoutes] Processing direct nav:', navItem.name, 'path:', navItem.path, 'page:', navItem.page);
          
          let PageComponent = null;
          if (moduleDir && navItem.page) {
            const modularKey = `./modules/${moduleDir}/pages/${navItem.page}.tsx`;
            const moduleExport = pageModules[modularKey];
            if (moduleExport) {
              PageComponent = () => {
                const Component = moduleExport.default || moduleExport;
                return <Component />;
              };
              console.log('✅ [DynamicRoutes] Found component for:', navItem.path);
            } else {
              console.log('❌ [DynamicRoutes] No component found for key:', modularKey);
            }
          }
          
          if (!PageComponent) {
            console.log('❌ [DynamicRoutes] No component found for nav item:', navItem.name);
            return null;
          }
          
          const moduleName = moduleDir || 'dashboard';
          const requiredPermission = moduleName ? `${moduleName}.view` : undefined;
          
          return (
            <Route
              key={navItem.path}
              path={navItem.path}
              element={
                <ProtectedRoute requiredModule={moduleName} requiredPermission={requiredPermission}>
                  <PageErrorBoundary pageName={navItem.page || navItem.path}>
                    <Suspense fallback={
                      <div className="flex items-center justify-center h-screen">
                        <div className="text-center">
                          <Spinner size="lg" />
                          <p className="mt-4 text-gray-600">Loading {navItem.name}...</p>
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
        }
        
        return null;
      }).filter(Boolean)}
      
      {/* Module base path routes - for module dashboards */}
      {moduleRegistry.getEnabledModules().map(module => {
        const moduleName = module.id;
        const requiredPermission = moduleName ? `${moduleName}.view` : undefined;
        
        // Create a route for the module base path that redirects to the dashboard
        if (module.path) {
          // Check if this is the academics module and create a redirect to its dashboard
          if (moduleName === 'academics') {
            const dashboardKey = `./modules/academics/pages/AcademicsDashboardPage.tsx`;
            const dashboardExport = pageModules[dashboardKey];
            
            if (dashboardExport) {
              const DashboardComponent = () => {
                const Component = dashboardExport.default || dashboardExport;
                return <Component />;
              };
              
              return (
                <Route
                  key={module.path}
                  path={module.path}
                  element={
                    <ProtectedRoute requiredModule={moduleName} requiredPermission={requiredPermission}>
                      <PageErrorBoundary pageName="AcademicsDashboardPage">
                        <Suspense fallback={
                          <div className="flex items-center justify-center h-screen">
                            <div className="text-center">
                              <Spinner size="lg" />
                              <p className="mt-4 text-gray-600">Loading Academics Dashboard...</p>
                            </div>
                          </div>
                        }>
                          <DashboardComponent />
                        </Suspense>
                      </PageErrorBoundary>
                    </ProtectedRoute>
                  }
                />
              );
            }
          }
          
          // For other modules, use the placeholder
          return (
            <Route
              key={module.path}
              path={module.path}
              element={
                <ProtectedRoute requiredModule={moduleName} requiredPermission={requiredPermission}>
                  <ModuleDashboardPlaceholder moduleName={module.name} />
                </ProtectedRoute>
              }
            />
          );
        }
        
        return null;
      }).filter(Boolean)}
        
        {/* Catch-all route for unmatched paths */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

// Enhanced app content with feature flag support
const AppContent: React.FC<{ modulesInitialized: boolean; config: UnifiedAppConfig }> = ({ modulesInitialized, config }) => {
  const location = useLocation();
  const authContext = useAuth();
  const { isAuthenticated, isLoading, user } = authContext;
  const { restoreRouteIfNeeded } = useRoutePersistence();
  
  // Debug current user and authentication state
  useEffect(() => {
    console.log('🔍 [App] Current user:', user);
    console.log('🔍 [App] Is authenticated:', isAuthenticated);
    console.log('🔍 [App] Is loading:', isLoading);
  }, [user, isAuthenticated, isLoading]);

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
    <ActionProvider>
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
    </ActionProvider>
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
import { ActionProvider } from './contexts/ActionProvider';

// Main consolidated App component
const AppInner: React.FC = () => {
  const { config, applyPreset } = useUnifiedConfig();
  const [modulesInitialized, setModulesInitialized] = useState(false);
  const initializedRef = useRef(false);

  // TEMPORARY: Apply demo preset to test mock data path
  useEffect(() => {
    console.log('🧪 [App] TESTING: Applying demo preset to test mock data path');
    applyPreset('demo');
    
    // Log current config after applying preset
    setTimeout(() => {
      const currentConfig = getCurrentUnifiedConfig();
      console.log('Current unified config after demo preset:', {
        dataMode: currentConfig.dataMode,
        enhancedDataLayer: currentConfig.features.enhancedDataLayer,
        environment: currentConfig.environment,
        demo: currentConfig.demo
      });
    }, 1000);
  }, [applyPreset]);
  
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
        debugLog('🚀 [App] Initializing modules...');
        initializedRef.current = true;
        
        try {
          // Add emergency timeout for module initialization
          const emergencyTimeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Emergency module loading timeout')), 8000);
          });
          
          await measureAsync(
            () => Promise.race([initializeModules(), emergencyTimeout]),
            'module_initialization'
          );
          
          // Verify modules are properly registered
          const registeredModules = moduleRegistry.getAllModules();
          const enabledModules = moduleRegistry.getEnabledModules();
          
          console.log('✅ [App] Modules initialized successfully');
          console.log('📦 [App] Registered modules:', registeredModules.map(m => ({ id: m.id, name: m.name, version: m.version })));
          console.log('🟢 [App] Enabled modules:', enabledModules.map(m => ({ id: m.id, name: m.name })));
          
          // Verify navigation items are available
          const navigationItems = moduleRegistry.getNavigationItems();
          console.log('🧭 [App] Navigation items:', navigationItems.map(item => ({ name: item.name, path: item.path, isActive: item.isActive })));
          
          // Additional verification
          console.log(`📊 [App] Module verification complete: ${registeredModules.length} total, ${enabledModules.length} enabled, ${navigationItems.length} nav items`);
          
          // Add visible verification for debugging
          const verificationDiv = document.createElement('div');
          verificationDiv.id = 'module-verification-status';
          verificationDiv.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: #4CAF50;
            color: white;
            padding: 10px;
            border-radius: 5px;
            z-index: 9999;
            font-family: monospace;
            font-size: 12px;
            max-width: 300px;
          `;
          verificationDiv.innerHTML = `
            <strong>Module Verification ✅</strong><br/>
            Registered: ${registeredModules.length}<br/>
            Enabled: ${enabledModules.length}<br/>
            Nav Items: ${navigationItems.length}<br/>
            <small>Modules: ${enabledModules.map(m => m.id).join(', ')}</small>
          `;
          document.body.appendChild(verificationDiv);
          
          // Remove after 10 seconds
          setTimeout(() => {
            const elem = document.getElementById('module-verification-status');
            if (elem) elem.remove();
          }, 10000);
          
          debugLog('✅ [App] Modules initialized successfully');
          debugLog('📦 [App] Registered modules:', registeredModules.map(m => ({ id: m.id, name: m.name, version: m.version })));
          debugLog('🟢 [App] Enabled modules:', enabledModules.map(m => ({ id: m.id, name: m.name })));
          debugLog('🧭 [App] Navigation items:', navigationItems.map(item => ({ name: item.name, path: item.path, isActive: item.isActive })));
          
          // Expose module registry to global scope for testing
          (window as any).moduleRegistry = moduleRegistry;
          (window as any).moduleTestData = {
            registeredModules,
            enabledModules,
            navigationItems,
            initializationComplete: true,
            timestamp: new Date().toISOString()
          };
          
        } catch (error) {
          console.error('❌ [App] Module initialization failed:', error);
          console.warn('⚠️ [App] Forcing module loading completion for emergency access...');
          
          // Force complete module loading to allow app access
          try {
            const { moduleRegistry } = await import('./core/moduleRegistry');
            
            // Register minimal core modules for basic functionality
            const coreModules = [
              {
                id: 'dashboard',
                name: 'Dashboard',
                description: 'Main dashboard',
                icon: 'LayoutDashboard',
                path: '/dashboard',
                version: '1.0.0',
                navigation: [],
                features: [],
                dependencies: [],
                settings: {},
                rbacPermissions: [],
                defaultRoles: []
              },
              {
                id: 'settings',
                name: 'Settings',
                description: 'System settings',
                icon: 'Settings',
                path: '/settings',
                version: '1.0.0',
                navigation: [],
                features: [],
                dependencies: [],
                settings: {},
                rbacPermissions: [],
                defaultRoles: []
              }
            ];
            
            coreModules.forEach(module => {
              moduleRegistry.registerModule(module);
              console.log(`✅ [App] Emergency registered module: ${module.id}`);
            });
            
          } catch (registryError) {
            console.error('❌ [App] Emergency module registration failed:', registryError);
          }
          
          // Expose error state for testing
          (window as any).moduleTestData = {
            registeredModules: [],
            enabledModules: [],
            navigationItems: [],
            initializationComplete: false,
            error: error.message,
            timestamp: new Date().toISOString()
          };
          
        } finally {
          setModulesInitialized(true);
        }
      }
    };
    
    init();
  }, [measureAsync]); // Add measureAsync to dependency array

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
                <NetworkProvider>
                  <SyncProvider>
                    <ModuleErrorBoundary moduleName="Core Application">
                      <AppContent modulesInitialized={modulesInitialized} config={config} />
                    </ModuleErrorBoundary>
                  </SyncProvider>
                </NetworkProvider>
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

// Main App component with unified config provider and i18n Suspense
const App: React.FC = () => {

  return (
    <UnifiedConfigProvider>
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
    </UnifiedConfigProvider>
  );
};

export default App;

