// ABOUTME: The canonical chart of accounts: the rows a school keeps, the default chart a new
// ABOUTME: school starts from, the mapping the posting engine reads, and the rules that keep an
// ABOUTME: account a posting depends on from being deleted or repurposed.

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
  type PaymentChannel,
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
 * Every account the posting engine resolves by code or a school's configuration depends on is
 * `isSystem`: the ledger cannot post without it, and a bursar must not be able to delete it or
 * turn it into something else. That includes the standard expense accounts, because an expense
 * recorded before the school configures its own cost headings must always find an account to
 * debit. A system account's name stays editable: presentation is the school's, the code and class
 * are the ledger's.
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
    isSystem: true,
  })),
];

/**
 * The account each payment channel posts to when the school nominates none.
 *
 * These are the control accounts the postings resolve by code today. A school that configures a
 * second bank account for bank deposits keeps these rows as its starting point, so clearing a
 * nomination always falls back to the chart's own cash book, bank book and clearing accounts.
 */
export const DEFAULT_CHANNEL_ACCOUNTS: readonly {
  readonly channel: ChannelAccountChannel;
  readonly control: ControlAccountName;
}[] = [
  { channel: 'cash', control: 'cash' },
  { channel: 'bank_deposit', control: 'bank' },
  { channel: 'cheque', control: 'bank' },
  { channel: 'mobile_money', control: 'mobile_money_clearing' },
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

/** A row of the school's channel nominations. */
export type ChannelAccountRow = RepositoryRow<'channel_account'>;

/**
 * The channels a school nominates an account for: the four a payment or an expense can move money
 * through. The engine's wider channel list adds card and in-kind, which post to clearing accounts
 * the chart names and have no school-facing nomination.
 */
export type ChannelAccountChannel = ChannelAccountRow['channel'];

/** The row a default channel nomination becomes for one institution. */
export function channelAccountInput(
  institutionId: string,
  channel: ChannelAccountChannel,
  ledgerAccountId: string
): CreateInput<'channel_account'> {
  return {
    institution_id: institutionId as Id<'institution'>,
    channel,
    ledger_account_id: ledgerAccountId as Id<'ledger_account'>,
  };
}

/** What seeding the channel nominations did. */
export interface ChannelAccountSeed {
  readonly rows: readonly ChannelAccountRow[];
  readonly created: number;
}

/**
 * Nominates the default account of every channel the school has not configured yet.
 *
 * Idempotent per channel: a row the school already has - including one that names its own bank
 * account - is left alone. A channel whose control account the chart does not hold is skipped
 * rather than failing the seed, so a chart a school trimmed still opens.
 */
export async function seedDefaultChannelAccounts(
  store: LedgerAccountStore,
  institutionId: string,
  chart: readonly LedgerAccountRow[],
  options?: WriteOptions
): Promise<ChannelAccountSeed> {
  const existing = await store.list('channel_account', {
    where: { institution_id: institutionId },
    limit: 500,
  });
  const nominated = new Set(existing.items.map((row) => row.channel));
  const byCode = new Map(chart.map((row) => [row.code, row]));
  const rows: ChannelAccountRow[] = [...existing.items];
  let created = 0;

  for (const { channel, control } of DEFAULT_CHANNEL_ACCOUNTS) {
    if (nominated.has(channel)) continue;
    const account = byCode.get(CONTROL_ACCOUNTS[control].code);
    if (!account) continue;
    const row = await store.create(
      'channel_account',
      channelAccountInput(institutionId, channel, account.id),
      options
    );
    rows.push(row);
    nominated.add(channel);
    created += 1;
  }
  return { rows, created };
}

/** What seeding the whole default configuration did. */
export interface LedgerChartSeed {
  readonly accounts: LedgerAccountSeed;
  readonly channels: ChannelAccountSeed;
  /** Every account the school now has, in code order. */
  readonly rows: readonly LedgerAccountRow[];
}

/**
 * Writes the default chart and its channel nominations for one school.
 *
 * This is the setup path a new school and a school that lost every row take: the accounts the
 * postings resolve, then the channel rows that name them. It is idempotent on both halves.
 */
export async function seedDefaultLedgerChart(
  store: LedgerAccountStore,
  institutionId: string,
  options?: WriteOptions
): Promise<LedgerChartSeed> {
  const accounts = await seedDefaultLedgerAccounts(store, institutionId, options);
  const channels = await seedDefaultChannelAccounts(store, institutionId, accounts.rows, options);
  return {
    accounts,
    channels,
    rows: [...accounts.rows].sort((left, right) => left.code.localeCompare(right.code)),
  };
}

/**
 * Gives every school in the database the chart it posts against, once.
 *
 * Called from the canonical start-up path, on the connection the repository just opened: a school
 * created before the chart existed has no `ledger_account` rows, and seeding only when it has none
 * keeps the run idempotent per institution and never touches a chart a school configured. A school
 * that deleted every row deliberately is seeded again on the next start; the Ledger page's own
 * action covers a deletion in the running session.
 */
export async function ensureDefaultLedgerCharts(
  store: LedgerAccountStore,
  options?: WriteOptions
): Promise<{ readonly institutions: number; readonly seeded: number }> {
  const institutions = await store.list('institution', { limit: 500 });
  let seeded = 0;
  for (const institution of institutions.items) {
    const chart = await store.list('ledger_account', {
      where: { institution_id: institution.id },
      limit: 1,
    });
    if (chart.items.length > 0) continue;
    await seedDefaultLedgerChart(store, institution.id, options);
    seeded += 1;
  }
  return { institutions: institutions.items.length, seeded };
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

/** What the posting mapping is built from: the chart rows and the channel nominations. */
export interface LedgerChartInput extends ChartOfAccountsInput {
  /** The channel nominations the school keeps; a channel without one falls back. */
  readonly channelRows?: readonly ChannelAccountRow[];
}

/**
 * The posting engine's chart, built from the school's rows.
 *
 * A school without rows falls back to the default chart, so a database that has not run the seed
 * still posts. A school with rows overrides the defaults with what it configured; the control
 * accounts stay present because they are the codes the postings name, and `is_system` keeps them
 * from being removed. The channel rows say which account each channel nominates; the resolver
 * falls back to the control account of the channel when a nomination is missing or stale.
 */
export function ledgerChartFromRows(
  rows: readonly LedgerAccountRow[],
  input: LedgerChartInput = {}
): LedgerAccountMapping {
  const { accounts: extra, channelRows, ...rest } = input;
  const accounts = [...rows.map(ledgerAccountOf), ...(extra ?? [])];
  const channelAccounts = channelAccountsOf(rows, channelRows ?? []);
  if (
    accounts.length === 0 &&
    Object.keys(rest).length === 0 &&
    Object.keys(channelAccounts).length === 0
  ) {
    return DEFAULT_LEDGER_ACCOUNT_MAPPING;
  }
  return createLedgerAccountMapping({
    ...rest,
    ...(accounts.length === 0 ? {} : { accounts }),
    ...(Object.keys(channelAccounts).length === 0 ? {} : { channelAccounts }),
  });
}

/** The accounts the channel rows nominate, by channel. A stale reference is left out. */
function channelAccountsOf(
  rows: readonly LedgerAccountRow[],
  channelRows: readonly ChannelAccountRow[]
): Partial<Record<PaymentChannel, LedgerAccount>> {
  const byId = new Map<string, LedgerAccountRow>(rows.map((row) => [String(row.id), row]));
  const nominated: Partial<Record<PaymentChannel, LedgerAccount>> = {};
  for (const channelRow of channelRows) {
    const account = byId.get(channelRow.ledger_account_id);
    if (!account) continue;
    nominated[channelRow.channel] = ledgerAccountOf(account);
  }
  return nominated;
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
    `Account ${row.code} ${row.name} is a system account the ledger posts against; its code, class, role and active state cannot change.`,
    { detail: { accountId: row.id, code: row.code, patch } }
  );
}

/** Refuses deleting a system account the ledger posts against. */
export function assertLedgerAccountDeleteAllowed(row: LedgerAccountRow): void {
  if (!row.is_system) return;
  throw new LedgerError(
    'account_protected',
    `Account ${row.code} ${row.name} is a system account the ledger posts against; it cannot be deleted.`,
    { detail: { accountId: row.id, code: row.code } }
  );
}

/** True when a patch changes something a system account protects. Re-exported for the pages. */
export function isProtectedLedgerAccount(row: LedgerAccountRow): boolean {
  return row.is_system;
}

/** The kind values the form offers. */
export type LedgerAccountKind = (typeof LEDGER_ACCOUNT_KINDS)[number];
