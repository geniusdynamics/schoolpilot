// ABOUTME: This is the root component of the application.
// ABOUTME: It sets up the main router and global context providers with authentication.

import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { UserProvider } from './contexts/UserContext';
import { AppDataProvider } from '@/contexts/AppDataContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useDynamicNavigation } from './hooks/useDynamicNavigation';
import { useRBAC } from './hooks/useRBAC';
import { initializeModules } from './core/moduleLoader';
import Spinner from './components/ui/Spinner';
import { moduleRegistry } from './core/moduleRegistry';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy load the login page
const LoginPage = lazy(() => import('./pages/LoginPage'));

// Lazy load the dashboard page
const DashboardPage = lazy(() => import('./pages/DashboardPage'));

// Vite will statically analyze all .tsx files in ./pages and ./modules/*/pages
const pageModules = {
  ...import.meta.glob('./pages/**/*.tsx'),
  ...import.meta.glob('./modules/*/pages/**/*.tsx'),
};

console.log('🔍 [App] Available page modules:', Object.keys(pageModules));

// Future-proof getPageComponent: Try src/modules/<module>/pages/<PageName>.tsx, then src/pages/<module>/<PageName>.tsx, then src/pages/<PageName>.tsx
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
    
    // Try modular location first
    if (moduleDir) {
      const modularKey = `./modules/${moduleDir}/pages/${nav.page}.tsx`;
      const modularImportFn = pageModules[modularKey];
      if (modularImportFn) {
        console.log('✅ [getPageComponent] Found modular key:', modularKey);
        return lazy(modularImportFn as any);
      }
    }
    // Fallback to old src/pages/<module>/<PageName>.tsx
    if (moduleDir) {
      const legacyKey = `./pages/${moduleDir}/${nav.page}.tsx`;
      const legacyImportFn = pageModules[legacyKey];
      if (legacyImportFn) {
        console.log('✅ [getPageComponent] Found legacy key:', legacyKey);
        return lazy(legacyImportFn as any);
      }
    }
    // Fallback to root-level page
    const rootKey = `./pages/${nav.page}.tsx`;
    const rootImportFn = pageModules[rootKey];
    if (rootImportFn) {
      console.log('✅ [getPageComponent] Found root key:', rootKey);
      return lazy(rootImportFn as any);
    }
    
    console.log('❌ [getPageComponent] No page component found for:', nav.page);
    return null;
  }
  // Fallback: old logic (should ideally not be hit if nav.page is always provided)
  const key = `./pages${nav.path}.tsx`;
  const importFn = pageModules[key];
  if (importFn) {
    console.log('✅ [getPageComponent] Found fallback key:', key);
    return lazy(importFn as any);
  }
  console.log('❌ [getPageComponent] No page component found for fallback path:', nav.path);
  return null;
};

const DynamicRoutes = ({ modulesInitialized }: { modulesInitialized: boolean }) => {
  const { navigationItems } = useDynamicNavigation(true);
  const { accessibleModules } = useRBAC();
  const { user } = useAuth();

  // Debug logs to help identify the issue
  console.log('🔍 [DynamicRoutes] Debug Info:', {
    modulesInitialized,
    navigationItemsCount: navigationItems.length,
    navigationItems: navigationItems,
    accessibleModulesCount: accessibleModules.length,
    accessibleModules: accessibleModules,
    user: user?.username,
    filteredItems: navigationItems.filter(item => !item.modulePath || accessibleModules.includes(item.modulePath.replace('/', '')))
  });

  // Debug: Check each navigation item structure
  navigationItems.forEach((item, index) => {
    console.log(`🔍 [DynamicRoutes] Navigation Item ${index}:`, {
      name: item.name,
      path: item.path,
      isGroup: item.isGroup,
      children: item.children,
      childrenCount: item.children?.length || 0
    });
  });

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      {/* Login Route */}
      <Route 
        path="/login" 
        element={
          <Suspense fallback={<div>Loading...</div>}>
            <LoginPage />
          </Suspense>
        } 
      />
      
      {/* Direct Dashboard Route - Always Available */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Suspense fallback={<div>Loading...</div>}>
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
          // Try modular location first
          if (moduleDir) {
            const modularKey = `./modules/${moduleDir}/pages/${route.page}.tsx`;
            const modularImportFn = pageModules[modularKey];
            if (modularImportFn) PageComponent = lazy(modularImportFn as any);
          }
          // Fallback to old src/pages/<module>/<PageName>.tsx
          if (!PageComponent && moduleDir) {
            const legacyKey = `./pages/${moduleDir}/${route.page}.tsx`;
            const legacyImportFn = pageModules[legacyKey];
            if (legacyImportFn) PageComponent = lazy(legacyImportFn as any);
          }
          // Fallback to root-level page
          if (!PageComponent) {
            const rootKey = `./pages/${route.page}.tsx`;
            const rootImportFn = pageModules[rootKey];
            if (rootImportFn) PageComponent = lazy(rootImportFn as any);
          }
          if (!PageComponent) return null;
          return (
            <Route
              key={route.path}
              path={route.path}
              element={
                <ProtectedRoute requiredModule={moduleDir}>
                  <Suspense fallback={<div>Loading...</div>}>
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
            const requiredPermission = modulePath ? `${modulePath}.view` : undefined;
            
            console.log('✅ [DynamicRoutes] Creating route for:', nav.path, 'with permission:', requiredPermission);
            
            return (
              <Route
                key={nav.path}
                path={nav.path}
                element={
                  <ProtectedRoute 
                    requiredPermission={requiredPermission}
                    requiredModule={modulePath}
                  >
                    <Suspense fallback={<div>Loading...</div>}>
                      <PageComponent />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
            );
          });
        })}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const AppContent: React.FC<{ modulesInitialized: boolean }> = ({ modulesInitialized }) => {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

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
    return <LoginPage />;
  }

  return (
    <Layout>
      <ErrorBoundary key={location.pathname}>
        <DynamicRoutes modulesInitialized={modulesInitialized} />
      </ErrorBoundary>
    </Layout>
  );
};

const App: React.FC = () => {
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

export default App;

