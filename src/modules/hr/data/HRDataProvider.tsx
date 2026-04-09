// ABOUTME: HR Data Provider
// ABOUTME: Provides module-specific data and CRUD operations for HR
// ABOUTME: This keeps HR logic encapsulated within the module

import React, { createContext, useContext, ReactNode, useCallback, useState } from 'react';
import { databaseService } from '@/services/database/databaseService';
import { useToast } from '@/hooks/useToast';
import * as types from './types';

interface HRDataContextType {
  // Data collections (read-only, from AppDataContext)
  staffSalarySettings: types.HRStaffSalarySettingType[];
  payrollPeriods: types.PayrollPeriod[];
  payslips: types.HRPayslipType[];
  payrollItemTypes: types.PayrollItemType[];
  loading: boolean;
  
  // CRUD Operations - Staff Salary Settings
  addStaffSalarySetting: (data: Omit<types.HRStaffSalarySettingType, 'id' | 'created_at' | 'updated_at'>) => Promise<types.HRStaffSalarySettingType>;
  updateStaffSalarySetting: (id: string, data: Partial<types.HRStaffSalarySettingType>) => Promise<types.HRStaffSalarySettingType>;
  deleteStaffSalarySetting: (id: string) => Promise<void>;
  
  // CRUD Operations - Payroll Periods
  addPayrollPeriod: (data: Omit<types.PayrollPeriod, 'id' | 'created_at' | 'updated_at'>) => Promise<types.PayrollPeriod>;
  updatePayrollPeriod: (id: number, data: Partial<types.PayrollPeriod>) => Promise<types.PayrollPeriod>;
  deletePayrollPeriod: (id: number) => Promise<void>;
  closePayrollPeriod: (id: number) => Promise<types.PayrollPeriod>;
  
  // CRUD Operations - Payslips
  addPayslip: (data: Omit<types.HRPayslipType, 'id' | 'created_at' | 'updated_at'>) => Promise<types.HRPayslipType>;
  updatePayslip: (id: string, data: Partial<types.HRPayslipType>) => Promise<types.HRPayslipType>;
  deletePayslip: (id: string) => Promise<void>;
  processPayslip: (id: string) => Promise<types.HRPayslipType>;
  
  // CRUD Operations - Payroll Item Types
  addPayrollItemType: (data: Omit<types.PayrollItemType, 'id' | 'created_at' | 'updated_at'>) => Promise<types.PayrollItemType>;
  updatePayrollItemType: (id: number, data: Partial<types.PayrollItemType>) => Promise<types.PayrollItemType>;
  deletePayrollItemType: (id: number) => Promise<void>;
}

const HRDataContext = createContext<HRDataContextType | undefined>(undefined);

export const useHRDataContext = () => {
  const context = useContext(HRDataContext);
  if (!context) {
    throw new Error('useHRDataContext must be used within HRDataProvider');
  }
  return context;
};

interface Props {
  children: ReactNode;
  staffSalarySettings: types.HRStaffSalarySettingType[];
  payrollPeriods: types.PayrollPeriod[];
  payslips: types.HRPayslipType[];
  payrollItemTypes: types.PayrollItemType[];
  loading: boolean;
}

export const HRDataProvider: React.FC<Props> = ({
  children,
  staffSalarySettings,
  payrollPeriods,
  payslips,
  payrollItemTypes,
  loading: parentLoading,
}) => {
  const toast = useToast();
  const [localLoading, setLocalLoading] = useState(false);
  const loading = parentLoading || localLoading;

  // ===== STAFF SALARY SETTINGS CRUD =====
  const addStaffSalarySetting = useCallback(async (data: Omit<types.HRStaffSalarySettingType, 'id' | 'created_at' | 'updated_at'>) => {
    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const newSetting: types.HRStaffSalarySettingType = {
        ...data,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.staff_salary_settings?.insert(newSetting);
      toast.showSuccess('Salary setting created successfully');
      return newSetting;
    } catch (error) {
      toast.showError(`Failed to create salary setting: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [toast]);

  const updateStaffSalarySetting = useCallback(async (id: string, data: Partial<types.HRStaffSalarySettingType>) => {
    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const updates = { ...data, updated_at: new Date().toISOString() };
      await db.staff_salary_settings?.update(id, updates);
      toast.showSuccess('Salary setting updated successfully');
      return { ...staffSalarySettings.find(s => s.id === id), ...updates } as types.HRStaffSalarySettingType;
    } catch (error) {
      toast.showError(`Failed to update salary setting: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [staffSalarySettings, toast]);

  const deleteStaffSalarySetting = useCallback(async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this salary setting?');
    if (!confirmed) return;

    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      await db.staff_salary_settings?.remove(id);
      toast.showSuccess('Salary setting deleted successfully');
    } catch (error) {
      toast.showError(`Failed to delete salary setting: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [toast]);

  // ===== PAYROLL PERIOD CRUD =====
  const addPayrollPeriod = useCallback(async (data: Omit<types.PayrollPeriod, 'id' | 'created_at' | 'updated_at'>) => {
    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const newPeriod: types.PayrollPeriod = {
        ...data,
        id: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.payroll_periods?.insert(newPeriod);
      toast.showSuccess('Payroll period created successfully');
      return newPeriod;
    } catch (error) {
      toast.showError(`Failed to create payroll period: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [toast]);

  const updatePayrollPeriod = useCallback(async (id: number, data: Partial<types.PayrollPeriod>) => {
    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const updates = { ...data, updated_at: new Date().toISOString() };
      await db.payroll_periods?.update(String(id), updates);
      toast.showSuccess('Payroll period updated successfully');
      return { ...payrollPeriods.find(p => p.id === id), ...updates } as types.PayrollPeriod;
    } catch (error) {
      toast.showError(`Failed to update payroll period: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [payrollPeriods, toast]);

  const deletePayrollPeriod = useCallback(async (id: number) => {
    const confirmed = window.confirm('Are you sure you want to delete this payroll period?');
    if (!confirmed) return;

    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      await db.payroll_periods?.remove(String(id));
      toast.showSuccess('Payroll period deleted successfully');
    } catch (error) {
      toast.showError(`Failed to delete payroll period: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [toast]);

  const closePayrollPeriod = useCallback(async (id: number) => {
    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const updates = {
        status: types.HRPayrollPeriodStatusEnum.CLOSED,
        updated_at: new Date().toISOString(),
      };
      await db.payroll_periods?.update(String(id), updates);
      toast.showSuccess('Payroll period closed successfully');
      return { ...payrollPeriods.find(p => p.id === id), ...updates } as types.PayrollPeriod;
    } catch (error) {
      toast.showError(`Failed to close payroll period: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [payrollPeriods, toast]);

  // ===== PAYSLIP CRUD =====
  const addPayslip = useCallback(async (data: Omit<types.HRPayslipType, 'id' | 'created_at' | 'updated_at'>) => {
    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const newPayslip: types.HRPayslipType = {
        ...data,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: types.HRPayslipStatusEnum.DRAFT,
      };
      await db.payslips?.insert(newPayslip);
      toast.showSuccess('Payslip created successfully');
      return newPayslip;
    } catch (error) {
      toast.showError(`Failed to create payslip: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [toast]);

  const updatePayslip = useCallback(async (id: string, data: Partial<types.HRPayslipType>) => {
    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const updates = { ...data, updated_at: new Date().toISOString() };
      await db.payslips?.update(id, updates);
      toast.showSuccess('Payslip updated successfully');
      return { ...payslips.find(p => p.id === id), ...updates } as types.HRPayslipType;
    } catch (error) {
      toast.showError(`Failed to update payslip: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [payslips, toast]);

  const deletePayslip = useCallback(async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this payslip?');
    if (!confirmed) return;

    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      await db.payslips?.remove(id);
      toast.showSuccess('Payslip deleted successfully');
    } catch (error) {
      toast.showError(`Failed to delete payslip: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [toast]);

  const processPayslip = useCallback(async (id: string) => {
    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const updates = {
        status: types.HRPayslipStatusEnum.PROCESSED,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.payslips?.update(id, updates);
      toast.showSuccess('Payslip processed successfully');
      return { ...payslips.find(p => p.id === id), ...updates } as types.HRPayslipType;
    } catch (error) {
      toast.showError(`Failed to process payslip: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [payslips, toast]);

  // ===== PAYROLL ITEM TYPE CRUD =====
  const addPayrollItemType = useCallback(async (data: Omit<types.PayrollItemType, 'id' | 'created_at' | 'updated_at'>) => {
    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const newType: types.PayrollItemType = {
        ...data,
        id: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.payroll_item_types?.insert(newType);
      toast.showSuccess('Payroll item type created successfully');
      return newType;
    } catch (error) {
      toast.showError(`Failed to create payroll item type: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [toast]);

  const updatePayrollItemType = useCallback(async (id: number, data: Partial<types.PayrollItemType>) => {
    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const updates = { ...data, updated_at: new Date().toISOString() };
      await db.payroll_item_types?.update(String(id), updates);
      toast.showSuccess('Payroll item type updated successfully');
      return { ...payrollItemTypes.find(t => t.id === id), ...updates } as types.PayrollItemType;
    } catch (error) {
      toast.showError(`Failed to update payroll item type: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [payrollItemTypes, toast]);

  const deletePayrollItemType = useCallback(async (id: number) => {
    const confirmed = window.confirm('Are you sure you want to delete this payroll item type?');
    if (!confirmed) return;

    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      await db.payroll_item_types?.remove(String(id));
      toast.showSuccess('Payroll item type deleted successfully');
    } catch (error) {
      toast.showError(`Failed to delete payroll item type: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [toast]);

  const value: HRDataContextType = {
    staffSalarySettings,
    payrollPeriods,
    payslips,
    payrollItemTypes,
    loading,
    addStaffSalarySetting,
    updateStaffSalarySetting,
    deleteStaffSalarySetting,
    addPayrollPeriod,
    updatePayrollPeriod,
    deletePayrollPeriod,
    closePayrollPeriod,
    addPayslip,
    updatePayslip,
    deletePayslip,
    processPayslip,
    addPayrollItemType,
    updatePayrollItemType,
    deletePayrollItemType,
  };

  return (
    <HRDataContext.Provider value={value}>
      {children}
    </HRDataContext.Provider>
  );
};

export default HRDataProvider;
