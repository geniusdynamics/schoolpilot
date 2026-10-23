// ABOUTME: The aging buckets of spec 05 section 6: an exact hand-computed case, the due-date rule
// ABOUTME: rather than the issue date, the convention for an item with no due date, and a partly
// ABOUTME: paid invoice whose outstanding part alone ages.

import { describe, expect, it } from 'vitest';

import { fromMinor } from '@/domain/money';

import {
  AGING_BUCKETS,
  agingBucketOf,
  agingSummary,
  daysBetween,
  daysPastDue,
  isStatementError,
  outstandingItemsFromInvoices,
  type AgingItem,
} from '..';

const kes = (minor: number) => fromMinor(minor, 'KES');

/** The reference day every hand-computed case is measured against. */
const AS_OF = '2027-03-31';

function item(id: string, dueDate: string | null, amountMinor: number, issueDate = '2027-01-01'): AgingItem {
  return {
    id,
    documentId: id,
    documentNumber: `INV/${id}`,
    issueDate,
    dueDate,
    amount: kes(amountMinor),
  };
}

/** The hand-computed fixture: one item per bucket, plus a future-dated one and a dateless one. */
const FIXTURE: readonly AgingItem[] = [
  // 11 days past due -> 1-30
  item('a', '2027-03-20', 100_000),
  // 49 days past due -> 31-60
  item('b', '2027-02-10', 200_000),
  // 75 days past due -> 61-90
  item('c', '2027-01-15', 300_000),
  // 120 days past due -> 90+
  item('d', '2026-12-01', 400_000),
  // not yet due -> current
  item('e', '2027-04-10', 500_000),
  // no due date: aged from its issue date, 6 days past due -> 1-30
  item('f', null, 600_000, '2027-03-25'),
];

function bucketMinor(summary: ReturnType<typeof agingSummary>, name: string): number {
  return summary.buckets.find((bucket) => bucket.name === name)?.amount.amount_minor ?? -1;
}

describe('the day arithmetic', () => {
  it('counts whole days between two ISO days, and a leap day cannot move it', () => {
    expect(daysBetween('2027-02-10', '2027-03-31')).toBe(49);
    expect(daysBetween('2027-01-15', '2027-03-31')).toBe(75);
    expect(daysBetween('2026-12-01', '2027-03-31')).toBe(120);
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
  });

  it('refuses a day that is not an ISO day', () => {
    expect(() => daysBetween('31/03/2027', AS_OF)).toThrow();
  });

  it('ages from the due date, not the issue date', () => {
    // Issued long ago, due yesterday: one day past due, not a year.
    const invoice = item('x', '2027-03-30', 1_000, '2026-01-01');
    expect(daysPastDue(invoice, AS_OF, 'issue_date')).toBe(1);
    expect(agingBucketOf(1)).toBe('days_1_30');
  });
});

describe('the bucket boundaries', () => {
  it('places 0 and a future date in current, and 30/31, 60/61, 90/91 on the spec\'s edges', () => {
    expect(agingBucketOf(0)).toBe('current');
    expect(agingBucketOf(-5)).toBe('current');
    expect(agingBucketOf(1)).toBe('days_1_30');
    expect(agingBucketOf(30)).toBe('days_1_30');
    expect(agingBucketOf(31)).toBe('days_31_60');
    expect(agingBucketOf(60)).toBe('days_31_60');
    expect(agingBucketOf(61)).toBe('days_61_90');
    expect(agingBucketOf(90)).toBe('days_61_90');
    expect(agingBucketOf(91)).toBe('days_90_plus');
    expect(agingBucketOf(3_650)).toBe('days_90_plus');
  });

  it('names the five buckets of the spec, in order', () => {
    expect(AGING_BUCKETS.map((bucket) => bucket.name)).toEqual([
      'current',
      'days_1_30',
      'days_31_60',
      'days_61_90',
      'days_90_plus',
    ]);
  });
});

describe('the hand-computed aging summary', () => {
  it('buckets each item into the exact bucket, with the exact total', () => {
    const summary = agingSummary(FIXTURE, AS_OF, 'KES');

    expect(bucketMinor(summary, 'current')).toBe(500_000);
    expect(bucketMinor(summary, 'days_1_30')).toBe(700_000); // 100,000 + the dateless 600,000
    expect(bucketMinor(summary, 'days_31_60')).toBe(200_000);
    expect(bucketMinor(summary, 'days_61_90')).toBe(300_000);
    expect(bucketMinor(summary, 'days_90_plus')).toBe(400_000);
    expect(summary.total.amount_minor).toBe(2_100_000);

    const counts = summary.buckets.map((bucket) => bucket.count);
    expect(counts).toEqual([1, 2, 1, 1, 1]);
  });

  it('states the convention it used, and the convention changes the answer', () => {
    const byIssue = agingSummary(FIXTURE, AS_OF, 'KES');
    expect(byIssue.missingDueDate).toBe('issue_date');
    expect(bucketMinor(byIssue, 'days_1_30')).toBe(700_000);

    const asCurrent = agingSummary(FIXTURE, AS_OF, 'KES', { missingDueDate: 'current' });
    expect(asCurrent.missingDueDate).toBe('current');
    // The dateless item is current, so only the 11-days-past-due item is in 1-30.
    expect(bucketMinor(asCurrent, 'current')).toBe(1_100_000);
    expect(bucketMinor(asCurrent, 'days_1_30')).toBe(100_000);
    // The total is the same whichever convention is stated.
    expect(asCurrent.total.amount_minor).toBe(byIssue.total.amount_minor);
  });

  it('leaves a zero item out and refuses an aging date that is not a day', () => {
    const withZero = agingSummary([item('z', '2027-01-01', 0)], AS_OF, 'KES');
    expect(withZero.total.amount_minor).toBe(0);
    expect(withZero.buckets.every((bucket) => bucket.count === 0)).toBe(true);

    expect(() => agingSummary(FIXTURE, 'yesterday', 'KES')).toThrow();
  });
});

describe('the outstanding part of an invoice', () => {
  const invoices = [
    {
      id: 'inv-full',
      number: 'INV/FULL',
      issueDate: '2027-01-01',
      dueDate: '2027-01-31',
      totalMinor: 1_000_000,
      currency: 'KES' as const,
      status: 'posted',
    },
    {
      id: 'inv-part',
      number: 'INV/PART',
      issueDate: '2027-02-01',
      dueDate: '2027-02-28',
      totalMinor: 1_000_000,
      currency: 'KES' as const,
      status: 'partially_paid',
    },
    {
      id: 'inv-void',
      number: 'INV/VOID',
      issueDate: '2027-01-01',
      dueDate: '2027-01-31',
      totalMinor: 1_000_000,
      currency: 'KES' as const,
      status: 'void',
    },
  ];

  it('ages only the outstanding part of a partly paid invoice, and nothing of a paid or void one', () => {
    const items = outstandingItemsFromInvoices({
      invoices,
      allocatedMinorByInvoice: new Map([
        ['inv-full', 1_000_000],
        ['inv-part', 400_000],
      ]),
      creditedMinorByInvoice: new Map([['inv-part', 100_000]]),
    });

    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe('inv-part');
    // 1,000,000 - 400,000 allocated - 100,000 credited = 500,000 outstanding, not the whole invoice.
    expect(items[0]?.amount.amount_minor).toBe(500_000);
    expect(items[0]?.dueDate).toBe('2027-02-28');
  });

  it('ages a dateless invoice from its issue date by the stated convention', () => {
    const items = outstandingItemsFromInvoices({
      invoices: [
        {
          id: 'inv-dateless',
          number: 'INV/NODUE',
          issueDate: '2027-01-01',
          dueDate: null,
          totalMinor: 250_000,
          currency: 'KES',
          status: 'posted',
        },
      ],
      allocatedMinorByInvoice: new Map(),
      creditedMinorByInvoice: new Map(),
    });
    const summary = agingSummary(items, AS_OF, 'KES');
    // 2027-01-01 to 2027-03-31 is 89 days: 61-90.
    expect(bucketMinor(summary, 'days_61_90')).toBe(250_000);
  });
});

describe('the module error', () => {
  it('is recognisable by its guard', () => {
    let thrown: unknown = null;
    try {
      agingSummary([], 'not-a-day', 'KES');
    } catch (error) {
      thrown = error;
    }
    expect(isStatementError(thrown)).toBe(true);
  });
});
