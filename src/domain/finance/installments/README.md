# The installment-plan module

An **installment plan** is the canonical `installment_plan` entity of spec 05 §3: a name, an optional
academic period, and a list of dated percentages. A `fee_schedule_line` names one through its own
`installment_plan_id` column. This module is the rules and the arithmetic around those rows: it
validates a plan, splits a schedule line's own amount by it, and reads the state an installment is
in. It is not a second model — every row is the entity's own, and every read and write goes through
the canonical repository.

```ts
import { InstallmentPlanService } from '@/domain/finance/installments';

const service = new InstallmentPlanService({ store: repository });
const plan = await service.create({
  institutionId,
  name: 'Term 1 three-part plan',
  academicPeriodId,
  installments: [
    { sequence: 1, dueDate: '2027-01-05', percent: 50 },
    { sequence: 2, dueDate: '2027-02-20', percent: 30 },
    { sequence: 3, dueDate: '2027-03-20', percent: 20 },
  ],
});

// The line's own amount is the total; the plan only says how it is divided.
const split = await service.installmentsForScheduleLine(lineId);
// split.source === 'plan'; split.installments is three dated amounts that sum to the line's amount.
```

## What already existed, and what this module adds

The canonical finance model already carried the plan and the link to it:

- `installment_plan` — `name`, `academic_period_id`, and `installments: [{ sequence, due_date,
  percent }]`;
- `fee_schedule_line.installment_plan_id` — the column a line names a plan with — and
  `fee_schedule_line.due_dates`, the dates a line pins without a plan;
- `src/modules/finance/pages/FeesInstallmentsPage.tsx` — the screen that creates and edits a plan's
  dated percentages.

What it did **not** carry, and this module adds:

- the **splitting arithmetic**: an equal split through the money module's largest-remainder
  allocator, and a percentage split through its rational multiply with a named rounding mode;
- the **validation** a plan needs to be a split of a whole (percentages summing to 100, sequences
  unique, due dates real calendar days, percentages held to basis points);
- the **derivation** that turns a schedule line's amount and a plan into dated amounts;
- the **state** of an installment (scheduled, due, overdue, paid), read without touching the amount.

No table was added. The module reads and writes the canonical `installment_plan` and
`fee_schedule_line` rows through the repository.

## The splitting rule

A plan divides a total. Two splits are offered, and both **sum to the total exactly**.

### Equal, through the allocator

`splitEqually(total, count)` is `allocateEqually`, the money module's largest-remainder allocator:
each part takes the floor of its exact share, and the minor units the floors leave go one each to the
earliest installments. The odd unit therefore lands **deterministically on the first installment**:

| Total | Parts | Result |
| --- | --- | --- |
| 100.00 KES into 3 | | 33.34, 33.33, 33.33 |
| 0.01 KES into 3 | | 0.01, 0.00, 0.00 |
| 100,000 UGX into 3 | | 33,334, 33,333, 33,333 |

### By declared percentages, through the rational multiply

`splitByPercentages(total, percentages, rounding)` scales the total by each percentage through
`multiplyRational`, so the **rounding mode the caller names is applied explicitly** — there is no
default inside the split. Every part but the last is rounded; **the last installment is the total
less the parts before it**, so the parts always sum exactly and the minor unit the rounding leaves
lands deterministically on the final installment. A split that would drive an installment below zero
is refused (`negative_installment`) rather than written.

| Total | Percentages | `half_up` | `down` |
| --- | --- | --- | --- |
| 100.00 KES | 33.33 / 33.33 / 33.34 | 33.33, 33.33, 33.34 | — |
| 0.01 KES | 33.33 / 33.33 / 33.34 | 0.00, 0.00, 0.01 | — |
| 0.05 KES | 33.33 / 33.33 / 33.34 | 0.02, 0.02, 0.01 | 0.01, 0.01, 0.03 |
| 100,000 UGX | 33.33 / 33.33 / 33.34 | 33,330, 33,330, 33,340 | — |

A percentage is held in **basis points**, so `7.5` is exactly `750`. A percentage that needs more
than two decimals cannot be held exactly and is refused (`percent_precision`) rather than rounded
silently — the same rule the fee-schedule uplift applies.

## A late installment is a state, not a change to the amount

`installmentStatus(dueDate, asOf, paidOn?)` returns `scheduled`, `due`, `overdue` or `paid` from the
due date and the day it is read. It never touches the amount: the money an installment is for is the
same before and after it falls overdue. The test asserts exactly that.

## How a plan meets the schedule line's own column

The line owns the amount and the plan owns the division, and this module joins them without
duplicating either:

1. the line names an `installment_plan_id` → the plan's dated percentages split the line's `amount`;
2. the line names no plan but pins its own `due_dates` → the amount is split **equally** across those
   dates (the odd unit first);
3. the line names neither → it is a single undated charge and is returned whole, not split.

The plan carries **no money**, so one plan splits a 6,000 tuition line and a 4,200 lunch line without
changing, and a plan can never drift from the price it splits.

## The refusals

| Rule | Refusal |
| --- | --- |
| a plan declares no installment | `no_installments` |
| a plan carries no name | `name_required` |
| a sequence is not a whole number at or above 1 | `sequence_invalid` |
| two installments share a sequence | `sequence_duplicate` |
| a due date is not an ISO calendar day | `due_date_invalid` |
| a percentage is below 0 or above 100 | `percent_invalid` |
| a percentage needs more than two decimals | `percent_precision` |
| the percentages do not sum to 100 | `percentages_do_not_sum` |
| a percentage split drives an installment below zero | `negative_installment` |
| the installment count is not a whole number at or above 1 | `installment_count_invalid` |
| the total is not a Money value | `amount_not_money` |
| the schedule line does not exist | `schedule_line_not_found` |
| the plan does not exist | `plan_not_found` |

## The tests

`__tests__/installments.test.ts` runs the pure splits (including the awkward cases above and the two
rounding modes) and, on a real SQLite database through the canonical repository: a plan created and
read back, the refusal of a plan that does not sum (asserting nothing was written), a line split by
the plan it names, a line split equally across its own due dates, a line returned whole, and every
refusal.

## Gaps

- The module reads and writes the canonical `installment_plan` rows, so it needs no migration. It
  does not model a **per-learner** promise-to-pay agreement (spec 05 §3), which is a different
  entity: a plan is per schedule, and a learner's own dates would need a new canonical entity.
- It computes the installments; it does not post them. The billing run (P3-C01) reads
  `installmentsForScheduleLine` and raises the dated invoice lines.
