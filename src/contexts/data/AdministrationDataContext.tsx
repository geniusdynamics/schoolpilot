// ABOUTME: Administration domain context — Students, Staff, Classes, Departments, Attendance
// ABOUTME: Wraps useAdministrationData hook and exposes it via React Context

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useAdministrationData } from '../../hooks/data/useAdministrationData';

export type AdministrationDataContextValue = ReturnType<typeof useAdministrationData>;

const AdministrationDataContext = createContext<AdministrationDataContextValue | undefined>(undefined);

export const AdministrationDataProvider: React.FC<{ children: ReactNode; mockData?: any }> = ({
  children,
  mockData,
}) => {
  const adminData = useAdministrationData(mockData);

  const value = useMemo(() => adminData, [adminData]);

  return (
    <AdministrationDataContext.Provider value={value}>
      {children}
    </AdministrationDataContext.Provider>
  );
};

export const useAdministrationDataContext = (): AdministrationDataContextValue => {
  const context = useContext(AdministrationDataContext);
  if (context === undefined) {
    throw new Error('useAdministrationDataContext must be used within an AdministrationDataProvider');
  }
  return context;
};

export { AdministrationDataContext };
