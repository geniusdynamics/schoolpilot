// ABOUTME: Main application component with unified configuration and module management
// ABOUTME: Updated to support both old and new tab systems via feature flags

import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserProvider } from './contexts/UserContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UnifiedConfigProvider } from './contexts/UnifiedConfigContext';
import { useUnifiedConfig } from './hooks/useUnifiedConfig';
import { useDynamicNavigation } from './hooks/useDynamicNavigation';
import { useRBAC } from './hooks/useRBAC';
import { initializeModules } from './core/moduleLoader';
import { initializeTheme } from './hooks/useTheme';
import { getStoredRouteFromSession, useRoutePersistence } from './hooks/useRoutePersistence';
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
import { NetworkProvider } from './contexts/NetworkContext';
import { SyncProvider } from './contexts/SyncContext';
import { featureFlags } from './config/featureFlags';
import { uds } from './services/data';
import { performanceEventManager } from './services/performanceEventManager';

// Layout components - choose based on feature flag
import Layout from './components/Layout';
import LayoutNew from './components/LayoutNew';
import GlobalNotifications from './components/GlobalNotifications';

// Lazy load components
const LoginPage = lazy(() => import('./modules/core/pages/LoginPage'));
const DashboardPage = lazy(() => import('./modules/dashboard/pages/DashboardPage'));
const ErrorTrackingTest = lazy(() => import('./components/ErrorTrackingTest'));
  const PerformanceMonitor = lazy(() => import('./components/PerformanceMonitor'));

// Explicitly lazy load settings pages to ensure correct routing
const SettingsPage = lazy(() => import('./modules/settings/pages/SettingsPage'));
const UnifiedSettingsPage = lazy(() => import('./modules/settings/pages/UnifiedSettingsPage'));
const FeatureSettingsPage = lazy(() => import('./modules/settings/pages/FeatureSettingsPage'));
const DataManagementPage = lazy(() => import('./modules/settings/pages/DataManagementPage'));
const DatabaseAdminPage = lazy(() => import('./modules/settings/pages/DatabaseAdminPage'));
const AuditLogPage = lazy(() => import('./modules/settings/pages/AuditLogPage'));

// Vite will statically analyze all .tsx files in ./modules/*/pages
const pageModules = {
  ...import.meta.glob('./modules/*/pages/*.tsx'),
  ...import.meta.glob('./modules/*/pages/**/*.tsx'),
};

// Debug: Log available page modules
const allPageKeys = Object.keys(pageModules);
console.log('📦 [App] Total page modules loaded:', allPageKeys.length);
console.log('📦 [App] Sample keys:', allPageKeys.slice(0, 5));
const settingsPages = allPageKeys.filter(k => k.includes('/settings/pages/'));
console.log('📦 [App] Settings pages available:', settingsPages.length);
settingsPages.forEach(page => console.log('  -', page));

// Dashboard modules for dynamic loading
const dashboardModules = {
  ...import.meta.glob('./modules/*/pages/*Dashboard*.tsx'),
};

const getPageComponent = (navItem: any) => {
  console.log('🔍 [App] Looking up page component for:', navItem.page, 'path:', navItem.path);
  
  if (!navItem.page) {
    console.log('❌ [App] No page specified for nav item:', navItem);
    return null;
  }

  // Split path to determine module directory
  const pathSegments = navItem.path.split('/').filter(Boolean);
  const moduleDir = pathSegments[0] || 'dashboard';
  
  // Try multiple key patterns for better compatibility
  const possibleKeys = [
    // Standard pattern
    `./modules/${moduleDir}/pages/${navItem.page}.tsx`,
    // Without .tsx extension
    `./modules/${moduleDir}/pages/${navItem.page}`,
    // With /index.tsx
    `./modules/${moduleDir}/pages/${navItem.page}/index.tsx`,
  ];
  
  for (const key of possibleKeys) {
    if (pageModules[key]) {
      console.log('✅ [App] Found component via key:', key);
      return React.lazy(pageModules[key]);
    }
  }
  
  // Fallback: Search for any key that ends with the page name
  // This handles cases where Vite might return different path formats
  const allKeys = Object.keys(pageModules);
  const matchingKey = allKeys.find(key => {
    // Match patterns like: ./modules/settings/pages/UnifiedSettingsPage.tsx
    // Or: /modules/settings/pages/UnifiedSettingsPage.tsx (without leading dot)
    const pageNamePattern = new RegExp(`/(modules/)?${moduleDir}/pages/${navItem.page}\\.tsx$`);
    return pageNamePattern.test(key) || key.endsWith(`/${navItem.page}.tsx`);
  });
  
  if (matchingKey) {
    console.log('✅ [App] Found component via fallback search:', matchingKey);
    return React.lazy(pageModules[matchingKey]);
  }
  
  // Debug: List all available keys for this module
  const availableKeys = allKeys.filter(k => 
    k.includes(`/modules/${moduleDir}/pages/`) || 
    k.includes(`/${moduleDir}/pages/`)
  );
  console.log('❌ [App] Component not found for:', navItem.page);
  console.log('❌ [App] Tried keys:', possibleKeys);
  console.log('🔍 [App] Available keys for', moduleDir, ':', availableKeys.slice(0, 20));
  return null;
};

const DynamicRoutes = ({
  modulesInitialized,
  userId,
  userRole
}: {
  modulesInitialized: boolean;
  userId?: string;
  userRole?: string;
}) => {
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
  const { accessibleModules } = useRBAC(userId, userRole);
  const { t } = useTranslation();

  useEffect(() => {
    if (modulesInitialized && navigationItems.length > 0) {
      console.log('✅ [DynamicRoutes] Navigation loaded:', navigationItems.length, 'items');
    }
  }, [modulesInitialized, navigationItems.length]);

  const initialRoute = getStoredRouteFromSession();
  const startupRoute = initialRoute && initialRoute !== '/' && initialRoute !== '/login'
    ? initialRoute
    : '/dashboard';

  return (
    <Routes>
      <Route path="/" element={<Navigate to={startupRoute} replace />} />
      
      {/* Login Route - public, no auth check needed */}
      <Route
        path="/login"
        element={
          <Suspense fallback={
            <div className="flex items-center justify-center h-screen">
              <div className="text-center">
                <Spinner size="lg" />
                <p className="mt-4 text-gray-600">Loading...</p>
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

      {/* Explicit Settings Routes - Fixes routing bug where settings pages were navigating to Audit Log */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute requiredModule="settings" requiredPermission="settings.view">
            <Suspense fallback={<div className="flex items-center justify-center h-screen"><Spinner size="lg" /></div>}>
              <SettingsPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/unified"
        element={
          <ProtectedRoute requiredModule="settings" requiredPermission="settings.view">
            <Suspense fallback={<div className="flex items-center justify-center h-screen"><Spinner size="lg" /></div>}>
              <UnifiedSettingsPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/features"
        element={
          <ProtectedRoute requiredModule="settings" requiredPermission="settings.view">
            <Suspense fallback={<div className="flex items-center justify-center h-screen"><Spinner size="lg" /></div>}>
              <FeatureSettingsPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
          path="/settings/data-management"
          element={
            <ProtectedRoute requiredModule="settings" requiredPermission="settings.view">
              <Suspense fallback={<div className="flex items-center justify-center h-screen"><Spinner size="lg" /></div>}>
                <DataManagementPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/database-admin"
          element={
            <ProtectedRoute requiredModule="settings" requiredPermission="settings.view">
              <Suspense fallback={<div className="flex items-center justify-center h-screen"><Spinner size="lg" /></div>}>
                <DatabaseAdminPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
      <Route
        path="/settings/audit-log"
        element={
          <ProtectedRoute requiredModule="settings" requiredPermission="settings.view">
            <Suspense fallback={<div className="flex items-center justify-center h-screen"><Spinner size="lg" /></div>}>
              <AuditLogPage />
            </Suspense>
          </ProtectedRoute>
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
          const DashboardComponent = lazy(dashboardExport as any);
          
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
          console.log('🗺️ [DynamicRoutes] Processing module:', module.name, 'children:', module.children?.length);
          return (module.children || []).map(nav => {
            console.log('🗺️ [DynamicRoutes] Processing nav item:', {
              name: nav.name,
              path: nav.path,
              page: nav.page,
              deprecated: nav.deprecated
            });
            
            const PageComponent = getPageComponent(nav);
            if (!PageComponent) {
              console.warn('⚠️ [DynamicRoutes] No component found for:', nav.path, 'page:', nav.page);
              return null;
            }
            
            console.log('✅ [DynamicRoutes] Creating route for:', nav.path, 'with component:', nav.page);
            
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
                          <p className="mt-4 text-gray-600">Loading {nav.page || 'page'}...</p>
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
      
      {/* Catch-all route - redirect to dashboard for unknown paths */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

// Enhanced app content with feature flag support
const AppContent: React.FC<{ modulesInitialized: boolean; config: UnifiedAppConfig }> = ({ modulesInitialized, config }) => {
  const location = useLocation();
  const authContext = useAuth();
  const { isAuthenticated, isLoading, user } = authContext;
  const { restoreRouteIfNeeded } = useRoutePersistence(isAuthenticated);
  
  // Choose layout based on feature flag
  const LayoutComponent = featureFlags.useNewTabSystem ? LayoutNew : Layout;
  
  // Debug authentication state
  useEffect(() => {
    performanceEventManager.markDiagnostic('app_route_state', {
      pathname: location.pathname,
      isAuthenticated,
      isLoading
    });
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
        performanceEventManager.markDiagnostic('app_route_restored', {
          pathname: location.pathname
        });
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
    <LayoutComponent>
      {/* Main content with error boundary */}
      <div className="flex-1">
        <ErrorBoundary resetKey={`${location.pathname}|${location.search}|${location.hash}`}>
          <DynamicRoutes
            modulesInitialized={modulesInitialized}
            userId={user?.id}
            userRole={user?.role}
          />
        </ErrorBoundary>
      </div>
      
      {/* Global notifications (if enabled) */}
      {(config.features as any).enableNotifications && config.environment !== 'demo' && (
        <GlobalNotifications />
      )}
      
      {/* Performance Monitor (Feature Flag Controlled) */}
      {config.features.performanceMonitorWidget && (
        <Suspense fallback={null}>
          <PerformanceMonitor showDetails={true} />
        </Suspense>
      )}
    </LayoutComponent>
  );
};

// Data provider wrapper with feature flag
const DataProviderWrapper: React.FC<{ config: UnifiedAppConfig; children: React.ReactNode }> = ({ config: _config, children }) => {
  void _config;
  // Always proceed with app even if UDS fails - use fallback
  const [udsInitialized, setUdsInitialized] = useState(true); // Always start as true to prevent hanging
  
  useEffect(() => {
    if (featureFlags.useUnifiedDataService) {
      debugLog('🚀 [App] Initializing Unified Data Service...');
      
      // CRITICAL FIX: Use 'standalone' mode with PouchDB for data persistence (CRIT-001)
      // This replaces the mock provider with real IndexedDB-backed PouchDB
      // Add timeout to prevent hanging
      const initializationPromise = uds.initialize('standalone', { 
        pouchdb: {
          localDbName: 'schoolpilot_standalone',
        }
      });
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('UDS initialization timeout')), 10000); // 10 second timeout
      });
      
      Promise.race([initializationPromise, timeoutPromise])
        .then(() => {
          setUdsInitialized(true);
          debugLog('✅ [App] Unified Data Service initialized');
        })
        .catch(error => {
          console.warn('⚠️ [App] UDS initialization failed or timed out, falling back to mock:', error);
          // Fall back to old system gracefully
          setUdsInitialized(true);
        });
      
      return () => {
        uds.destroy();
      };
    }
  }, []);
  
  if (!udsInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Initializing data layer...</p>
        </div>
      </div>
    );
  }
  
  // Use existing AppDataProvider for now (legacy)
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

  // Memory management for the main app
  const _memoryManagement = useMemoryManagement({
    componentName: 'App',
    trackLifecycle: true,
    enableAlerts: false
  });
  void _memoryManagement;

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
      <NetworkProvider>
        <SyncProvider>
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
        </SyncProvider>
      </NetworkProvider>
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
