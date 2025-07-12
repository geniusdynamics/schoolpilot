// ABOUTME: Self-contained hook for customerinvoice data management
// ABOUTME: Provides CRUD operations for customerinvoice without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockCustomerInvoices } from '../../finance/data/mockData';
import { CustomerInvoice } from '../../../core/types';

export const useCustomerInvoiceData = () => {
  const [data, setData] = useState<CustomerInvoice[]>(initialMockCustomerInvoices);

  const create = async (newItem: Partial<CustomerInvoice>) => {
    const newDataItem: CustomerInvoice = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as CustomerInvoice;
    setData((prev: CustomerInvoice[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<CustomerInvoice>) => {
    setData((prev: CustomerInvoice[]) => prev.map((item: CustomerInvoice) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: CustomerInvoice[]) => prev.filter((item: CustomerInvoice) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
