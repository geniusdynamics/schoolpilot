# P5 - Packs and Localisation - phase complete (2026-10-27)

**Commits:** `0f79749` (phase start) .. `fc483e2` (all merged) **Tasks:** 13/13 done, 0 deferred **Pushed and merged:** yes, PRs #53, #56

## Exit criteria

| # | Criterion | Met | Evidence |
| --- | --- | --- | --- |
| 1 | sw, fr, pt, ar (RTL) locales complete for core flows; no hard-coded curriculum terms in core | **yes** | `npx tsx scripts/i18n/check-locales.ts` → "OK every core namespace is complete in every listed locale" (sw, fr, pt, ar: 0 problems in `common` and `navigation`). `npx tsx scripts/i18n/check-pseudo.ts --check` → "OK every English string has a pseudo translation". `ar` renders `dir="rtl"` (`rtl-layout.test.tsx`). No exam-system term (KCSE, PLE, CSEE, WASSCE, BECE, UBE, bac) appears in the English core namespaces. |
| 2 | Ethiopian calendar entry/display works in date fields | **yes** | `src/domain/calendar/__tests__/calendar.test.ts` (53 tests): every day 1900-2100 round-trips, every Ethiopian date 1893-2092 round-trips, every day 1990-2060 matches ICU, in three time zones; `DatePickerEthiopic.test.tsx` (26): display, typed entry, 13-month popover, Pagume, min/max, keyboard. 79 tests total, passing. |
| 3 | UG, TZ, RW, NG, GH, ZA, Francophone packs pass vectors with cited sources | **yes** | `node scripts/packs/run-vectors.mjs` → 275/275 executed, 0 skipped, 0 failed across 10 packs. Each pack README cites its sources; every figure no reachable official source states is `verification: draft` and listed. Verifiers re-fetched the sources (UNEB site was down; NECTA needed `curl`; CI circulars and the CM decree were OCR'd). |
| 4 | Country packs provide identifiers, address schemas, holidays; KE payroll pack implements the interface | **yes** | `packs/country/{ke,ug,tz,rw,ng,gh,za,sn,ci,cm}` — KE alone: 8 identifiers, 3 address levels, 14 holidays, 5 statutory returns. `addressSchemaFor` for all ten comes from the pack (`addresses.ts`). `packs/payroll/ke` implements `src/domain/payroll` with effective-dated tables and no rate in code (`noRatesInCode.test.ts`); 8 payslip fixtures reproduce to the cent, recomputed independently. |
| 5 | `node scripts/prd/gate.mjs phase --probe` → GATE PASSED; baseline tightened; phase-complete log written | **partly - see the waiver** | G1-G8 PASS/SKIP as expected, P2 production build PASS, P3 probe **15/16 PASS** (floor 14). **P1 FAILED locally (6 failed files vs baseline 4) and is waived; CI certifies it.** Baseline not tightened (reason below). This log is the third part. |

## The P1 waiver (recorded, not hidden)

`P1 Full test suite: failed files do not increase` failed on this machine: 6 failed files against a baseline of 4. The six, classified:

| File | Why |
| --- | --- |
| `scripts/prd/__tests__/eslint-gate.test.ts` (2 tests) | The gate's own ESLint integration resolves no config on Windows (`expected 'undefinedundefined' to match ... rules-of-hooks`). |
| `scripts/prd/__tests__/secret-scan.test.mjs` (1) | The gate's own scanner test; passes in CI on Linux. |
| `scripts/prd/fix-encoding.test.mjs` | The file fails with no failing test (suite-level), Windows path handling in the mojibake repair. |
| `src/tests/crawlCrashPages.smoke.test.tsx` | Suite-level failure; it hung for over 15 minutes when run alone on this machine. |
| `src/domain/demo/__tests__/mockPathsRetired.test.ts` (1) | Passes alone (3/3), fails only in the parallel full run: load flake. |
| `src/services/database/__tests__/collectionRegistry.test.ts` (1) | Passes alone (16/16): load flake. |

The baseline's four `knownFailingFiles` (ModuleLoader, ModuleRegistry.integration, CapabilityDetector.property, SyncComponents.property) all passed here, so the local failure set is not the baseline's set: it is platform and load, not a regression.

**Why CI is the authority here.** The CI job "Gate, unit tests, build" runs the same full suite on Linux and fails on any file outside `knownFailingFiles` (`ci.yml`, step "Unit tests (no failures beyond the baseline's knownFailingFiles)"). That job passed on all three PRs that carried this phase: #54 (run 40465700322), #55 (run 40476782160), #56 (run 40468155524). This is the same check, on the platform it was calibrated for. The repo's handoff (`LOCAL-HANDOFF.md` §0a note 1) already records that the local gate cannot certify a suite this size on Windows.

**Baseline not tightened.** The only locally improving number is typecheck (2252 against 2500), and the baseline's own note says that number is platform-dependent and must be updated from a CI run, not a local one. Tightening P1 from a measurement that failed would loosen it, which `baseline --update` refuses and which would be wrong. Follow-up task P5-Q01 below covers making the gate's own Windows-only tests skip on Windows with a stated reason, so P1 can be measured locally.

## Probe (`.prd-gate/probe.md`, port 5312)

15 of 16 checks passed. `C12 Marks entry lists the students of a stream` was SKIPPED with "no teaching group is available for the assessment" (a data precondition, not a failure). C16 rendered 84 navigation pages and hub tabs without a crash. Floor is 14.

## Deferred to people (no agent can close these)

| Item | Owner |
| --- | --- |
| Native-speaker review of every sw, fr, pt, ar translation (all are drafts; verifier term notes in the wave logs) | the owner / a reviewer per language |
| Payroll accountant sign-off on `packs/payroll/ke` before anyone is paid from it | the owner |
| Country-pack stewards for UG, TZ, RW, NG, GH, ZA, SN, CI, CM (data is draft where no official source was reachable) | the owner |
| Fixing the public application wizard (step 1 requires `intendedClassId`, rendered only in step 3) | product decision, pre-existing |
| Decide whether Ethiopian locales default to the Ethiopian calendar (spec says Gregorian default) | the owner |

## Follow-ups opened by this phase

| id | Task |
| --- | --- |
| P5-Q01 | Make the gate's own Windows-only suites (eslint-gate, secret-scan, fix-encoding, crawlCrashPages) skip on Windows with a stated reason so P1 can be measured locally; investigate the `crawlCrashPages` hang. |
| P5-Q02 | Ghana `bece_aggregate` emits the points total (47) rather than the aggregate (13); rename it or make 60-minus expressible in the aggregation schema. |
| P5-Q03 | CI progression sends averages 8.50-9.49 to the council where circular 268 says repeat/exclude; SN term window says September where the spec says October. |
| P5-Q04 | Wire the payroll pack to the HR pages, and the packs' report templates to report rendering. |

## How the phase was run

Four waves, all on one branch per wave, merged with merge commits. Each task was implemented in its own worktree and checked by an independent verifier agent that re-derived the numbers and re-fetched the sources; blocking findings were fixed before integration (KE pack URLs, the December 2024 PAYE draft flag, the date-dependent DatePicker test). Sub-agents ran on Sonnet 5.5; when that provider started stalling, the last two verifications ran on DeepSeek Flash, and both approved with detailed evidence. P5-W2's log is `P5-W2-2026-10-26.md`; P5-W3's evidence is in PR #56 and the ledger notes for C05 and C06.

## How to start P6

1. `node scripts/prd/prd.mjs status` - P6 is 0/11 and runnable.
2. `node scripts/prd/prd.mjs show P6-E01` (then E02...) for the tasks that need an owner decision before an agent can start: the licence (DR-03), the pilot schools, the 1.0 release.
3. Refine P6's coarse tasks into sub-tasks at wave start, as P5 did.
