// ABOUTME: Nutrition domain context — MealPlans, Menus, StudentMealPlans,
// ABOUTME: MealConsumptionLogs, Merchants, StudentWallets, WalletTransactions
// ABOUTME: Wraps useNutritionData hook and exposes it via React Context

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useNutritionData } from './useNutritionData';

export type NutritionDataContextValue = ReturnType<typeof useNutritionData>;

const NutritionDataContext = createContext<NutritionDataContextValue | undefined>(undefined);

export const NutritionDataProvider: React.FC<{ children: ReactNode; mockData?: any }> = ({
  children,
  mockData,
}) => {
  const data = useNutritionData(mockData);

  const value = useMemo(() => data, [data]);

  return (
    <NutritionDataContext.Provider value={value}>
      {children}
    </NutritionDataContext.Provider>
  );
};

export const useNutritionDataContext = (): NutritionDataContextValue => {
  const context = useContext(NutritionDataContext);
  if (context === undefined) {
    throw new Error('useNutritionDataContext must be used within a NutritionDataProvider');
  }
  return context;
};

export { NutritionDataContext };
