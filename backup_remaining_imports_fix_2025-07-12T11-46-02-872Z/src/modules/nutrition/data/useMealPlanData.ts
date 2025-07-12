// ABOUTME: Self-contained hook for mealplan data management
// ABOUTME: Provides CRUD operations for mealplan without depending on AppDataContext

import { useState, useEffect } from 'react';
import { initialMockMealPlans } from '../../nutrition/data/mockData';
import { MealPlan } from '../../../core/types';

export const useMealPlanData = () => {
  const [data, setData] = useState<MealPlan[]>(initialMockMealPlans);

  const create = async (newItem: Partial<MealPlan>) => {
    const newDataItem: MealPlan = {
      ...newItem,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as MealPlan;
    setData((prev: MealPlan[]) => [...prev, newDataItem]);
    return newDataItem;
  };

  const update = async (id: number, updatedData: Partial<MealPlan>) => {
    setData((prev: MealPlan[]) => prev.map((item: MealPlan) => 
      item.id === id 
        ? { ...item, ...updatedData, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const remove = async (id: number) => {
    setData((prev: MealPlan[]) => prev.filter((item: MealPlan) => item.id !== id));
  };

  return {
    data,
    create,
    update,
    remove
  };
};
