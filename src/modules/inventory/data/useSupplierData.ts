// ABOUTME: Database-backed hook for managing supplier entities in the inventory module.
// ABOUTME: Backed by the 'suppliers' collection (shared with the finance module).

import { useCallback } from 'react';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import { InvSupplierStatusEnum, InvSupplierType } from './types';

export const useSupplierData = () => {
  const suppliersCollection = useDatabaseCollection<InvSupplierType>('suppliers');

  const suppliers = suppliersCollection.data;

  const count = suppliers.length;

  const create = useCallback(async (input: Partial<InvSupplierType>): Promise<InvSupplierType> => {
    const now = new Date().toISOString();
    const payload = {
      status: InvSupplierStatusEnum.ACTIVE,
      created_at: now,
      updated_at: now,
      ...input
    } as Omit<InvSupplierType, 'id'> & { id?: string };
    const result = await suppliersCollection.insert(payload);
    return result as InvSupplierType;
  }, [suppliersCollection]);

  const update = useCallback(async (id: number | string, updates: Partial<InvSupplierType>): Promise<InvSupplierType> => {
    const result = await suppliersCollection.update(String(id), {
      ...updates,
      updated_at: new Date().toISOString()
    });
    return result as InvSupplierType;
  }, [suppliersCollection]);

  const remove = useCallback(async (id: number | string): Promise<boolean> => {
    return suppliersCollection.remove(String(id));
  }, [suppliersCollection]);

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

  const findById = (id: number | string) => {
    return suppliers.find((supplier) => String(supplier.id) === String(id));
  };

  return {
    suppliers,
    loading: suppliersCollection.loading,
    error: suppliersCollection.error,
    create,
    update,
    remove,
    findById,
    count,
    refresh: suppliersCollection.refresh,
    findActiveSuppliers,
    findSuppliersByStatus,
    findSuppliersByRating,
    searchSuppliers
  };
};
