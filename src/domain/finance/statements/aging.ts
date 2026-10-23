// ABOUTME: Ages outstanding amounts into the buckets of spec 05 section 6 - current, 1-30, 31-60,
// ABOUTME: 61-90, 90+ days past due - from the due date rather than the issue date, with a stated
// ABOUTME: convention for an item that carries no due date and for one that is only partly paid.

import { add, fromMinor, isZero, zero, type CurrencyCode, type Money } from '@/domain/money';

import { StatementError } from './errors';
import type {
  AgingBucket,
  AgingBucketName,
  AgingItem,
  AgingSummary,
  MissingDueDateConvention,
} from './types';

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** One bucket's definition: the range of days past due it covers. */
export interface AgingBucketSpec {
  readonly name: AgingBucketName;
  readonly label: string;
  readonly fromDays: number;
  /** The last day it covers, inclusive; null is open-ended. */
  readonly toDays: number | null;
}

/**
 * The buckets of spec 05 section 6, in order.
 *
 * `current` is everything not yet past due (a negative days-past-due, i.e. an item not yet due,
 * falls here too); the rest are the spec's day ranges, with 90+ open-ended.
 */
export const AGING_BUCKETS: readonly AgingBucketSpec[] = [
  { name: 'current', label: 'Current', fromDays: 0, toDays: 0 },
  { name: 'days_1_30', label: '1-30 days', fromDays: 1, toDays: 30 },
  { name: 'days_31_60', label: '31-60 days', fromDays: 31, toDays: 60 },
  { name: 'days_61_90', label: '61-90 days', fromDays: 61, toDays: 90 },
  { name: 'days_90_plus', label: '90+ days', fromDays: 91, toDays: null },
];

/** Refuses a day that is not an ISO `YYYY-MM-DD`. */
function assertIsoDay(day: string, what: string): void {
  if (!ISO_DAY.test(day)) {
    throw new StatementError('invalid_period', `${what} must be an ISO day (YYYY-MM-DD), not "${day}"`, {
      detail: { what, day },
    });
  }
}

/** The whole days between two ISO days, as a UTC day count, so a time zone cannot move it. */
export function daysBetween(fromDay: string, toDay: string): number {
  assertIsoDay(fromDay, 'the from day');
  assertIsoDay(toDay, 'the to day');
  return dayNumber(toDay) - dayNumber(fromDay);
}

function dayNumber(isoDay: string): number {
  const [year, month, day] = isoDay.split('-').map((part) => Number(part));
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

/**
 * The day an item ages from.
 *
 * An item with a due date ages from it; one without ages from its issue date. The `current`
 * convention (which ages a missing due date as not yet due) is applied in {@link daysPastDue},
 * before this is reached.
 */
export function agingReferenceDay(item: AgingItem): string {
  if (item.dueDate !== undefined && item.dueDate !== null && item.dueDate !== '') return item.dueDate;
  return item.issueDate;
}

/**
 * How many days past due an item is as of a day.
 *
 * A due date in the future, or a `current` convention on a missing due date, gives a non-positive
 * number, which {@link agingBucketOf} places in `current`.
 */
export function daysPastDue(
  item: AgingItem,
  asOf: string,
  convention: MissingDueDateConvention
): number {
  if (
    (item.dueDate === undefined || item.dueDate === null || item.dueDate === '') &&
    convention === 'current'
  ) {
    assertIsoDay(asOf, 'the aging date');
    return 0;
  }
  return daysBetween(agingReferenceDay(item), asOf);
}

/** The bucket a days-past-due figure falls in. */
export function agingBucketOf(daysPastDue: number): AgingBucketName {
  if (daysPastDue <= 0) return 'current';
  for (const bucket of AGING_BUCKETS) {
    if (daysPastDue < bucket.fromDays) continue;
    if (bucket.toDays === null || daysPastDue <= bucket.toDays) return bucket.name;
  }
  return 'days_90_plus';
}

/** Ages a set of outstanding items as of a day. */
export function agingSummary(
  items: readonly AgingItem[],
  asOf: string,
  currency: CurrencyCode,
  options: { readonly missingDueDate?: MissingDueDateConvention } = {}
): AgingSummary {
  assertIsoDay(asOf, 'the aging date');
  const convention = options.missingDueDate ?? 'issue_date';

  const byName = new Map<AgingBucketName, { amount: Money; items: AgingItem[] }>();
  for (const bucket of AGING_BUCKETS) byName.set(bucket.name, { amount: zero(currency), items: [] });

  for (const item of items) {
    if (isZero(item.amount)) continue;
    const name = agingBucketOf(daysPastDue(item, asOf, convention));
    const bucket = byName.get(name);
    if (!bucket) continue;
    bucket.amount = add(bucket.amount, item.amount);
    bucket.items.push(item);
  }

  const buckets: AgingBucket[] = AGING_BUCKETS.map((spec) => {
    const bucket = byName.get(spec.name) ?? { amount: zero(currency), items: [] };
    return {
      name: spec.name,
      label: spec.label,
      fromDays: spec.fromDays,
      toDays: spec.toDays,
      amount: bucket.amount,
      count: bucket.items.length,
      items: bucket.items,
    };
  });

  const total = buckets.reduce((running, bucket) => add(running, bucket.amount), zero(currency));
  return { asOf, currency, buckets, total, missingDueDate: convention };
}

/** One invoice as the aging reads it. */
export interface OutstandingInvoiceInput {
  readonly id: string;
  readonly number?: string;
  readonly issueDate: string;
  readonly dueDate?: string | null;
  /** The invoice total, in minor units. */
  readonly totalMinor: number;
  readonly currency: CurrencyCode;
  /** The canonical invoice status; a draft or a void invoice ages nothing. */
  readonly status: string;
}

/**
 * Builds the outstanding items of a set of invoices.
 *
 * The outstanding part of an invoice is its total less what has been allocated to it and less the
 * credit notes that name it, so a **partially paid** invoice ages only the part that is left
 * rather than the whole invoice. An invoice that is paid in full contributes nothing.
 */
export function outstandingItemsFromInvoices(input: {
  readonly invoices: readonly OutstandingInvoiceInput[];
  readonly allocatedMinorByInvoice: ReadonlyMap<string, number>;
  readonly creditedMinorByInvoice: ReadonlyMap<string, number>;
}): readonly AgingItem[] {
  const items: AgingItem[] = [];
  for (const invoice of input.invoices) {
    if (invoice.status === 'draft' || invoice.status === 'void') continue;
    const allocated = input.allocatedMinorByInvoice.get(invoice.id) ?? 0;
    const credited = input.creditedMinorByInvoice.get(invoice.id) ?? 0;
    const outstanding = invoice.totalMinor - allocated - credited;
    if (outstanding <= 0) continue;
    items.push({
      id: invoice.id,
      documentId: invoice.id,
      ...(invoice.number === undefined ? {} : { documentNumber: invoice.number }),
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate ?? null,
      amount: fromMinor(outstanding, invoice.currency),
    });
  }
  return items;
}
