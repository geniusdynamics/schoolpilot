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

const getPageComponent = (path: string) => {
  // Ensure path always has .tsx extension
  const key = `./pages${path}.tsx`;
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
            const PageComponent = getPageComponent(nav.path);
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

