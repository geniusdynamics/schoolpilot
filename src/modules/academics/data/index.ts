// ABOUTME: Serves as the main CSL entry point for the Academics module's data definitions.
// ABOUTME: It re-exports types, mock data, schemas, and collection configurations.

export * from './types';
export * from './mockData';
export * from './schema';
export * from './collections';

export { isGlobalProvider as isSubjectGlobalProvider, useSubjectData } from './useSubjectData';
export { isGlobalProvider as isSubjectPaperGlobalProvider, useSubjectPaperData } from './useSubjectPaperData';
export { isGlobalProvider as isExamSessionGlobalProvider, useExamSessionData } from './useExamSessionData';
export { isGlobalProvider as isExamPaperSettingGlobalProvider, useExamPaperSettingData } from './useExamPaperSettingData';
export { isGlobalProvider as isGradingSchemeGlobalProvider, useGradingSchemeData } from './useGradingSchemeData';
export { isGlobalProvider as isGradingSchemeLevelGlobalProvider, useGradingSchemeLevelData } from './useGradingSchemeLevelData';
export { isGlobalProvider as isStudentExamResultGlobalProvider, useStudentExamResultData } from './useStudentExamResultData';
export { isGlobalProvider as isStudentPaperMarkGlobalProvider, useStudentPaperMarkData } from './useStudentPaperMarkData';
export { isGlobalProvider as isClassSubjectAllocationGlobalProvider, useClassSubjectAllocationData } from './useClassSubjectAllocationData';