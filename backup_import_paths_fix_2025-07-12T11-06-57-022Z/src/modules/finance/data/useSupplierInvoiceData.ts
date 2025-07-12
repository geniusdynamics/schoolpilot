// ABOUTME: Self-contained hook for supplierinvoice data management
// ABOUTME: Provides CRUD operations for supplierinvoice without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockSupplierInvoices } from '../../administration/data/mockData';
import { SupplierInvoice } from '../../../core/types';

export const useSupplierInvoiceData = () => {
  const [data, setData] = useState<SupplierInvoice[]>(initialMockSupplierInvoices);

  const create = async (newItem: Partial<SupplierInvoice>) => {
    const newDataItem: SupplierInvoice = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as SupplierInvoice;
    setData((prev: SupplierInvoice[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<SupplierInvoice>) => {
    setData((prev: SupplierInvoice[]) => prev.map((item: SupplierInvoice) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: SupplierInvoice[]) => prev.filter((item: SupplierInvoice) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
