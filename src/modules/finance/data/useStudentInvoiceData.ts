// ABOUTME: Self-contained hook for student invoice data management.
// ABOUTME: Provides CRUD operations for student invoices without depending on AppDataContext.

import { useState, useEffect } from 'react';
import { initialMockStudentInvoices } from './mockData';
import {
  FinInvoiceStatusEnum,
  FinStudentInvoiceType as StudentInvoice
} from './types';

const useStudentInvoiceData = () => {
  const [studentInvoices, setStudentInvoices] = useState<StudentInvoice[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setStudentInvoices(initialMockStudentInvoices);
      setIsLoading(false);
    } catch {
      setError('Failed to fetch student invoices');
      setIsLoading(false);
    }
  }, []);

  const create = async (newItem: Partial<StudentInvoice>) => {
    const newDataItem: StudentInvoice = {
      ...newItem,
      id: `SINV${Date.now()}`,
      total_amount_billed: newItem.total_amount_billed ?? 0,
      amount_paid: newItem.amount_paid ?? 0,
      status: newItem.status ?? FinInvoiceStatusEnum.DUE,
      items: newItem.items ?? [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as StudentInvoice;
    setStudentInvoices((prev) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (
    idOrItem: string | StudentInvoice,
    updatedData?: Partial<StudentInvoice>
  ) => {
    const targetId = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
    const nextData = typeof idOrItem === 'string' ? updatedData : idOrItem;

    setStudentInvoices((prev) => prev.map((item) =>
      item.id === targetId
        ? { ...item, ...nextData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: string) => {
    setStudentInvoices((prev) => prev.filter((item) => item.id !== id));
  };

  return {
    data: studentInvoices,
    isLoading,
    error,
    create,
    update,
    remove
  };
};

export { useStudentInvoiceData };
