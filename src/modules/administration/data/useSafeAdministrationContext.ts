// ABOUTME: Safe context hook for administration module - returns empty data when module is disabled
import { useAdministrationDataContext } from './AdministrationDataContext';
import { moduleRegistry } from '@/core/moduleRegistry';

export const useSafeAdministrationContext = () => {
  const isEnabled = moduleRegistry.isEnabled('administration');

  if (!isEnabled) {
    return {
      academicYearStructures: [],
      academicPeriodDefinitions: [],
      academicYears: [],
      schoolPeriods: [],
      students: [],
      staff: [],
      parentsGuardians: [],
      classes: [],
      classStreams: [],
      departments: [],
      designations: [],
      studentCategories: [],
      dormitories: [],
      studentHealthRecords: [],
      timetablePeriodDefs: [],
      studentAttendance: [],
      isModuleEnabled: false,
    };
  }

  return { ...useAdministrationDataContext(), isModuleEnabled: true };
};
