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

  // Fill in missing keys with empty arrays/objects for type safety
  const fullData = { ...data } as AppDataType;
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