// ABOUTME: Global provider hook for StudentAttendance entity with full CRUD using mock data.
// ABOUTME: Used for modular, plugin-ready data access across the system.

import { useState } from 'react';
import { AdminStudentAttendanceType } from './types';
import { initialMockStudentAttendance } from './mockData';

export const isGlobalProvider = true;

export function useStudentAttendanceData() {
  const [studentAttendance, setStudentAttendance] = useState<AdminStudentAttendanceType[]>(initialMockStudentAttendance);

  const addStudentAttendance = (data: Omit<AdminStudentAttendanceType, 'id'>) => {
    const newAttendance: AdminStudentAttendanceType = {
      ...data,
      id: Date.now().toString(),
    };
    setStudentAttendance(prev => [...prev, newAttendance]);
    return newAttendance;
  };

  const updateStudentAttendance = (updated: AdminStudentAttendanceType) => {
    setStudentAttendance(prev => prev.map(a => a.id === updated.id ? { ...updated } : a));
    return updated;
  };

  const deleteStudentAttendance = (id: string) => {
    setStudentAttendance(prev => prev.filter(a => a.id !== id));
  };

  return {
    studentAttendance,
    addStudentAttendance,
    updateStudentAttendance,
    deleteStudentAttendance,
  };
} 