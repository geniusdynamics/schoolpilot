// ABOUTME: The canonical chart of accounts: the rows a school keeps, the default chart a new
// ABOUTME: school starts from, the mapping the posting engine reads, and the rules that keep a
// ABOUTME: control account a posting depends on from being deleted or repurposed.

import type { CreateInput, ListQuery, RepositoryRow, WriteOptions } from '@/data/repository';
import type { Id } from '@/domain/ids';
import type { EntityName } from '@/domain/schema';
import {
  LEDGER_ACCOUNT_KINDS,
  LEDGER_ACCOUNT_ROLES,
} from '@/domain/schema/finance';

import {
  CONTROL_ACCOUNTS,
  DEFAULT_LEDGER_ACCOUNT_MAPPING,
  STANDARD_EXPENSE_ACCOUNTS,
  createLedgerAccountMapping,
  type ChartOfAccountsInput,
  type ControlAccountName,
  type LedgerAccountMapping,
} from './chart';
import { LedgerError } from './errors';
import type { AccountKind, LedgerAccount } from './types';

/** A row of the canonical chart. */
export type LedgerAccountRow = RepositoryRow<'ledger_account'>;

/** The cash-book, bank-book or clearing role an account may play. */
export type LedgerAccountRole = (typeof LEDGER_ACCOUNT_ROLES)[number];

/** The role a control account plays, when it holds money for a payment channel. */
const CONTROL_ROLE: Readonly<Record<ControlAccountName, LedgerAccountRole | null>> = {
  cash: 'cash',
  bank: 'bank',
  mobile_money_clearing: 'mobile_money',
  card_clearing: 'card',
  in_kind_goods: 'in_kind',
  receivables: null,
  refunds_payable: null,
  learner_credit: null,
  opening_balance_equity: null,
  fee_revenue: null,
};

/** One account of the default chart, before it belongs to a school. */
export interface DefaultLedgerAccount {
  readonly code: string;
  readonly name: string;
  readonly kind: AccountKind;
  readonly role: LedgerAccountRole | null;
  readonly isSystem: boolean;
}

/**
 * The chart a new school starts from.
 *
 * Every control account the posting engine resolves by code is `isSystem`: the ledger cannot post
 * without it. The standard expense accounts are ordinary accounts of the same chart, so a school
 * may rename or replace them once it configures its own cost headings.
 */
export const DEFAULT_LEDGER_ACCOUNTS: readonly DefaultLedgerAccount[] = [
  ...(Object.keys(CONTROL_ACCOUNTS) as ControlAccountName[]).map((name) => {
    const account = CONTROL_ACCOUNTS[name];
    return {
      code: account.code,
      name: account.name,
      kind: account.kind,
      role: CONTROL_ROLE[name],
      isSystem: true,
    };
  }),
  ...STANDARD_EXPENSE_ACCOUNTS.map((account) => ({
    code: account.code,
    name: account.name,
    kind: account.kind,
    role: null,
    isSystem: false,
  })),
];

/** The row a default account becomes for one institution. */
export function defaultLedgerAccountInput(
  institutionId: string,
  account: DefaultLedgerAccount
): CreateInput<'ledger_account'> {
  return {
    institution_id: institutionId as Id<'institution'>,
    code: account.code,
    name: account.name,
    kind: account.kind,
    role: account.role,
    is_system: account.isSystem,
    is_active: true,
  };
}

/** The store seeding and reading the chart needs. */
export interface LedgerAccountStore {
  list<E extends EntityName>(
    entity: E,
    query?: ListQuery
  ): Promise<{ readonly items: readonly RepositoryRow<E>[] }>;
  create<E extends EntityName>(
    entity: E,
    input: CreateInput<E>,
    options?: WriteOptions
  ): Promise<RepositoryRow<E>>;
}

/**
 * Writes any default account the school does not have yet, and returns the school's whole chart.
 *
 * Idempotent: a second run reuses the rows it finds by code, so a wizard re-run never duplicates
 * the chart and never overwrites an account the school has renamed. It is called from the setup
 * and demo seed path, where the school is being created, rather than lazily from a read.
 */
export async function seedDefaultLedgerAccounts(
  store: LedgerAccountStore,
  institutionId: string,
  options?: WriteOptions
): Promise<LedgerAccountSeed> {
  const existing = await store.list('ledger_account', {
    where: { institution_id: institutionId },
    limit: 500,
  });
  const byCode = new Map<string, LedgerAccountRow>();
  for (const row of existing.items) byCode.set(row.code, row);
  let created = 0;

  for (const account of DEFAULT_LEDGER_ACCOUNTS) {
    if (byCode.has(account.code)) continue;
    const row = await store.create(
      'ledger_account',
      defaultLedgerAccountInput(institutionId, account),
      options
    );
    byCode.set(row.code, row);
    created += 1;
  }
  return { rows: [...byCode.values()], created };
}

/** What seeding the chart did: every row the school now has, and how many were written. */
export interface LedgerAccountSeed {
  readonly rows: readonly LedgerAccountRow[];
  readonly created: number;
}

/** The chart account a row describes. */
export function ledgerAccountOf(row: LedgerAccountRow): LedgerAccount {
  return {
    code: row.code,
    name: row.name,
    kind: row.kind,
    isActive: row.is_active,
    isSystem: row.is_system,
  };
}

/**
 * The posting engine's chart, built from the school's rows.
 *
 * A school without rows falls back to the default chart, so a database that has not run the seed
 * still posts. A school with rows overrides the defaults with what it configured; the control
 * accounts stay present because they are the codes the postings name, and `is_system` keeps them
 * from being removed.
 */
export function ledgerChartFromRows(
  rows: readonly LedgerAccountRow[],
  input: ChartOfAccountsInput = {}
): LedgerAccountMapping {
  const { accounts: extra, ...rest } = input;
  const accounts = [...rows.map(ledgerAccountOf), ...(extra ?? [])];
  if (accounts.length === 0 && Object.keys(rest).length === 0) {
    return DEFAULT_LEDGER_ACCOUNT_MAPPING;
  }
  return createLedgerAccountMapping({
    ...rest,
    ...(accounts.length === 0 ? {} : { accounts }),
  });
}

/** The accounts of a role, in code order: the banks tab reads the cash and bank books. */
export function accountsWithRole(
  rows: readonly LedgerAccountRow[],
  roles: readonly LedgerAccountRole[]
): readonly LedgerAccountRow[] {
  return rows
    .filter((row) => row.role !== null && row.role !== undefined && roles.includes(row.role))
    .sort((left, right) => left.code.localeCompare(right.code));
}

/** The fields of an account a caller may change. */
export type LedgerAccountPatch = Partial<
  Pick<LedgerAccountRow, 'code' | 'name' | 'kind' | 'role' | 'is_system' | 'is_active'>
>;

/**
 * Refuses an edit that would leave the ledger unable to post.
 *
 * A system account is resolved by code, so its code, class, role and active flag are the things a
 * posting depends on; its name is presentation and may change. A caller that asks to turn the
 * system mark off is refused too: the protection is not a switch a client can flip.
 */
export function assertLedgerAccountUpdateAllowed(
  row: LedgerAccountRow,
  patch: LedgerAccountPatch
): void {
  if (!row.is_system) return;
  const protectedChange =
    (patch.code !== undefined && patch.code !== row.code) ||
    (patch.kind !== undefined && patch.kind !== row.kind) ||
    (patch.role !== undefined && patch.role !== row.role) ||
    (patch.is_system !== undefined && patch.is_system !== row.is_system) ||
    (patch.is_active !== undefined && patch.is_active !== row.is_active);
  if (!protectedChange) return;
  throw new LedgerError(
    'account_protected',
    `Account ${row.code} ${row.name} is a control account the ledger posts against; its code, class, role and active state cannot change.`,
    { detail: { accountId: row.id, code: row.code, patch } }
  );
}

/** Refuses deleting a control account the ledger posts against. */
export function assertLedgerAccountDeleteAllowed(row: LedgerAccountRow): void {
  if (!row.is_system) return;
  throw new LedgerError(
    'account_protected',
    `Account ${row.code} ${row.name} is a control account the ledger posts against; it cannot be deleted.`,
    { detail: { accountId: row.id, code: row.code } }
  );
}

/** True when a patch changes something a system account protects. Re-exported for the pages. */
export function isProtectedLedgerAccount(row: LedgerAccountRow): boolean {
  return row.is_system;
}

/** The kind values the form offers. */
export type LedgerAccountKind = (typeof LEDGER_ACCOUNT_KINDS)[number];
