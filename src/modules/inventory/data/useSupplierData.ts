// ABOUTME: Data hook for managing supplier entities in the inventory module.
// ABOUTME: Provides CRUD operations and reactive queries for supplier management.

import { createDataHook } from '../../../hooks/useDataHookFactory';
import { InvSupplierType } from './types';
import { initialMockSuppliers } from './mockData';

const supplierHook = createDataHook<InvSupplierType>('suppliers', initialMockSuppliers);

export const useSupplierData = () => {
  const {
    data: suppliers,
    loading,
    error,
    create,
    update,
    remove,
    count,
    refresh
  } = supplierHook();

  // Specialized query methods
  const findActiveSuppliers = () => {
    return suppliers.filter(supplier => supplier.status === 'Active')
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const findSuppliersByStatus = (status: string) => {
    return suppliers.filter(supplier => supplier.status === status)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const findSuppliersByRating = (minRating: number) => {
    return suppliers.filter(supplier => (supplier.performance_rating || 0) >= minRating)
      .sort((a, b) => (b.performance_rating || 0) - (a.performance_rating || 0));
  };

  const searchSuppliers = (searchTerm: string) => {
    const term = searchTerm.toLowerCase();
    return suppliers.filter(supplier => 
      supplier.name.toLowerCase().includes(term) ||
      (supplier.contact_person || '').toLowerCase().includes(term) ||
      (supplier.email || '').toLowerCase().includes(term)
    ).sort((a, b) => a.name.localeCompare(b.name));
  };

  const findById = (id: string) => {
    return suppliers.find(supplier => supplier.id === id);
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
    // Specialized methods
    findActiveSuppliers,
    findSuppliersByStatus,
    findSuppliersByRating,
    searchSuppliers
  };
};