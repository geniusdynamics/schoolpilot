// ABOUTME: Self-contained hook for studenthealthrecord data management
// ABOUTME: Provides CRUD operations for studenthealthrecord without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockStudentHealthRecords } from '../../administration/data/mockData';
import { StudentHealthRecord } from '../../../core/types';

export const useStudentHealthRecordData = () => {
  const [data, setData] = useState<StudentHealthRecord[]>(initialMockStudentHealthRecords);

  const create = async (newItem: Partial<StudentHealthRecord>) => {
    const newDataItem: StudentHealthRecord = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as StudentHealthRecord;
    setData((prev: StudentHealthRecord[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<StudentHealthRecord>) => {
    setData((prev: StudentHealthRecord[]) => prev.map((item: StudentHealthRecord) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: StudentHealthRecord[]) => prev.filter((item: StudentHealthRecord) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};

// Mark this as a global provider for cross-module use
export const isGlobalProvider = true;
