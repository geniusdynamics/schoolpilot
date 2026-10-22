# The fee-item (vote head) module

A **fee item** is a vote head: the thing a school bills. It is the canonical `fee_item` entity of
spec 05 §2.1, and this module is the service, the rules and the GL seam around it. It is not a
second model: the fields are the entity's own (`code`, `name`, `revenue_account_code`, `category`,
`refundable`, `taxable`, `priority`, `funding_source`), and every read and write goes through the
canonical repository.

```ts
import { FeeItemService } from '@/domain/finance/feeItems';

const service = new FeeItemService({ repository });
const item = await service.create({
  institutionId,
  code: 'tuition',
  name: 'Tuition',
  category: 'tuition',
  revenueAccountCode: '4000',
  priority: 1,
  fundingSource: 'parent',
});
// item.code is 'TUITION': a code is trimmed and upper-cased into its canonical form.
```

## What already existed, and what this module adds

The `fee_item` entity already carried the code, the name, the revenue account, the category,
`refundable`, `taxable`, the priority and the funding source. What it did not carry, and this
module adds:

- a **service** with the rules below, on top of the repository's own schema validation;
- two **funding sources**: `bursary` and `government` (see below);
- the **GL seam** the posting engine reads;
- the **allocation order** the allocation engine reads.

## Funding sources

`funding_source` is a declared list, and it is the canonical list, not a second vocabulary:

| Value | Who funds the item |
| --- | --- |
| `parent` | the learner's family (the owner's "learner") |
| `bursary` | a bursary or scholarship (added by P3-B01) |
| `sponsor` | a sponsor |
| `government_capitation` | the government's per-learner grant, FPE / FDSE (the owner's "capitation") |
| `government` | a government grant that is not capitation (added by P3-B01) |

`bursary` and `government` were added to `FEE_FUNDING_SOURCES` in `src/domain/schema/finance.ts`.
The column is TEXT with no CHECK constraint, so the widening changes no table and no stored row; it
is the one canonical-schema change this task made, and it is recorded here rather than made
silently. The spec's own spellings (`parent`, `government_capitation`) are kept because migration
005 and the demo seed already wrote them.

## The GL mapping

`fee_item.revenue_account_code` is the account a posting for the item credits. An invoice line on
the item debits the institution's receivables control (not per item) and credits this account, so
the item names the revenue side only.

```ts
import { glMappingOf } from '@/domain/finance/feeItems';

const mapping = glMappingOf(item);      // { revenue_account_code: '4000' | null }
```

`FeeItemGlMapping` is the interface the posting engine of **P3-A02** consumes: it reads the mapping
of the row it is posting for and credits `revenue_account_code`, resolving the institution default
when it is `null`. The interface is one field on purpose, so a second side can be added later
without changing the caller.

The chart of accounts is not modelled yet (the accounts land with the P3 ledger, P3-A02), so
resolution is a port, `GlAccountDirectory`: a caller with a chart of accounts supplies
`{ has(code) }`, and a code that does not resolve is refused with `gl_account_unresolved`. Without a
directory only the **format** of a code is checked. The format rule always applies.

## Priority, and the order allocation follows

`priority` is a whole number at or above 0; allocation follows the **lowest number first**. The
service keeps it unique among the **active** items of an institution and refuses a duplicate with
`priority_taken`. When the caller names no priority, `nextFreePriority` gives the next free number,
so the order of the items a school already has never moves.

Legacy rows can still share a number (the fee migration and the demo seed write `1` for every
item), so the order is total and deterministic anyway:

```ts
import { orderFeeItemsForAllocation } from '@/domain/finance/feeItems';

// lowest priority first, then code, then id
const ordered = orderFeeItemsForAllocation(items);
```

`compareFeeItemsForAllocation` is the comparator **P3-D02** consumes for its `vote_head_priority`
policy.

## The rules, and what each refusal is called

| Rule | Refusal |
| --- | --- |
| the institution exists | `institution_missing` |
| its base currency is a currency of the table | `institution_currency_invalid` |
| the code is non-empty, ≤ 50 chars, `[A-Z0-9][A-Z0-9_]*` | `code_malformed` |
| the code is unique in the institution, including among deactivated items | `code_taken` |
| the name is non-empty | `name_required` |
| the category is declared | `category_invalid` |
| the funding source is declared | `funding_source_invalid` |
| the priority is a whole number ≥ 0 | `priority_invalid` |
| the priority is unique among active items | `priority_taken` |
| the GL account code is well formed | `gl_account_malformed` |
| the GL account code resolves, when a directory is given | `gl_account_unresolved` |
| the GL account code cannot be cleared once set | `gl_account_not_clearable` |
| an amount is a money value | `amount_not_money` |
| an amount is in the institution's currency | `amount_currency_mismatch` |
| an amount is a whole number of minor units of a currency of the table | `amount_invalid` |
| a referenced item cannot be deactivated | `fee_item_in_use` |
| the row exists | `not_found` |

A code is unique **including among deactivated items**: the canonical unique key on
`(institution_id, code)` is a plain unique index, so a soft-deleted row keeps its code and a code is
never reused. The service checks the same thing the database does, so the caller gets `code_taken`
rather than a storage conflict.

### Deactivation

A deactivation is a soft delete: the row stays, `deleted_at` is set, and it drops out of the default
reads. It is refused with `fee_item_in_use` while a `fee_schedule_line` bills the item, or while a
line of a **live** (non-void) invoice references it - the refusal names what holds it and what each
invoice still owes. `outstandingBalance(invoiceId)` is that arithmetic: the invoice total less every
allocation against it, exact in minor units through the frozen money module. An amount that is not
Money of the institution's currency is refused by name rather than summed.

The canonical column is optional but not nullable, so a GL account code can be set but never
cleared; naming `null` to clear it is refused with `gl_account_not_clearable` rather than ignored.
This is the repository's own documented limit on clearing an optional-but-not-nullable field.

## Not here

- The canonical `fee_item` carries **no amount of its own**: an amount lives on the
  `fee_schedule_line` a schedule writes for the item, and on the invoice lines it bills. So the
  amount rule above is applied to the Money the fee-item workflow handles, not to a stored field.
- The canonical `fee_item` carries **no description**: its `name` is its display text. Adding a
  `description` column would need an additive column sync in the repository's `setup()` (which
  today adds only the concurrency counter) or a numbered migration; neither is in this task's
  files, so the change is reported rather than made.
