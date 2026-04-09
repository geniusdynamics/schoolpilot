// ABOUTME: Nutrition Data Provider
import React, { createContext, useContext, ReactNode, useCallback, useState } from 'react';
import { databaseService } from '@/services/database/databaseService';
import { useToast } from '@/hooks/useToast';
import * as types from './types';

interface NutritionDataContextType {
  mealPlans: types.MealPlan[];
  mealPlanItems: types.MealPlanItem[];
  nutritionWallets: types.NutritionWallet[];
  loading: boolean;
  addMealPlan: (data: Omit<types.MealPlan, 'id' | 'created_at' | 'updated_at'>) => Promise<types.MealPlan>;
  updateMealPlan: (id: number, data: Partial<types.MealPlan>) => Promise<types.MealPlan>;
  deleteMealPlan: (id: number) => Promise<void>;
  addNutritionWallet: (data: Omit<types.NutritionWallet, 'id' | 'created_at' | 'updated_at'>) => Promise<types.NutritionWallet>;
  updateNutritionWallet: (id: string, data: Partial<types.NutritionWallet>) => Promise<types.NutritionWallet>;
  deleteNutritionWallet: (id: string) => Promise<void>;
}

const NutritionDataContext = createContext<NutritionDataContextType | undefined>(undefined);

export const useNutritionDataContext = () => {
  const context = useContext(NutritionDataContext);
  if (!context) throw new Error('useNutritionDataContext must be used within NutritionDataProvider');
  return context;
};

interface Props {
  children: ReactNode;
  mealPlans: types.MealPlan[];
  mealPlanItems: types.MealPlanItem[];
  nutritionWallets: types.NutritionWallet[];
  loading: boolean;
}

export const NutritionDataProvider: React.FC<Props> = ({
  children, mealPlans, mealPlanItems, nutritionWallets, loading: parentLoading
}) => {
  const toast = useToast();
  const [localLoading, setLocalLoading] = useState(false);
  const loading = parentLoading || localLoading;

  const withToast = async <T,>(fn: () => Promise<T>, successMsg: string): Promise<T> => {
    setLocalLoading(true);
    try {
      const result = await fn();
      toast.showSuccess(successMsg);
      return result;
    } catch (error) {
      toast.showError(`Failed: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  };

  const withConfirm = async <T,>(fn: () => Promise<T>, confirmMsg: string): Promise<T | void> => {
    if (!window.confirm(confirmMsg)) return;
    return fn();
  };

  const addMealPlan = useCallback((data) =>
    withToast(async () => {
      const db = await databaseService.getDatabase();
      const newItem: types.MealPlan = { ...data, id: Date.now(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      await db.meal_plans?.insert(newItem);
      return newItem;
    }, 'Meal plan created'), [toast]);

  const updateMealPlan = useCallback((id, data) =>
    withToast(async () => {
      const db = await databaseService.getDatabase();
      const updates = { ...data, updated_at: new Date().toISOString() };
      await db.meal_plans?.update(String(id), updates);
      return { ...mealPlans.find(m => m.id === id), ...updates } as types.MealPlan;
    }, 'Meal plan updated'), [mealPlans, toast]);

  const deleteMealPlan = useCallback((id) =>
    withConfirm(() =>
      withToast(async () => { const db = await databaseService.getDatabase(); await db.meal_plans?.remove(String(id)); }, 'Meal plan deleted'),
      'Delete this meal plan?'), [toast]);

  const addNutritionWallet = useCallback((data) =>
    withToast(async () => {
      const db = await databaseService.getDatabase();
      const newItem: types.NutritionWallet = { ...data, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      await db.nutrition_wallets?.insert(newItem);
      return newItem;
    }, 'Nutrition wallet created'), [toast]);

  const updateNutritionWallet = useCallback((id, data) =>
    withToast(async () => {
      const db = await databaseService.getDatabase();
      const updates = { ...data, updated_at: new Date().toISOString() };
      await db.nutrition_wallets?.update(id, updates);
      return { ...nutritionWallets.find(w => w.id === id), ...updates } as types.NutritionWallet;
    }, 'Nutrition wallet updated'), [nutritionWallets, toast]);

  const deleteNutritionWallet = useCallback((id) =>
    withConfirm(() =>
      withToast(async () => { const db = await databaseService.getDatabase(); await db.nutrition_wallets?.remove(id); }, 'Nutrition wallet deleted'),
      'Delete this wallet?'), [toast]);

  return (
    <NutritionDataContext.Provider value={{
      mealPlans, mealPlanItems, nutritionWallets, loading,
      addMealPlan, updateMealPlan, deleteMealPlan,
      addNutritionWallet, updateNutritionWallet, deleteNutritionWallet,
    }}>
      {children}
    </NutritionDataContext.Provider>
  );
};

export default NutritionDataProvider;
