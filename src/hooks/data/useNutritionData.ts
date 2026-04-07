// ABOUTME: Nutrition domain hook — MealPlans, Menus, StudentMealPlans,
// ABOUTME: MealConsumptionLogs, Merchants, StudentWallets, WalletTransactions

import { useState, useCallback } from 'react';
import type { AppDataContextType } from '../../types';
import { databaseService } from '../../services/database/databaseService';
import * as allTypes from '../../types';

type RawInitialData = AppDataContextType['rawInitialData'];

// Cross-domain data refs needed for wallet/consumption logic
export interface NutritionCrossDomainRefs {
  students: any[];
  menus: any[];
  studentMealPlans: any[];
  studentWallets: any[];
}

export function useNutritionData(_mockDataForSeeding: RawInitialData, crossDomainRefs?: NutritionCrossDomainRefs) {
  const [nutritionData] = useState<{
    mealPlans: any[];
    menus: any[];
    merchants: any[];
    studentMealPlans: any[];
    studentWallets: any[];
  }>({
    mealPlans: [],
    menus: [],
    merchants: [],
    studentMealPlans: [],
    studentWallets: [],
  });

  // Resolve cross-domain data (passed in or fall back to local empty arrays)
  const getStudents = useCallback(() => crossDomainRefs?.students ?? [], [crossDomainRefs]);
  const getMenus = useCallback(() => crossDomainRefs?.menus ?? nutritionData.menus, [crossDomainRefs, nutritionData.menus]);
  const getStudentMealPlans = useCallback(() => crossDomainRefs?.studentMealPlans ?? nutritionData.studentMealPlans, [crossDomainRefs, nutritionData.studentMealPlans]);
  const getStudentWallets = useCallback(() => crossDomainRefs?.studentWallets ?? nutritionData.studentWallets, [crossDomainRefs, nutritionData.studentWallets]);

  // ── Meal Plans ────────────────────────────────────────────────────────────────
  const addMealPlan = useCallback(async (data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.meal_plans?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding meal plan:', error); throw error; }
  }, []);

  const updateMealPlan = useCallback(async (id: string, data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.meal_plans?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating meal plan:', error); throw error; }
  }, []);

  const deleteMealPlan = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.meal_plans?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting meal plan:', error); throw error; }
  }, []);

  // ── Menus ─────────────────────────────────────────────────────────────────────
  const addMenu = useCallback(async (data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.menus?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding menu:', error); throw error; }
  }, []);

  const updateMenu = useCallback(async (id: string, data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.menus?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating menu:', error); throw error; }
  }, []);

  const deleteMenu = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.menus?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting menu:', error); throw error; }
  }, []);

  // ── Student Meal Plans ────────────────────────────────────────────────────────
  const addStudentMealPlan = useCallback(async (data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.student_meal_plans?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding student meal plan:', error); throw error; }
  }, []);

  const updateStudentMealPlan = useCallback(async (id: string, data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.student_meal_plans?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating student meal plan:', error); throw error; }
  }, []);

  const deleteStudentMealPlan = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.student_meal_plans?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting student meal plan:', error); throw error; }
  }, []);

  // ── Meal Consumption Logs ─────────────────────────────────────────────────────
  const addMealConsumptionLog = useCallback(async (logData: Omit<allTypes.MealConsumptionLog, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const students = getStudents();
      const menus = getMenus();
      const studentMealPlans = getStudentMealPlans();
      const studentWallets = getStudentWallets();

      const student = students.find((entry: any) => String(entry.id) === String(logData.student_id));
      const menu = menus.find((entry: any) => String(entry.id) === String(logData.menu_id));
      const activeMealPlan = studentMealPlans.find((entry: any) => String(entry.student_id) === String(logData.student_id));
      const chargedAmount = logData.charged_amount ?? (activeMealPlan ? 0 : (menu as any)?.cost || 0);
      const walletTransactionId = chargedAmount > 0 ? databaseService.generateId() : null;

      if (chargedAmount > 0) {
        const currentWallet = studentWallets.find((entry: any) => String(entry.student_id) === String(logData.student_id));
        const nextBalance = (currentWallet?.balance || 0) - chargedAmount;

        await db.wallet_transactions?.insert({
          id: walletTransactionId,
          student_id: logData.student_id,
          transaction_date: new Date().toISOString(),
          transaction_type: 'DEBIT',
          amount: chargedAmount,
          description: `${menu?.description || 'Meal'} consumption charge`,
          reference_id: logData.menu_id,
          reference_type: 'MEAL_CONSUMPTION',
          running_balance: nextBalance,
          student_name: student ? `${(student as any).first_name || ''} ${(student as any).last_name || ''}`.trim() : undefined,
        });

        if (currentWallet) {
          await db.student_wallets?.update(String(logData.student_id), {
            ...currentWallet,
            balance: nextBalance,
            last_updated: new Date().toISOString(),
          });
        } else {
          await db.student_wallets?.insert({
            student_id: logData.student_id,
            balance: nextBalance,
            last_updated: new Date().toISOString(),
            student_name: student ? `${(student as any).first_name || ''} ${(student as any).last_name || ''}`.trim() : undefined,
          });
        }
      }

      const logWithId = {
        ...logData,
        id: databaseService.generateId(),
        consumption_time: logData.consumption_time || new Date().toISOString(),
        charged_amount: chargedAmount,
        wallet_transaction_id: walletTransactionId,
        student_name: logData.student_name || (student ? `${(student as any).first_name || ''} ${(student as any).last_name || ''}`.trim() : undefined),
        menu_description: logData.menu_description || menu?.description,
        menu_meal_type: logData.menu_meal_type || (menu as any)?.meal_type,
        menu_date: logData.menu_date || (menu as any)?.menu_date,
      };
      const result = await db.meal_consumption_logs?.insert(logWithId);
      return result?.doc || null;
    } catch (error) { console.error('Error adding meal consumption log:', error); throw error; }
  }, [getStudents, getMenus, getStudentMealPlans, getStudentWallets]);

  // ── Merchants ─────────────────────────────────────────────────────────────────
  const addMerchant = useCallback(async (data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.merchants?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding merchant:', error); throw error; }
  }, []);

  const updateMerchant = useCallback(async (id: string, data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.merchants?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating merchant:', error); throw error; }
  }, []);

  const deleteMerchant = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.merchants?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting merchant:', error); throw error; }
  }, []);

  // ── Wallet Transactions ───────────────────────────────────────────────────────
  const addWalletTransaction = useCallback(async (transactionData: Omit<allTypes.WalletTransaction, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const studentWallets = getStudentWallets();
      const students = getStudents();

      const currentWallet = studentWallets.find((entry: any) => String(entry.student_id) === String(transactionData.student_id));
      const currentBalance = currentWallet?.balance || 0;
      const delta = transactionData.transaction_type === 'DEBIT' ? -Math.abs(transactionData.amount) : Math.abs(transactionData.amount);
      const nextBalance = transactionData.running_balance ?? (currentBalance + delta);
      const student = students.find((entry: any) => String(entry.id) === String(transactionData.student_id));

      const transactionWithId = {
        ...transactionData,
        id: databaseService.generateId(),
        running_balance: nextBalance,
        student_name: transactionData.student_name || (student ? `${(student as any).first_name || ''} ${(student as any).last_name || ''}`.trim() : undefined),
      };

      const result = await db.wallet_transactions?.insert(transactionWithId);

      if (currentWallet) {
        await db.student_wallets?.update(String(transactionData.student_id), {
          ...currentWallet,
          balance: nextBalance,
          last_updated: new Date().toISOString(),
        });
      } else {
        await db.student_wallets?.insert({
          student_id: transactionData.student_id,
          balance: nextBalance,
          last_updated: new Date().toISOString(),
          student_name: transactionWithId.student_name,
        });
      }

      return result?.doc || null;
    } catch (error) { console.error('Error adding wallet transaction:', error); throw error; }
  }, [getStudentWallets, getStudents]);

  return {
    // Data
    mealPlans: nutritionData.mealPlans,
    menus: nutritionData.menus,
    merchants: nutritionData.merchants,
    studentMealPlans: nutritionData.studentMealPlans,
    studentWallets: nutritionData.studentWallets,

    // CRUD
    addMealPlan, updateMealPlan, deleteMealPlan,
    addMenu, updateMenu, deleteMenu,
    addStudentMealPlan, updateStudentMealPlan, deleteStudentMealPlan,
    addMealConsumptionLog,
    addMerchant, updateMerchant, deleteMerchant,
    addWalletTransaction,
  };
}
