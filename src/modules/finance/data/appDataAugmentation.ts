// ABOUTME: TypeScript module augmentation for Finance collections in AppData
// ABOUTME: Extends AppDataType and AppDataContextType with finance-specific properties
// ABOUTME: This is the compile-time equivalent of Frappe's DocType self-registration

import type {
  FinancialYear,
  ChartOfAccount,
  ExpenseCategory,
  Bank,
  Supplier,
  FeeTemplate,
  FeeTemplateItem,
  ExpenseClaim,
  RFQ,
  StudentInvoice,
  StudentInvoiceItem,
  StudentPayment,
  FeeAdjustment,
  InvoicePaymentApplication,
  CustomerInvoice,
  SupplierInvoice,
  StudentOpeningBalance,
  TransportRoute,
  StudentTransportAssignment,
  GeneralPayment,
  GeneralLedgerEntry,
  BalanceSheetItem,
  CashBookEntry,
  DayBookEntry,
  ReceiptTemplate,
  IncomeStatementItem,
  JournalEntry,
  PreviousSessionFee,
  StudentPaymentRecord,
  TrialBalanceItem,
} from './types';
import type { GenerateTermInvoicesParams, GenerateTermInvoicesResult } from './useFinanceData';

declare module '@/core/types' {
  export interface AppDataType {
    financialYears: FinancialYear[];
    chartOfAccounts: ChartOfAccount[];
    expenseCategories: ExpenseCategory[];
    banks: Bank[];
    suppliers: Supplier[];
    supplierContracts: any[];
    feeTemplates: FeeTemplate[];
    feeTemplateItems: FeeTemplateItem[];
    expenseClaims: ExpenseClaim[];
    studentInvoices: StudentInvoice[];
    studentInvoiceItems: StudentInvoiceItem[];
    studentPayments: StudentPayment[];
    feeAdjustments: FeeAdjustment[];
    invoicePaymentApplications: InvoicePaymentApplication[];
    customerInvoices: CustomerInvoice[];
    supplierInvoices: SupplierInvoice[];
    studentOpeningBalances: StudentOpeningBalance[];
    transportRoutes: TransportRoute[];
    studentTransportAssignments: StudentTransportAssignment[];
    generalPayments: GeneralPayment[];
    generalLedgerEntries: GeneralLedgerEntry[];
    rfqs: RFQ[];
    // Report / View collections
    balanceSheetItems: BalanceSheetItem[];
    cashBookEntries: CashBookEntry[];
    dayBookEntries: DayBookEntry[];
    receiptTemplates: ReceiptTemplate[];
    incomeStatementItems: IncomeStatementItem[];
    journalEntries: JournalEntry[];
    previousSessionFees: PreviousSessionFee[];
    studentPaymentRecords: StudentPaymentRecord[];
    trialBalanceItems: TrialBalanceItem[];
  }

  export interface AppDataContextType {
    // Banks
    addBank: (data: Omit<Bank, 'id'>) => Promise<Bank>;
    updateBank: (id: string, data: Partial<Bank>) => Promise<Bank>;
    deleteBank: (id: string) => Promise<void>;
    // Chart of Accounts
    addChartOfAccount: (data: any) => Promise<any>;
    updateChartOfAccount: (id: string, data: any) => Promise<any>;
    deleteChartOfAccount: (id: string) => Promise<void>;
    // Fee Templates
    addFeeTemplate: (data: any) => Promise<any>;
    updateFeeTemplate: (id: string, data: any) => Promise<any>;
    deleteFeeTemplate: (id: string) => Promise<void>;
    // Student Payments
    recordStudentPayment: (data: any) => Promise<any>;
    // Invoice Generation
    generateStudentInvoices: (feeTemplateId: number, schoolPeriodId: number, criteria: any) => Promise<any[]>;
    // Supplier Contract CRUD
    addSupplierContract: (data: Partial<any>) => Promise<void>;
    updateSupplierContract: (id: string, data: Partial<any>) => Promise<void>;
    deleteSupplierContract: (id: string) => Promise<void>;
    // Fee Template Items (nested in fee_templates.items)
    addFeeTemplateItem: (data: Omit<FeeTemplateItem, 'id'>) => Promise<FeeTemplateItem>;
    updateFeeTemplateItem: (id: string, data: Partial<FeeTemplateItem>) => Promise<FeeTemplateItem | undefined>;
    deleteFeeTemplateItem: (id: string) => Promise<boolean>;
    // Term billing: one invoice per learner per fee template and period; dryRun previews only
    generateTermInvoices: (params: GenerateTermInvoicesParams) => Promise<GenerateTermInvoicesResult>;
  }
}
