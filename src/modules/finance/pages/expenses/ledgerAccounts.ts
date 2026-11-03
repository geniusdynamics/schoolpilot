// ABOUTME: Read-only rows of the ledger's chart of accounts, with the account class and whether
// ABOUTME: the account is the cash book or the bank book, so a screen can show what the ledger posts to.

import { CONTROL_ACCOUNTS, type LedgerAccount, type LedgerAccountMapping } from '@/domain/finance/ledger';

/** Whether an account is the ledger's cash book, its bank book, or neither. */
export type CashOrBank = 'Cash' | 'Bank' | '—';

/** One account of the chart as a read-only row. */
export interface LedgerAccountRow {
  readonly code: string;
  readonly name: string;
  readonly kind: LedgerAccount['kind'];
  readonly cashOrBank: CashOrBank;
}

/**
 * The chart's accounts in code order.
 *
 * The cash and bank book accounts are identified by the control-account codes the posting
 * engine itself uses, so the label cannot drift from the accounts money actually lands in.
 */
export function ledgerAccountRows(mapping: LedgerAccountMapping): readonly LedgerAccountRow[] {
  return mapping
    .accounts()
    .map((account) => ({
      code: account.code,
      name: account.name,
      kind: account.kind,
      cashOrBank:
        account.code === CONTROL_ACCOUNTS.cash.code
          ? 'Cash'
          : account.code === CONTROL_ACCOUNTS.bank.code
            ? 'Bank'
            : '—',
    }) as LedgerAccountRow)
    .sort((left, right) => left.code.localeCompare(right.code));
}
