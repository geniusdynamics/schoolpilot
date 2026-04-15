// ABOUTME: Serves as the main CSL entry point for the Administration module's data definitions.
// ABOUTME: It re-exports types, mock data, schemas, and collection configurations.

// Main comprehensive data hook
export { useAdministrationData } from './useAdministrationData';

// Modular data provider (new architecture)
export { 
  AdministrationDataProvider,
  useAdministrationDataContext 
} from './AdministrationDataContext';

export * from './types';
export * from './mockData';
export * from './schema';
export * from './collections';
export { isGlobalProvider as isDepartmentGlobalProvider, useDepartmentData } from './useDepartmentData';
export { isGlobalProvider as isDesignationGlobalProvider, useDesignationData } from './useDesignationData';
export { isGlobalProvider as isSchoolPeriodGlobalProvider, useSchoolPeriodData } from './useSchoolPeriodData';
export { isGlobalProvider as isAcademicYearGlobalProvider, useAcademicYearData } from './useAcademicYearData';
export { isGlobalProvider as isAcademicPeriodDefinitionGlobalProvider, useAcademicPeriodDefinitionData } from './useAcademicPeriodDefinitionData';
export { isGlobalProvider as isDormitoryGlobalProvider, useDormitoryData } from './useDormitoryData';
export { isGlobalProvider as isStudentCategoryGlobalProvider, useStudentCategoryData } from './useStudentCategoryData';
export { isGlobalProvider as isClubAndSocietyGlobalProvider, useClubAndSocietyData } from './useClubAndSocietyData';
export { isGlobalProvider as isCustomerGlobalProvider, useCustomerData } from './useCustomerData';
export { isGlobalProvider as isStudentHealthRecordGlobalProvider, useStudentHealthRecordData } from './useStudentHealthRecordData';
export { isGlobalProvider as isStudentAttendanceGlobalProvider, useStudentAttendanceData } from './useStudentAttendanceData';
export { isGlobalProvider as isTemplateCommGlobalProvider, useTemplateCommData } from './useTemplateCommData';
export { isGlobalProvider as isCampaignGlobalProvider, useCampaignData } from './useCampaignData';
export { isGlobalProvider as isClassGlobalProvider, useClassData } from './useClassData';
export { isGlobalProvider as isClassStreamGlobalProvider, useClassStreamData } from './useClassStreamData';
export { useStudentImportData } from './useStudentImportData';