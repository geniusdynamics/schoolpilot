// ABOUTME: Exports all data hooks and types for the academics module
// ABOUTME: Registers data hooks with the global context
// ABOUTME: Provides consistent data access patterns

import { useAcademicYearData } from './useAcademicYearData';
import { useClassSubjectAllocationData } from './useClassSubjectAllocationData';
import { useExamPaperSettingData } from './useExamPaperSettingData';
import { useExamSessionData } from './useExamSessionData';
import { useGradingSchemeData } from './useGradingSchemeData';
import { useGradingSchemeLevelData } from './useGradingSchemeLevelData';
import { useStudentExamResultData } from './useStudentExamResultData';
import { useStudentPaperMarkData } from './useStudentPaperMarkData';
import { useStudentSubjectEnrollmentData } from './useStudentSubjectEnrollmentData';
import { useSubjectData } from './useSubjectData';
import { useSubjectPaperData } from './useSubjectPaperData';
import { useTeacherSubjectAssignmentData } from './useTeacherSubjectAssignmentData';
import { useTimetableEntryData } from './useTimetableEntryData';
import { useTimetablePeriodDefData } from './useTimetablePeriodDefData';

// Export all data hooks
export {
  useAcademicYearData,
  useClassSubjectAllocationData,
  useExamPaperSettingData,
  useExamSessionData,
  useGradingSchemeData,
  useGradingSchemeLevelData,
  useStudentExamResultData,
  useStudentPaperMarkData,
  useStudentSubjectEnrollmentData,
  useSubjectData,
  useSubjectPaperData,
  useTeacherSubjectAssignmentData,
  useTimetableEntryData,
  useTimetablePeriodDefData
};

// Export data hook configurations for registration
export { useAcademicYearDataConfig } from './useAcademicYearData';

// Export types
export * from './types';