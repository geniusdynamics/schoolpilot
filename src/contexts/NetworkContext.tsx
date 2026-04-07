// ABOUTME: Network state management context for handling online/offline status
// ABOUTME: Provides network monitoring and connection quality information

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo } from 'react';
import { NetworkStateManager, NetworkState } from '../services/data/NetworkStateManager';

export interface NetworkContextType {
  isOnline: boolean;
  backendAvailable: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  networkState: NetworkState;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [networkManager] = useState(() => NetworkStateManager.getInstance());
  const [networkState, setNetworkState] = useState<NetworkState>(() => {
    return networkManager.getState();
  });

  // Initialize network monitoring
  useEffect(() => {
    const unsubscribe = networkManager.subscribe(setNetworkState);
    return unsubscribe;
  }, [networkManager]);

  const contextValue = useMemo((): NetworkContextType => ({
    isOnline: networkState.isOnline,
    backendAvailable: networkState.backendAvailable,
    connectionQuality: networkState.isOnline ? 'excellent' : 'offline',
    networkState
  }), [networkState]);

  return (
    <NetworkContext.Provider value={contextValue}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = (): NetworkContextType => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};