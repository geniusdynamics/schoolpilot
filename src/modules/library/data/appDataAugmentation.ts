// ABOUTME: TypeScript module augmentation for Library collections in AppData
// ABOUTME: Extends AppDataType and AppDataContextType with library-specific properties
// ABOUTME: This is the compile-time equivalent of Frappe's DocType self-registration

import type {
  BookCategory,
  Book,
  Loan,
  Fine,
  MealPlan,
  Menu,
  Merchant,
  StudentMealPlan,
  MealConsumptionLog,
  WalletTransaction,
  StudentWallet,
} from './types';

declare module '@/core/types' {
  export interface AppDataType {
    bookCategories: BookCategory[];
    books: Book[];
    loans: Loan[];
    fines: Fine[];
    // Nutrition types (defined in library module for historical reasons)
    mealPlans: MealPlan[];
    menus: Menu[];
    merchants: Merchant[];
    studentMealPlans: StudentMealPlan[];
    mealConsumptionLogs: MealConsumptionLog[];
    walletTransactions: WalletTransaction[];
    studentWallets: StudentWallet[];
  }

  export interface AppDataContextType {
    // Book CRUD
    addBook: (data: any) => Promise<any>;
    updateBook: (id: string, data: any) => Promise<any>;
    deleteBook: (id: string) => Promise<void>;
    // Loan CRUD
    addLoan: (data: any) => Promise<any>;
    updateLoan: (id: string, data: any) => Promise<any>;
    deleteLoan: (id: string) => Promise<void>;
    // Fine CRUD
    addFine: (data: any) => Promise<any>;
    updateFine: (id: string, data: any) => Promise<any>;
    deleteFine: (id: string) => Promise<void>;
  }
}
