// ABOUTME: HR domain context — PayrollPeriods, PayrollItemTypes, Payslips,
// ABOUTME: StaffSalarySettings, LeaveRequests
// ABOUTME: Wraps useHRData hook and exposes it via React Context

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useHRData } from '@/hooks/data/useHRData';

export type HRDataContextValue = ReturnType<typeof useHRData>;

const HRDataContext = createContext<HRDataContextValue | undefined>(undefined);

export const HRDataProvider: React.FC<{ children: ReactNode; mockData?: any }> = ({
  children,
  mockData,
}) => {
  const data = useHRData(mockData);

  const value = useMemo(() => data, [data]);

  return (
    <HRDataContext.Provider value={value}>
      {children}
    </HRDataContext.Provider>
  );
};

export const useHRDataContext = (): HRDataContextValue => {
  const context = useContext(HRDataContext);
  if (context === undefined) {
    throw new Error('useHRDataContext must be used within a HRDataProvider');
  }
  return context;
};

export { HRDataContext };
