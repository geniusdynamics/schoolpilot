
// ABOUTME: Defines the RxDB collection configurations for the Finance module.
// ABOUTME: Module collection definitions - used by UnifiedDatabaseManager

import * as schemas from './schema';

export const financeCollections = {
  financial_years: { // Assuming schema is in finance/data/schema.ts or imported
    schema: schemas.financialYearsSchema, 
  },
  school_periods: { // Assuming schema is in finance/data/schema.ts or imported and finance-related
    schema: schemas.schoolPeriodSchema,
  },
  chart_of_accounts: { 
    schema: schemas.chartOfAccountsSchema,
  },
  expense_categories: { 
    schema: schemas.expenseCategoriesSchema,
  },
  banks: {
    schema: schemas.banksSchema,
  },
  suppliers: {
    schema: schemas.suppliersSchema,
  },
  fee_templates: {
    schema: schemas.feeTemplatesSchema,
  },
  // fee_template_items are nested
  expense_claims: {
    schema: schemas.expenseClaimsSchema,
  },
  student_opening_balances: {
    schema: schemas.studentOpeningBalancesSchema,
  },
  fee_adjustments: {
    schema: schemas.feeAdjustmentsSchema,
  },
  transport_routes: {
    schema: schemas.transportRoutesSchema,
  },
  student_transport_assignments: {
    schema: schemas.studentTransportAssignmentsSchema,
  },
  student_invoices: {
    schema: schemas.studentInvoicesSchema,
  },
  // student_invoice_items are nested
  student_payments: {
    schema: schemas.studentPaymentsSchema,
  },
  invoice_payment_applications: {
    schema: schemas.invoicePaymentApplicationsSchema,
  },
  customer_invoices: {
    schema: schemas.customerInvoicesSchema,
  },
  // customer_invoice_items are nested
  supplier_invoices: { // Corrected schema reference
    schema: schemas.supplierInvoicesSchema,
  },
  general_payments: {
    schema: schemas.generalPaymentsSchema,
  },
  // general_payment_items are nested
  general_ledger_entries: {
    schema: schemas.generalLedgerEntriesSchema,
  },

  // === REPORT / VIEW COLLECTIONS ===
  balance_sheet_items: {
    schema: schemas.balanceSheetItemSchema,
  },
  cash_book_entries: {
    schema: schemas.cashBookEntrySchema,
  },
  day_book_entries: {
    schema: schemas.dayBookEntrySchema,
  },
  receipt_templates: {
    schema: schemas.receiptTemplateSchema,
  },
  income_statement_items: {
    schema: schemas.incomeStatementItemSchema,
  },
  journal_entries: {
    schema: schemas.journalEntrySchema,
  },
  previous_session_fees: {
    schema: schemas.previousSessionFeeSchema,
  },
  student_payment_records: {
    schema: schemas.studentPaymentRecordSchema,
  },
  trial_balance_items: {
    schema: schemas.trialBalanceItemSchema,
  },
};

// Type helper for consumers of this module's collections (optional)
export type FinanceCollections = typeof financeCollections;
