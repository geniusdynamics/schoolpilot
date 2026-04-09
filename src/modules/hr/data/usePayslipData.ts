/**
 * Payslip Data Hook
 * 
 * Provides CRUD operations for payslip management.
 * 
 * @module hr/data/usePayslipData
 */

import { useState, useEffect } from 'react';

interface Payslip {
  id: number;
  staff_id: number;
  payroll_period_id: number;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  status: 'draft' | 'generated' | 'approved' | 'paid';
  generated_at?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

interface UsePayslipDataResult {
  data: Payslip[];
  isLoading: boolean;
  error: string | null;
  create: (newItem: Partial<Payslip>) => Promise<Payslip>;
  update: (id: number, updatedData: Partial<Payslip>) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

/**
 * Hook for managing payslip data
 * @returns Payslip data and CRUD operations
 */
const usePayslipData = (): UsePayslipDataResult => {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // TODO: Fetch from database
        setPayslips([]);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch payslips');
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const create = async (newItem: Partial<Payslip>): Promise<Payslip> => {
    const newDataItem: Payslip = {
      id: Date.now(),
      staff_id: newItem.staff_id || 0,
      payroll_period_id: newItem.payroll_period_id || 0,
      gross_pay: newItem.gross_pay || 0,
      total_deductions: newItem.total_deductions || 0,
      net_pay: newItem.net_pay || 0,
      status: newItem.status || 'draft',
      generated_at: newItem.generated_at,
      paid_at: newItem.paid_at,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...newItem
    };
    setPayslips((prev) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<Payslip>): Promise<void> => {
    setPayslips((prev) => prev.map((item) =>
      item.id === id
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number): Promise<void> => {
    setPayslips((prev) => prev.filter((item) => item.id !== id));
  };

  return {
    data: payslips,
    isLoading,
    error,
    create,
    update,
    remove
  };
};

export { usePayslipData };
export type { Payslip, UsePayslipDataResult };
