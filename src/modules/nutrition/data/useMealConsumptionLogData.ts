// ABOUTME: Self-contained hook for mealconsumptionlog data management
// ABOUTME: Provides CRUD operations for mealconsumptionlog without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockMealConsumptionLogs } from '../../nutrition/data/mockData';
import { MealConsumptionLog } from '../../../core/types';

export const useMealConsumptionLogData = () => {
  const [data, setData] = useState<MealConsumptionLog[]>(initialMockMealConsumptionLogs);

  const create = async (newItem: Partial<MealConsumptionLog>) => {
    const newDataItem: MealConsumptionLog = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as MealConsumptionLog;
    setData((prev: MealConsumptionLog[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<MealConsumptionLog>) => {
    setData((prev: MealConsumptionLog[]) => prev.map((item: MealConsumptionLog) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: MealConsumptionLog[]) => prev.filter((item: MealConsumptionLog) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
