// ABOUTME: This is the root component of the application.
// ABOUTME: It sets up the main router and global context providers.

import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { UserProvider } from './contexts/UserContext';
import { AppDataProvider } from '@/contexts/AppDataContext';
import { useDynamicNavigation } from './hooks/useDynamicNavigation';
import { useRBAC } from './hooks/useRBAC';
import { initializeModules } from './core/moduleLoader';
import Spinner from './components/ui/Spinner';

// Vite will statically analyze all .tsx files in ./pages
const pageModules = import.meta.glob('./pages/**/*.tsx');

// Enhanced getPageComponent: Accepts nav item, uses 'page' property if present
const getPageComponent = (nav: any) => {
  // If nav.page is present, use it for dynamic import
  if (nav.page) {
    // Try to infer the module directory from the path
    // E.g., /academics/subjects => ./pages/academics/SubjectsPage.tsx
    const segments = nav.path.split('/').filter(Boolean);
    let moduleDir = segments.length > 1 ? segments[0] : '';
    // Special case for dashboard pages at root
    if (nav.path === '/dashboard') {
      moduleDir = '';
    }
    const key = moduleDir
      ? `./pages/${moduleDir}/${nav.page}.tsx`
      : `./pages/${nav.page}.tsx`;
    const importFn = pageModules[key];
    if (!importFn) return null;
    return lazy(importFn as any);
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
          <Layout>
            <DynamicRoutes modulesInitialized={modulesInitialized} />
          </Layout>
        </HashRouter>
      </AppDataProvider>
    </UserProvider>
  );
};

export default App;

