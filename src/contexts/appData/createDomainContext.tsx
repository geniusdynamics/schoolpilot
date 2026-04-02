import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { UnifiedDatabaseManager } from '../../services/database/UnifiedDatabaseManager';
import { normalizeAppDataCollections } from './appDataCollections';
import { getDataModeManager } from '../../config/dataModePolicies';

export function createDomainContext<T>(domainName: string, collectionsList: string[]) {
  const DomainContext = createContext<T | undefined>(undefined);

  const DomainProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [data, setData] = useState<Partial<T>>({});
    
    const loadDomainCollections = useCallback(async () => {
      try {
        const dbManager = UnifiedDatabaseManager.getInstance();
        const loadedData: Record<string, any[]> = {};

        for (const name of collectionsList) {
          try {
            const collection = dbManager.getCollection(name);
            if (collection && typeof collection.find === 'function') {
              const docs = await collection.find({});
              loadedData[name] = docs;
            } else {
              loadedData[name] = [];
            }
          } catch (err) {
            console.warn(`[${domainName}] Failed to load collection ${name}:`, err);
            loadedData[name] = [];
          }
        }

        // We normalize the fetched data to get the camelCase versions
        const normalized = normalizeAppDataCollections(loadedData) as any;
        
        // Filter out keys that we didn't request
        const domainData: any = {};
        
        // helper to get camelCase mapping just like normalizeAppDataCollections does
        const snakeToCamel = (value: string): string => value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
        
        // Include aliases mapping if available (we'll just manually check the normalized output)
        // Since normalizeAppDataCollections populated the camelCase keys correctly for loadedData
        // We just need to identify which camelCase keys correspond to our snake_case collectionsList
        
        const camelKeys = collectionsList.map(name => {
           if (name === 'app_settings' || name === 'school_details') return 'schoolDetails';
           return snakeToCamel(name);
        });

        for (const key of camelKeys) {
          if (normalized[key] !== undefined) {
             domainData[key] = normalized[key];
          }
        }

        setData(domainData);
      } catch (err) {
        console.error(`[${domainName}] Failed to load collections:`, err);
      }
    }, []);

    useEffect(() => {
      loadDomainCollections();
    }, [loadDomainCollections]);

    useEffect(() => {
      const dataModeManager = getDataModeManager();
      
      const handleDataChanged = () => {
        console.log(`🔄 [${domainName}] Received appDataChanged event, reloading collections...`);
        loadDomainCollections();
      };
      
      window.addEventListener('appDataChanged', handleDataChanged);
      dataModeManager.on('dataSeeded', handleDataChanged);
      
      return () => {
        window.removeEventListener('appDataChanged', handleDataChanged);
        dataModeManager.off('dataSeeded', handleDataChanged);
      };
    }, [loadDomainCollections]);

    return (
      <DomainContext.Provider value={data as T}>
        {children}
      </DomainContext.Provider>
    );
  };

  const useDomainContext = () => {
    const context = useContext(DomainContext);
    if (context === undefined) {
      throw new Error(`use${domainName}Context must be used within a ${domainName}Provider`);
    }
    return context;
  };

  return { DomainContext, DomainProvider, useDomainContext };
}
