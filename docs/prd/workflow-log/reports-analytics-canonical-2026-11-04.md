# Reports analytics: canonical records, not mock arrays — 2026-11-04

Branch `fix/report-analytics-honest` from `e07ac28` (the shared academic scope commit). The reports
analytics screens now compute every figure from canonical marks, enrolments, assessments, teaching
groups and attendance rows. A metric the school has not recorded is `null` and renders "Not recorded";
an empty series renders the screen's own empty state.

## What changed

| Area | Files | What it does now |
| --- | --- | --- |
| Arithmetic | `src/modules/reports/data/analyticsFromRows.ts` (new) | Pure computation: class averages and marks coverage, per-learning-area averages, teacher rows from teaching groups, period trends, attendance. |
| Types | `src/modules/reports/data/analyticsTypes.ts` (new) | Row shapes with explicit `null` for an unrecorded metric; pass rate exists only when a grading band marks a pass. |
| Data | `src/modules/reports/data/useAnalyticsData.ts` | Reads canonical rows through `useEntityQuery` (`allPages` for growing tables) and `useCanonicalRepository`; no timers, no mock arrays. |
| Export | `src/modules/reports/data/analyticsExport.ts` (new), `AnalyticsExportPage.tsx` | CSV/JSON download from the same computed rows; subject/class filters change the values they name; PDF honestly disabled; fabricated history removed. |
| Screens | `AnalyticsClassPage.tsx`, `AnalyticsSubjectPage.tsx`, `AnalyticsTeacherDashboardPage.tsx`, `AnalyticsTrendsPage.tsx` | Shared Year → Class → Stream → Period bar feeds the hook; trends use one real point per period with marks; no sine/random synthesis. |
| Scope | `useReportAnalyticsScope.ts`, `AnalyticsScopeCard.tsx` (new) | One wrapper around `useAcademicScope` and one card around `AcademicScopeFilterBar`, used by all five screens. |
| Tests | `src/modules/reports/data/__tests__/`, `src/modules/reports/pages/analytics/__tests__/` | Red-first arithmetic and export-filter tests, a hook integration test over the canonical fixture, and rendered class/trend screens. |
| Smoke harness | `src/tests/crawlCrashPages.smoke.test.tsx` | Stubs the shared academic scope; the report page still renders its own seeded subject row. |

## Deliberate omissions and the honest UI

- **Pass rate**: the canonical `grading_scale.bands` schema has no pass flag, so no pass band can be
  claimed. `passRate` is `null` and the screen says "Not recorded" rather than applying a made-up 50%
  threshold. The pure function supports `is_pass` if a band ever carries it; the hook never invents it.
- **Attendance**: rates come from `attendance_session`/`attendance_mark`; with no registers the value
  is `null` and the trends page says no registers have been recorded.
- **Teacher attendance and grading backlog**: a register names a class, not a teacher of a subject
  group, and there is no canonical assignment/grading queue, so both are `null` / "Not recorded".
- **Grade distribution**: the subject screen no longer renders it; no canonical per-band distribution
  was computed for this change.
- **Export history**: not recorded anywhere canonical, so the screen says so and lists nothing.
- **Date-range export controls**: removed. The shared year/period scope is what actually selects the
  assessments and marks; the old date inputs had no effect.

## Verification

- `npx vitest run src/modules/reports/data/__tests__/analyticsFromRows.test.ts ...` — 41 targeted tests
  pass across the arithmetic, export, hook integration, rendered screens and the existing analysis v2
  page.
- `npx eslint` on every changed file — clean.
- Red-first: the arithmetic suite first failed on the missing module; after the hook replaced the mock
  arrays, the source guard proved no `Math.random`/`Math.sin`/mock array remains in the trend path.
- Not run, per the task: `tsc`, the full suite, the gate and the build.
