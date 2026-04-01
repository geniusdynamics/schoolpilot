// ABOUTME: Self-contained hook for customer invoice data management.
// ABOUTME: Provides CRUD operations for customer invoices without depending on AppDataContext.

import { useState, useEffect } from 'react';
import { initialMockCustomerInvoices } from './mockData';
import {
  FinCustomerInvoiceStatusEnum,
  FinCustomerInvoiceType as CustomerInvoice
} from './types';

export const useCustomerInvoiceData = () => {
  const [data, setData] = useState<CustomerInvoice[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setData(initialMockCustomerInvoices);
      setIsLoading(false);
    } catch {
      setError('Failed to fetch customer invoices');
      setIsLoading(false);
    }
  }, []);

  const create = async (newItem: Partial<CustomerInvoice>) => {
    const newDataItem: CustomerInvoice = {
      ...newItem,
      id: `CINV${Date.now()}`,
      total_amount: newItem.total_amount ?? 0,
      status: newItem.status ?? FinCustomerInvoiceStatusEnum.DUE,
      items: newItem.items ?? [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as CustomerInvoice;
    setData((prev: CustomerInvoice[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (
    idOrItem: string | CustomerInvoice,
    updatedData?: Partial<CustomerInvoice>
  ) => {
    const targetId = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
    const nextData = typeof idOrItem === 'string' ? updatedData : idOrItem;

    setData((prev: CustomerInvoice[]) => prev.map((item: CustomerInvoice) => 
      item.id === targetId 
        ? { ...item, ...nextData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: string) => {
    setData((prev: CustomerInvoice[]) => prev.filter((item: CustomerInvoice) => item.id !== id));
  };

  return {
    data,
    isLoading,
    error,
    create,
    update,
    remove
  };
};
