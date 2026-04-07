// ABOUTME: System domain context — SchoolDetails, Roles, Users, Config, AuditLogs, Workflows
// ABOUTME: Wraps useSystemData hook and exposes it via React Context

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useSystemData } from '../../hooks/data/useSystemData';

export type SystemDataContextValue = ReturnType<typeof useSystemData>;

const SystemDataContext = createContext<SystemDataContextValue | undefined>(undefined);

export const SystemDataProvider: React.FC<{ children: ReactNode; mockData?: any }> = ({
  children,
  mockData,
}) => {
  const systemData = useSystemData(mockData);

  const value = useMemo(() => systemData, [systemData]);

  return (
    <SystemDataContext.Provider value={value}>
      {children}
    </SystemDataContext.Provider>
  );
};

export const useSystemDataContext = (): SystemDataContextValue => {
  const context = useContext(SystemDataContext);
  if (context === undefined) {
    throw new Error('useSystemDataContext must be used within a SystemDataProvider');
  }
  return context;
};

export { SystemDataContext };
