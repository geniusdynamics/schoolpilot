// ABOUTME: Main hook for HR module pages
// ABOUTME: Combines data from AppDataContext with CRUD from HRDataProvider
// ABOUTME: This is the ONLY hook HR pages should use

import { useAppData } from '@/hooks/useAppData';
import { useHRDataContext } from '../data/HRDataProvider';

export const useHR = () => {
  // Get read-only data from AppDataContext
  const {
    staffSalarySettings: appStaffSalarySettings,
    payrollPeriods: appPayrollPeriods,
    payslips: appPayslips,
    payrollItemTypes: appPayrollItemTypes,
    loading: appLoading,
  } = useAppData();

  // Get CRUD operations from HRDataProvider
  const {
    // Staff Salary Settings CRUD
    addStaffSalarySetting,
    updateStaffSalarySetting,
    deleteStaffSalarySetting,
    
    // Payroll Period CRUD
    addPayrollPeriod,
    updatePayrollPeriod,
    deletePayrollPeriod,
    closePayrollPeriod,
    
    // Payslip CRUD
    addPayslip,
    updatePayslip,
    deletePayslip,
    processPayslip,
    
    // Payroll Item Type CRUD
    addPayrollItemType,
    updatePayrollItemType,
    deletePayrollItemType,
  } = useHRDataContext();

  return {
    // Data (from AppDataContext)
    staffSalarySettings: appStaffSalarySettings,
    payrollPeriods: appPayrollPeriods,
    payslips: appPayslips,
    payrollItemTypes: appPayrollItemTypes,
    loading: appLoading,
    
    // Staff Salary Settings CRUD
    addStaffSalarySetting,
    updateStaffSalarySetting,
    deleteStaffSalarySetting,
    
    // Payroll Period CRUD
    addPayrollPeriod,
    updatePayrollPeriod,
    deletePayrollPeriod,
    closePayrollPeriod,
    
    // Payslip CRUD
    addPayslip,
    updatePayslip,
    deletePayslip,
    processPayslip,
    
    // Payroll Item Type CRUD
    addPayrollItemType,
    updatePayrollItemType,
    deletePayrollItemType,
  };
};

export default useHR;
