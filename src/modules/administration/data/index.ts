// ABOUTME: Serves as the main CSL entry point for the Administration module's data definitions.
// ABOUTME: It re-exports types, mock data, schemas, and collection configurations.

export * from './types';
export * from './mockData';
export * from './schema';
export * from './collections';
export { isGlobalProvider as isDepartmentGlobalProvider, useDepartmentData } from './useDepartmentData';
export { isGlobalProvider as isDesignationGlobalProvider, useDesignationData } from './useDesignationData';
export { isGlobalProvider as isSchoolPeriodGlobalProvider, useSchoolPeriodData } from './useSchoolPeriodData';
export { isGlobalProvider as isAcademicYearGlobalProvider, useAcademicYearData } from './useAcademicYearData';