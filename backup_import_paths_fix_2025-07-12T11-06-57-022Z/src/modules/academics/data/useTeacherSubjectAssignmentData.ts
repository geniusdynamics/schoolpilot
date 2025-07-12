// ABOUTME: Self-contained hook for teachersubjectassignment data management
// ABOUTME: Provides CRUD operations for teachersubjectassignment without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockTeacherSubjectAssignments } from '../../administration/data/mockData';
import { TeacherSubjectAssignment } from '../../../core/types';

export const useTeacherSubjectAssignmentData = () => {
  const [data, setData] = useState<TeacherSubjectAssignment[]>(initialMockTeacherSubjectAssignments);

  const create = async (newItem: Partial<TeacherSubjectAssignment>) => {
    const newDataItem: TeacherSubjectAssignment = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as TeacherSubjectAssignment;
    setData((prev: TeacherSubjectAssignment[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<TeacherSubjectAssignment>) => {
    setData((prev: TeacherSubjectAssignment[]) => prev.map((item: TeacherSubjectAssignment) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: TeacherSubjectAssignment[]) => prev.filter((item: TeacherSubjectAssignment) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
