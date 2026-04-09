// ABOUTME: Safe context hook for HR module - returns empty data when module is disabled
import { useHRDataContext } from './HRDataContext';
import { moduleRegistry } from '@/core/moduleRegistry';

export const useSafeHRContext = () => {
  const isEnabled = moduleRegistry.isEnabled('hr');

  if (!isEnabled) {
    return {
      payrollPeriods: [],
      payrollItemTypes: [],
      payslips: [],
      staffSalarySettings: [],
      leaveRequests: [],
      isModuleEnabled: false,
    };
  }

  return { ...useHRDataContext(), isModuleEnabled: true };
};
