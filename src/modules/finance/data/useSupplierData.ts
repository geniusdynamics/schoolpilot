// ABOUTME: Provides a data hook for managing supplier data through the global data context.
// ABOUTME: This hook centralizes supplier data access and manipulation, ensuring consistency.

import { useDataHook } from '@/hooks/useDataHook';
import { Supplier } from '@/core/types';

/**
 * @description Hook for accessing and managing supplier data.
 * @returns An object with data, and methods for CRUD operations.
 */
export const useSupplierData = () => {
  const dataHook = useDataHook<Supplier>('suppliers');
  return dataHook;
};
