// Legacy App component - preserved for backward compatibility
// This is the original App.tsx before consolidation
// Use this if you need to revert to the original implementation

import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { UserProvider } from './contexts/UserContext';
import { AppDataProvider } from './contexts/AppDataContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useDynamicNavigation } from './hooks/useDynamicNavigation';
import { useRBAC } from './hooks/useRBAC';
import { initializeModules } from './core/moduleLoader';
import Spinner from './components/ui/Spinner';
import { moduleRegistry } from './core/moduleRegistry';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy load the login page
const LoginPage = lazy(() => import('./modules/core/pages/LoginPage'));

// Lazy load the dashboard page
const DashboardPage = lazy(() => import('./modules/dashboard/pages/DashboardPage'));

// Vite will statically analyze all .tsx files in ./modules/*/pages
const pageModules = {
  ...import.meta.glob('./modules/*/pages/*.tsx'),
  ...import.meta.glob('./modules/*/pages/**/*.tsx'),
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

const DynamicRoutes = ({ modulesInitialized }: { modulesInitialized: boolean }) => {
  const { navigationItems } = useDynamicNavigation(true);
  const { accessibleModules } = useRBAC();

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
            if (modularImportFn) PageComponent = lazy(modularImportFn as any);
          }
          if (!PageComponent) return null;
          
          // Extract module name for permission checking
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
      {navigationItems
        .filter(item => !item.modulePath || accessibleModules.includes(item.modulePath.replace('/', '')))
        .flatMap(module => {
          console.log('🔍 [DynamicRoutes] Processing module:', module.name, 'with children:', module.children?.length || 0);
          return (module.children || []).map(nav => {
            console.log('🔍 [DynamicRoutes] Processing nav item:', nav.name, 'path:', nav.path, 'page:', nav.page);
            const PageComponent = getPageComponent(nav);
            if (!PageComponent) {
              console.log('❌ [DynamicRoutes] No page component found for nav item:', nav.name);
              return null;
            }
            
            // Determine required permission based on module path
            const modulePath = nav.modulePath?.replace('/', '') || '';
            // Extract module name from path (e.g., '/administration' -> 'administration')
            const moduleName = modulePath || nav.path.split('/')[1] || '';
            const requiredPermission = moduleName ? `${moduleName}.view` : undefined;
            
            console.log('✅ [DynamicRoutes] Creating route for:', nav.path, 'with permission:', requiredPermission, 'moduleName:', moduleName);
            
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
        })}
    </Routes>
  );
};

const AppContent: React.FC<{ modulesInitialized: boolean }> = ({ modulesInitialized }) => {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  // Debug authentication state
  console.log('🔍 [AppContent] Auth state:', { isAuthenticated, isLoading, pathname: location.pathname });

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
    console.log('🔍 [AppContent] User not authenticated, showing login page');
    return <LoginPage />;
  }

  console.log('🔍 [AppContent] User authenticated, showing layout');
  return (
    <Layout>
      <ErrorBoundary key={location.pathname}>
        <DynamicRoutes modulesInitialized={modulesInitialized} />
      </ErrorBoundary>
    </Layout>
  );
};

const AppLegacy: React.FC = () => {
  const [modulesInitialized, setModulesInitialized] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      if (!initializedRef.current) {
        await initializeModules();
        setModulesInitialized(true);
        initializedRef.current = true;
      }
    };
    init();
  }, []);

  if (!modulesInitialized) {
    return <div className="flex items-center justify-center h-screen"><Spinner size="lg" /></div>;
  }

  return (
    <AuthProvider>
      <UserProvider>
        <AppDataProvider>
          <HashRouter>
            <AppContent modulesInitialized={modulesInitialized} />
          </HashRouter>
        </AppDataProvider>
      </UserProvider>
    </AuthProvider>
  );
};

export default AppLegacy;