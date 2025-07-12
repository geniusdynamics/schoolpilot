// ABOUTME: Global provider hook for StudentHealthRecord entity with full CRUD using mock data.
// ABOUTME: Used for modular, plugin-ready data access across the system.

import { useState } from 'react';
import { AdminStudentHealthRecordType } from './types';
import { initialMockStudentHealthRecords } from './mockData';

export const isGlobalProvider = true;

export function useStudentHealthRecordData() {
  const [studentHealthRecords, setStudentHealthRecords] = useState<AdminStudentHealthRecordType[]>(initialMockStudentHealthRecords);

  const addStudentHealthRecord = (data: Omit<AdminStudentHealthRecordType, 'id' | 'created_at' | 'updated_at'>) => {
    const newRecord: AdminStudentHealthRecordType = {
      ...data,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setStudentHealthRecords(prev => [...prev, newRecord]);
    return newRecord;
  };

  const updateStudentHealthRecord = (updated: AdminStudentHealthRecordType) => {
    setStudentHealthRecords(prev => prev.map(r => r.id === updated.id ? { ...updated } : r));
    return updated;
  };

  const deleteStudentHealthRecord = (id: string) => {
    setStudentHealthRecords(prev => prev.filter(r => r.id !== id));
  };

  return {
    studentHealthRecords,
    addStudentHealthRecord,
    updateStudentHealthRecord,
    deleteStudentHealthRecord,
  };
} 