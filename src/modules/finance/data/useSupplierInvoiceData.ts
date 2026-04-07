// ABOUTME: Provides a data hook for managing supplier invoice data through the global data context.
// ABOUTME: This hook centralizes supplier invoice data access and manipulation for consistency.

import { useDataHook } from '@/hooks/useDataHook';
import { SupplierInvoice } from '@/core/types';

/**
 * @description Hook for accessing and managing supplier invoice data.
 * @returns An object with data, and methods for CRUD operations.
 */
export const useSupplierInvoiceData = () => {
  const dataHook = useDataHook<SupplierInvoice>('supplierinvoices');
  return dataHook;
};
