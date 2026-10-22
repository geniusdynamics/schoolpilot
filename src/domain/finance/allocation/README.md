# The allocation engine

Given a payment (or a credit note) and a learner's outstanding invoice lines, the engine produces an
**allocation plan**: how much of the payment goes to which line, with a trace explaining every
amount. It is pure — it mutates nothing. Applying the plan is the caller's job, and posting it is the
ledger's (P3-A02).

```ts
import { planAllocation, applyAllocationPlan } from '@/domain/finance/allocation';

const plan = planAllocation({
  source: { id: 'pay-1', kind: 'payment', amount: money(500_00, 'KES'), learnerId: 'lrn-1' },
  items: outstandingLines, // invoice lines with their balances, from canonicalFinance's invoiceLineRows
  options: { strategy: 'oldest_first' },
});

plan.unallocated; // the payment's leftover, which becomes learner credit
plan.trace;       // one line per decision: strategy, tie-break, cap, credit, remainder
const after = applyAllocationPlan(outstandingLines, plan); // the lines, reduced
```

Every amount is a `Money` from `@/domain/money`, an integer count of minor units and a currency.
No major-unit `number` decides an amount anywhere here. All the splitting runs through the money
module's `allocate` (largest remainder), so parts always sum exactly.

## Strategies

Each strategy is a pure function of `(amount, outstanding items, options)`. `oldest_first` is the
default.

| Strategy | Semantics | Ordering & tie-breaks | Trace fields |
| --- | --- | --- | --- |
| `oldest_first` | Fill the oldest line up to its balance, then the next, until the money runs out. | Invoice date, then due date, then the line's order on its invoice, then the item id. A missing due date sorts last. | `ordering: 'invoice_date'`, `tieBreak`, `capped`, `fullyCovered` |
| `vote_head_priority` | Fill by the fee items' declared priority (spec 05 §2.1), oldest invoice first within a priority. | `fee_item.priority` ascending; `null`/unknown sorts last; ties by the oldest-first keys. | `ordering: 'vote_head_priority'`, `tieBreak` (`vote_head_priority` or the oldest-first key) |
| `proportional` | Split the money across every outstanding line in proportion to its balance. | None — the split is `allocate(need, balances)`. The line that took a largest-remainder unit says so. | `ordering: 'proportional_share'`, `tieBreak: 'largest_remainder'` where it applies, `weightMinor`, `weightSumMinor` |
| `manual` | The caller names `(item, amount)` pairs; each is validated. The remainder is governed by the stated policy. | The caller's order. | `ordering: 'manual'`, and `'manual_remainder'` for the remainder line |

The vote-head priority comes from a `VoteHeadPriorityLookup` the caller supplies; the engine holds
no table of its own (P3-B01 lands that configuration in parallel).

### Manual validation

`allocateManually` refuses, with an `AllocationError` code:

- `unknown_item` — an instruction names a line that is not outstanding;
- `duplicate_item` — the same line is named twice;
- `non_positive_amount` — an amount is zero or negative;
- `manual_exceeds_item` — an amount exceeds its line's balance;
- `manual_exceeds_payment` — the instructions together exceed the money available;
- `currency_mismatch` — an amount is in another currency;
- `missing_manual_plan` — `manual` was asked for without a plan.

The remainder policy is stated by the caller and is one of: `leave_unallocated` (it becomes learner
credit — the spec's rule), `refuse` (`manual_remainder` when money is left), `to_item` (one named
line takes it, `manual_remainder_item` if it cannot), or `spill` (another strategy takes it).

## Credits

A credit note or an over-payment is a credit balance that can be applied later. A plan consumes
existing credits as well as the incoming payment, in the order `options.creditOrder` states:

- `payment_first` (**the default**): the payment is exhausted before any credit is touched;
- `credit_first`: credits are consumed first, so the payment may stay unallocated.

`plan.credits` lists the credits consumed and how much of each; `plan.unusedCredits` lists the rest.
`plan.unallocated` is the **payment's** leftover, which becomes learner credit (spec 05 §5.3).

## Household split

`planHouseholdAllocation` divides one payment across siblings and then plans each sibling's own
lines:

```ts
const household = planHouseholdAllocation({
  source: { id: 'pay-9', kind: 'payment', amount: money(1_200_00, 'KES') },
  members: [
    { learnerId: 'lrn-1', items: aminaLines, credits: aminaCredits },
    { learnerId: 'lrn-2', items: brianLines },
  ],
  split: { kind: 'proportional' }, // or 'equal', or { kind: 'manual', shares: {...} }
  options: { strategy: 'oldest_first' },
});
```

The split itself runs through `allocate`, so the shares sum to the payment exactly. `household.shares`
reports each sibling's share; `household.plans` holds one plan per sibling; `household.unallocated`
is what no sibling could absorb. A duplicate learner is refused (`duplicate_member`), and a manual
share that is negative or not finite is refused (`invalid_share`).

## Sum invariants

Property-tested with seeded fast-check (`__tests__/allocation.property.test.ts`), the same shape as
the money module's suites:

1. **Conservation.** `allocatedFromPayment + unallocated == payment`, exactly, in every plan.
2. **No over-allocation.** No line is allocated beyond its balance, and no allocation is negative;
   per-line sums are within the line's balance.
3. **Covered and excess.** A payment that covers every line leaves `unallocated == 0`; a payment
   larger than the debt leaves exactly the excess.
4. **Re-planning and re-applying.** The plan is deterministic: the same input always yields the
   same plan. Applying a plan to lines that no longer carry the balance is **refused**
   (`plan_exceeds_balance`) — the engine never pushes a line below zero, which is the repository's
   over-allocation invariant, in the small; an empty plan is a no-op.
5. **Order does not change the total.** For the deterministic strategies, shuffling the input items
   changes the distribution but not the total allocated.
6. **Proportional sums exactly.** Even when a share is a repeating decimal (`1/3` of a shilling),
   the parts sum to the money placed — the money module's `allocate` guarantee, exercised through
   the engine.

## Applying a plan

`applyAllocationPlan(lines, plan)` returns the lines with reduced balances. It refuses
(`plan_exceeds_balance`) rather than over-allocate, and it writes nothing.

## The module

| File | Holds |
| --- | --- |
| `types.ts` | The inputs, the strategies, the plan and the trace. |
| `errors.ts` | `AllocationError` and its codes. |
| `order.ts` | The ordering rules and the tie-break that placed an item. |
| `strategies.ts` | The four pure strategies and their validation. |
| `plan.ts` | `planAllocation`, the source waterfall and `applyAllocationPlan`. |
| `household.ts` | The household split. |
| `index.ts` | The public API. |
