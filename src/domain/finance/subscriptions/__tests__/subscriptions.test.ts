// ABOUTME: The subscriptions module proven against a real SQLite database and the pure billing seam:
// ABOUTME: a subscription created and priced from the fee schedule, prorated by each rule, cancelled
// ABOUTME: with a stated effect, skipped with its reason, and every refusal by name.

import { afterEach, describe, expect, it } from 'vitest';

import { createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';
import { asId, type Id } from '@/domain/ids';
import { fromMinor } from '@/domain/money';
import type { ResolvedLine } from '@/domain/finance/schedules';

import { billSubscription, billSubscriptions, billedOnly, skippedOnly } from '../billing';
import { isSubscriptionError, type SubscriptionErrorCode } from '../errors';
import { SubscriptionService } from '../service';
import {
  SUBSCRIPTION_TABLE,
  createSqliteSubscriptionStore,
  ensureSubscriptionSchema,
} from '../store';
import type {
  BillingPeriod,
  Subscription,
  SubscriptionBilling,
  SubscriptionBillingContext,
  SubscriptionBillingResult,
  SubscriptionPricing,
  SubscriptionSkip,
} from '../types';

const INSTITUTION = asId<'institution'>('inst-1');
const LEARNER = asId<'learner'>('learner-1');
const LEARNER_TWO = asId<'learner'>('learner-2');
const FEE_ITEM = asId<'fee_item'>('item-transport');
const FEE_ITEM_LUNCH = asId<'fee_item'>('item-lunch');
const SCHEDULE = asId<'fee_schedule'>('schedule-1');
const OTHER_SCHEDULE = asId<'fee_schedule'>('schedule-2');
const PERIOD = asId<'academic_period'>('period-1');

/** Term 1, 2027: 2027-01-05 to 2027-03-25, eighty days. */
const TERM_1: BillingPeriod = { start: '2027-01-05', end: '2027-03-25' };
/** Term 2, 2027: 2027-04-05 to 2027-06-25. */
const TERM_2: BillingPeriod = { start: '2027-04-05', end: '2027-06-25' };

const kes = (minor: number) => fromMinor(minor, 'KES');

function line(feeItemId: Id<'fee_item'>, minor: number, overrides: Partial<ResolvedLine> = {}): ResolvedLine {
  return {
    feeItemId,
    amount: kes(minor),
    mandatory: false,
    frequency: 'per_term',
    dueDates: [],
    installmentPlanId: null,
    prorationRule: 'full',
    ...overrides,
  };
}

function pricing(lines: readonly ResolvedLine[], feeScheduleId: Id<'fee_schedule'> = SCHEDULE): SubscriptionPricing {
  return { feeScheduleId, version: 1, lines };
}

function contextFor(
  lines: readonly ResolvedLine[],
  period: BillingPeriod = TERM_1,
  feeScheduleId: Id<'fee_schedule'> = SCHEDULE
): SubscriptionBillingContext {
  return { period, pricing: pricing(lines, feeScheduleId) };
}

let sequence = 0;

function subscription(overrides: Partial<Subscription> = {}): Subscription {
  sequence += 1;
  return {
    id: `sub-${sequence}`,
    institutionId: INSTITUTION,
    learnerId: LEARNER,
    serviceKind: 'transport',
    serviceRef: 'transport-route:r1',
    feeItemId: FEE_ITEM,
    feeScheduleId: SCHEDULE,
    academicPeriodId: PERIOD,
    startsOn: '2027-01-05',
    endsOn: null,
    prorationRule: 'full',
    status: 'active',
    cancelledOn: null,
    cancellationReason: null,
    createdAt: '2027-01-01T00:00:00.000Z',
    updatedAt: '2027-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function billed(result: SubscriptionBillingResult): SubscriptionBilling {
  if (result.kind !== 'billed') throw new Error(`expected a billed result, got a skip: ${result.reason}`);
  return result;
}

function skipped(result: SubscriptionBillingResult): SubscriptionSkip {
  if (result.kind !== 'skipped') throw new Error('expected a skip, got a billed result');
  return result;
}

// ---------------------------------------------------------------- the billing seam

describe('the billing seam: what a subscription adds, and why', () => {
  const transport = () => line(FEE_ITEM, 420_000);

  it('bills the whole price when the rule is full', () => {
    const result = billed(billSubscription(subscription(), contextFor([transport()])));
    expect(result.feeItemId).toBe(FEE_ITEM);
    expect(result.price).toEqual(kes(420_000));
    expect(result.amount).toEqual(kes(420_000));
    expect(result.scheduleVersion).toBe(1);
    expect(result.proration).toEqual({
      rule: 'full',
      daysUsed: 80,
      daysInPeriod: 80,
      weeksUsed: 12,
      weeksInPeriod: 12,
    });
    expect(result.reason).toMatch(/whole price/);
  });

  it('prorates a mid-period start by days, through the money module', () => {
    const result = billed(
      billSubscription(
        subscription({ startsOn: '2027-02-15', prorationRule: 'pro_rata_days' }),
        contextFor([transport()])
      )
    );
    expect(result.price).toEqual(kes(420_000));
    expect(result.amount).toEqual(kes(204_750));
    expect(result.proration.daysUsed).toBe(39);
    expect(result.proration.daysInPeriod).toBe(80);
    expect(result.reason).toBe('pro rata by days: 39 of 80 days');
  });

  it('prorates a mid-period start by weeks', () => {
    const result = billed(
      billSubscription(
        subscription({ startsOn: '2027-02-15', prorationRule: 'pro_rata_weeks' }),
        contextFor([transport()])
      )
    );
    expect(result.amount).toEqual(kes(210_000));
    expect(result.proration.weeksUsed).toBe(6);
    expect(result.proration.weeksInPeriod).toBe(12);
  });

  it('splits at half term: the whole price before it, half after', () => {
    const before = billed(
      billSubscription(
        subscription({ startsOn: '2027-01-20', prorationRule: 'from_half_term' }),
        contextFor([transport()])
      )
    );
    const after = billed(
      billSubscription(
        subscription({ startsOn: '2027-02-15', prorationRule: 'from_half_term' }),
        contextFor([transport()])
      )
    );
    expect(before.amount).toEqual(kes(420_000));
    expect(after.amount).toEqual(kes(210_000));
  });

  it('bills nothing under `none` for a partial window, and the whole price for a full one', () => {
    const partial = skipped(
      billSubscription(
        subscription({ startsOn: '2027-02-15', prorationRule: 'none' }),
        contextFor([transport()])
      )
    );
    expect(partial.reason).toBe('not_billable_rule');
    const full = billed(
      billSubscription(subscription({ prorationRule: 'none' }), contextFor([transport()]))
    );
    expect(full.amount).toEqual(kes(420_000));
  });

  it('skips a subscription the schedule prices no line for', () => {
    const result = skipped(
      billSubscription(subscription({ feeItemId: FEE_ITEM_LUNCH }), contextFor([transport()]))
    );
    expect(result.reason).toBe('fee_item_not_priced');
    expect(result.detail).toMatch(/prices no line/);
  });

  it('skips a subscription priced from a schedule the run did not resolve', () => {
    const result = skipped(
      billSubscription(subscription(), contextFor([transport()], TERM_1, OTHER_SCHEDULE))
    );
    expect(result.reason).toBe('different_schedule');
  });

  it('skips a subscription that starts after the period and one that ended before it', () => {
    expect(
      skipped(billSubscription(subscription({ startsOn: '2027-04-01' }), contextFor([transport()])))
        .reason
    ).toBe('not_started');
    expect(
      skipped(
        billSubscription(subscription({ endsOn: '2027-01-01' }), contextFor([transport()]))
      ).reason
    ).toBe('ended');
  });

  it('returns one result per subscription, in the order given', () => {
    const results = billSubscriptions(
      [
        subscription({ serviceKind: 'transport' }),
        subscription({ serviceKind: 'lunch', feeItemId: FEE_ITEM_LUNCH }),
      ],
      contextFor([transport()])
    );
    expect(results).toHaveLength(2);
    expect(results[0].kind).toBe('billed');
    expect(results[1].kind).toBe('skipped');
    expect(billedOnly(results)).toHaveLength(1);
    expect(skippedOnly(results)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------- cancellation

describe('a cancellation’s stated effect', () => {
  it('leaves a period before it alone, prorates the period it falls in, and skips the periods after', () => {
    const active = subscription({ prorationRule: 'pro_rata_days' });
    const cancelled: Subscription = {
      ...active,
      status: 'cancelled',
      cancelledOn: '2027-02-28',
      cancellationReason: 'family moved',
    };
    const before: BillingPeriod = { start: '2027-01-05', end: '2027-02-05' };
    const line420 = () => line(FEE_ITEM, 420_000);
    const early = contextFor([line420()], before);
    const term1 = contextFor([line420()], TERM_1);
    const term2 = contextFor([line420()], TERM_2);

    // A period that ended before the cancellation is billed exactly as it was: the cancellation
    // does not reach back into what a run already billed.
    expect(billed(billSubscription(active, early)).amount).toEqual(kes(420_000));
    expect(billed(billSubscription(cancelled, early)).amount).toEqual(kes(420_000));

    // The period the cancellation falls in is prorated to the cancellation day.
    const term1After = billed(billSubscription(cancelled, term1));
    expect(term1After.amount).toEqual(kes(288_750));
    expect(term1After.proration.daysUsed).toBe(55);

    // The periods after it are skipped, with the reason named.
    const term2After = skipped(billSubscription(cancelled, term2));
    expect(term2After.reason).toBe('cancelled');
  });
});

// ---------------------------------------------------------------- the service and the store

const adapters: SqliteAdapter[] = [];

async function harness() {
  const adapter = createNodeSqliteAdapter({ filename: ':memory:', foreignKeys: true });
  await adapter.open();
  await ensureSubscriptionSchema(adapter);
  adapters.push(adapter);
  const store = createSqliteSubscriptionStore(adapter);
  let counter = 0;
  const service = new SubscriptionService({
    store,
    now: () => new Date('2027-01-01T00:00:00.000Z'),
    newId: () => {
      counter += 1;
      return `01930000-0000-7000-8000-0000000000${String(counter).padStart(2, '0')}`;
    },
  });
  return { adapter, store, service };
}

afterEach(async () => {
  while (adapters.length > 0) await adapters.pop()?.close();
});

async function refusalCode(run: () => Promise<unknown>): Promise<SubscriptionErrorCode> {
  try {
    await run();
  } catch (error) {
    if (isSubscriptionError(error)) return error.code;
    throw error;
  }
  throw new Error('the call was expected to be refused');
}

const baseInput = () => ({
  institutionId: INSTITUTION,
  learnerId: LEARNER,
  serviceKind: 'transport' as const,
  serviceRef: 'transport-route:r1',
  feeItemId: FEE_ITEM,
  feeScheduleId: SCHEDULE,
  academicPeriodId: PERIOD,
  startsOn: '2027-01-05',
});

describe('creating, reading and cancelling, on real SQLite', () => {
  it('creates a subscription, persists it and reads it back', async () => {
    const { adapter, service } = await harness();
    const created = await service.create(baseInput());

    expect(created.status).toBe('active');
    expect(created.endsOn).toBeNull();
    expect(created.prorationRule).toBe('full');
    expect(created.serviceRef).toBe('transport-route:r1');

    const read = await service.get(created.id);
    expect(read).toEqual(created);

    const rows = await adapter.all<{ id: string }>(`SELECT "id" FROM "${SUBSCRIPTION_TABLE}"`);
    expect(rows.map((row) => row.id)).toEqual([created.id]);
  });

  it('lists a learner’s subscriptions and answers the billing seam for them', async () => {
    const { service } = await harness();
    const transport = await service.create(baseInput());
    await service.create({ ...baseInput(), serviceKind: 'lunch', feeItemId: FEE_ITEM_LUNCH });
    // Another learner's subscription is not this learner's.
    await service.create({ ...baseInput(), learnerId: LEARNER_TWO });

    const listed = await service.list({ learnerId: LEARNER });
    expect(listed).toHaveLength(2);

    const results = await service.billableFor(
      LEARNER,
      contextFor([line(FEE_ITEM, 420_000), line(FEE_ITEM_LUNCH, 120_000)])
    );
    expect(results).toHaveLength(2);
    const transportResult = billed(results.find((r) => r.subscriptionId === transport.id)!);
    expect(transportResult.amount).toEqual(kes(420_000));
  });

  it('cancels a subscription without deleting it', async () => {
    const { adapter, service } = await harness();
    const created = await service.create(baseInput());
    const cancelled = await service.cancel(created.id, { on: '2027-02-28', reason: 'family moved' });

    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.cancelledOn).toBe('2027-02-28');
    expect(cancelled.cancellationReason).toBe('family moved');
    expect((await service.get(created.id)).status).toBe('cancelled');

    const rows = await adapter.all<{ id: string }>(`SELECT "id" FROM "${SUBSCRIPTION_TABLE}"`);
    expect(rows).toHaveLength(1);
  });

  it('refuses a subscription with an end before its start', async () => {
    const { service } = await harness();
    expect(
      await refusalCode(() => service.create({ ...baseInput(), endsOn: '2027-01-04' }))
    ).toBe('ends_before_starts');
  });

  it('refuses a subscription with no price: no fee item at all', async () => {
    const { service } = await harness();
    expect(
      await refusalCode(() => service.create({ ...baseInput(), feeItemId: asId<'fee_item'>('') }))
    ).toBe('fee_item_required');
  });

  it('refuses an unknown service kind, a malformed date and an unknown proration rule', async () => {
    const { service } = await harness();
    expect(
      await refusalCode(() =>
        service.create({ ...baseInput(), serviceKind: 'swimming' as never })
      )
    ).toBe('service_kind_invalid');
    expect(
      await refusalCode(() => service.create({ ...baseInput(), startsOn: '5 January 2027' }))
    ).toBe('date_invalid');
    expect(
      await refusalCode(() =>
        service.create({ ...baseInput(), prorationRule: 'pro_rata_terms' as never })
      )
    ).toBe('proration_rule_invalid');
  });

  it('refuses a cancellation of a missing, already-cancelled or not-yet-started subscription', async () => {
    const { service } = await harness();
    expect(await refusalCode(() => service.cancel('missing', { on: '2027-02-01' }))).toBe(
      'not_found'
    );

    const created = await service.create(baseInput());
    await service.cancel(created.id, { on: '2027-02-28' });
    expect(await refusalCode(() => service.cancel(created.id, { on: '2027-03-01' }))).toBe(
      'already_cancelled'
    );

    const later = await service.create({ ...baseInput(), startsOn: '2027-05-01' });
    expect(await refusalCode(() => service.cancel(later.id, { on: '2027-04-01' }))).toBe(
      'cancelled_before_start'
    );
    expect(await refusalCode(() => service.cancel(later.id, { on: 'not a day' }))).toBe(
      'date_invalid'
    );
  });

  it('stores no amount: the price is always the schedule’s', async () => {
    const { adapter, service } = await harness();
    await service.create(baseInput());
    const columns = await adapter.all<{ name: string }>(
      `PRAGMA table_info("${SUBSCRIPTION_TABLE}")`
    );
    const names = columns.map((column) => column.name);
    expect(names).not.toContain('amount');
    expect(names).not.toContain('price');
    expect(names).not.toContain('amount_minor');
  });
});
