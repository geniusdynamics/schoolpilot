# Dashboard Deployment and Rollback Runbook

## Scope
This runbook covers release, verification, and rollback steps for the redesigned main dashboard.

## Pre-Deployment Checklist
- Confirm local quality gate passes:
  - `npm run typecheck`
  - `npm run test:run -- src/modules/dashboard/pages/__tests__/DashboardPage.test.tsx`
  - `npm run build`
- Confirm dashboard data dependencies are healthy:
  - `students`
  - `staff`
  - `studentAttendance`
  - `schoolPeriods`
  - `campaigns` and `templatesComm`
  - `studentExamResults`
  - `studentInvoices` and `studentPayments`
- Validate role access behavior for:
  - administrator
  - teacher
  - student
  - parent/guardian

## Deployment Steps
1. Create release branch from the current integration baseline.
2. Merge dashboard changes after CI green status.
3. Build and publish frontend artifact to staging environment.
4. Run staging smoke checks:
   - Dashboard route loads without console errors.
   - KPI cards and charts render correctly.
   - Navigation hub routes resolve.
   - Role-specific quick actions display as expected.
5. Promote artifact from staging to production.
6. Run production smoke checks with real accounts for each major role.

## Production Smoke Test Script
- Open dashboard as administrator:
  - verify key metrics, chart rendering, quick actions.
- Open dashboard as teacher:
  - verify teacher quick actions and attendance emphasis.
- Open dashboard as student:
  - verify timetable/results/notices quick actions.
- Open dashboard as parent:
  - verify attendance/fees/communication access paths.
- Verify mobile layout at 320px and tablet layout at 768px.
- Verify keyboard-only navigation across navigation hub and quick actions.

## Monitoring During Rollout
- Watch client-side error logs for dashboard route and chart rendering.
- Track latency for dashboard initial render and interactive readiness.
- Track navigation failures and permission-denied spikes.
- Confirm synchronization and offline notifications reflect network state.

## Rollback Triggers
- Dashboard route fails to render for any core role.
- Severe data mismatch in KPI calculations.
- Accessibility regression blocking keyboard navigation.
- Material increase in frontend error rate after deployment.
- Performance regression exceeding 3-second interaction target.

## Rollback Procedure
1. Freeze new production promotions.
2. Redeploy previous stable frontend artifact.
3. Validate rollback with quick smoke checks:
   - dashboard route renders
   - role access works
   - major navigation actions open correctly
4. Announce rollback completion to operations and support.
5. Capture incident report with root cause and corrective actions.

## Post-Rollback Stabilization
- Reproduce failure in staging with production-like data.
- Add or tighten automated test coverage for identified failure path.
- Re-run full dashboard quality gate before next release candidate.
