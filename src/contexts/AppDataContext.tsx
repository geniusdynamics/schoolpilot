/// <reference types="react" />
// ABOUTME: This is the data context provider for the entire application.
// ABOUTME: It dynamically switches between mock data and RxDB based on the app mode.

import React, { createContext, useContext, ReactNode, useMemo, useEffect, useState } from 'react';
import { APP_MODE } from './config'; 
import { useMockData } from '../hooks/useCompleteMockData';
import { rawInitialData as mockDataContentForProdSeed } from '../hooks/useCompleteMockData';

import type { AppDataContextType } from '../core/types';
import Spinner from '../components/ui/Spinner'; 

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

type UseRxDBDataHookType = typeof import('../hooks/useRxDBData').useRxDBData;
type RxDBServiceModuleType = typeof import('../services/rxdbService');


export const AppDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const mockDataHookResult = useMockData();
  
  // const [rxDBHookModule, setRxDBHookModule] = useState<{ useRxDBData: UseRxDBDataHookType } | null>(null);
  // const [rxDBServiceModule, setRxDBServiceModule] = useState<RxDBServiceModuleType | null>(null);
  const [isProdDepsLoaded, setIsProdDepsLoaded] = useState(true); // Always true for now
  const [prodDepsError, setProdDepsError] = useState<Error | null>(null);
  
  // useEffect(() => {
  //   let isMounted = true;
  //   if (APP_MODE === 'production') {
  //     console.log("AppDataProvider: Production mode - attempting to load RxDB modules...");
  //     Promise.all([
  //       import('../hooks/useRxDBData'), 
  //       import('../services/rxdbService') 
  //     ]).then(([{ useRxDBData }, serviceModule]) => {
  //       if (isMounted) {
  //         console.log("AppDataProvider: RxDB modules loaded.");
  //         setRxDBHookModule({ useRxDBData });
  //         setRxDBServiceModule(serviceModule);
  //         setIsProdDepsLoaded(true);
  //       }
  //     }).catch(error => {
  //       if (isMounted) {
  //         console.error("AppDataProvider: Failed to load RxDB modules:", error);
  //         setProdDepsError(error);
  //         setIsProdDepsLoaded(true); 
  //       }
  //     });
  //   }
  //   return () => { isMounted = false; };
  // }, []);

  const rxDBDataHookResult = null; // Temporarily disable RxDB

  const currentDataMode = useMemo(() => {
    // if (APP_MODE === 'production' && isProdDepsLoaded && rxDBDataHookResult && !rxDBDataHookResult.initializationError && !prodDepsError) {
    //   return 'rxdb';
    // }
    return 'mock';
  }, [isProdDepsLoaded, rxDBDataHookResult, prodDepsError]);

  const activeHookResult = useMemo(() => {
    // if (currentDataMode === 'rxdb' && rxDBDataHookResult) {
    //   return rxDBDataHookResult;
    // }
    return mockDataHookResult;
  }, [currentDataMode, mockDataHookResult, rxDBDataHookResult]);

  const isRxDBModeEffectivelyActive = false; // Temporarily disable RxDB
  
  const initializationError = null; // Temporarily disable RxDB

  const dataSourceDescription = useMemo(() => {
    if (APP_MODE === 'demo') return "AppDataProvider: Using Mock Data (Demo Mode)";
    // if (APP_MODE === 'production' && !isProdDepsLoaded) return "AppDataProvider: Loading RxDB modules...";
    // if (prodDepsError) return `AppDataProvider: Using Mock Data (Fallback due to RxDB module load error: ${prodDepsError.message})`;
    // if (initializationError) return `AppDataProvider: Using Mock Data (Fallback due to RxDB init error: ${initializationError.message})`;
    // if (isRxDBModeEffectivelyActive) return "AppDataProvider: Using RxDB Data";
    return "AppDataProvider: Using Mock Data (Production Fallback / Initializing)";
  }, [APP_MODE, isProdDepsLoaded, prodDepsError, initializationError, isRxDBModeEffectivelyActive]);

  useEffect(() => {
      console.log(dataSourceDescription);
  }, [dataSourceDescription]);

  const contextValue = useMemo(() => ({
    ...activeHookResult,
    initializationError,
    isRxDBModeActive: isRxDBModeEffectivelyActive,
    isUsingRxDBDummyData: null, // Temporarily disable RxDB
    triggerSeedRxDB: async () => { console.warn("Seed RxDB not available in current mode or RxDB hook not loaded."); },
    triggerClearRxDB: async () => { console.warn("Clear RxDB not available in current mode or RxDB hook not loaded."); },
  }), [activeHookResult, initializationError, isRxDBModeEffectivelyActive, currentDataMode, rxDBDataHookResult]);

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
      {APP_MODE === 'production' && initializationError && ( 
        <div style={{
          position: 'fixed', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: 'rgba(255, 204, 0, 0.95)', color: '#333',
          padding: '8px 15px', borderRadius: '8px', zIndex: 10000,
          fontSize: '0.85em', boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          textAlign: 'center',
        }}>
          <strong>Warning:</strong> Could not connect to local database. Using temporary sample data. Changes will not be saved. ({initializationError.message})
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
