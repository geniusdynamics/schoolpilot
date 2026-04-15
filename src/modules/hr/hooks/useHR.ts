// ABOUTME: Main hook for HR module pages
// ABOUTME: Uses useHRData() for database-backed data and CRUD
// ABOUTME: This is the ONLY hook HR pages should use

import { useCallback } from 'react';
import { useHRData } from '../data/useHRData';
import { databaseService } from '@/services/database/databaseService';

export const useHR = () => {
  const hrData = useHRData();

  // Additional operations not in useHRData
  const addStaffSalarySetting = useCallback(async (data: any) => {
    const db = await databaseService.getDatabase();
    const result = await db.staff_salary_settings?.insert(data);
    return result?.doc || null;
  }, []);

  const deleteStaffSalarySetting = useCallback(async (id: string) => {
    const db = await databaseService.getDatabase();
    await db.staff_salary_settings?.remove(id);
  }, []);

  const addPayslip = useCallback(async (data: any) => {
    const db = await databaseService.getDatabase();
    const result = await db.payslips?.insert(data);
    return result?.doc || null;
  }, []);

  const updatePayslip = useCallback(async (id: string, data: any) => {
    const db = await databaseService.getDatabase();
    const result = await db.payslips?.update(id, data);
    return result?.doc || null;
  }, []);

  const deletePayslip = useCallback(async (id: string) => {
    const db = await databaseService.getDatabase();
    await db.payslips?.remove(id);
  }, []);

  const processPayslip = useCallback(async (periodId: string) => {
    return hrData.generatePayslipsForPeriod(periodId);
  }, [hrData]);

  const closePayrollPeriod = useCallback(async (id: string) => {
    return hrData.updatePayrollPeriod(id, { status: 'Closed', closed_at: new Date().toISOString() });
  }, [hrData]);

  return {
    staffSalarySettings: hrData.staffSalarySettings,
    payrollPeriods: hrData.payrollPeriods,
    payslips: hrData.payslips,
    payrollItemTypes: hrData.payrollItemTypes,
    loading: false,

    // Staff Salary Settings CRUD
    addStaffSalarySetting,
    updateStaffSalarySetting: hrData.updateStaffSalarySetting,
    deleteStaffSalarySetting,

    // Payroll Period CRUD
    addPayrollPeriod: hrData.addPayrollPeriod,
    updatePayrollPeriod: hrData.updatePayrollPeriod,
    deletePayrollPeriod: hrData.deletePayrollPeriod,
    closePayrollPeriod,

    // Payslip CRUD
    addPayslip,
    updatePayslip,
    deletePayslip,
    processPayslip,

    // Payroll Item Type CRUD
    addPayrollItemType: hrData.addPayrollItemType,
    updatePayrollItemType: hrData.updatePayrollItemType,
    deletePayrollItemType: hrData.deletePayrollItemType,
  };
};

export default useHR;