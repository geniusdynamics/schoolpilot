# The fee-schedule module

A **fee schedule** is a versioned, approved set of prices that apply to a population (spec 05
§2.2). It is the canonical `fee_schedule` / `fee_schedule_line` pair, and this module is the matrix,
the versioning, the copy-with-uplift, the maker-checker approval and the service around them. It is
not a second model: every row is the entity's own, and every read and write goes through the
canonical repository.

```ts
import { FeeScheduleService, createWorkflowApprovalGateway } from '@/domain/finance/schedules';

const service = new FeeScheduleService({
  store: repository,
  approvals: createWorkflowApprovalGateway(repository),
});

const cell = await service.resolveForBilling(scheduleId, { levelId, residence: 'boarder' });
// cell.feeScheduleId / cell.version pin the version the amounts came from.
// cell.lines is the exact Money of every fee item; cell.total is their sum in minor units.
```

## What already existed, and what this module adds

The canonical finance model already carried the schedule and its lines:

- `fee_schedule` — the name, academic year and periods, programmes, `level_ids`,
  `residence_statuses`, `fee_category_ids`, `campus_id`, `new_learners_only`, the business
  `version` and the `status`;
- `fee_schedule_line` — the fee item, the amount (`Money`), mandatory/optional, frequency, due
  dates, installment plan and proration rule.

What it did **not** carry, and this module adds:

- **Three cell-dimension columns on `fee_schedule_line`** — `level_id`, `residence_status` and
  `fee_category_id` (all optional). The header already named the dimensions a version spans; without
  these columns a line could not say which point of that space it prices, so the same fee item could
  not be priced differently for a Grade 10 boarder and a Form 3 day learner. `campus_id` stays on the
  header: a version belongs to one campus.
- **The matrix module** — `cellKeyOf`, `normalizeAddress`, `resolveCell`, `effectiveLineAddress`:
  deterministic cell resolution with named refusals.
- **The uplift** — `applyUplift` over the frozen money module, with one explicit rounding rule.
- **The maker-checker gateway** — the schedule's life bound to the workflow engine's
  `finance.fee_schedule_approval`, plus the one rule the engine's guard cannot carry (a maker may
  not approve their own submission).
- **The service and the editor page.**

### The schema change, stated plainly

`feeScheduleLineSchema` gained `level_id`, `residence_status` and `fee_category_id`, and
`feeScheduleLineEntity.storage` gained the two references (`level`, `fee_category`) and two indexes.
They are **optional**, so every existing row — the fee migration's and the demo seed's, which name no
cell — stays valid, and a null column means "the schedule's only value for that dimension". The
canonical DDL is CREATE-only, so a database created before this change keeps its old
`fee_schedule_line` and needs an additive `ALTER TABLE ... ADD COLUMN` before it can store a
multi-cell version; that is the same additive-column caveat the repository README records for the
concurrency counter. The gap is reported rather than papered over.

## The matrix

A version spans four dimensions, and each line prices one point of them:

| Dimension | Where it lives | Example |
| --- | --- | --- |
| level | `fee_schedule.level_ids`, `fee_schedule_line.level_id` | Grade 10, Form 3, Form 4 |
| residence | `fee_schedule.residence_statuses`, `fee_schedule_line.residence_status` | day, boarder |
| fee category | `fee_schedule.fee_category_ids`, `fee_schedule_line.fee_category_id` | citizen, staff child |
| campus | `fee_schedule.campus_id` | Main, Annex |

A cell key is `level|residence|category|campus`, with an absent dimension written empty. The key is
stable: the same address always keys the same cell, and `parseCellKey` reads it back.

### Resolving a cell, and its refusals

`resolveCell(header, lines, address)` never guesses:

- a dimension the caller **names** must be one the schedule declares → `cell_dimension_unknown`
  otherwise;
- a dimension the caller **omits** must be one the schedule declares exactly one value for; that
  value is the schedule's own, not a default. Zero values → `cell_dimension_undeclared`; several →
  `cell_ambiguous` (name it);
- a declared combination that **no cell prices** → `cell_missing`.

A stored line that names no level or residence belongs to the schedule's only value for it; when the
schedule spans several values and the line names none, its cell is unknowable and
`effectiveLineAddress` returns null rather than filing it under the first value.

## Versioning

A version is one `fee_schedule` row; a new version of the same matrix is a whole new row, never an
edit. The state a version is in is the row's `status` column, which is also the workflow engine's
state column — there is no second table to keep in step.

- **draft** — editable. `setCells` replaces the version's lines.
- **submitted** — with the checker.
- **approved** — **frozen**. `setCells` refuses with `version_immutable`. So is **published**, and
  so is **archived**.
- A correction to an approved or published version is a **new version derived from it**
  (`copyWithUplift` or a fresh `createVersion`), never an edit of the old one.

**What records the version a learner was billed from.** `resolveForBilling` returns the amounts
together with `feeScheduleId` and `version`, so a billing run can record the pair on the invoice. A
published version is immutable, so resolving the same cell after a newer version is published gives
the same amounts — which is what lets a historical invoice explain itself. **Gap:** the canonical
`invoice_line` has no `fee_schedule_id` column, so the billing run (P3-C01) needs one additive column
to record the version on the line itself; until then the resolution carries it and the invoice's own
description is the only place it can be pinned. Reported, not added here, because `invoice_line` is
that task's interface.

## Copy with uplift

`copyWithUplift(fromScheduleId, { version, uplift, actor })` copies every cell and line, then raises
each amount:

1. **percentage** — `amount × (10000 + basis points) ÷ 10000`, through `multiplyRational`, so the
   arithmetic is in `bigint` and never in floating point. A percent is held in basis points, so
   `7.5` is exactly `750`; more than two decimals is refused (`uplift_invalid`) rather than rounded
   silently.
2. **per-item absolute change** — a `Money` delta added after the percentage, keyed by fee item, and
   refused if its currency is not the line's.

**Rounding rule: `half_up`, and why.** A percentage of an amount is usually not a whole number of
minor units, and the money module refuses to round without a named rule. `half_up` is the rule a
bursar expects of a fee increase: the nearest minor unit, a half rounded away from zero. `up` would
systematically over-charge the payer and `down` would systematically under-charge the school, so
neither is a policy anyone chose. A school that wants another rule names it per copy
(`percentRounding`).

**Exactness.** `6,000.00 × 7.5% = 6,450.00` and `5,500.00 × 10% = 6,050.00` exactly; `0.10 × 5% =
0.105` rounds to `0.11` half-up and `0.10` half-down. The tests assert the copied cell totals, not
just the individual lines (`__tests__/uplift.test.ts`, `__tests__/service.test.ts`).

## Maker-checker approval

The workflow is the engine's `finance.fee_schedule_approval` (`src/domain/workflows`):

`draft → submitted → approved → published → archived`, with a rejection that goes back to `draft`
and **requires a reason**.

| Move | Guard | Who |
| --- | --- | --- |
| submit | `finance.write` | the bursar |
| approve | roles `head_teacher`/`administrator`/`accountant` **and** `fee_schedule.approve` | the checker |
| reject | `fee_schedule.approve`, `requires_reason` | the checker |
| publish | `finance.write` | the bursar |
| archive | `finance.write` | the bursar |

Nothing here re-implements those guards: `createRepositoryWorkflowStore` + `apply` run the engine's
`resolveMove`, write the state column and record the transition in the **repository's own audit
trail** (actor, before, after, reason, timestamp). `service.history(id)` reads it back.

**The maker rule.** The engine's guard cannot know who submitted — its conditions are over the
record's fields, not its audit. So `createWorkflowApprovalGateway` reads the engine's trail, takes
the actor of the newest `submitted` entry, and refuses an approval by that same actor with
`maker_cannot_approve`. `available()` also drops the approve move for the maker, so the editor does
not offer a move that will be refused. The rule is tested in `__tests__/service.test.ts` and driven
through the real gateway in the page test.

## Publishing

`publish` moves an approved version to `published` and archives any earlier published version of the
same matrix, so exactly one version is in force (`versionInForce`). The archived version **stays
readable**: `listVersions` still returns it, and `resolveForBilling` still resolves its cells, which
is how a historical invoice is explained. `publish` also refuses an unapproved version: the engine
has no `submitted → published` transition.

## The page

`src/modules/finance/pages/schedules/FeeSchedulesPage.tsx` — the matrix editor:

- a version selector and a status badge;
- the grid: a column per declared level × residence, a row per fee item, each cell an editable
  amount on a draft and exact `Money` text otherwise (never a float through the screen);
- per-cell validation: a malformed amount marks its own cell, and a service refusal is shown in an
  alert;
- **Load the spec §2.2 example**, which creates the levels and fee items it needs and writes the
  example as a new draft version;
- **Copy with uplift** with a percentage;
- Save, Submit, Approve, Send back (with a reason) and Publish, each gated by the permission its
  transition needs;
- the version history, with each version selectable.

Reachability: the page is `schedules/FeeSchedulesPage`, named by the route entry
`/finance/fee-schedules` in `src/modules/finance/moduleDefinition.tsx` and surfaced as the
"Fee schedules" tab of the fee-configuration hub. `src/routing/__tests__/pageRouteCoverage.test.ts`
passes.

**The actor.** No session-actor provider has landed, so the editor derives the workflow actor from
`useRBAC()` (roles and permissions) and keeps one actor id per browser in `localStorage`. That is a
stand-in for the session provider: two browsers are two makers, which is what lets maker-checker be
exercised before a login exists. **Gap:** a real session actor should supply the id.

## The spec §2.2 example

`fixtures.ts` transcribes the spec's table as data and `SPEC_EXAMPLE_TOTALS` holds the exact `Money`
of each column:

| Fee item | Grade 10 day | Grade 10 boarder | Form 3 day | Form 3 boarder | Form 4 day | Form 4 boarder |
| --- | --- | --- | --- | --- | --- | --- |
| Tuition | 6,000 | 6,000 | 5,500 | 5,500 | 5,500 | 5,500 |
| Boarding & meals | — | 18,500 | — | 17,000 | — | 17,000 |
| Lunch (optional) | 4,200 | — | 4,200 | — | 4,200 | — |
| Activity | 1,000 | 1,000 | 1,000 | 1,000 | 1,000 | 1,000 |
| Exam (F4 only) | — | — | 0 | 0 | 5,000 | 5,000 |
| Admission (new learners) | 2,000 | 2,000 | — | — | — | — |
| **Total** | **13,200** | **27,500** | **10,700** | **23,500** | **15,700** | **28,500** |

The spec's "Form 3/4" column groups two levels and its "0 / 5,000" prices them apart: Form 3 pays
nothing (KCSE registration is a Form 4 event) and Form 4 pays 5,000. The example is transcribed as
three levels so every number the spec writes has a cell. The Admission row is the spec's "new
learners only" item; the canonical line has no per-line new-learner flag, so it is modelled as lines
that exist only in the Grade 10 cells (**gap**).

`__tests__/service.test.ts` writes the example to a real SQLite database and asserts each column's
total against `SPEC_EXAMPLE_TOTALS`, plus the individual tuition/boarding/lunch/activity/exam/
admission amounts.

## The tests

| File | Guards |
| --- | --- |
| `__tests__/matrix.test.ts` | the cell key, resolution, and every refusal (ambiguous, undeclared, unknown, missing). |
| `__tests__/uplift.test.ts` | the percentage, the absolute change, the rounding rule, and every malformed uplift. |
| `__tests__/service.test.ts` | the spec §2.2 example on real SQLite, versioning and immutability, the copy, maker-checker, the reasoned rejection, the audit trail, and publishing. |
| `pages/schedules/__tests__/FeeSchedulesPage.test.tsx` | the grid, a re-price through the repository, the maker's refusal through the real gateway, the permission gate, the history. |
