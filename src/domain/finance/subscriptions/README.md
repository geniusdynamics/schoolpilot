# The subscriptions module

A **subscription** is a learner's recurring optional service for a period — transport on a route, a
lunch programme, a club, a trip, remedial classes (spec 05 §2.2). It is *learner × service × period*,
and it produces invoice lines in billing runs. This module is the model, the proration rules, the
store and the **billing seam** a billing run calls.

```ts
import { SubscriptionService, createSqliteSubscriptionStore } from '@/domain/finance/subscriptions';

const service = new SubscriptionService({ store: createSqliteSubscriptionStore(adapter) });

const subscription = await service.create({
  institutionId,
  learnerId,
  serviceKind: 'transport',
  serviceRef: 'transport-route:r1',
  feeItemId,          // the vote head the fee schedule prices
  feeScheduleId,      // the schedule version it prices from
  academicPeriodId,
  startsOn: '2027-02-15',
  prorationRule: 'pro_rata_days',
});
```

## What already existed, and what this module adds

The fee schedule and the fee items already existed and are what a subscription bills through:
`fee_item` (the vote head, with a `transport` / `meals` / `activity` category) and
`fee_schedule_line` (the price, with `frequency`, `due_dates` and `proration_rule`). The
`FeeScheduleService.resolveForBilling` already answers "what does this population pay for this fee
item" with the schedule version pinned.

What did **not** exist, and this module adds:

- the **subscription entity itself**: the canonical model has no `subscription` entity, so this
  module declares one — a learner, a service, a period, a fee item and a schedule, and **no amount**;
- the **proration rules** a mid-period start or a cancellation bills by, through the money module;
- the **billing seam**: a pure function that answers, for a learner and a period, what each
  subscription adds to their bill and why;
- the **store** (DDL, port and SQLite implementation) the service reads and writes through.

**Transport reuse, stated.** The canonical model has **no transport-route entity**. The legacy
`TransportRoute` in `src/modules/finance/data/useTransportRouteData.ts` is a stub with a numeric id
and no persistence, so it is not reusable. A transport subscription therefore carries the route as a
text reference (`serviceRef`, `transport-route:<id>`) alongside `serviceKind: 'transport'`, and the
price still comes from the fee schedule. When a canonical transport-route entity lands, `serviceRef`
is the column that points at it.

## The price is never typed in

A subscription stores **no amount**. The price is whatever the fee schedule it names prices the fee
item at for the learner's population, resolved by the billing run and passed into the seam. A
re-priced schedule therefore re-prices every subscription that bills through it, and a subscription
can never drift from the published prices. The table's own columns are asserted in a test: there is
no `amount`, `price` or `amount_minor` column.

## The billing seam (the acceptance)

A subscription is **billable in a run**. The pure function is the interface P3-C01 calls:

```ts
import { billSubscription, billSubscriptions } from '@/domain/finance/subscriptions';

const results = billSubscriptions(subscriptions, {
  period: { start: '2027-01-05', end: '2027-03-25' },
  pricing: {                       // exactly what resolveForBilling returns
    feeScheduleId,
    version: 2,
    lines: cell.lines,             // ResolvedLine[]
  },
});
```

Every result is either a **billing** or a **skip**:

```ts
// billed
{
  kind: 'billed',
  subscriptionId, learnerId, feeItemId, serviceKind, serviceRef,
  feeScheduleId, scheduleVersion,
  price:  Money,                   // the schedule price, before proration
  amount: Money,                   // what it adds to the bill for this period
  proration: { rule, daysUsed, daysInPeriod, weeksUsed, weeksInPeriod },
  reason: 'pro rata by days: 39 of 80 days',
}

// skipped
{ kind: 'skipped', subscriptionId, learnerId, feeItemId, serviceKind, reason, detail }
```

`SubscriptionService.billableFor(learnerId, context)` is the same answer with the store read for
you: it reads the learner's subscriptions (active and cancelled alike) and returns one result per
subscription. The run resolves the learner's cell once with `FeeScheduleService.resolveForBilling`
and passes it in, so a subscription is never re-priced by a second lookup.

**Skip reasons:** `not_started`, `ended`, `outside_period`, `cancelled`, `different_schedule`,
`fee_item_not_priced`, `not_billable_rule`.

## Proration

The rule a subscription declares is one of the schedule's own `PRORATION_RULES`. All arithmetic goes
through the money module's `multiplyRational`, with one named rule: **`half_up`**, exported as
`PRORATION_ROUNDING` (a half of a minor unit rounded away from zero — `up` over-charges the payer and
`down` under-charges the school on every mid-term joiner, so neither is a policy anyone chose).

| Rule | What it bills |
| --- | --- |
| `full` | the whole price, whenever in the period the subscription starts |
| `none` | the whole price only if the subscription covers the whole period; otherwise nothing |
| `pro_rata_days` | `price × daysUsed ÷ daysInPeriod`, rounded half-up |
| `pro_rata_weeks` | `price × weeksUsed ÷ weeksInPeriod`, whole weeks counting a partial week up, rounded half-up |
| `from_half_term` | the whole price for a start on or before the period's midpoint, half of it after |

The window is the subscription's own dates clamped to the period (both ends included). 4,200.00 KES
starting 2027-02-15 in a 2027-01-05..2027-03-25 term (80 days, 39 used) is 2,047.50 by days and
2,100.00 by weeks.

## Cancellation, and its stated effect on what was already billed

`cancel(id, { on, reason })` moves the row to `cancelled` and records the day. Nothing already billed
is touched: the invoices of periods that ended before the cancellation are what they were. The
cancellation reaches only forward —

- a period that **ended before** the cancellation is billed exactly as before;
- the period the cancellation **falls in** is prorated to the cancellation day (the window's end
  becomes the cancellation day);
- a period **after** it is skipped, with reason `cancelled`.

The tests assert all three. The module does not post a credit note or an adjustment invoice for a
period already billed: that is the billing run's job (spec 05 §4.4, P3-C01), and the module says so
rather than mutating a past amount.

## The refusals

| Rule | Refusal |
| --- | --- |
| the institution is missing | `institution_missing` |
| the learner is missing | `learner_required` |
| the fee item is missing (so nothing can price it) | `fee_item_required` |
| the service kind is not declared | `service_kind_invalid` |
| the proration rule is not declared | `proration_rule_invalid` |
| a date is not an ISO calendar day | `date_invalid` |
| the end is before the start | `ends_before_starts` |
| a cancellation is dated before the start | `cancelled_before_start` |
| the subscription is already cancelled | `already_cancelled` |
| the row does not exist | `not_found` |

"A subscription with no price" is covered from both ends: `fee_item_required` when no fee item is
named at all, and the billing seam's `fee_item_not_priced` skip when the resolved schedule prices no
line for the item.

## The store, and its one gap

`store.ts` declares the `subscription` table's DDL and `ensureSubscriptionSchema(adapter)` applies
it, exactly as the ledger and reconciliation modules declare their own tables. The **gap** is that
this table is not yet in `SCHEMA_MIGRATIONS` (`src/data/migrations/schemaMigrations.ts`), so it is
created by `ensureSubscriptionSchema` (what the tests call) but not by the startup path. Registering
it is one entry in that registry's list — a change outside this task's files — and is reported here
rather than made. Until then a billing run reads subscriptions through `SubscriptionStore`, which the
SQLite store satisfies.

## The tests

`__tests__/subscriptions.test.ts` runs the pure billing seam for every rule and every skip, the
cancellation's three effects, and, on a real SQLite database: a subscription created and read back,
a learner's subscriptions listed and billed through the service, a cancellation that leaves the row,
and every refusal by name. It also asserts the table carries no amount column.
