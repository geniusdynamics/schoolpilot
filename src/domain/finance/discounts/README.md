# The discounts, bursaries and sponsorships module

A **discount** is a rule that reduces what a learner owes (spec 05 §2.3). This module evaluates the
rules a bill is subject to, splits the bill between the family and its sponsors so the parts sum to
it exactly, tracks a programme's budget, and exposes the pure seam a billing run calls.

```ts
import { planLearnerBill, siblingRule, planSplit } from '@/domain/finance/discounts';

const plan = planLearnerBill({
  learnerId: 'lrn-brian',
  institutionId: 'inst-1',
  currency: 'KES',
  period: { periodId: 'term-1-2027', on: '2027-02-15' },
  lines: billLines,
  rules: [siblingRule({ id: 'rule-sibling', name: 'Sibling discount', basis: { kind: 'percent', percent: 0 } })],
  facts: { isStaffWard: false, siblingRank: 2 },
});

plan.schoolDiscountTotal; // the contra-revenue the school forgoes
plan.learnerBill;         // what the family and its sponsors owe
plan.split.shares;        // the family's residual and each sponsor's part, summing to learnerBill
plan.trace;               // why each decision was made
```

## What already existed, and what this module adds

The canonical registry already held the two entities this is about:

- **`discount_rule`** (`src/domain/schema/finance.ts`) - name, `kind` (`percent` | `fixed`), `value`,
  `fee_item_ids`, a `conditions` JSON object, and a `funding_source` of `school`, `government`,
  `county_bursary`, `ngo`, `church`, `alumni` or `other`.
- **`sponsorship`** - name, `sponsor_name`, `funding_source`, `fee_item_ids`, `coverage_percent`,
  `starts_on`, `ends_on`.

The finance module already had the screens (`FeeAdjustmentsPage` records a discount as a credit
note, `ScholarshipTrackingPage` the legacy scholarship tracker, `FeeRulesPage` the hub), the funding
sources of a fee item (`parent`, `bursary`, `sponsor`, `government_capitation`, `government`, from
P3-B01), and the ledger derivations that post a negative invoice line or a credit note
(`invoiceEntry`, `creditNoteEntry` of P3-A02).

What was missing, and what this module adds:

- an **engine** that reads a rule's basis, scope, period, precedence and reason, and applies it;
- the **sibling policy** as a configurable tier list rather than a constant;
- the **split-billing** engine, which divides a bill between the family and its sponsors exactly;
- the **budget** tracking a bursary programme needs;
- the **billing seam** a run calls, and the **service** that reads the canonical rows into it.

No canonical column was added. Everything the canonical entities do not carry - the period, the cap,
the precedence, the sibling tiers - is read from the `conditions` object the schema already provides,
and the repository's own fixture already uses it (`conditions: { sibling_rank: 2 }`).

## The discounts

| Rule | Basis | Scope | Period | Reason on the bill |
| --- | --- | --- | --- | --- |
| **Sibling** | the policy's tier for the learner's rank, as a percentage or an amount | the fee items the rule names, by code or id; the spec's example is tuition | `startsOn` / `endsOn` / `periodIds` | `Sibling discount on tuition` |
| **Staff ward** | a percentage or an amount | the fee items it names | the same | `...: a member of staff's child` |
| **Bursary** | a percentage or an amount, **possibly capped** | the fee items it names | the same | `...: a bursary awarded to this learner` |
| **Scholarship** | a percentage (100 is a full one) or an amount | the fee items it names | the same | `...: a scholarship awarded to this learner` |
| **Early settlement / pay in full / other** | either | the fee items it names | the same | the rule's own reason |

**Basis.** A percentage is read as basis points (`33.33` is `3333`) and scaled through the money
module's `multiplyRational` with an explicit rounding mode (`half_up` unless the caller states
otherwise), so a percentage of an odd amount lands on a whole minor unit deterministically. An
absolute amount is a `Money`. Either may carry a **cap**, the ceiling the spec's bursaries ask for;
when the cap does the work the applied discount reports `basis: 'cap'` and `capped: true`.

**Scope, and the fee item's own funding source.** A discount reduces what the **learner owes**. A
fee item whose own `funding_source` is not `parent` is funded by that source - capitation, a bursary,
a sponsor - so the family owes nothing on it and a discount that touches only `parent` items
discounts nothing there. The trace says so. A caller that means to discount another source's items
names them in `scope.fundingSources`.

**Precedence.** `precedence` is a whole number, applied lowest first, ties broken by rule id so the
order is total and the same bill always discounts the same way. The defaults are the spec's own
order: scholarship 10, bursary 20, staff ward 30, sibling 40, early settlement 50, pay in full 60,
other 70.

**Stacking.** `options.stacking` is one of `apply_all` (the default: every applicable rule, in
precedence order), `highest_only` (only the largest single discount on a line, ties by precedence),
or `refuse` (a second rule on a line is refused with `discount_stack_refused`). A rule marked
`exclusive` refuses to share its line with any other rule, whatever the policy.

**The no-exceed rule.** Each rule takes its basis of the line's **remaining** amount, so two rules
never discount the same shilling twice, and the discount is **capped at what is left**: it can never
exceed the amount it discounts. A 10,000 bursary on a 6,000 tuition lands as 6,000, `capped: true`,
and the line nets to zero rather than going negative. A percentage above 100, a non-positive amount
and a cap that is not `Money` are refused by name.

## Split billing

A bill is split between **exactly one family payer** and zero or more sponsors. A sponsor states
**either** an agreed share (a percentage of the bill, at most two decimals) **or** an agreed amount
(a `Money`). The family takes the **residual**.

```
planSplit(27,500 KES, [family, county 40 %, NGO 5,000 KES])
  county  11,000   (share)
  NGO      5,000   (agreed_amount)
  family  11,500   (residual)
  ────────────────
  total   27,500   exactly
```

**Exactness.** The split runs through the money module's `allocate`, so the parts always sum to the
bill exactly and the odd minor unit goes to the largest remainder, in payer order when the remainders
tie. `planSplit` re-sums its own output and raises `split_does_not_sum` rather than returning parts
that do not add up - an invariant, not a policy. A bill of 100,001 across two 33.33 % sponsors and
the family gives 33,330 / 33,330 / 33,341: the odd unit is the family's, and it is the same every
time. The family's weight is derived from the sponsors' shares (`10000 - sum(basis points)`), never
subtracted as a float, so a decimal percentage cannot drift.

**Refusals.** No family payer or two of them (`split_family_invalid`); shares adding up to more than
the bill (`split_share_exceeds_bill`); a sponsor whose agreed amount the family's residual cannot
absorb (`split_sponsor_exceeds_bill`); a share that is not a percentage of at most two decimals, or
an amount in another currency.

**How a sponsor's share posts.** It is money that arrives from a third party, so it does **not**
reduce the family's bill and nothing posts as revenue on the learner's behalf until it is received.
The school issues the learner invoice for the residual and a **sponsor invoice** for the sponsored
part; that invoice is the sponsor's receivable (`sponsor_receivable_on_invoice_cleared_on_receipt`),
and the ledger's `paymentEntry` clears it when the sponsor's money arrives.

**Underpayment.** `settleSponsors` reports what each sponsor paid against its share.
`learnerBalanceEffect` is zero and the shortfall sits against the **sponsor** under the default
`sponsor_liability` policy: the learner owes only the residual, and a sponsor that does not pay does
not move the learner's balance. A school whose agreement makes the family guarantee the sponsored
part states `family_liability`, and the shortfall moves onto the learner's balance instead. Both are
tested, including a sponsor that pays nothing at all.

## The budgets

A bursary or discount programme has a budget for a period. **The platform models no budget entity**
- spec 05 §8 names the budget-versus-actual report but not the entity, and the accounting reports
already take the budget as a stored figure the caller supplies. This module does the same:
`DiscountBudget` is `{ programmeId, name, fundingSource, amount, committed }`, where `amount` is the
budget and `committed` is what the caller has already recorded against the programme in the period.
`budgetStatus` reports `committedBefore`, `proposed`, `committedAfter`, `remaining`, `overspend` and
`withinBudget`, and says where the figure came from (`BUDGET_SOURCE`).

A discount reaches a programme by its **funding source**: a county bursary's budget tracks every
county-bursary discount. `budgetStatuses` maps the plan's discounts onto the budgets that way and
reports a programme no discount draws on at zero proposed, so a screen never hides a fund.

**The overspend policy is `warn` by default: the bill is allowed and the overspend is recorded.**
A school tracks a bursary fund to report against it (spec 05 §2.3 asks for budget *tracking*), not to
turn a learner away at the counter because the fund is momentarily exhausted. `allow` records it
silently; `refuse` makes the engine raise `budget_exceeded`, naming the programme and the overspend,
so a school that chooses to enforce a fund cannot post past it. All three are tested.

## The billing interface

```ts
planLearnerBill(input: LearnerBillInput): LearnerBillPlan
```

**Pure** - it reads what it is given and writes nothing. A billing run (P3-C01) loads the rules, the
sponsorships and the budgets and calls this, then posts the plan: the learner invoice carries the
family's residual and a negative line per school-funded discount, and each sponsor share is its own
sponsor invoice.

| Input | What it is |
| --- | --- |
| `learnerId`, `institutionId`, `currency` | who the bill is for |
| `period` | `{ periodId?, on }` - what the rules' periods are matched against |
| `lines` | the fee items billed, each with its own `fundingSource` |
| `rules` | the discount rules, as `discountRuleFromRow` reads them |
| `sponsorships` | the agreements in force for this learner (the run resolves them from the learner's enrolment) |
| `facts` | `{ isStaffWard, siblingRank?, awardRuleIds? }` - what reaches the learner |
| `budgets` | the stored budget figures, optional |
| `family` | the residual payer's id and name, optional |
| `options` | `stacking`, `sponsorRisk`, `rounding`, `budgetOverspend` |

| Output | What it is |
| --- | --- |
| `lines` | per fee item: `gross`, `learnerPayable`, `externallyFunded`, the applied `discounts` and the `net` |
| `grossBill`, `externallyFunded`, `schoolDiscountTotal`, `awardTotal` | the bill's arithmetic |
| `learnerBill` | the base of the split: what the family funds, less the discounts the school forgoes |
| `split`, `familyShare`, `sponsorShares` | the parts, summing to `learnerBill` exactly |
| `sponsorRisk` | who carries a sponsor's shortfall, as the run will settle it |
| `budgets` | each programme's status |
| `trace` | every decision, in the order it was made, as a bursar reads it back to a parent |

**An award a third party funds is not a reduction of the family's bill.** A bursary whose funding
source is `county_bursary`, `ngo`, `government` and so on is money that third party pays, so it
becomes a **sponsor share** on the split (`source.kind: 'award'`) and the family's invoice is the
residual. A discount whose funding source is `school` is the school forgoing revenue: it reduces the
family's bill and becomes the negative line the spec asks for.

## The canonical seam and the service

`discountRuleFromRow` decodes a canonical `discount_rule` row into the rule the engine applies, and
`discountRuleToRow` encodes one back; `sponsorshipFromRow` / `sponsorshipToRow` do the same for a
sponsorship. The keys the decoder reads out of `conditions` are listed in `CONDITION_KEYS`; a rule
whose conditions name no kind is a plain discount, and a row carrying `sibling_rank` or
`sibling_tiers` is the sibling rule the repository's own fixture writes.

`DiscountService` is a thin seam over those: `listRules`, `listSponsorships`, `createRule`,
`createSponsorship`, `applicableRules`, and `planBill`, which loads the institution's rules, the
sponsorships the caller names and the currency the canonical rows do not carry, then calls the pure
seam. The learner-to-sponsorship link is the canonical `enrolment.sponsorship_id`, which the caller
resolves; the service loads exactly the sponsorships it is given, so one learner's sponsorship is
never applied to another's bill.

## The module

| File | Holds |
| --- | --- |
| `types.ts` | the vocabulary: rules, basis, scope, period, the split, the budgets, the plan |
| `errors.ts` | `DiscountError` and its codes |
| `rules.ts` | validation, applicability, the basis arithmetic, precedence, stacking, the no-exceed cap |
| `siblings.ts` | the sibling policy, the ranking, the staff-ward, bursary and scholarship builders |
| `split.ts` | the split engine, the sponsor shares, the settlement of an underpayment |
| `budget.ts` | the stored budget figure, the committed figure, the overspend policy |
| `billing.ts` | `planLearnerBill`, the seam a billing run calls |
| `canonical.ts` | the decode and encode between the canonical rows and the engine |
| `service.ts` | `DiscountService`: the repository seam |
| `fixtures.ts` | the spec's bill, the sibling household, the sponsor split, the capped bursary |
| `index.ts` | the public API; a caller imports from here |

## The tests

| File | Guards |
| --- | --- |
| `__tests__/discounts.test.ts` | every basis and its refusals, the cap, precedence, the stacking policies, scope and the fee item's funding source, the period |
| `__tests__/siblings.test.ts` | the sibling fixture's exact shillings per child, the ranking, a school's own tiers, the staff-ward rule |
| `__tests__/split.test.ts` | the sponsor split fixture's exact shillings, the allocator's odd unit, every refusal, the underpayment under both policies |
| `__tests__/budget.test.ts` | the committed figure against the budget, the overspend and the three policies |
| `__tests__/billing.test.ts` | the seam's output: the fixture, an award as a sponsor share, an externally funded line, a scoped sponsorship, the budget interaction |
| `__tests__/service.test.ts` | the canonical round-trip and `planBill`, against a **real SQLite** database |

## Not here

- **No page.** The existing screens (`FeeAdjustmentsPage`, `FeeRulesPage`) already record a discount
  and a credit note through the canonical repository; this module is the engine behind them and the
  seam a billing run calls. Adding a page would mean adding a route, which is P3-C01's surface.
- **No budget entity.** The budget is the stored figure the caller supplies, as the accounting
  reports already do. A canonical budget table would be an additive schema change the spec does not
  ask for, and is reported rather than made.
- **The learner-to-sponsorship link is not read here.** It is the canonical
  `enrolment.sponsorship_id`; the service takes the ids it is given.
- **`discount_rule.value` is a major-unit `number`.** The canonical column predates the money module.
  A fixed amount is written as its exact decimal text (`toDecimalString`) and read back with
  `fromMajor`, so the round trip is exact for the currency's own precision; a stored value carrying
  more precision than the currency holds is refused by name rather than rounded silently.
