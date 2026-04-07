// ABOUTME: AppContent and AppInner components — authenticated layout shell and module initialization
// ABOUTME: AppContent handles layout selection (feature-flag), auth gating, and route rendering
// ABOUTME: AppInner handles theme init, module initialization, and wraps AppProviders

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { UnifiedAppConfig } from '../config/unifiedConfig';
import { useAuth } from '../contexts/AuthContext';
import { useUnifiedConfig } from '../hooks/useUnifiedConfig';
import { initializeModules } from '../core/moduleLoader';
import { initializeTheme } from '../hooks/useTheme';
import { useRoutePersistence } from '../hooks/useRoutePersistence';
import { logger } from '../utils/logging';
import Spinner from '../components/ui/Spinner';
import { moduleRegistry } from '../core/moduleRegistry';
import ErrorBoundary from '../components/ErrorBoundary';
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring';
import { useMemoryManagement } from '../hooks/useMemoryManagement';
import { AppProviders } from '../contexts/AppProviders';
import { useFeatureFlagStore } from '../stores/featureFlagStore';
import { performanceEventManager } from '../services/performance/performanceEventManager';
import { PerformanceMonitor } from './routeConfig';
import GlobalNotifications from '../components/GlobalNotifications';

// Layout components — chosen based on feature flag at runtime
import Layout from '../components/Layout';
import LayoutNew from '../components/LayoutNew';

import { DynamicRoutes } from './moduleRoutes';
import { LoginPage } from './routeConfig';

// ─────────────────────────────────────────────
// AppContent
// ─────────────────────────────────────────────

interface AppContentProps {
  modulesInitialized: boolean;
  config: UnifiedAppConfig;
}

/**
 * AppContent — renders the authenticated layout shell.
 * Selects Layout vs LayoutNew via the useNewTabSystem feature flag.
 * Shows a loading spinner while auth state is resolving.
 * Renders the login page if not authenticated.
 */
export const AppContent: React.FC<AppContentProps> = ({ modulesInitialized, config }) => {
  const location = useLocation();
  const authContext = useAuth();
  const { isAuthenticated, isLoading, user } = authContext;
  const { restoreRouteIfNeeded } = useRoutePersistence(isAuthenticated);

  // Choose layout based on feature flag
  const featureFlags = useFeatureFlagStore(state => state.flags);
  const LayoutComponent = featureFlags.useNewTabSystem ? LayoutNew : Layout;

  // Diagnostic: track auth state transitions
  useEffect(() => {
    performanceEventManager.markDiagnostic('app_route_state', {
      pathname: location.pathname,
      isAuthenticated,
      isLoading,
    });
    logger.debug('🔍 [AppContent] Auth state details:', {
      isAuthenticated,
      isLoading,
      pathname: location.pathname,
      user: authContext.user,
      isDemoMode: authContext.isDemoMode,
    });
  }, [isAuthenticated, isLoading, location.pathname, authContext]);

  // Restore saved route after authentication and module init are both complete
  useEffect(() => {
    if (isAuthenticated && modulesInitialized && !isLoading) {
      const restored = restoreRouteIfNeeded();
      if (restored) {
        performanceEventManager.markDiagnostic('app_route_restored', {
          pathname: location.pathname,
        });
        logger.debug('✅ [AppContent] Route restored after refresh');
      }
    }
  }, [isAuthenticated, modulesInitialized, isLoading, restoreRouteIfNeeded]);

  // Show loading spinner while auth state is being resolved
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

  // Not authenticated — show login page (no layout chrome)
  if (!isAuthenticated) {
    logger.debug('🔍 [AppContent] User not authenticated, showing login page');
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

  logger.debug('🔍 [AppContent] User authenticated, showing layout');

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

// ─────────────────────────────────────────────
// AppInner
// ─────────────────────────────────────────────

/**
 * AppInner — initializes the theme, loads all modules, and renders AppProviders + AppContent.
 * Must be rendered inside UnifiedConfigProvider so useUnifiedConfig() works.
 */
export const AppInner: React.FC = () => {
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
    trackMounts: true,
  });

  // Memory management for the main app
  const _memoryManagement = useMemoryManagement({
    componentName: 'App',
    trackLifecycle: true,
    enableAlerts: false,
  });
  void _memoryManagement;

  // Initialize modules with improved error handling and emergency timeout
  useEffect(() => {
    const init = async () => {
      if (!initializedRef.current) {
        logger.debug('🚀 [App] Initializing modules...');
        initializedRef.current = true;

        try {
          const emergencyTimeout = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Emergency module loading timeout')), 8000);
          });

          await measureAsync(
            () => Promise.race([initializeModules(), emergencyTimeout]),
            'module_initialization'
          );

          const registeredModules = moduleRegistry.getAllModules();
          const enabledModules = moduleRegistry.getEnabledModules();
          const navigationItems = moduleRegistry.getNavigationItems();

          logger.debug(
            `📊 [App] Module verification complete: ${registeredModules.length} total, ${enabledModules.length} enabled, ${navigationItems.length} nav items`
          );

          setModulesInitialized(true);
        } catch (error) {
          logger.error('❌ [App] Module initialization failed:', error);
          setModulesInitialized(true);
        }
      }
    };

    init();
  }, [measureAsync]);

  return (
    <AppProviders modulesInitialized={modulesInitialized}>
      <AppContent modulesInitialized={modulesInitialized} config={config} />
    </AppProviders>
  );
};
