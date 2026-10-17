// ABOUTME: Database-backed customers (collection 'customers') with CRUD that persists across navigation and reload.
// ABOUTME: Replaces the former in-memory mock hook; ids are strings and update accepts a record or (id, patch).

import { useCallback, useMemo } from 'react';
import { Customer } from '@/core/types';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';

export const CUSTOMERS_COLLECTION = 'customers';

/** A stored customer; ids are strings at runtime. */
export type CustomerRecord = Omit<Customer, 'id'> & { id: string };
type CustomerInput = Omit<CustomerRecord, 'id' | 'created_at' | 'updated_at'>;

const stamp = () => new Date().toISOString();

const toStored = (record: Partial<CustomerRecord>) =>
  Object.fromEntries(Object.entries(record).filter(([key, value]) => key !== 'id' && value !== undefined)) as Partial<CustomerRecord>;

export const useCustomerData = () => {
  const collection = useDatabaseCollection<CustomerRecord>(CUSTOMERS_COLLECTION);
  const { data, insert, update: updateDocument, remove: removeDocument, refresh } = collection;

  const customers = useMemo(() => [...data].sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''))), [data]);

  const addCustomer = useCallback(
    async (newItem: CustomerInput) => {
      const now = stamp();
      return insert({ ...(toStored(newItem) as CustomerInput), created_at: now, updated_at: now });
    },
    [insert]
  );

  const updateCustomer = useCallback(
    async (idOrRecord: string | CustomerRecord, patch?: Partial<CustomerRecord>) => {
      const id = typeof idOrRecord === 'object' ? idOrRecord.id : idOrRecord;
      const changes = typeof idOrRecord === 'object' ? idOrRecord : patch ?? {};
      return updateDocument(String(id), { ...toStored(changes), updated_at: stamp() });
    },
    [updateDocument]
  );

  const deleteCustomer = useCallback(async (id: string) => removeDocument(String(id)), [removeDocument]);

  return {
    customers,
    loading: { customers: collection.loading },
    error: collection.error,
    refresh,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    // Legacy compatibility
    data: customers,
    create: addCustomer,
    update: updateCustomer,
    remove: deleteCustomer,
  };
};

// Mark this as a global provider for cross-module use
export const isGlobalProvider = true;
