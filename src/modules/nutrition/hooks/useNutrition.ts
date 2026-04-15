// ABOUTME: Main hook for Nutrition module pages
// ABOUTME: Uses useNutritionData() for database-backed data and CRUD
// ABOUTME: This is the ONLY hook Nutrition pages should use

import { useCallback } from 'react';
import { useNutritionData } from '../data/useNutritionData';
import { databaseService } from '@/services/database/databaseService';

export const useNutrition = () => {
  const nutritionData = useNutritionData();

  // Wallet operations using databaseService directly
  const addNutritionWallet = useCallback(async (data: any) => {
    const db = await databaseService.getDatabase();
    const result = await db.student_wallets?.insert(data);
    return result?.doc || null;
  }, []);

  const updateNutritionWallet = useCallback(async (id: string, data: any) => {
    const db = await databaseService.getDatabase();
    const result = await db.student_wallets?.update(id, data);
    return result?.doc || null;
  }, []);

  const deleteNutritionWallet = useCallback(async (id: string) => {
    const db = await databaseService.getDatabase();
    await db.student_wallets?.remove(id);
  }, []);

  return {
    // Data
    mealPlans: nutritionData.mealPlans,
    mealPlanItems: nutritionData.studentMealPlans, // Map studentMealPlans → mealPlanItems for backward compat
    menus: nutritionData.menus,
    merchants: nutritionData.merchants,
    studentMealPlans: nutritionData.studentMealPlans,
    nutritionWallets: nutritionData.studentWallets, // Map studentWallets → nutritionWallets for backward compat
    studentWallets: nutritionData.studentWallets,
    loading: false,

    // Meal Plan CRUD
    addMealPlan: nutritionData.addMealPlan,
    updateMealPlan: nutritionData.updateMealPlan,
    deleteMealPlan: nutritionData.deleteMealPlan,

    // Menu CRUD
    addMenu: nutritionData.addMenu,
    updateMenu: nutritionData.updateMenu,
    deleteMenu: nutritionData.deleteMenu,

    // Student Meal Plan CRUD
    addStudentMealPlan: nutritionData.addStudentMealPlan,
    updateStudentMealPlan: nutritionData.updateStudentMealPlan,
    deleteStudentMealPlan: nutritionData.deleteStudentMealPlan,

    // Meal Consumption
    addMealConsumptionLog: nutritionData.addMealConsumptionLog,

    // Merchant CRUD
    addMerchant: nutritionData.addMerchant,
    updateMerchant: nutritionData.updateMerchant,
    deleteMerchant: nutritionData.deleteMerchant,

    // Wallet CRUD (via databaseService)
    addNutritionWallet,
    updateNutritionWallet,
    deleteNutritionWallet,

    // Wallet Transactions
    addWalletTransaction: nutritionData.addWalletTransaction,
  };
};

export default useNutrition;