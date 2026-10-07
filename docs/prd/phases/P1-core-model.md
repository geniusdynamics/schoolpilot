# Phase 1 — Core Model & Data Layer

**Goal:** replace the three parallel data layers and mock hooks with the canonical model
([spec 02](../../specs/multi-curriculum-platform/02-domain-model.md)) behind typed repositories, live queries and domain
services ([spec 06 §2](../../specs/multi-curriculum-platform/06-platform-architecture.md#2-data-layer)); migrate existing
installations safely ([spec 08 §5](../../specs/multi-curriculum-platform/08-quality-and-release.md#5-migrating-existing-installations)).

**Depends on:** P0 · **Unblocks:** P2, P3, P4 (from P1-W4 onwards they may start in parallel) · **Estimate:** 4–5 weeks.

## Design commitments
- `Id<T>` branded strings, UUIDv7; ESLint rule forbids numeric coercion of ids (P1-A02).
- Repository contract: `get/list/create/update(id, patch)/remove/watch`, validation + referential integrity + audit + permission checks in one place (P1-B02/B03).
- Enrolment is the source of "current class"; class groups are year-scoped (P1-C02/C03).
- UI reads labels through `useLookup` and picks references through `EntityPicker` (P1-D01).
- Demo data is generated through repositories (P1-E06) — no mock data paths remain.

## Parallelism
- Lanes **A** (schema/storage) and **D** (UI components) start together; **B** (repositories/services) follows A.
- **E** (module UI migration) fans out one task per module in W5 — up to 5 implementers in parallel, each owning one `src/modules/<name>/**` tree.
- **C** (data migrations) runs alongside E: migrations touch only `src/data/migrations/**`.
- P5-W1 (i18n infrastructure) can run in parallel with any P1 wave (owns `src/i18n/**`).

## Migration safety
Every migration task ships: fixture database(s) from P0-era data, before/after counts and per-learner balance/mark checks, rollback test, and an entry in the phase log with the verification output.

## Lanes

| Lane | Scope |
| --- | --- |
| A | Schema, ids & storage |
| B | Repositories, query cache & services |
| C | Data migration |
| D | UI components (EntityPicker, forms, lookups) |
| E | Module UI migration |
| Q | Quality & test harness |

## Exit criteria

1. All modules read/write through repositories; useAppData() only for read-only legacy compatibility or removed
2. No mock hooks; no denormalised *_name reads in UI
3. Enrolment history model live; 'current class' derived
4. Existing installations migrate with before/after balance and count verification
5. Repository integration tests run on SQLite (node) and in CI
6. `node scripts/prd/gate.mjs phase --probe` → GATE PASSED; baseline tightened; phase-complete log written.

## Waves

| Wave | Focus | Tasks (run in parallel) |
| --- | --- | --- |
| `P1-W1` | Decisions and id rules | P1-A01, P1-A02, P1-B01 |
| `P1-W2` | Entity schemas and EntityPicker | P1-A03, P1-D01 |
| `P1-W3` | Storage adapter, repository base, schema-bound forms | P1-A04, P1-B02, P1-D02 |
| `P1-W4` | Migration framework, permissions, domain services, live queries, repair tool, test harness | P1-A05, P1-B03, P1-B04, P1-B05, P1-C06, P1-Q01 |
| `P1-W5` | Calendar migration and module UI migration (parallel by module) | P1-C01, P1-E01, P1-E02, P1-E03, P1-E04, P1-E05 |
| `P1-W6` | Class-group migration and retirement of legacy data layers | P1-C02, P1-E06 |
| `P1-W7` | Learner/enrolment migration and golden paths | P1-C03, P1-Q02 |
| `P1-W8` | Assessment and finance migrations; phase exit | P1-C04, P1-C05 |

## Tasks

Snapshot generated with the ledger; **status lives in [`../tasks.json`](../tasks.json)**. Later-phase tasks are intentionally
coarser than P0: each is refined into sub-tasks (same id + suffix, e.g. `P2-C01a`) by the orchestrator at the start of its wave,
after the previous phase's learnings are logged.

#### P1-W1 — Decisions and id rules

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P1-A01` | A | DR-01: choose schema/validation approach (zod vs JSON Schema + codegen); write decision record | — | S | Decision with spike results |
| `P1-A02` | A | Id module: branded Id<T>, UUIDv7 generator, ESLint rule banning numeric coercion of ids | — | M | Rule flags all patterns from contract-scan |
| `P1-B01` | B | DR-04: query cache choice; useQuery/useMutation/useLookup API design | — | S | Decision record |

#### P1-W2 — Entity schemas and EntityPicker

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P1-A03` | A | Entity schemas for canonical model (institution, calendar, curriculum, class groups, people, enrolment, assessment, finance docs) | P1-A01 | L | Schemas match spec 02; generated TS types |
| `P1-D01` | D | EntityPicker component (07 §2) with conformance tests | P1-B01 | M | UUID round trip, live update, scoped filter, empty-state CTA, archived display |

#### P1-W3 — Storage adapter, repository base, schema-bound forms

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P1-A04` | A | Storage adapter for SQLite (browser worker + node for tests) with generated DDL and indexes | P1-A03 | L | Same adapter code runs in browser and node |
| `P1-B02` | B | Repository base: get/list/create/update/remove/watch with validation, referential integrity, audit events, optimistic concurrency | P1-A03, P1-B01 | L | Invariants 02 §12 enforced |
| `P1-D02` | D | EntityForm v2 bound to schemas; DateField/MoneyField/PhoneField/IdentifierField | P1-A03, P1-D01 | L | Schema-driven validation identical in form and repository |

#### P1-W4 — Migration framework, permissions, domain services, live queries, repair tool, test harness

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P1-A05` | A | Migration framework: numbered migrations, pre-migration backup, progress screen, rollback | P1-A04 | M | Interrupted migration resumes or rolls back |
| `P1-B03` | B | Permission context and scope checks in repositories (role × scope) | P1-B02 | M | Teacher cannot write marks outside assigned groups |
| `P1-B04` | B | Domain services v1: EnrolmentService, AdmissionService, GuardianService, AttendanceService | P1-B02 | L | Services used by UI; no direct collection access |
| `P1-B05` | B | Live query cache + useQuery/useLookup hooks; change events from repositories | P1-B02 | M | Any write updates all dependent views |
| `P1-C06` | C | Integrity & repair tool (orphans, NaN FKs, null streams, duplicate ids) with consented fixes | P1-B02 | M | Report + fix on audit-era data |
| `P1-Q01` | Q | Repository integration test harness (node SQLite, optional Postgres via testcontainers in CI) | P1-A04 | M | No storage mocks in integration tests |

#### P1-W5 — Calendar migration and module UI migration (parallel by module)

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P1-C01` | C | Migration M1: institution, calendar, academic years/periods, financial years | P1-A05 | M | Counts and dates verified |
| `P1-E01` | E | Administration UI on repositories (learners, guardians, staff, class groups, calendar) | P1-B04, P1-B05, P1-D02 | L | No useAppData() writes; pickers are EntityPicker |
| `P1-E02` | E | Academics UI on repositories (learning areas, teaching groups, assessments, marks) | P1-B04, P1-B05, P1-D02 | L | Same as E01 |
| `P1-E03` | E | Finance UI on repositories (current feature set, pre-P3) | P1-B04, P1-B05, P1-D02 | L | Same as E01 |
| `P1-E04` | E | Admissions UI on repositories; admit creates learner + guardians + enrolment | P1-B04, P1-D02 | M | GP-6 green |
| `P1-E05` | E | Other modules on repositories (inventory, library, nutrition, HR, reports) | P1-B05 | L | No legacy data access |

#### P1-W6 — Class-group migration and retirement of legacy data layers

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P1-C02` | C | Migration M2: classes/streams → levels + year-scoped class groups (interactive mapping) | P1-C01 | L | Every learner keeps their class |
| `P1-E06` | E | Retire AppDataContext writes, mock data hooks, useModularMockData; demo fixtures generated through repositories | P1-E01, P1-E02, P1-E03, P1-E04, P1-E05 | L | Demo uses real code paths |

#### P1-W7 — Learner/enrolment migration and golden paths

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P1-C03` | C | Migration M3: learners, guardians, identifiers, enrolments from current_class_stream_id | P1-C02 | L | Guardians de-duplicated by phone; UPI to identifiers |
| `P1-Q02` | Q | GP-1 and GP-6 full golden paths in Playwright | P1-E06 | M | Green in CI |

#### P1-W8 — Assessment and finance migrations; phase exit

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P1-C04` | C | Migration M4: exam sessions/results → assessments, marks, results | P1-C03 | M | Marks per learner equal before/after |
| `P1-C05` | C | Migration M5: fee templates, invoices, payments, allocations → finance documents (minor units) | P1-C03 | L | Balance per learner equal before/after |
