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
const LoginPage = lazy(() => import('./modules/core/pages/LoginPage'));

// Lazy load the dashboard page
const DashboardPage = lazy(() => import('./modules/dashboard/pages/DashboardPage'));

// Vite will statically analyze all .tsx files in ./modules/*/pages
const pageModules = {
  ...import.meta.glob('./modules/*/pages/**/*.tsx'),
};

console.log('🚀 [App] Available page modules:', Object.keys(pageModules).length);

// Modular getPageComponent: Try src/modules/<module>/pages/<PageName>.tsx
const getPageComponent = (nav: any) => {
  if (nav.page) {
    const pathSegments = nav.path.split('/').filter(Boolean);
    let moduleDir = '';

    // Determine moduleDir based on pathSegments
    if (pathSegments.length > 0) {
      // The first segment of the path is always the module directory, if it exists
      moduleDir = pathSegments[0];
    }
    
    // Try modular location
    if (moduleDir) {
      const modularKey = `./modules/${moduleDir}/pages/${nav.page}.tsx`;
      const modularImportFn = pageModules[modularKey];
      if (modularImportFn) {
        return lazy(modularImportFn as any);
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
          <Suspense fallback={<div>Loading...</div>}>
            <LoginPage />
          </Suspense>
        } 
      />
      
      {/* Direct Dashboard Route - Always Available */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute requiredModule="dashboard" requiredPermission="dashboard.view">
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
          return (module.children || []).map(nav => {
            const PageComponent = getPageComponent(nav);
            if (!PageComponent) {
              return null;
            }
            
            // Determine required permission based on module path
            const modulePath = nav.modulePath?.replace('/', '') || '';
            // Extract module name from path (e.g., '/administration' -> 'administration')
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

