# Module Dashboard Modernization Migration Guide

## Objective
Migrate all module dashboards to the unified dashboard shell without data loss, while keeping additional render overhead below 100 ms.

## Scope
- Modules covered: academics, administration, admissions, dashboard, finance, hr, inventory, library, nutrition, reports, settings.
- Migration type: UI-layer modernization only.
- Data model impact: none.

## Data Safety Guarantees
- No schema changes are introduced in this migration.
- No write-path behavior is modified for module entities.
- Existing identifiers and route paths remain unchanged.
- Existing `useAppData` reads are preserved and only remapped into unified dashboard presentation models.

## Zero-Data-Loss Checklist
1. Validate database connectivity and backup status before release.
2. Run baseline entity counts per module in staging and production snapshots.
3. Deploy dashboard UI artifacts only.
4. Re-run entity counts post-deployment and compare against baseline.
5. Verify sampling checks:
   - requisitions, purchase orders, suppliers
   - students, staff, attendance, grades
   - invoices, payments, payroll periods
   - books, loans, fines, meal plans
6. Confirm parity tolerance: exact-match counts and no missing primary records.

## Performance Budget and Validation
- Target: additional dashboard render time <100 ms compared to previous baseline.
- Validation method:
  - Measure first meaningful paint and interaction-ready timestamps before migration.
  - Measure same metrics after migration per module dashboard.
  - Compute delta per module and ensure each dashboard remains under +100 ms.
- Instrumentation recommendation:
  - Browser Performance API marks on dashboard mount.
  - Runtime diagnostics event for `dashboard:render-complete`.
  - Store p50/p95 deltas for release approval.

## Rollout Strategy
1. Deploy to staging and execute dashboard smoke tests for every module.
2. Validate role-based visibility with admin, teacher, student, and parent accounts where applicable.
3. Run test suite and coverage gate:
   - module dashboard tests
   - main dashboard tests
   - coverage threshold >=90%
4. Promote to production with monitoring window.

## Verification Matrix
- Visual consistency: shared shell structure and card hierarchy.
- Accessibility: keyboard navigation, focus visibility, ARIA live notifications.
- Responsiveness: 320px, 768px, 1440px.
- Functional integrity: quick actions and navigation routes.
- Data integrity: count and sampling parity checks.
- Performance integrity: render delta budget compliance.

## Rollback Procedure
1. Halt rollout immediately on data mismatch or render-regression breach.
2. Redeploy previous stable frontend artifact.
3. Re-verify route integrity and data parity.
4. Retain logs and performance traces for remediation.
5. Reattempt rollout only after failing module root causes are closed.

## Operational Acceptance Criteria
- No data-loss evidence in parity checks.
- All dashboard smoke tests pass.
- Accessibility and responsive checks pass.
- Coverage remains at or above 90% for dashboard modernization scope.
- Additional render time remains under 100 ms per module dashboard.
