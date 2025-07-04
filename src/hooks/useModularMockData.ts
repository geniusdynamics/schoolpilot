// ABOUTME: Dynamically loads and aggregates all modular mock data for the app.
// ABOUTME: Used as the only source of mock data for AppDataContext in mock/demo mode.

import { useState, useEffect } from 'react';
import type { AppDataType, AppDataContextType, AppDataLoadingStates } from '../core/types';

// Dynamically import all mockData.ts files from modules
const mockDataModules = import.meta.glob('../modules/*/data/mockData.ts', { eager: true });

// Aggregate all exported mock data into a single object
const rawInitialData: Partial<AppDataType> = {};
for (const mod of Object.values(mockDataModules)) {
  if (typeof mod === 'object' && mod !== null) {
    Object.entries(mod).forEach(([key, value]) => {
      // Only add if not already present (last-in wins for duplicate keys)
      rawInitialData[key as keyof AppDataType] = value;
    });
  }
}

// Helper to create loading states for all entities
const createLoadingStates = (): AppDataLoadingStates => {
  const keys = Object.keys(rawInitialData) as Array<keyof AppDataType>;
  const states = keys.reduce((acc, key) => {
    acc[key] = true;
    return acc;
  }, {} as Record<keyof AppDataType, boolean>);
  return { ...states, all: true };
};

// Dynamically collect all keys from all loaded mockData modules
const allMockKeys = Array.from(
  new Set(
    Object.values(mockDataModules)
      .flatMap(mod => (typeof mod === 'object' && mod !== null ? Object.keys(mod) : []))
  )
);

// Helper to determine if a value is an array (for defaulting to [])
const isArrayType = (val: any) => Array.isArray(val);

export const useModularMockData = (): AppDataContextType => {
  const [data, setData] = useState<Partial<AppDataType>>(rawInitialData);
  const [loading, setLoading] = useState<AppDataLoadingStates>(createLoadingStates());

  useEffect(() => {
    // Simulate async loading
    const timer = setTimeout(() => {
      setLoading(prev => ({ ...prev, all: false }));
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Dynamically fill in missing keys with [] or null based on the type in rawInitialData
  const fullData: any = { ...data };
  for (const key of allMockKeys) {
    if (fullData[key] === undefined) {
      // If any module's value for this key is an array, default to []
      const sample = Object.values(mockDataModules)
        .map(mod => (typeof mod === 'object' && mod !== null ? (mod as any)[key] : undefined))
        .find(val => val !== undefined);
      fullData[key] = isArrayType(sample) ? [] : null;
    }
  }

  return {
    ...fullData,
    loading,
    rawInitialData: data,
    // Provide no-op implementations for required context methods
    getStudentDetailsById: async () => null,
    getStudentFinancialDetailsById: async () => null,
    saveStudentAttendance: async () => {},
    getStudentAttendanceByFilters: () => [],
    getTimetablePeriodDefs: () => [],
    getTimetableEntries: () => [],
    addTimetableEntry: async () => {},
    updateTimetableEntry: async () => {},
    deleteTimetableEntry: async () => {},
    addPartner: async () => {},
    updatePartner: async () => {},
    deletePartner: async () => {},
    generateStudentInvoices: async () => [],
    permissions: [],
    roles: [],
    userRoles: [],
    addPermission: async () => {},
    updatePermission: async () => {},
    deletePermission: async () => {},
    addRole: async () => {},
    updateRole: async () => {},
    deleteRole: async () => {},
    assignRoleToUser: async () => {},
    removeRoleFromUser: async () => {},
  };
};

export { rawInitialData }; 