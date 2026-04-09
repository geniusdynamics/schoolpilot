// ABOUTME: HR domain hook — PayrollPeriods, PayrollItemTypes, Payslips,
// ABOUTME: StaffSalarySettings, LeaveRequests

import { useState, useCallback } from 'react';
import type { AppDataContextType } from '@/types';
import { databaseService } from '@/services/database/databaseService';

type RawInitialData = AppDataContextType['rawInitialData'];

export function useHRData(_mockDataForSeeding: RawInitialData) {
  const [hrData] = useState<{
    payrollPeriods: any[];
    payrollItemTypes: any[];
    staffSalarySettings: any[];
    payslips: any[];
  }>({
    payrollPeriods: [],
    payrollItemTypes: [],
    staffSalarySettings: [],
    payslips: [],
  });

  // ── Payroll Periods ───────────────────────────────────────────────────────────
  const addPayrollPeriod = useCallback(async (data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.payroll_periods?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding payroll period:', error); throw error; }
  }, []);

  const updatePayrollPeriod = useCallback(async (id: string, data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.payroll_periods?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating payroll period:', error); throw error; }
  }, []);

  const deletePayrollPeriod = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.payroll_periods?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting payroll period:', error); throw error; }
  }, []);

  // ── Payroll Item Types ────────────────────────────────────────────────────────
  const addPayrollItemType = useCallback(async (data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.payroll_item_types?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding payroll item type:', error); throw error; }
  }, []);

  const updatePayrollItemType = useCallback(async (id: string, data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.payroll_item_types?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating payroll item type:', error); throw error; }
  }, []);

  const deletePayrollItemType = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.payroll_item_types?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting payroll item type:', error); throw error; }
  }, []);

  // ── Staff Salary Settings ─────────────────────────────────────────────────────
  const updateStaffSalarySetting = useCallback(async (staffId: string, salaryData: any) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.staff_members?.update(staffId, { salary_settings: salaryData });
      return result?.doc || null;
    } catch (error) { console.error('Error updating staff salary setting:', error); throw error; }
  }, []);

  // ── Payslip Generation ────────────────────────────────────────────────────────
  const generatePayslipsForPeriod = useCallback(async (periodId: string) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.payroll_periods?.update(periodId, { payslips_generated: true });
      return result?.doc || null;
    } catch (error) { console.error('Error generating payslips for period:', error); throw error; }
  }, []);

  return {
    // Data
    payrollPeriods: hrData.payrollPeriods,
    payrollItemTypes: hrData.payrollItemTypes,
    staffSalarySettings: hrData.staffSalarySettings,
    payslips: hrData.payslips,

    // CRUD
    addPayrollPeriod, updatePayrollPeriod, deletePayrollPeriod,
    addPayrollItemType, updatePayrollItemType, deletePayrollItemType,
    updateStaffSalarySetting,
    generatePayslipsForPeriod,
  };
}
