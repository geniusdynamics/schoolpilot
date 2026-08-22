import { logger } from '@/utils/logging';

// ABOUTME: Nutrition domain hook â€” MealPlans, Menus, StudentMealPlans,
// ABOUTME: MealConsumptionLogs, Merchants, StudentWallets, WalletTransactions
// ABOUTME: Uses real database-backed hooks for persistent data

import { useCallback } from 'react';
import { databaseService } from '@/services/database/databaseService';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import * as allTypes from '@/types';

// Cross-domain data refs needed for wallet/consumption logic
export interface NutritionCrossDomainRefs {
  students: any[];
  menus: any[];
  studentMealPlans: any[];
  studentWallets: any[];
}

export function useNutritionData(crossDomainRefs?: NutritionCrossDomainRefs) {
  const mealPlansCollection = useDatabaseCollection<any>('meal_plans');
  const menusCollection = useDatabaseCollection<any>('menus');
  const merchantsCollection = useDatabaseCollection<any>('merchants');
  const studentMealPlansCollection = useDatabaseCollection<any>('student_meal_plans');
  const studentWalletsCollection = useDatabaseCollection<any>('student_wallets');

  // Resolve cross-domain data (passed in or fall back to local DB-backed data)
  const getStudents = useCallback(() => crossDomainRefs?.students ?? [], [crossDomainRefs]);
  const getMenus = useCallback(() => crossDomainRefs?.menus ?? menusCollection.data, [crossDomainRefs, menusCollection.data]);
  const getStudentMealPlans = useCallback(() => crossDomainRefs?.studentMealPlans ?? studentMealPlansCollection.data, [crossDomainRefs, studentMealPlansCollection.data]);
  const getStudentWallets = useCallback(() => crossDomainRefs?.studentWallets ?? studentWalletsCollection.data, [crossDomainRefs, studentWalletsCollection.data]);

  // â”€â”€ Meal Plans â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addMealPlan = useCallback(async (data: any) => {
    return mealPlansCollection.insert(data);
  }, [mealPlansCollection]);

  const updateMealPlan = useCallback(async (id: string, data: any) => {
    return mealPlansCollection.update(id, data);
  }, [mealPlansCollection]);

  const deleteMealPlan = useCallback(async (id: string) => {
    return mealPlansCollection.remove(id);
  }, [mealPlansCollection]);

  // â”€â”€ Menus â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addMenu = useCallback(async (data: any) => {
    return menusCollection.insert(data);
  }, [menusCollection]);

  const updateMenu = useCallback(async (id: string, data: any) => {
    return menusCollection.update(id, data);
  }, [menusCollection]);

  const deleteMenu = useCallback(async (id: string) => {
    return menusCollection.remove(id);
  }, [menusCollection]);

  // â”€â”€ Student Meal Plans â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addStudentMealPlan = useCallback(async (data: any) => {
    return studentMealPlansCollection.insert(data);
  }, [studentMealPlansCollection]);

  const updateStudentMealPlan = useCallback(async (id: string, data: any) => {
    return studentMealPlansCollection.update(id, data);
  }, [studentMealPlansCollection]);

  const deleteStudentMealPlan = useCallback(async (id: string) => {
    return studentMealPlansCollection.remove(id);
  }, [studentMealPlansCollection]);

  // â”€â”€ Meal Consumption Logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

        if (currentWallet?.id) {
          await db.student_wallets?.update(String(currentWallet.id), {
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
    } catch (error) { logger.error('Error adding meal consumption log:', error); throw error; }
  }, [getStudents, getMenus, getStudentMealPlans, getStudentWallets]);

  // â”€â”€ Merchants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addMerchant = useCallback(async (data: any) => {
    return merchantsCollection.insert(data);
  }, [merchantsCollection]);

  const updateMerchant = useCallback(async (id: string, data: any) => {
    return merchantsCollection.update(id, data);
  }, [merchantsCollection]);

  const deleteMerchant = useCallback(async (id: string) => {
    return merchantsCollection.remove(id);
  }, [merchantsCollection]);

  // â”€â”€ Wallet Transactions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

      if (currentWallet?.id) {
        await db.student_wallets?.update(String(currentWallet.id), {
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
    } catch (error) { logger.error('Error adding wallet transaction:', error); throw error; }
  }, [getStudentWallets, getStudents]);

  return {
    // Data
    mealPlans: mealPlansCollection.data,
    menus: menusCollection.data,
    merchants: merchantsCollection.data,
    studentMealPlans: studentMealPlansCollection.data,
    studentWallets: studentWalletsCollection.data,

    // CRUD
    addMealPlan, updateMealPlan, deleteMealPlan,
    addMenu, updateMenu, deleteMenu,
    addStudentMealPlan, updateStudentMealPlan, deleteStudentMealPlan,
    addMealConsumptionLog,
    addMerchant, updateMerchant, deleteMerchant,
    addWalletTransaction,
  };
}
