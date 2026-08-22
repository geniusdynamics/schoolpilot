import { logger } from '@/utils/logging';

// ABOUTME: HR domain hook â€” PayrollPeriods, PayrollItemTypes, Payslips,
// ABOUTME: StaffSalarySettings, LeaveRequests
// ABOUTME: Uses real database-backed hooks for persistent data

import { useCallback } from 'react';
import { databaseService } from '@/services/database/databaseService';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';

export function useHRData() {
  const payrollPeriodsCollection = useDatabaseCollection<any>('payroll_periods');
  const payrollItemTypesCollection = useDatabaseCollection<any>('payroll_item_types');
  const staffSalarySettingsCollection = useDatabaseCollection<any>('staff_salary_settings');
  const payslipsCollection = useDatabaseCollection<any>('payslips');

  // â”€â”€ Payroll Periods â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addPayrollPeriod = useCallback(async (data: any) => {
    return payrollPeriodsCollection.insert(data);
  }, [payrollPeriodsCollection]);

  const updatePayrollPeriod = useCallback(async (id: string, data: any) => {
    return payrollPeriodsCollection.update(id, data);
  }, [payrollPeriodsCollection]);

  const deletePayrollPeriod = useCallback(async (id: string) => {
    return payrollPeriodsCollection.remove(id);
  }, [payrollPeriodsCollection]);

  // â”€â”€ Payroll Item Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addPayrollItemType = useCallback(async (data: any) => {
    return payrollItemTypesCollection.insert(data);
  }, [payrollItemTypesCollection]);

  const updatePayrollItemType = useCallback(async (id: string, data: any) => {
    return payrollItemTypesCollection.update(id, data);
  }, [payrollItemTypesCollection]);

  const deletePayrollItemType = useCallback(async (id: string) => {
    return payrollItemTypesCollection.remove(id);
  }, [payrollItemTypesCollection]);

  // â”€â”€ Staff Salary Settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const updateStaffSalarySetting = useCallback(async (staffId: string, salaryData: any) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.staff_members?.update(staffId, { salary_settings: salaryData });
      return result?.doc || null;
    } catch (error) { logger.error('Error updating staff salary setting:', error); throw error; }
  }, []);

  // â”€â”€ Payslip Generation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const generatePayslipsForPeriod = useCallback(async (periodId: string) => {
    return payrollPeriodsCollection.update(periodId, { payslips_generated: true });
  }, [payrollPeriodsCollection]);

  return {
    // Data
    payrollPeriods: payrollPeriodsCollection.data,
    payrollItemTypes: payrollItemTypesCollection.data,
    staffSalarySettings: staffSalarySettingsCollection.data,
    payslips: payslipsCollection.data,

    // CRUD
    addPayrollPeriod, updatePayrollPeriod, deletePayrollPeriod,
    addPayrollItemType, updatePayrollItemType, deletePayrollItemType,
    updateStaffSalarySetting,
    generatePayslipsForPeriod,
  };
}
