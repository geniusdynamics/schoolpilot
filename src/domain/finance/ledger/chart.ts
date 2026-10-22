// ABOUTME: The chart of accounts the posting engine posts against: the control accounts of
// ABOUTME: spec 05 section 8, the account a payment channel lands in, and the small mapping
// ABOUTME: interface through which a fee item names its revenue account.

import { PAYMENT_CHANNELS } from '@/domain/schema';

import { LedgerError } from './errors';
import type { LedgerAccount } from './types';

/** The channels a payment can arrive through (the canonical list of spec 05 section 5.1). */
export type PaymentChannel = (typeof PAYMENT_CHANNELS)[number];

/**
 * The control accounts of spec 05 section 8.
 *
 * These are the accounts the engine posts against when no fee item is involved: the books the
 * spec names (cash book, bank book, mobile-money clearing account) plus the receivables, the
 * learner credit, the refunds payable and the opening-balance equity.
 */
export const CONTROL_ACCOUNTS = {
  cash: { code: '1010', name: 'Cash', kind: 'asset' },
  bank: { code: '1020', name: 'Bank', kind: 'asset' },
  mobile_money_clearing: { code: '1030', name: 'Mobile money clearing', kind: 'asset' },
  card_clearing: { code: '1040', name: 'Card clearing', kind: 'asset' },
  receivables: { code: '1100', name: 'Fee receivables', kind: 'asset' },
  in_kind_goods: { code: '1200', name: 'In-kind goods', kind: 'asset' },
  refunds_payable: { code: '2100', name: 'Refunds payable', kind: 'liability' },
  learner_credit: { code: '2150', name: 'Learner credit', kind: 'liability' },
  opening_balance_equity: { code: '3000', name: 'Opening balances', kind: 'equity' },
  fee_revenue: { code: '4000', name: 'Fee revenue', kind: 'revenue' },
} as const satisfies Record<string, LedgerAccount>;

/** The name of a control account. */
export type ControlAccountName = keyof typeof CONTROL_ACCOUNTS;

/** The account a payment channel's money lands in (spec 05 section 8: cash, bank, mobile money). */
export const CHANNEL_ACCOUNTS: Readonly<Record<PaymentChannel, ControlAccountName>> = {
  cash: 'cash',
  bank_deposit: 'bank',
  cheque: 'bank',
  mobile_money: 'mobile_money_clearing',
  card: 'card_clearing',
  in_kind: 'in_kind_goods',
};

/**
 * The chart of accounts as the posting engine needs it.
 *
 * Deliberately small, and deliberately a seam: the real fee-item GL mapping belongs to the fee
 * item registry (P3-B01, `src/domain/finance/feeItems/*`). The engine resolves a fee item's
 * revenue account through this interface, so the mapping can land beside it without this module
 * changing. An implementation that knows nothing about a fee item returns `null`, and the engine
 * falls back to the default revenue account it was configured with.
 */
export interface LedgerAccountMapping {
  /** The revenue account a fee item posts to, or null when the item carries no GL mapping. */
  revenueAccountForFeeItem(feeItemId: string): LedgerAccount | null;
  /** An account of the chart by code, or null when the chart does not hold it. */
  account(code: string): LedgerAccount | null;
}

/** What a chart is built from. */
export interface ChartOfAccountsInput {
  /** Extra accounts beyond the control accounts. */
  readonly accounts?: readonly LedgerAccount[];
  /** The revenue account code of a fee item, by fee item id. */
  readonly feeItemRevenueAccounts?: Readonly<Record<string, string>>;
  /** A resolver, when the mapping is not a plain record (the seam P3-B01 fills). */
  readonly revenueAccountForFeeItem?: (feeItemId: string) => LedgerAccount | null;
  /**
   * The revenue account a line posts to when its fee item carries no GL mapping.
   *
   * Defaults to the fee-revenue control account. A chart that would rather refuse an unmapped fee
   * item leaves this out and passes `requireFeeItemMapping: true`.
   */
  readonly fallbackRevenueAccountCode?: string;
  /** When true, a line whose fee item has no mapping is refused instead of falling back. */
  readonly requireFeeItemMapping?: boolean;
}

/** The chart the engine starts from: the control accounts, with no fee item mapped. */
export const DEFAULT_LEDGER_ACCOUNT_MAPPING: LedgerAccountMapping = createLedgerAccountMapping();

/** Builds a chart of accounts from the control accounts and whatever the caller adds. */
export function createLedgerAccountMapping(
  input: ChartOfAccountsInput = {}
): LedgerAccountMapping {
  const accounts = new Map<string, LedgerAccount>();
  for (const account of Object.values(CONTROL_ACCOUNTS)) {
    accounts.set(account.code, account);
  }
  for (const account of input.accounts ?? []) {
    accounts.set(account.code, account);
  }

  const revenueCodes = new Map<string, string>();
  for (const [feeItemId, code] of Object.entries(input.feeItemRevenueAccounts ?? {})) {
    revenueCodes.set(feeItemId, code);
  }

  const fallbackCode = input.fallbackRevenueAccountCode ?? CONTROL_ACCOUNTS.fee_revenue.code;
  const requireMapping = input.requireFeeItemMapping ?? false;

  return {
    account(code) {
      return accounts.get(code) ?? null;
    },
    revenueAccountForFeeItem(feeItemId) {
      if (input.revenueAccountForFeeItem) {
        return input.revenueAccountForFeeItem(feeItemId);
      }
      const code = revenueCodes.get(feeItemId);
      if (code !== undefined) {
        const account = accounts.get(code);
        if (!account) {
          throw new LedgerError(
            'no_mapping',
            `fee item "${feeItemId}" is mapped to account "${code}", which the chart of accounts does not hold`,
            { detail: { feeItemId, accountCode: code } }
          );
        }
        return account;
      }
      if (requireMapping) return null;
      return accounts.get(fallbackCode) ?? null;
    },
  };
}

/** Resolves a control account, refusing when the chart does not hold it. */
export function resolveControlAccount(
  mapping: LedgerAccountMapping,
  name: ControlAccountName
): LedgerAccount {
  const expected = CONTROL_ACCOUNTS[name];
  const account = mapping.account(expected.code);
  if (!account) {
    throw new LedgerError(
      'no_mapping',
      `the chart of accounts does not hold the "${name}" control account (${expected.code})`,
      { detail: { control: name, accountCode: expected.code } }
    );
  }
  return account;
}

/** The account a payment channel lands in, refusing when the chart does not hold it. */
export function resolveChannelAccount(
  mapping: LedgerAccountMapping,
  channel: PaymentChannel
): LedgerAccount {
  return resolveControlAccount(mapping, CHANNEL_ACCOUNTS[channel]);
}

/**
 * Resolves the revenue account of an invoice or credit-note line.
 *
 * A line that names no fee item, or a fee item the mapping does not know, posts to the default
 * revenue account. A chart built with `requireFeeItemMapping` refuses instead, and says which fee
 * item has no mapping.
 */
export function resolveRevenueAccount(
  mapping: LedgerAccountMapping,
  feeItemId: string | null | undefined,
  subject: string
): LedgerAccount {
  if (feeItemId !== null && feeItemId !== undefined && feeItemId !== '') {
    const mapped = mapping.revenueAccountForFeeItem(feeItemId);
    if (mapped) return mapped;
    throw new LedgerError(
      'no_mapping',
      `${subject}: fee item "${feeItemId}" has no revenue account in the chart of accounts`,
      { detail: { feeItemId, subject } }
    );
  }
  const fallback = mapping.account(CONTROL_ACCOUNTS.fee_revenue.code);
  if (!fallback) {
    throw new LedgerError(
      'no_mapping',
      `${subject}: the chart of accounts holds no default revenue account (${CONTROL_ACCOUNTS.fee_revenue.code})`,
      { detail: { accountCode: CONTROL_ACCOUNTS.fee_revenue.code, subject } }
    );
  }
  return fallback;
}
