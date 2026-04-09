// ABOUTME: Finance Module Collection Configuration
// ABOUTME: Defines collections this module owns - auto-discovered by core
// ABOUTME: No need to edit core files when modifying Finance collections!

import type { ModuleCollectionsConfig } from '@/core/types/moduleCollections';
import * as schemas from './schema';

/**
 * Finance module collections
 * Key: DB collection name (snake_case)
 * Value: AppData key (camelCase)
 */
const ALIASES: Record<string, string> = {
  // Core finance collections
  financial_years: 'financialYears',
  chart_of_accounts: 'chartOfAccounts',
  expense_categories: 'expenseCategories',
  banks: 'banks',
  suppliers: 'suppliers',
  supplier_contracts: 'supplierContracts',
  
  // Fee & invoicing
  fee_templates: 'feeTemplates',
  fee_template_items: 'feeTemplateItems',
  expense_claims: 'expenseClaims',
  student_opening_balances: 'studentOpeningBalances',
  fee_adjustments: 'feeAdjustments',
  
  // Transport
  transport_routes: 'transportRoutes',
  student_transport_assignments: 'studentTransportAssignments',
  
  // Student financials
  student_invoices: 'studentInvoices',
  student_invoice_items: 'studentInvoiceItems',
  student_payments: 'studentPayments',
  invoice_payment_applications: 'invoicePaymentApplications',
  
  // External financials
  customer_invoices: 'customerInvoices',
  supplier_invoices: 'supplierInvoices',
  general_payments: 'generalPayments',
  general_ledger_entries: 'generalLedgerEntries',
};

/**
 * Schema definitions for UnifiedDatabaseManager
 */
const SCHEMAS: Record<string, any> = {
  financial_years: schemas.financialYearsSchema,
  chart_of_accounts: schemas.chartOfAccountsSchema,
  expense_categories: schemas.expenseCategoriesSchema,
  banks: schemas.banksSchema,
  suppliers: schemas.suppliersSchema,
  fee_templates: schemas.feeTemplatesSchema,
  expense_claims: schemas.expenseClaimsSchema,
  student_opening_balances: schemas.studentOpeningBalancesSchema,
  fee_adjustments: schemas.feeAdjustmentsSchema,
  transport_routes: schemas.transportRoutesSchema,
  student_transport_assignments: schemas.studentTransportAssignmentsSchema,
  student_invoices: schemas.studentInvoicesSchema,
  student_payments: schemas.studentPaymentsSchema,
  invoice_payment_applications: schemas.invoicePaymentApplicationsSchema,
  customer_invoices: schemas.customerInvoicesSchema,
  supplier_invoices: schemas.supplierInvoicesSchema,
  general_payments: schemas.generalPaymentsSchema,
  general_ledger_entries: schemas.generalLedgerEntriesSchema,
};

/**
 * Module export - core auto-discovers this
 */
export const financeModuleCollections: ModuleCollectionsConfig = {
  moduleName: 'finance',
  aliases: ALIASES,
  schemas: SCHEMAS,
};

export default financeModuleCollections;
