// ABOUTME: Finance domain context — ChartOfAccounts, Banks, Suppliers, FeeTemplates,
// ABOUTME: ExpenseClaims, Invoices, Payments, FinancialYears, GeneralLedger
// ABOUTME: Wraps useFinanceData hook and exposes it via React Context

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useFinanceData } from './useFinanceData';

export type FinanceDataContextValue = ReturnType<typeof useFinanceData>;

const FinanceDataContext = createContext<FinanceDataContextValue | undefined>(undefined);

export const FinanceDataProvider: React.FC<{ children: ReactNode; mockData?: any }> = ({
  children,
  mockData,
}) => {
  const data = useFinanceData(mockData);

  const value = useMemo(() => data, [data]);

  return (
    <FinanceDataContext.Provider value={value}>
      {children}
    </FinanceDataContext.Provider>
  );
};

export const useFinanceDataContext = (): FinanceDataContextValue => {
  const context = useContext(FinanceDataContext);
  if (context === undefined) {
    throw new Error('useFinanceDataContext must be used within a FinanceDataProvider');
  }
  return context;
};

export { FinanceDataContext };
