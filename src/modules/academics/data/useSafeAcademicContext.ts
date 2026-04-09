// ABOUTME: Safe context hook for academics module - returns empty data when module is disabled
import { useAcademicDataContext } from './AcademicDataContext';
import { moduleRegistry } from '@/core/moduleRegistry';

export const useSafeAcademicContext = () => {
  const isEnabled = moduleRegistry.isEnabled('academics');

  if (!isEnabled) {
    return {
      classSubjectAllocations: [],
      examPaperSettings: [],
      subjects: [],
      subjectPapers: [],
      studentSubjectEnrollments: [],
      teacherSubjectAssignments: [],
      timetableEntries: [],
      examSessions: [],
      studentExamResults: [],
      examSchedules: [],
      gradingSchemes: [],
      weeklyPlans: [],
      isModuleEnabled: false,
    };
  }

  return { ...useAcademicDataContext(), isModuleEnabled: true };
};
