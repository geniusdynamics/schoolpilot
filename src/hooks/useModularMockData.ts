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
      setLoading(prev => {
        // Set all loading states to false
        const newLoading = { ...prev };
        Object.keys(newLoading).forEach(key => {
          newLoading[key as keyof AppDataLoadingStates] = false;
        });
        return newLoading;
      });
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
    addClub: async (clubData: any) => {
      // Generate new ID
      const newId = Math.max(...(fullData.clubs || []).map((c: any) => c.id), 0) + 1;
      const newClub = {
        id: newId,
        ...clubData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Add to data
      setData(prev => ({
        ...prev,
        clubs: [...(prev.clubs || []), newClub]
      }));
    },
    updateClub: async (updatedClub: any) => {
      setData(prev => ({
        ...prev,
        clubs: (prev.clubs || []).map((club: any) =>
          club.id === updatedClub.id
            ? { ...club, ...updatedClub, updated_at: new Date().toISOString() }
            : club
        )
      }));
    },
    deleteClub: async (clubId: number) => {
      setData(prev => ({
        ...prev,
        clubs: (prev.clubs || []).filter((club: any) => club.id !== clubId)
      }));
    },
    addCustomer: async (customerData: any) => {
      // Generate new ID
      const newId = Math.max(...(fullData.customers || []).map((c: any) => c.id), 0) + 1;
      const newCustomer = {
        id: newId,
        ...customerData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Add to data
      setData(prev => ({
        ...prev,
        customers: [...(prev.customers || []), newCustomer]
      }));
    },
    updateCustomer: async (updatedCustomer: any) => {
      setData(prev => ({
        ...prev,
        customers: (prev.customers || []).map((customer: any) =>
          customer.id === updatedCustomer.id
            ? { ...customer, ...updatedCustomer, updated_at: new Date().toISOString() }
            : customer
        )
      }));
    },
    deleteCustomer: async (customerId: number) => {
      setData(prev => ({
        ...prev,
        customers: (prev.customers || []).filter((customer: any) => customer.id !== customerId)
      }));
    },
    addStudentHealthRecord: async (healthRecordData: any) => {
      // Generate new ID
      const newId = Math.random().toString(36).substr(2, 9);
      const newHealthRecord = {
        id: newId,
        ...healthRecordData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Add to data
      setData(prev => ({
        ...prev,
        studentHealthRecords: [...(prev.studentHealthRecords || []), newHealthRecord]
      }));
    },
    updateStudentHealthRecord: async (updatedHealthRecord: any) => {
      setData(prev => ({
        ...prev,
        studentHealthRecords: (prev.studentHealthRecords || []).map((record: any) =>
          record.id === updatedHealthRecord.id
            ? { ...record, ...updatedHealthRecord, updated_at: new Date().toISOString() }
            : record
        )
      }));
    },
    deleteStudentHealthRecord: async (healthRecordId: string) => {
      setData(prev => ({
        ...prev,
        studentHealthRecords: (prev.studentHealthRecords || []).filter((record: any) => record.id !== healthRecordId)
      }));
    },
    addTemplateComm: async (templateData: any) => {
      // Generate new ID
      const newId = Math.max(...(fullData.templatesComm || []).map((t: any) => t.id), 0) + 1;
      const newTemplate = {
        id: newId,
        ...templateData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Add to data
      setData(prev => ({
        ...prev,
        templatesComm: [...(prev.templatesComm || []), newTemplate]
      }));
    },
    updateTemplateComm: async (updatedTemplate: any) => {
      setData(prev => ({
        ...prev,
        templatesComm: (prev.templatesComm || []).map((template: any) =>
          template.id === updatedTemplate.id
            ? { ...template, ...updatedTemplate, updated_at: new Date().toISOString() }
            : template
        )
      }));
    },
    deleteTemplateComm: async (templateId: number) => {
      setData(prev => ({
        ...prev,
        templatesComm: (prev.templatesComm || []).filter((template: any) => template.id !== templateId)
      }));
    },
    addCampaign: async (campaignData: any) => {
      // Generate new ID
      const newId = Math.random().toString(36).substr(2, 9);
      const newCampaign = {
        id: newId,
        ...campaignData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Add to data
      setData(prev => ({
        ...prev,
        campaigns: [...(prev.campaigns || []), newCampaign]
      }));
    },
    updateCampaign: async (updatedCampaign: any) => {
      setData(prev => ({
        ...prev,
        campaigns: (prev.campaigns || []).map((campaign: any) =>
          campaign.id === updatedCampaign.id
            ? { ...campaign, ...updatedCampaign, updated_at: new Date().toISOString() }
            : campaign
        )
      }));
    },
    deleteCampaign: async (campaignId: string) => {
      setData(prev => ({
        ...prev,
        campaigns: (prev.campaigns || []).filter((campaign: any) => campaign.id !== campaignId)
      }));
    },
    addSchoolPeriod: async (periodData: any) => {
      // Generate new ID
      const newId = Math.max(...(fullData.schoolPeriods || []).map((p: any) => p.id), 0) + 1;
      const newPeriod = {
        id: newId,
        ...periodData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Add to data
      setData(prev => ({
        ...prev,
        schoolPeriods: [...(prev.schoolPeriods || []), newPeriod]
      }));
    },
    updateSchoolPeriod: async (updatedPeriod: any) => {
      setData(prev => ({
        ...prev,
        schoolPeriods: (prev.schoolPeriods || []).map((period: any) =>
          period.id === updatedPeriod.id
            ? { ...period, ...updatedPeriod, updated_at: new Date().toISOString() }
            : period
        )
      }));
    },
    deleteSchoolPeriod: async (periodId: number) => {
      setData(prev => ({
        ...prev,
        schoolPeriods: (prev.schoolPeriods || []).filter((period: any) => period.id !== periodId)
      }));
    },
    addTimetablePeriodDef: async (periodDefData: any) => {
      // Generate new ID
      const newId = Math.max(...(fullData.timetablePeriodDefs || []).map((p: any) => p.id), 0) + 1;
      const newPeriodDef = {
        id: newId,
        ...periodDefData,
      };
      
      // Add to data
      setData(prev => ({
        ...prev,
        timetablePeriodDefs: [...(prev.timetablePeriodDefs || []), newPeriodDef]
      }));
    },
    updateTimetablePeriodDef: async (updatedPeriodDef: any) => {
      setData(prev => ({
        ...prev,
        timetablePeriodDefs: (prev.timetablePeriodDefs || []).map((periodDef: any) =>
          periodDef.id === updatedPeriodDef.id
            ? { ...periodDef, ...updatedPeriodDef }
            : periodDef
        )
      }));
    },
    deleteTimetablePeriodDef: async (periodDefId: number) => {
      setData(prev => ({
        ...prev,
        timetablePeriodDefs: (prev.timetablePeriodDefs || []).filter((periodDef: any) => periodDef.id !== periodDefId)
      }));
    },
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