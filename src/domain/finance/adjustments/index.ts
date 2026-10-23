// ABOUTME: Public surface of the adjustments module: the service that issues credit notes, runs
// ABOUTME: refunds through a maker-checker approval, writes off and recovers uncollectable balances,
// ABOUTME: clears a learner on exit and explains a balance as the documents that sum to it; the
// ABOUTME: workflow definitions it binds to; and the pure clearance rule P3-E01 reads too.

export { AdjustmentError, isAdjustmentError, type AdjustmentErrorCode } from './errors';

export * from './types';

export {
  CLEARANCE_WORKFLOW_KEY,
  REFUND_APPROVAL_WORKFLOW_KEY,
  WRITE_OFF_APPROVAL_WORKFLOW_KEY,
  assertMakerIsNotDecider,
  clearanceDefinition,
  refundApprovalDefinition,
  writeOffApprovalDefinition,
} from './definitions';

export {
  BALANCE_ACCOUNT_CODES,
  buildBalanceExplanation,
  creditEffect,
  invoiceEffect,
  ledgerBalanceFor,
  recoveryEffect,
  type BalanceExplanationInput,
} from './balance';

export {
  RECOVERY_ACCOUNT,
  WRITE_OFF_ACCOUNT,
  buildChart,
  ensureAdjustmentSchema,
  revenueAccountsOf,
} from './support';

export { AdjustmentsService, evaluateClearance, type BalanceExplanationQuery } from './service';
