// ABOUTME: Global provider hook for TeacherSubjectAssignment entity with full CRUD using mock data.
// ABOUTME: Used for modular, plugin-ready data access across the system.

import { useState } from 'react';
import { TeacherSubjectAssignment } from '../../../core/types';

export const isGlobalProvider = true;

export function useTeacherSubjectAssignmentData() {
  const [teacherSubjectAssignments, setTeacherSubjectAssignments] = useState<TeacherSubjectAssignment[]>([]);

  const addTeacherSubjectAssignment = (data: Omit<TeacherSubjectAssignment, 'id'>) => {
    const newAssignment: TeacherSubjectAssignment = {
      ...data,
      id: `TSA${Date.now()}`,
    };
    setTeacherSubjectAssignments(prev => [...prev, newAssignment]);
    return newAssignment;
  };

  const updateTeacherSubjectAssignment = (updated: TeacherSubjectAssignment) => {
    setTeacherSubjectAssignments(prev => prev.map(a => a.id === updated.id ? { ...updated } : a));
    return updated;
  };

  const deleteTeacherSubjectAssignment = (id: string) => {
    setTeacherSubjectAssignments(prev => prev.filter(a => a.id !== id));
  };

  return {
    teacherSubjectAssignments,
    addTeacherSubjectAssignment,
    updateTeacherSubjectAssignment,
    deleteTeacherSubjectAssignment,
  };
} 