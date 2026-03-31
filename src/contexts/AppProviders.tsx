// ABOUTME: Composite provider component that orchestrates all application-level React contexts.
// ABOUTME: Extracted from App.tsx to reduce nesting depth and establish a stable provider contract.

import React, { Suspense, lazy, useState, useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import { NetworkProvider } from './NetworkContext';
import { SyncProvider } from './SyncContext';
import { AuthProvider } from './AuthContext';
import { UserProvider } from './UserContext';
import { StableActionProvider } from './StableActionProvider';
import ErrorBoundary from '../components/ErrorBoundary';
import { useUnifiedConfig } from '../hooks/useUnifiedConfig';
import { featureFlags } from '../config/featureFlags';
import { uds } from '../services/data';
import { debugLog, warnLog } from '../utils';
import Spinner from '../components/ui/Spinner';

const AppDataProvider = lazy(() =>
  import('./AppDataContext').then(module => ({ default: module.AppDataProvider }))
);

const DataProviderWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { config } = useUnifiedConfig();
  const [udsInitialized, setUdsInitialized] = useState(true);

  useEffect(() => {
    if (featureFlags.useUnifiedDataService) {
      debugLog('🚀 [AppProviders] Initializing Unified Data Service...');

      const initializationPromise = uds.initialize('standalone', {
        pouchdb: {
          localDbName: 'schoolpilot_standalone',
        }
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('UDS initialization timeout')), 10000);
      });

      Promise.race([initializationPromise, timeoutPromise])
        .then(() => {
          setUdsInitialized(true);
          debugLog('✅ [AppProviders] Unified Data Service initialized');
        })
        .catch(error => {
          warnLog('⚠️ [AppProviders] UDS initialization failed or timed out, falling back to mock:', error);
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

  void config;

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

export interface AppProvidersProps {
  children: React.ReactNode;
  modulesInitialized?: boolean;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children, modulesInitialized = true }) => {
  return (
    <HashRouter>
      <NetworkProvider>
        <SyncProvider>
          <DataProviderWrapper>
            <AuthProvider>
              <UserProvider>
                <ErrorBoundary>
                  <StableActionProvider>
                    {modulesInitialized ? children : (
                      <div className="flex items-center justify-center h-screen">
                        <div className="text-center">
                          <Spinner size="lg" />
                          <p className="mt-4 text-gray-600">Initializing application...</p>
                        </div>
                      </div>
                    )}
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

export default AppProviders;
