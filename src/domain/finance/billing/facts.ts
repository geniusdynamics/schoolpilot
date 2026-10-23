// ABOUTME: Loading what a billing run reads: the period, the schedule versions in force with their
// ABOUTME: cells, the learners and their enrolments, the invoices already posted and the one-off
// ABOUTME: inputs. Everything is read once, in pages, and indexed in memory so the per-learner loop
// ABOUTME: never issues a query of its own.

import type { ListQuery, RepositoryRow } from '@/data/repository';
import { asId } from '@/domain/ids';
import { isCurrencyCode, type CurrencyCode } from '@/domain/money';
import type { EntityName } from '@/domain/schema';
import { headerOf, type MatrixHeader } from '@/domain/finance/schedules';

import { BillingError } from './errors';
import type {
  AdHocChargeInput,
  BillingRunRequest,
  BillingRunStore,
  OpeningBalanceInput,
} from './types';

/** The statuses a run may price from: a version in force, or one a checker already approved. */
const BILLABLE_STATUSES: readonly string[] = ['approved', 'published'];

/** The repository's own page cap; a larger `limit` is clamped to it. */
export const MAX_PAGE_SIZE = 500;

/** A schedule version the run prices from, with its header and its cells. */
export interface ScheduleFacts {
  readonly row: RepositoryRow<'fee_schedule'>;
  readonly header: MatrixHeader;
  readonly lines: readonly RepositoryRow<'fee_schedule_line'>[];
}

/** What a learner already holds for the period. */
export interface ExistingInvoiceFacts {
  readonly invoice: RepositoryRow<'invoice'>;
  /** The fee items the learner's live invoices already bill. */
  readonly billedFeeItemIds: ReadonlySet<string>;
  /** The descriptions they already carry, so a one-off charge is not billed twice. */
  readonly billedDescriptions: ReadonlySet<string>;
}

/** Everything one run reads, indexed for the per-learner loop. */
export interface RunFacts {
  readonly period: RepositoryRow<'academic_period'>;
  readonly institutionId: string;
  readonly currency: CurrencyCode;
  readonly issueDate: string;
  readonly dueDate: string;
  readonly schedules: readonly ScheduleFacts[];
  readonly learners: readonly RepositoryRow<'learner'>[];
  readonly enrolmentsByLearner: ReadonlyMap<string, RepositoryRow<'enrolment'>>;
  readonly feeItems: ReadonlyMap<string, RepositoryRow<'fee_item'>>;
  readonly existingByLearner: ReadonlyMap<string, ExistingInvoiceFacts>;
  /** The first billing period of the academic year, which is where a `per_year` line is billed. */
  readonly firstBillingPeriodId: string | null;
  readonly chargesByLearner: ReadonlyMap<string, readonly AdHocChargeInput[]>;
  readonly openingsByLearner: ReadonlyMap<string, readonly OpeningBalanceInput[]>;
  readonly notices: readonly string[];
}

/** Reads every page of a query, so a cap the repository applies is never a silent truncation. */
export async function readAll<E extends EntityName>(
  store: BillingRunStore,
  entity: E,
  query: ListQuery,
  pageSize: number
): Promise<readonly RepositoryRow<E>[]> {
  const limit = Math.max(1, Math.min(Math.trunc(pageSize), MAX_PAGE_SIZE));
  const rows: RepositoryRow<E>[] = [];
  for (let offset = 0; ; offset += limit) {
    const page = await store.list(entity, { ...query, limit, offset });
    rows.push(...page.items);
    if (!page.hasMore || page.items.length === 0) return rows;
  }
}

const key = (value: string | null | undefined): string =>
  value === null || value === undefined ? '' : String(value);

/** The day of the clock, or the clock's ISO timestamp sliced. */
function clockDay(now: () => Date): string {
  return now().toISOString().slice(0, 10);
}

/** The enrolment a learner is billed from: the live one, else the one the period falls inside. */
function bestEnrolment(
  rows: readonly RepositoryRow<'enrolment'>[],
  periodStart: string,
  periodEnd: string
): RepositoryRow<'enrolment'> | null {
  const live = rows.filter((row) => row.status === 'active' || row.status === 'repeating');
  if (live.length > 0) {
    return live.slice().sort((left, right) => right.start_date.localeCompare(left.start_date))[0];
  }
  const overlapping = rows.filter(
    (row) => row.start_date <= periodEnd && (row.end_date ?? periodEnd) >= periodStart
  );
  if (overlapping.length > 0) {
    return overlapping
      .slice()
      .sort((left, right) => right.start_date.localeCompare(left.start_date))[0];
  }
  return null;
}

/** Loads everything the run reads. Pure reads: a preview writes nothing. */
export async function loadRunFacts(
  store: BillingRunStore,
  request: BillingRunRequest,
  options: { readonly now: () => Date; readonly pageSize: number }
): Promise<RunFacts> {
  const periodId = request.scope.periodId;
  const period = await store.get('academic_period', periodId);
  if (!period) {
    throw new BillingError('period_missing', `No academic period answers to ${periodId}.`, {
      detail: { periodId },
    });
  }

  const institutionId = period.institution_id;
  const institution = await store.get('institution', asId<'institution'>(institutionId));
  if (!institution) {
    throw new BillingError(
      'institution_missing',
      `No institution answers to ${institutionId}, the period's own institution.`,
      { detail: { institutionId } }
    );
  }
  const currency = institution.base_currency;
  if (!isCurrencyCode(currency)) {
    throw new BillingError(
      'request_invalid',
      `The institution's base currency ${String(currency)} is not one the money table holds.`
    );
  }

  const notices: string[] = [];
  if (!period.is_billing) {
    notices.push(
      `${period.name} is not marked as a billing period; the run still bills it, because the caller chose it.`
    );
  }

  const issueDate = request.issueDate ?? clockDay(options.now);
  const dueDate = request.dueDate ?? issueDate;

  // ---------------------------------------------------------------- schedules
  const scheduleRows = await readAll(
    store,
    'fee_schedule',
    { where: { academic_year_id: period.academic_year_id } },
    options.pageSize
  );
  const wantedScheduleIds = request.scope.scheduleIds
    ? new Set(request.scope.scheduleIds.map(String))
    : null;
  const candidates = scheduleRows.filter(
    (row) =>
      BILLABLE_STATUSES.includes(row.status) &&
      (!wantedScheduleIds || wantedScheduleIds.has(row.id)) &&
      (row.academic_period_ids.length === 0 || row.academic_period_ids.includes(period.id))
  );

  // One version in force per matrix: the published version with the highest number, or the
  // approved one when nothing is published yet. Two versions of one matrix must never both bill.
  const inForce = new Map<string, RepositoryRow<'fee_schedule'>>();
  for (const row of candidates) {
    const matrix = `${row.name}|${key(row.campus_id)}`;
    const current = inForce.get(matrix);
    if (!current) {
      inForce.set(matrix, row);
      continue;
    }
    const better =
      row.status === current.status
        ? row.version > current.version
        : row.status === 'published';
    if (better) inForce.set(matrix, row);
  }

  const schedules: ScheduleFacts[] = [];
  for (const row of inForce.values()) {
    const lines = await readAll(
      store,
      'fee_schedule_line',
      { where: { fee_schedule_id: row.id } },
      options.pageSize
    );
    if (lines.length === 0) continue;
    schedules.push({ row, header: headerOf(row), lines });
  }
  schedules.sort((left, right) => left.row.name.localeCompare(right.row.name));

  // ------------------------------------------------------------------ learners
  const learners = await readAll(
    store,
    'learner',
    { where: { status: 'enrolled' } },
    options.pageSize
  );

  const enrolments = await readAll(
    store,
    'enrolment',
    { where: { academic_year_id: period.academic_year_id } },
    options.pageSize
  );
  const enrolmentRowsByLearner = new Map<string, RepositoryRow<'enrolment'>[]>();
  for (const enrolment of enrolments) {
    const list = enrolmentRowsByLearner.get(enrolment.learner_id) ?? [];
    list.push(enrolment);
    enrolmentRowsByLearner.set(enrolment.learner_id, list);
  }
  const enrolmentsByLearner = new Map<string, RepositoryRow<'enrolment'>>();
  for (const [learnerId, rows] of enrolmentRowsByLearner) {
    const best = bestEnrolment(rows, period.start_date, period.end_date);
    if (best) enrolmentsByLearner.set(learnerId, best);
  }

  const feeItemRows = await readAll(store, 'fee_item', {}, options.pageSize);
  const feeItems = new Map<string, RepositoryRow<'fee_item'>>();
  for (const item of feeItemRows) feeItems.set(item.id, item);

  // ------------------------------------------------------- invoices already posted
  const existingInvoices = await readAll(
    store,
    'invoice',
    { where: { academic_period_id: period.id } },
    options.pageSize
  );
  const existingByLearner = new Map<string, ExistingInvoiceFacts>();
  for (const invoice of existingInvoices) {
    if (invoice.status === 'draft' || invoice.status === 'void') continue;
    if (!invoice.learner_id) continue;
    if (existingByLearner.has(invoice.learner_id)) continue;
    // The lines of one invoice are an indexed lookup, so a re-run reads only the invoices of the
    // period it bills rather than the whole invoice_line table.
    const lines = await readAll(
      store,
      'invoice_line',
      { where: { invoice_id: invoice.id } },
      options.pageSize
    );
    const billedFeeItemIds = new Set<string>();
    const billedDescriptions = new Set<string>();
    for (const line of lines) {
      if (line.fee_item_id) billedFeeItemIds.add(line.fee_item_id);
      billedDescriptions.add(line.description);
    }
    existingByLearner.set(invoice.learner_id, {
      invoice,
      billedFeeItemIds,
      billedDescriptions,
    });
  }

  // ------------------------------------------------------- the academic year's periods
  const yearPeriods = await readAll(
    store,
    'academic_period',
    { where: { academic_year_id: period.academic_year_id } },
    options.pageSize
  );
  const billingPeriods = yearPeriods
    .filter((row) => row.is_billing)
    .sort((left, right) => left.sequence - right.sequence);
  const firstBillingPeriodId = billingPeriods[0]?.id ?? null;

  // ------------------------------------------------------------- one-off inputs
  const chargesByLearner = new Map<string, AdHocChargeInput[]>();
  for (const charge of request.adhocCharges ?? []) {
    assertCharge(charge, currency);
    const list = chargesByLearner.get(charge.learnerId) ?? [];
    list.push(charge);
    chargesByLearner.set(charge.learnerId, list);
  }
  const openingsByLearner = new Map<string, OpeningBalanceInput[]>();
  for (const opening of request.openingBalances ?? []) {
    assertOpeningBalance(opening, currency);
    const list = openingsByLearner.get(opening.learnerId) ?? [];
    list.push(opening);
    openingsByLearner.set(opening.learnerId, list);
  }

  return {
    period,
    institutionId,
    currency,
    issueDate,
    dueDate,
    schedules,
    learners,
    enrolmentsByLearner,
    feeItems,
    existingByLearner,
    firstBillingPeriodId,
    chargesByLearner,
    openingsByLearner,
    notices,
  };
}

function assertCharge(charge: AdHocChargeInput, currency: CurrencyCode): void {
  if (charge.amount.amount_minor <= 0) {
    throw new BillingError(
      'charge_invalid',
      `The charge "${charge.description}" for learner ${charge.learnerId} is not a positive amount.`,
      { detail: { learnerId: charge.learnerId, amount: charge.amount } }
    );
  }
  if (charge.amount.currency !== currency) {
    throw new BillingError(
      'currency_mismatch',
      `The charge "${charge.description}" is in ${charge.amount.currency}, but the institution bills in ${currency}.`,
      { detail: { learnerId: charge.learnerId } }
    );
  }
}

function assertOpeningBalance(opening: OpeningBalanceInput, currency: CurrencyCode): void {
  if (opening.amount.amount_minor <= 0) {
    throw new BillingError(
      'charge_invalid',
      `The opening balance of learner ${opening.learnerId} is not a positive amount.`,
      { detail: { learnerId: opening.learnerId, amount: opening.amount } }
    );
  }
  if (opening.amount.currency !== currency) {
    throw new BillingError(
      'currency_mismatch',
      `The opening balance of learner ${opening.learnerId} is in ${opening.amount.currency}, but the institution bills in ${currency}.`,
      { detail: { learnerId: opening.learnerId } }
    );
  }
}
