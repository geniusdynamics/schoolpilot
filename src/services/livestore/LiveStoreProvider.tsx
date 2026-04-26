// ABOUTME: LiveStore React Provider Component
// ABOUTME: Provides LiveStore context and hooks for React components

import React, { ReactNode } from 'react';
import { LiveStoreProvider as BaseLiveStoreProvider } from '@livestore/react';
import { LiveStore } from '@livestore/livestore';
import { WebAdapter } from '@livestore/adapter-web';
import { schema } from '../../livestore/schema';

// LiveStore Provider Props
interface LiveStoreProviderProps {
  children: ReactNode;
  dbName?: string;
  debug?: boolean;
}

// Default configuration
const defaultDbName = 'schoolpilot3-livestore';

// LiveStore Provider Component
export const LiveStoreProvider: React.FC<LiveStoreProviderProps> = ({
  children,
  dbName = defaultDbName,
  debug = process.env.NODE_ENV === 'development'
}) => {
  // Create WebAdapter for LiveStore
  const adapter = new WebAdapter({
    dbName,
    version: 1
  });

  // Initialize LiveStore
  const liveStore = new LiveStore({
    adapter,
    schema,
    debug
  });

  return (
    <BaseLiveStoreProvider store={liveStore}>
      {children}
    </BaseLiveStoreProvider>
  );
};

// Re-export LiveStore React hooks
export { useStore, useQuery, useClientDocument } from '@livestore/react';

// Custom hook for LiveStore instance
export const useLiveStore = () => {
  return useStore();
};

// Custom hook for querying collections
export const useLiveStoreQuery = <T = any>(tableName: string, query?: any) => {
  return useQuery<T>(tableName, query);
};

// Custom hook for document operations
export const useLiveStoreDocument = <T = any>(tableName: string, id: string) => {
  return useClientDocument<T>(tableName, id);
};

export default LiveStoreProvider;