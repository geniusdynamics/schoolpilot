/**
 * Staff Salary Setting Data Hook
 * 
 * Provides CRUD operations for staff salary setting management.
 * 
 * @module hr/data/useStaffSalarySettingData
 */

import { useState, useEffect } from 'react';

interface StaffSalarySetting {
  id: number;
  staff_id: number;
  base_salary: number;
  currency: string;
  effective_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UseStaffSalarySettingDataResult {
  data: StaffSalarySetting[];
  isLoading: boolean;
  error: string | null;
  create: (newItem: Partial<StaffSalarySetting>) => Promise<StaffSalarySetting>;
  update: (id: number, updatedData: Partial<StaffSalarySetting>) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

/**
 * Hook for managing staff salary setting data
 * @returns Staff salary setting data and CRUD operations
 */
const useStaffSalarySettingData = (): UseStaffSalarySettingDataResult => {
  const [staffSalarySettings, setStaffSalarySettings] = useState<StaffSalarySetting[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // TODO: Fetch from database
        setStaffSalarySettings([]);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch staff salary settings');
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const create = async (newItem: Partial<StaffSalarySetting>): Promise<StaffSalarySetting> => {
    const newDataItem: StaffSalarySetting = {
      id: Date.now(),
      staff_id: newItem.staff_id || 0,
      base_salary: newItem.base_salary || 0,
      currency: newItem.currency || 'USD',
      effective_date: newItem.effective_date || new Date().toISOString(),
      is_active: newItem.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...newItem
    };
    setStaffSalarySettings((prev) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<StaffSalarySetting>): Promise<void> => {
    setStaffSalarySettings((prev) => prev.map((item) =>
      item.id === id
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number): Promise<void> => {
    setStaffSalarySettings((prev) => prev.filter((item) => item.id !== id));
  };

  return {
    data: staffSalarySettings,
    isLoading,
    error,
    create,
    update,
    remove
  };
};

export { useStaffSalarySettingData };
export type { StaffSalarySetting, UseStaffSalarySettingDataResult };
