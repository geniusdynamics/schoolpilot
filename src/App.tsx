// ABOUTME: This is the root component of the application.
// ABOUTME: It sets up the main router and global context providers.

import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { UserProvider } from './contexts/UserContext';
import { AppDataProvider } from '@/contexts/AppDataContext';
import { useDynamicNavigation } from './hooks/useDynamicNavigation';
import { useRBAC } from './hooks/useRBAC';
import { initializeModules } from './core/moduleLoader';
import Spinner from './components/ui/Spinner';
import { moduleRegistry } from './core/moduleRegistry';
import ErrorBoundary from './components/ErrorBoundary';

// Vite will statically analyze all .tsx files in ./pages and ./modules/*/pages
const pageModules = {
  ...import.meta.glob('./pages/**/*.tsx'),
  ...import.meta.glob('./modules/*/pages/**/*.tsx'),
};

// Future-proof getPageComponent: Try src/modules/<module>/pages/<PageName>.tsx, then src/pages/<module>/<PageName>.tsx, then src/pages/<PageName>.tsx
const getPageComponent = (nav: any) => {
  if (nav.page) {
    const segments = nav.path.split('/').filter(Boolean);
    let moduleDir = segments.length > 1 ? segments[0] : '';
    // Try modular location first
    if (moduleDir) {
      const modularKey = `./modules/${moduleDir}/pages/${nav.page}.tsx`;
      const modularImportFn = pageModules[modularKey];
      if (modularImportFn) return lazy(modularImportFn as any);
    }
    // Fallback to old src/pages/<module>/<PageName>.tsx
    if (moduleDir) {
      const legacyKey = `./pages/${moduleDir}/${nav.page}.tsx`;
      const legacyImportFn = pageModules[legacyKey];
      if (legacyImportFn) return lazy(legacyImportFn as any);
    }
    // Fallback to root-level page
    const rootKey = `./pages/${nav.page}.tsx`;
    const rootImportFn = pageModules[rootKey];
    if (rootImportFn) return lazy(rootImportFn as any);
    return null;
  }
  // Fallback: old logic
  const key = `./pages${nav.path}.tsx`;
  const importFn = pageModules[key];
  if (!importFn) return null;
  return lazy(importFn as any);
};

const DynamicRoutes = ({ modulesInitialized }: { modulesInitialized: boolean }) => {
  const { navigationItems } = useDynamicNavigation(modulesInitialized);
  const { accessibleModules } = useRBAC();

  // Debug logs to help identify the issue
  console.log('🔍 [DynamicRoutes] Debug Info:', {
    modulesInitialized,
    navigationItemsCount: navigationItems.length,
    navigationItems: navigationItems,
    accessibleModulesCount: accessibleModules.length,
    accessibleModules: accessibleModules,
    filteredItems: navigationItems.filter(item => !item.modulePath || accessibleModules.includes(item.modulePath.replace('/', '')))
  });

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      {/* Register custom/dynamic routes from all enabled modules */}
      {moduleRegistry.getEnabledModules().flatMap(module =>
        (module.routes || []).map(route => {
          // Use the same dynamic import logic as getPageComponent
          const segments = route.path.split('/').filter(Boolean);
          let moduleDir = segments.length > 1 ? segments[0] : '';
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
                <Suspense fallback={<div>Loading...</div>}>
                  <PageComponent />
                </Suspense>
              }
            />
          );
        })
      )}
      {navigationItems
        .filter(item => !item.modulePath || accessibleModules.includes(item.modulePath.replace('/', '')))
        .flatMap(module =>
          (module.children || []).map(nav => {
            const PageComponent = getPageComponent(nav);
            if (!PageComponent) return null;
            return (
              <Route
                key={nav.path}
                path={nav.path}
                element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <PageComponent />
                  </Suspense>
                }
              />
            );
          })
        )}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const AppContent: React.FC<{ modulesInitialized: boolean }> = ({ modulesInitialized }) => {
  const location = useLocation();
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
    <UserProvider>
      <AppDataProvider>
        <HashRouter>
          <AppContent modulesInitialized={modulesInitialized} />
        </HashRouter>
      </AppDataProvider>
    </UserProvider>
  );
};

export default App;

