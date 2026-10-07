# Phase 2 — Curriculum & Assessment Engine

**Goal:** curriculum-agnostic core driven by versioned Curriculum Packs, with a deterministic
results engine, mark entry v2, CBC observations, report cards and promotion
([spec 03](../../specs/multi-curriculum-platform/03-curriculum-and-assessment.md)).

**Depends on:** P1 (repositories, enrolment model) · **Runs in parallel with:** P3, P4 · **Estimate:** 6–8 weeks.

## Design commitments
- Packs are JSON validated by `packs/schema/*.json`; the engine never names a curriculum.
- Scores stored raw; scaling/rounding/grading in the engine; every computed number has an explanation trace.
- Ranking is a policy (default off for CBE).
- Published report cards are immutable snapshots; re-issue creates a version.
- Every pack ships conformance vectors traced to official sources; CI runs them (P2-Q01).

## Parallelism
- W2 is the widest wave: registry, scales, aggregation, **three packs in parallel** (KE CBE, KE 8-4-4, British — each owns its `packs/<code>/**`), and the report template engine.
- Pack authoring tasks need domain review: the verifier stage must check each band/rule against the cited source and mark uncertain items `verification: draft`.

## Exit evidence
GP-2 (transitional KE secondary), GP-3 (British international), GP-4 (term cycle), GP-5 (rollover) green; vectors 100 % pass.

## Lanes

| Lane | Scope |
| --- | --- |
| A | Pack format & registry |
| B | Assessment & results engine |
| C | Reference packs (KE CBE, KE 8-4-4, British) |
| D | Report cards & documents |
| E | Mark entry, observations, promotion UI |
| Q | Conformance & golden paths |

## Exit criteria

1. ke-cbe, ke-844 and british packs pass all conformance vectors and are installable in the wizard
2. Results computed with explanation traces; ranking policy honoured
3. Report cards publish as immutable snapshots and print in bulk
4. Promotion run with preview/approve/commit/undo on the enrolment model
5. GP-2, GP-3, GP-4, GP-5 green
6. `node scripts/prd/gate.mjs phase --probe` → GATE PASSED; baseline tightened; phase-complete log written.

## Waves

| Wave | Focus | Tasks (run in parallel) |
| --- | --- | --- |
| `P2-W1` | Pack schema, engine core, PDF decision | P2-A01, P2-B01, P2-D01 |
| `P2-W2` | Registry, grading scales, aggregation, reference packs, report template engine | P2-A02, P2-B02, P2-B03, P2-C01, P2-C02, P2-C03, P2-D02 |
| `P2-W3` | Progression rules, mark entry v2, observations, results UI, conformance CI | P2-B04, P2-E01, P2-E02, P2-E03, P2-Q01 |
| `P2-W4` | Report publishing, promotion UI, wizard on packs, analysis | P2-D03, P2-E04, P2-E05, P2-E06 |
| `P2-W5` | Golden paths; phase exit | P2-Q02 |

## Tasks

Snapshot generated with the ledger; **status lives in [`../tasks.json`](../tasks.json)**. Later-phase tasks are intentionally
coarser than P0: each is refined into sub-tasks (same id + suffix, e.g. `P2-C01a`) by the orchestrator at the start of its wave,
after the previous phase's learnings are logged.

#### P2-W1 — Pack schema, engine core, PDF decision

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P2-A01` | A | Pack JSON Schema (pack, structure, learning areas, assessment, progression, reports, locales, tests) | — | M | Validates spec 03 examples |
| `P2-B01` | B | Engine core: scheme evaluation (slots, scaling, components, missing policy, rounding) with explanation trace | — | L | Deterministic; trace explains each number |
| `P2-D01` | D | DR-05: PDF rendering approach; print CSS baseline | — | S | Decision |

#### P2-W2 — Registry, grading scales, aggregation, reference packs, report template engine

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P2-A02` | A | Pack registry & loader: install pack@version into a programme; overrides; diff preview on upgrade | P2-A01 | L | Install/upgrade/override with audit |
| `P2-B02` | B | Grading scales (bands, rubric, letter, points, division, /20, GPA) | P2-B01 | M | All spec 03 §5 kinds |
| `P2-B03` | B | Aggregation operators (sum, mean, weighted/coefficient, best_n with groups, points→lookup, divisions, count_where, rubric_profile) + ranking policies | P2-B01 | L | KCSE best-7 vector, PLE division vector, moyenne vector pass |
| `P2-C01` | C | Pack ke-cbe (PP1–G12, pathways, competencies, 4- and 8-level scales, report templates) with sources and vectors | P2-A01 | L | Conformance vectors pass; verification status recorded |
| `P2-C02` | C | Pack ke-844 (Forms 1–4, KCSE subjects/papers, 12-point scale, best-7) | P2-A01 | M | Vectors pass |
| `P2-C03` | C | Packs british: gb-national, cambridge-intl, pearson-intl (EYFS–A-Level, 9–1, A*–G, UCAS) | P2-A01 | L | Vectors pass |
| `P2-D02` | D | Report template engine (blocks from spec 03 §8.1), branding, locales, QR verification | P2-D01, P2-A01 | L | All blocks render; A4/A5 |

#### P2-W3 — Progression rules, mark entry v2, observations, results UI, conformance CI

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P2-B04` | B | Period→annual aggregation and progression rule evaluator | P2-B03 | M | Automatic, threshold, council, stage transition |
| `P2-E01` | E | Mark entry v2: teaching-group grid, keyboard, paste, validation, status codes, autosave offline, lock/moderate workflow | P2-B01 | L | Teacher scope enforced; locked cells need reason |
| `P2-E02` | E | CBC observations capture (outcome × level × evidence), bulk with exceptions, mobile layout | P2-C01 | M | Observations feed term judgement |
| `P2-E03` | E | Results computation UI with explanation drill-down and moderation tools | P2-B03 | M | 'Why this grade' view |
| `P2-Q01` | Q | Conformance runner: every pack's vectors in CI | P2-B03 | S | CI fails on any vector mismatch |

#### P2-W4 — Report publishing, promotion UI, wizard on packs, analysis

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P2-D03` | D | Report publishing: bulk generate, review, publish snapshot, distribute (print queue, PDF, portal link, SMS link) | P2-D02, P2-E03 | L | Snapshots immutable; re-issue versioned |
| `P2-E04` | E | Promotion run UI on enrolments (compute → review → approve → commit → undo) | P2-B04 | L | GP-5 green |
| `P2-E05` | E | Setup wizard & programme management driven by the pack registry (multiple programmes per school) | P2-A02, P2-C01, P2-C02, P2-C03 | M | Transitional KE secondary set up in the wizard |
| `P2-E06` | E | Analysis v2: subject/group/teacher analysis, trends, competency heat-maps respecting ranking policy | P2-E03 | M | No positions where disabled |

#### P2-W5 — Golden paths; phase exit

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P2-Q02` | Q | Golden paths GP-2, GP-3, GP-4, GP-5 | P2-D03, P2-E01, P2-E04, P2-E05 | L | Green in CI |
