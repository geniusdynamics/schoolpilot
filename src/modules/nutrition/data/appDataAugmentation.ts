// ABOUTME: TypeScript module augmentation for Nutrition collections in AppData
// ABOUTME: Extends AppDataType and AppDataContextType with nutrition-specific properties
// ABOUTME: This is the compile-time equivalent of Frappe's DocType self-registration

// Nutrition domain types are owned by the library module and re-exported via the core registry.
import type {
  MealPlan,
  Menu,
  Merchant,
  StudentMealPlan,
  MealConsumptionLog,
  WalletTransaction,
  StudentWallet,
} from '@/core/types';

declare module '@/core/types' {
  export interface AppDataType {
    mealPlans: MealPlan[];
    menus: Menu[];
    merchants: Merchant[];
    studentMealPlans: StudentMealPlan[];
    mealConsumptionLogs: MealConsumptionLog[];
    walletTransactions: WalletTransaction[];
    studentWallets: StudentWallet[];
    // Report / View collections
    kitchenMealPlans: any[];
  }

  export interface AppDataContextType {
    // Meal Plan CRUD
    addMealPlan: (data: any) => Promise<any>;
    updateMealPlan: (id: string, data: any) => Promise<any>;
    deleteMealPlan: (id: string) => Promise<void>;
    // Menu CRUD
    addMenu: (data: any) => Promise<any>;
    updateMenu: (id: string, data: any) => Promise<any>;
    deleteMenu: (id: string) => Promise<void>;
    // Merchant CRUD
    addMerchant: (data: any) => Promise<any>;
    updateMerchant: (id: string, data: any) => Promise<any>;
    deleteMerchant: (id: string) => Promise<void>;
  }
}
