// ABOUTME: Barrel exports for finance hooks
// ABOUTME: Module-specific hooks for finance

// Main modular hook (new architecture) - USE THIS for all Finance pages
export { useFinance } from './useFinance';

// P0 Service hooks - replacing Akademico database engine logic
export { useInvoiceStatus, useInvoiceGeneration, usePaymentAllocation } from './useFinanceServices';

// P1 Computed view hooks - replacing PgSQL views
export { useStudentFinancialSummary } from './useStudentFinancialSummary';
export type { StudentFinancialSummary } from './useStudentFinancialSummary';
export { useVoteheadStatement } from './useVoteheadStatement';
export type { VoteheadStatementRow } from './useVoteheadStatement';
export { useFeeCollectionSummary } from './useFeeCollectionSummary';
export type { FeeCollectionSummaryRow } from './useFeeCollectionSummary';
export { useAccountLedger } from './useAccountLedger';
export type { AccountLedgerRow } from './useAccountLedger';
