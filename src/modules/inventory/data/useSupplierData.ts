// ABOUTME: Data hook for managing supplier entities in the inventory module.
// ABOUTME: Provides CRUD operations and reactive queries for supplier management.

import { useMemo } from 'react';
import { createDataHook, DataHookConfig } from '@/hooks/useDataHookFactory';
import { useDataHookRegistration } from '@/hooks/useDataHookRegistration';
import { InvSupplierType } from './types';
import { initialMockSuppliers } from './mockData';

export const useSupplierData = () => {
  const config = useMemo((): DataHookConfig<InvSupplierType> => ({
    entityName: 'suppliers',
    initialData: initialMockSuppliers,
    entityModule: 'inventory',
    contextCrudName: 'Supplier',
    requiresBackend: false,
    allowOffline: true,
    syncPriority: 'normal'
  }), []);

  useDataHookRegistration(config);

  const {
    data: suppliers,
    loading,
    error,
    create,
    update,
    remove,
    refresh
  } = createDataHook<InvSupplierType>(config)();

  const count = suppliers.length;

  const findActiveSuppliers = () => {
    return suppliers
      .filter((supplier) => supplier.status === 'Active')
      .sort((left, right) => left.name.localeCompare(right.name));
  };

  const findSuppliersByStatus = (status: string) => {
    return suppliers
      .filter((supplier) => supplier.status === status)
      .sort((left, right) => left.name.localeCompare(right.name));
  };

  const findSuppliersByRating = (minRating: number) => {
    return suppliers
      .filter((supplier) => (supplier.performance_rating || 0) >= minRating)
      .sort((left, right) => (right.performance_rating || 0) - (left.performance_rating || 0));
  };

  const searchSuppliers = (searchTerm: string) => {
    const normalizedTerm = searchTerm.toLowerCase();

    return suppliers
      .filter((supplier) =>
        (supplier.name?.toLowerCase() ?? '').includes(normalizedTerm) ||
        (supplier.contact_person || '').toLowerCase().includes(normalizedTerm) ||
        (supplier.email || '').toLowerCase().includes(normalizedTerm)
      )
      .sort((left, right) => left.name.localeCompare(right.name));
  };

  const findById = (id: number) => {
    return suppliers.find((supplier) => supplier.id === id);
  };

  return {
    suppliers,
    loading,
    error,
    create,
    update,
    remove,
    findById,
    count,
    refresh,
    findActiveSuppliers,
    findSuppliersByStatus,
    findSuppliersByRating,
    searchSuppliers
  };
};
