// ABOUTME: The school's bank accounts and the account each payment channel posts to: the rules a
// ABOUTME: bank or channel row must satisfy against the chart, and the pickers the Banks tab offers.

import type { RepositoryRow } from '@/data/repository';

import { LedgerError } from './errors';
import type { PaymentChannel } from './chart';

/** A row of the school's bank accounts. */
export type BankAccountRow = RepositoryRow<'bank_account'>;

/** The cash-book and bank-book roles an account a bank account may link to plays. */
export const BANK_ACCOUNT_ROLES = ['cash', 'bank'] as const;

/**
 * True when the account is one money can be held in: an asset the chart marks as a cash book or a
 * bank book. A bank account may not link to an expense, a revenue, a payable or an asset with no
 * role, because a payment posted there would not be money the school holds.
 */
export function isBankAccountLedgerAccount(row: RepositoryRow<'ledger_account'>): boolean {
  return (
    row.kind === 'asset' &&
    row.role !== null &&
    row.role !== undefined &&
    (BANK_ACCOUNT_ROLES as readonly string[]).includes(row.role)
  );
}

/** The accounts the Banks tab offers in its picker: the active cash and bank books, by code. */
export function bankAccountLedgerCandidates(
  rows: readonly RepositoryRow<'ledger_account'>[]
): readonly RepositoryRow<'ledger_account'>[] {
  return rows
    .filter((row) => row.is_active && isBankAccountLedgerAccount(row))
    .sort((left, right) => left.code.localeCompare(right.code));
}

/**
 * The accounts the Payment channels section offers: every active asset money can land in.
 *
 * Wider than the bank-account picker because a mobile-money channel posts to the mobile-money
 * clearing account, which is an asset but neither a cash book nor a bank book.
 */
export function channelAccountLedgerCandidates(
  rows: readonly RepositoryRow<'ledger_account'>[]
): readonly RepositoryRow<'ledger_account'>[] {
  return rows
    .filter((row) => row.is_active && row.kind === 'asset')
    .sort((left, right) => left.code.localeCompare(right.code));
}

/** The account a bank account links to, refusing one the money cannot be held in. */
export function assertBankAccountLedgerAccount(
  rows: readonly RepositoryRow<'ledger_account'>[],
  ledgerAccountId: string,
  subject: string
): RepositoryRow<'ledger_account'> {
  const account = rows.find((row) => row.id === ledgerAccountId);
  if (!account) {
    throw new LedgerError(
      'invalid_account',
      `${subject} names a ledger account the chart does not hold`,
      { detail: { ledgerAccountId, subject } }
    );
  }
  if (!isBankAccountLedgerAccount(account)) {
    throw new LedgerError(
      'invalid_account',
      `${subject} names account ${account.code} ${account.name} (${account.kind}${
        account.role ? `, ${account.role}` : ''
      }); a bank account links to an asset the chart keeps as a cash book or a bank book`,
      {
        detail: {
          ledgerAccountId,
          accountCode: account.code,
          kind: account.kind,
          role: account.role,
          subject,
        },
      }
    );
  }
  return account;
}

/** The account a channel nomination may post through: an active asset of the chart. */
export function assertChannelAccountLedgerAccount(
  rows: readonly RepositoryRow<'ledger_account'>[],
  ledgerAccountId: string,
  channel: PaymentChannel
): RepositoryRow<'ledger_account'> {
  const account = rows.find((row) => row.id === ledgerAccountId);
  if (!account) {
    throw new LedgerError(
      'invalid_account',
      `the ${channel} channel names a ledger account the chart does not hold`,
      { detail: { ledgerAccountId, channel } }
    );
  }
  if (account.kind !== 'asset' || !account.is_active) {
    throw new LedgerError(
      'invalid_account',
      `the ${channel} channel names account ${account.code} ${account.name} (${account.kind}${
        account.is_active ? '' : ', inactive'
      }); a payment lands in an active asset account`,
      {
        detail: {
          ledgerAccountId,
          channel,
          accountCode: account.code,
          kind: account.kind,
          isActive: account.is_active,
        },
      }
    );
  }
  return account;
}
