// ABOUTME: Finance Data Provider
// ABOUTME: Provides module-specific data and CRUD operations for Finance
// ABOUTME: This keeps Finance logic encapsulated within the module

import React, { createContext, useContext, ReactNode, useCallback, useState } from 'react';
import { databaseService } from '@/services/database/databaseService';
import { useToast } from '@/hooks/useToast';
import { useValidation, ValidationSchema } from '@/hooks/useValidation';
import * as types from './types';
import { useConfirm } from '@/components/ui/ConfirmDialog';

interface FinanceDataContextType {
  // Data collections (read-only, from AppDataContext)
  banks: types.Bank[];
  chartOfAccounts: types.ChartOfAccount[];
  suppliers: types.Supplier[];
  feeTemplates: types.FeeTemplate[];
  customers: types.Customer[];
  financialYears: types.FinancialYear[];
  expenseClaims: types.ExpenseClaim[];
  customerInvoices: types.CustomerInvoice[];
  supplierInvoices: types.SupplierInvoice[];
  loading: boolean;
  
  // CRUD Operations - Banks
  addBank: (data: Omit<types.Bank, 'id' | 'created_at' | 'updated_at'>) => Promise<types.Bank>;
  updateBank: (id: string | number, data: Partial<types.Bank>) => Promise<types.Bank>;
  deleteBank: (id: string | number) => Promise<void>;
  bulkAddBanks: (items: Array<Omit<types.Bank, 'id' | 'created_at' | 'updated_at'>>) => Promise<types.Bank[]>;
  bulkDeleteBanks: (ids: (string | number)[]) => Promise<void>;
  
  // CRUD Operations - Chart of Accounts
  addChartOfAccount: (data: Omit<types.ChartOfAccount, 'id' | 'created_at' | 'updated_at'>) => Promise<types.ChartOfAccount>;
  updateChartOfAccount: (id: number, data: Partial<types.ChartOfAccount>) => Promise<types.ChartOfAccount>;
  deleteChartOfAccount: (id: number) => Promise<void>;
  
  // CRUD Operations - Suppliers
  addSupplier: (data: Omit<types.Supplier, 'id' | 'created_at' | 'updated_at'>) => Promise<types.Supplier>;
  updateSupplier: (id: string, data: Partial<types.Supplier>) => Promise<types.Supplier>;
  deleteSupplier: (id: string) => Promise<void>;
  
  // CRUD Operations - Fee Templates
  addFeeTemplate: (data: Omit<types.FeeTemplate, 'id' | 'created_at' | 'updated_at'>) => Promise<types.FeeTemplate>;
  updateFeeTemplate: (id: number, data: Partial<types.FeeTemplate>) => Promise<types.FeeTemplate>;
  deleteFeeTemplate: (id: number) => Promise<void>;
  
  // CRUD Operations - Customers
  addCustomer: (data: Omit<types.Customer, 'id' | 'created_at' | 'updated_at'>) => Promise<types.Customer>;
  updateCustomer: (id: number, data: Partial<types.Customer>) => Promise<types.Customer>;
  deleteCustomer: (id: number) => Promise<void>;
  
  // CRUD Operations - Financial Years
  addFinancialYear: (data: Omit<types.FinancialYear, 'id' | 'created_at' | 'updated_at'>) => Promise<types.FinancialYear>;
  updateFinancialYear: (id: number, data: Partial<types.FinancialYear>) => Promise<types.FinancialYear>;
  deleteFinancialYear: (id: number) => Promise<void>;
  closeFinancialYear: (id: number) => Promise<types.FinancialYear>;
  
  // Validation
  validateBank: (data: Partial<types.Bank>) => { valid: boolean; errors: Array<{ field: string; message: string }> };
  validateChartOfAccount: (data: Partial<types.ChartOfAccount>) => { valid: boolean; errors: Array<{ field: string; message: string }> };
  validateFeeTemplate: (data: Partial<types.FeeTemplate>) => { valid: boolean; errors: Array<{ field: string; message: string }> };
}

const FinanceDataContext = createContext<FinanceDataContextType | undefined>(undefined);

export const useFinanceDataContext = () => {
  const context = useContext(FinanceDataContext);
  if (!context) {
    throw new Error('useFinanceDataContext must be used within FinanceDataProvider');
  }
  return context;
};

interface Props {
  children: ReactNode;
  banks: types.Bank[];
  chartOfAccounts: types.ChartOfAccount[];
  suppliers: types.Supplier[];
  feeTemplates: types.FeeTemplate[];
  customers: types.Customer[];
  financialYears: types.FinancialYear[];
  expenseClaims: types.ExpenseClaim[];
  customerInvoices: types.CustomerInvoice[];
  supplierInvoices: types.SupplierInvoice[];
  loading: boolean;
}

export const FinanceDataProvider: React.FC<Props> = ({
  children,
  banks,
  chartOfAccounts,
  suppliers,
  feeTemplates,
  customers,
  financialYears,
  expenseClaims,
  customerInvoices,
  supplierInvoices,
  loading: parentLoading,
}) => {
  const toast = useToast();
  const confirm = useConfirm();
  const [localLoading, setLocalLoading] = useState(false);
  const loading = parentLoading || localLoading;

  const bankValidation = useValidation<types.Bank>();
  const chartValidation = useValidation<types.ChartOfAccount>();
  const templateValidation = useValidation<types.FeeTemplate>();

  // Validation schemas
  const bankSchema: ValidationSchema<types.Bank> = [
    { field: 'name', required: true, minLength: 2, maxLength: 100 },
    { field: 'gl_account_id', required: true },
  ];

  const chartSchema: ValidationSchema<types.ChartOfAccount> = [
    { field: 'account_code', required: true, minLength: 2, maxLength: 20, unique: true },
    { field: 'name', required: true, minLength: 2, maxLength: 100 },
    { field: 'type', required: true },
  ];

  const templateSchema: ValidationSchema<types.FeeTemplate> = [
    { field: 'name', required: true, minLength: 2, maxLength: 100 },
    { field: 'school_period_id', required: true },
  ];

  // ===== BANK CRUD =====
  const addBank = useCallback(async (data: Omit<types.Bank, 'id' | 'created_at' | 'updated_at'>) => {
    const validation = bankValidation.validate(data, bankSchema, banks);
    if (!validation.valid) {
      toast.showError(validation.errors.map(e => e.message).join(', '));
      throw new Error('Validation failed');
    }

    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const glAccount = chartOfAccounts.find(a => a.id === data.gl_account_id);
      const newBank: types.Bank = {
        ...data,
        id: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        gl_account_name: glAccount?.name || null,
      };
      await db.banks?.insert(newBank);
      toast.showSuccess('Bank created successfully');
      return newBank;
    } catch (error) {
      toast.showError(`Failed to create bank: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [banks, chartOfAccounts, toast, bankValidation]);

  const updateBank = useCallback(async (id: string | number, data: Partial<types.Bank>) => {
    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const updates = { ...data, updated_at: new Date().toISOString() };
      if (data.gl_account_id) {
        const glAccount = chartOfAccounts.find(a => a.id === data.gl_account_id);
        updates.gl_account_name = glAccount?.name || null;
      }
      await db.banks?.update(String(id), updates);
      toast.showSuccess('Bank updated successfully');
      return { ...banks.find(b => b.id === Number(id)), ...updates } as types.Bank;
    } catch (error) {
      toast.showError(`Failed to update bank: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [banks, chartOfAccounts, toast]);

  const deleteBank = useCallback(async (id: string | number) => {
    const confirmed = await confirm({ variant: 'danger', message: 'Are you sure you want to delete this bank?' });
    if (!confirmed) return;

    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      await db.banks?.remove(String(id));
      toast.showSuccess('Bank deleted successfully');
    } catch (error) {
      toast.showError(`Failed to delete bank: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [toast]);

  // ===== BATCH BANK OPERATIONS =====
  const bulkAddBanks = useCallback(async (
    items: Array<Omit<types.Bank, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<types.Bank[]> => {
    setLocalLoading(true);
    const created: types.Bank[] = [];
    try {
      for (const item of items) {
        const newBank = await addBank(item);
        created.push(newBank);
      }
      toast.showSuccess(`${created.length} banks created successfully`);
      return created;
    } catch (error) {
      toast.showError(`Failed to create some banks: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [addBank, toast]);

  const bulkDeleteBanks = useCallback(async (ids: (string | number)[]) => {
    const confirmed = await confirm({ variant: 'danger', message: `Are you sure you want to delete ${ids.length} banks?` });
    if (!confirmed) return;

    setLocalLoading(true);
    try {
      for (const id of ids) {
        await deleteBank(id);
      }
      toast.showSuccess(`${ids.length} banks deleted successfully`);
    } catch (error) {
      toast.showError(`Failed to delete some banks: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [deleteBank, toast]);

  // ===== CHART OF ACCOUNTS CRUD =====
  const addChartOfAccount = useCallback(async (data: Omit<types.ChartOfAccount, 'id' | 'created_at' | 'updated_at'>) => {
    const validation = chartValidation.validate(data, chartSchema, chartOfAccounts);
    if (!validation.valid) {
      toast.showError(validation.errors.map(e => e.message).join(', '));
      throw new Error('Validation failed');
    }

    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const newAccount: types.ChartOfAccount = {
        ...data,
        id: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: data.is_active ?? true,
      };
      await db.chart_of_accounts?.insert(newAccount);
      toast.showSuccess('Account created successfully');
      return newAccount;
    } catch (error) {
      toast.showError(`Failed to create account: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [chartOfAccounts, toast, chartValidation]);

  const updateChartOfAccount = useCallback(async (id: number, data: Partial<types.ChartOfAccount>) => {
    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const updates = { ...data, updated_at: new Date().toISOString() };
      await db.chart_of_accounts?.update(String(id), updates);
      toast.showSuccess('Account updated successfully');
      return { ...chartOfAccounts.find(a => a.id === id), ...updates } as types.ChartOfAccount;
    } catch (error) {
      toast.showError(`Failed to update account: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [chartOfAccounts, toast]);

  const deleteChartOfAccount = useCallback(async (id: number) => {
    const confirmed = await confirm({ variant: 'danger', message: 'Are you sure you want to delete this account?' });
    if (!confirmed) return;

    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      await db.chart_of_accounts?.remove(String(id));
      toast.showSuccess('Account deleted successfully');
    } catch (error) {
      toast.showError(`Failed to delete account: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [toast]);

  // ===== SUPPLIER CRUD =====
  const addSupplier = useCallback(async (data: Omit<types.Supplier, 'id' | 'created_at' | 'updated_at'>) => {
    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const newSupplier: types.Supplier = {
        ...data,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.suppliers?.insert(newSupplier);
      toast.showSuccess('Supplier created successfully');
      return newSupplier;
    } catch (error) {
      toast.showError(`Failed to create supplier: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [toast]);

  const updateSupplier = useCallback(async (id: string, data: Partial<types.Supplier>) => {
    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const updates = { ...data, updated_at: new Date().toISOString() };
      await db.suppliers?.update(id, updates);
      toast.showSuccess('Supplier updated successfully');
      return { ...suppliers.find(s => s.id === id), ...updates } as types.Supplier;
    } catch (error) {
      toast.showError(`Failed to update supplier: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [suppliers, toast]);

  const deleteSupplier = useCallback(async (id: string) => {
    const confirmed = await confirm({ variant: 'danger', message: 'Are you sure you want to delete this supplier?' });
    if (!confirmed) return;

    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      await db.suppliers?.remove(id);
      toast.showSuccess('Supplier deleted successfully');
    } catch (error) {
      toast.showError(`Failed to delete supplier: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [toast]);

  // ===== FEE TEMPLATE CRUD =====
  const addFeeTemplate = useCallback(async (data: Omit<types.FeeTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    const validation = templateValidation.validate(data, templateSchema, feeTemplates);
    if (!validation.valid) {
      toast.showError(validation.errors.map(e => e.message).join(', '));
      throw new Error('Validation failed');
    }

    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const newTemplate: types.FeeTemplate = {
        ...data,
        id: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: data.items || [],
      };
      await db.fee_templates?.insert(newTemplate);
      toast.showSuccess('Fee template created successfully');
      return newTemplate;
    } catch (error) {
      toast.showError(`Failed to create fee template: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [feeTemplates, toast, templateValidation]);

  const updateFeeTemplate = useCallback(async (id: number, data: Partial<types.FeeTemplate>) => {
    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const updates = { ...data, updated_at: new Date().toISOString() };
      await db.fee_templates?.update(String(id), updates);
      toast.showSuccess('Fee template updated successfully');
      return { ...feeTemplates.find(t => t.id === id), ...updates } as types.FeeTemplate;
    } catch (error) {
      toast.showError(`Failed to update fee template: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [feeTemplates, toast]);

  const deleteFeeTemplate = useCallback(async (id: number) => {
    const confirmed = await confirm({ variant: 'danger', message: 'Are you sure you want to delete this fee template?' });
    if (!confirmed) return;

    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      await db.fee_templates?.remove(String(id));
      toast.showSuccess('Fee template deleted successfully');
    } catch (error) {
      toast.showError(`Failed to delete fee template: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [toast]);

  // ===== CUSTOMER CRUD =====
  const addCustomer = useCallback(async (data: Omit<types.Customer, 'id' | 'created_at' | 'updated_at'>) => {
    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const newCustomer: types.Customer = {
        ...data,
        id: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.customers?.insert(newCustomer);
      toast.showSuccess('Customer created successfully');
      return newCustomer;
    } catch (error) {
      toast.showError(`Failed to create customer: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [toast]);

  const updateCustomer = useCallback(async (id: number, data: Partial<types.Customer>) => {
    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const updates = { ...data, updated_at: new Date().toISOString() };
      await db.customers?.update(String(id), updates);
      toast.showSuccess('Customer updated successfully');
      return { ...customers.find(c => c.id === id), ...updates } as types.Customer;
    } catch (error) {
      toast.showError(`Failed to update customer: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [customers, toast]);

  const deleteCustomer = useCallback(async (id: number) => {
    const confirmed = await confirm({ variant: 'danger', message: 'Are you sure you want to delete this customer?' });
    if (!confirmed) return;

    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      await db.customers?.remove(String(id));
      toast.showSuccess('Customer deleted successfully');
    } catch (error) {
      toast.showError(`Failed to delete customer: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [toast]);

  // ===== FINANCIAL YEAR CRUD =====
  const addFinancialYear = useCallback(async (data: Omit<types.FinancialYear, 'id' | 'created_at' | 'updated_at'>) => {
    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const newYear: types.FinancialYear = {
        ...data,
        id: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.financial_years?.insert(newYear);
      toast.showSuccess('Financial year created successfully');
      return newYear;
    } catch (error) {
      toast.showError(`Failed to create financial year: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [toast]);

  const updateFinancialYear = useCallback(async (id: number, data: Partial<types.FinancialYear>) => {
    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const updates = { ...data, updated_at: new Date().toISOString() };
      await db.financial_years?.update(String(id), updates);
      toast.showSuccess('Financial year updated successfully');
      return { ...financialYears.find(y => y.id === id), ...updates } as types.FinancialYear;
    } catch (error) {
      toast.showError(`Failed to update financial year: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [financialYears, toast]);

  const deleteFinancialYear = useCallback(async (id: number) => {
    const confirmed = await confirm({ variant: 'danger', message: 'Are you sure you want to delete this financial year?' });
    if (!confirmed) return;

    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      await db.financial_years?.remove(String(id));
      toast.showSuccess('Financial year deleted successfully');
    } catch (error) {
      toast.showError(`Failed to delete financial year: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [toast]);

  const closeFinancialYear = useCallback(async (id: number) => {
    setLocalLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const updates = {
        status: types.FinancialYearStatus.CLOSED,
        updated_at: new Date().toISOString(),
      };
      await db.financial_years?.update(String(id), updates);
      toast.showSuccess('Financial year closed successfully');
      return { ...financialYears.find(y => y.id === id), ...updates } as types.FinancialYear;
    } catch (error) {
      toast.showError(`Failed to close financial year: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [financialYears, toast]);

  // ===== VALIDATION HELPERS =====
  const validateBank = useCallback((data: Partial<types.Bank>) => {
    return bankValidation.validate(data, bankSchema, banks);
  }, [banks, bankValidation]);

  const validateChartOfAccount = useCallback((data: Partial<types.ChartOfAccount>) => {
    return chartValidation.validate(data, chartSchema, chartOfAccounts);
  }, [chartOfAccounts, chartValidation]);

  const validateFeeTemplate = useCallback((data: Partial<types.FeeTemplate>) => {
    return templateValidation.validate(data, templateSchema, feeTemplates);
  }, [feeTemplates, templateValidation]);

  const value: FinanceDataContextType = {
    // Data
    banks,
    chartOfAccounts,
    suppliers,
    feeTemplates,
    customers,
    financialYears,
    expenseClaims,
    customerInvoices,
    supplierInvoices,
    loading,
    
    // Bank CRUD
    addBank,
    updateBank,
    deleteBank,
    bulkAddBanks,
    bulkDeleteBanks,
    
    // Chart of Accounts CRUD
    addChartOfAccount,
    updateChartOfAccount,
    deleteChartOfAccount,
    
    // Supplier CRUD
    addSupplier,
    updateSupplier,
    deleteSupplier,
    
    // Fee Template CRUD
    addFeeTemplate,
    updateFeeTemplate,
    deleteFeeTemplate,
    
    // Customer CRUD
    addCustomer,
    updateCustomer,
    deleteCustomer,
    
    // Financial Year CRUD
    addFinancialYear,
    updateFinancialYear,
    deleteFinancialYear,
    closeFinancialYear,
    
    // Validation
    validateBank,
    validateChartOfAccount,
    validateFeeTemplate,
  };

  return (
    <FinanceDataContext.Provider value={value}>
      {children}
    </FinanceDataContext.Provider>
  );
};

export default FinanceDataProvider;
