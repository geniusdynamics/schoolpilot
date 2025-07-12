/// <reference types="react" />
// ABOUTME: This is the data context provider for the entire application.
// ABOUTME: It dynamically switches between mock data and RxDB based on the app mode.

import React, { createContext, useContext, ReactNode, useMemo, useEffect, useState } from 'react';
import { APP_MODE } from './config'; 
import { useModularMockData, rawInitialData as modularMockDataContentForProdSeed } from '../hooks/useModularMockData';

import type { AppDataContextType, RbacRole, Role } from '../core/types';
import Spinner from '../components/ui/Spinner'; 
import { rbacService } from '../core/rbacService';

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

type UseRxDBDataHookType = typeof import('../hooks/useRxDBData').useRxDBData;
type RxDBServiceModuleType = typeof import('../services/rxdbService');

// Mapping function: RbacRole -> Role (legacy)
function mapRbacRoleToLegacyRole(rbacRole: RbacRole, idx: number): Role {
  return {
    id: idx + 1, // Assign a numeric id for legacy consumers
    name: rbacRole.name,
    description: rbacRole.description,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export const AppDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const mockDataHookResult = useModularMockData();
  const [rxDBHookModule, setRxDBHookModule] = useState<{ useRxDBData: UseRxDBDataHookType } | null>(null);
  const [rxDBServiceModule, setRxDBServiceModule] = useState<RxDBServiceModuleType | null>(null);
  const [isProdDepsLoaded, setIsProdDepsLoaded] = useState(false);
  const [prodDepsError, setProdDepsError] = useState<Error | null>(null);
  const [rxDBDataHookResult, setRxDBDataHookResult] = useState<AppDataContextType | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (APP_MODE === 'production') {
      Promise.all([
        import('../hooks/useRxDBData'),
        import('../services/rxdbService')
      ]).then(([{ useRxDBData }, serviceModule]) => {
        if (isMounted) {
          setRxDBHookModule({ useRxDBData });
          setRxDBServiceModule(serviceModule);
          setIsProdDepsLoaded(true);
          // Initialize RxDB and useRxDBData
          const dbPromise = serviceModule.getDatabase();
          dbPromise.then((db: any) => {
            const hookResult = useRxDBData(
              serviceModule.getDatabase,
              serviceModule.seedDatabaseWithMockData,
              serviceModule.clearDatabase,
              serviceModule.getUsingDummyDataFlag,
              modularMockDataContentForProdSeed
            );
            setRxDBDataHookResult(hookResult);
          });
        }
      }).catch(error => {
        if (isMounted) {
          setProdDepsError(error);
          setIsProdDepsLoaded(true);
        }
      });
    } else {
      setIsProdDepsLoaded(true);
    }
    return () => { isMounted = false; };
  }, []);

  const currentDataMode = useMemo(() => {
    if (APP_MODE === 'production' && isProdDepsLoaded && rxDBDataHookResult && !prodDepsError) {
      return 'rxdb';
    }
    return 'mock';
  }, [isProdDepsLoaded, rxDBDataHookResult, prodDepsError]);

  const activeHookResult = useMemo(() => {
    if (currentDataMode === 'rxdb' && rxDBDataHookResult) {
      return rxDBDataHookResult;
    }
    return mockDataHookResult;
  }, [currentDataMode, mockDataHookResult, rxDBDataHookResult]);

  const isRxDBModeEffectivelyActive = currentDataMode === 'rxdb';

  const dataSourceDescription = useMemo(() => {
    if (APP_MODE === 'demo') return "AppDataProvider: Using Mock Data (Demo Mode)";
    if (APP_MODE === 'production' && !isProdDepsLoaded) return "AppDataProvider: Loading RxDB modules...";
    if (prodDepsError) return `AppDataProvider: Using Mock Data (Fallback due to RxDB module load error: ${prodDepsError.message})`;
    if (isRxDBModeEffectivelyActive) return "AppDataProvider: Using RxDB Data";
    return "AppDataProvider: Using Mock Data (Production Fallback / Initializing)";
  }, [APP_MODE, isProdDepsLoaded, prodDepsError, isRxDBModeEffectivelyActive]);

  useEffect(() => {
      console.log(dataSourceDescription);
  }, [dataSourceDescription]);

  const contextValue = useMemo(() => {
    // Only include rbacRoles if present on activeHookResult
    const rbacRoles = (activeHookResult as any).rbacRoles || [];
    const legacyRoles = rbacRoles.map(mapRbacRoleToLegacyRole);
    return {
      ...activeHookResult,
      roles: legacyRoles,
      // Optionally expose rbacRoles for advanced consumers
      ...(rbacRoles.length > 0 ? { rbacRoles } : {}),
    };
  }, [activeHookResult]);

  if (APP_MODE === 'production' && !isProdDepsLoaded) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.2em', backgroundColor: '#f0f0f0', fontFamily: 'Inter, sans-serif' }}>
            <Spinner className="loader" /> 
            <div style={{marginTop: '20px'}}>Loading application data (Production Mode - Loading Database Modules)...</div>
        </div>
    );
  }
  
  if (activeHookResult.loading.all) { 
     return (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.2em', backgroundColor: '#f0f0f0', fontFamily: 'Inter, sans-serif' }}>
            <Spinner className="loader" />
             <div style={{marginTop: '20px'}}>Loading application data ({dataSourceDescription})...</div>
        </div>
    );
  }

  return (
    <AppDataContext.Provider value={contextValue as AppDataContextType}>
      {APP_MODE === 'production' && prodDepsError && ( 
        <div style={{
          position: 'fixed', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: 'rgba(255, 204, 0, 0.95)', color: '#333',
          padding: '8px 15px', borderRadius: '8px', zIndex: 10000,
          fontSize: '0.85em', boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          textAlign: 'center',
        }}>
          <strong>Warning:</strong> Could not connect to local database. Using temporary sample data. Changes will not be saved. ({prodDepsError.message})
        </div>
      )}
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = (): AppDataContextType => {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};
