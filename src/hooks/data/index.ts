// ABOUTME: Barrel exports for all domain-split data hooks
// ABOUTME: Now imports from module locations for backward compatibility

export { useSystemData } from '@/modules/core/data/useSystemData';
export { useAdministrationData } from '@/modules/administration/data/useAdministrationData';
export { useAcademicData } from '@/modules/academics/data/useAcademicData';
export { useFinanceData } from '@/modules/finance/data/useFinanceData';
export { useHRData } from '@/modules/hr/data/useHRData';
export { useInventoryData } from '@/modules/inventory/data/useInventoryData';
export { useLibraryData } from '@/modules/library/data/useLibraryData';
export { useNutritionData } from '@/modules/nutrition/data/useNutritionData';
export { useDatabaseData } from './useDatabaseData';
export type { NutritionCrossDomainRefs } from '@/modules/nutrition/data/useNutritionData';
