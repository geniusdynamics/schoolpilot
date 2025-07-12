// ABOUTME: Self-contained hook for any data management
// ABOUTME: Provides CRUD operations for any without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockanys } from '../../administration/data/mockData';
import { any } from '../../../core/types';

export const UseGradingSchemeData = () => {
  const [data, setData] = useState<any[]>(initialMockanys);

  const create = async (newItem: Partial<any>) => {
    const newDataItem: any = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as any;
    setData((prev: any[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<any>) => {
    setData((prev: any[]) => prev.map((item: any) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: any[]) => prev.filter((item: any) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
