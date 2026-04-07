// ABOUTME: Self-contained hook for studentsubjectenrollment data management
// ABOUTME: Provides CRUD operations for studentsubjectenrollment without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockStudentSubjectEnrollments } from './mockData';
import { StudentSubjectEnrollment } from '@/core/types';

export const useStudentSubjectEnrollmentData = () => {
  const [data, setData] = useState<StudentSubjectEnrollment[]>(initialMockStudentSubjectEnrollments);

  const create = async (newItem: Partial<StudentSubjectEnrollment>) => {
    const newDataItem: StudentSubjectEnrollment = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as StudentSubjectEnrollment;
    setData((prev: StudentSubjectEnrollment[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<StudentSubjectEnrollment>) => {
    setData((prev: StudentSubjectEnrollment[]) => prev.map((item: StudentSubjectEnrollment) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: StudentSubjectEnrollment[]) => prev.filter((item: StudentSubjectEnrollment) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
