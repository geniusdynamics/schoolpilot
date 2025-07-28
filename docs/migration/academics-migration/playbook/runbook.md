# Migration Runbook

This runbook contains the step-by-step procedures for the migration from SchoolPilot 3 to EduGen OS. It should be followed meticulously by the operations team during the migration window.

## Pre-Migration Checklist

- [ ] **Backup**: Complete full backup of the SchoolPilot 3 database and application state.
- [ ] **Communication**: Notify all stakeholders of the migration window and potential downtime.
- [ ] **System Freeze**: Ensure no code deployments or data changes are made to SchoolPilot 3.
- [ ] **Verification**: Confirm all pre-migration tests have passed and results are nominal.

## Migration Steps

1.  **Deploy Adapters**: Deploy the SchoolPilot 3 data provider adapters to the production environment.
2.  **Enable Read-Only Mode**: Use feature flags to switch all traffic to read-only mode through the new adapters.
3.  **Run Smoke Tests**: Execute the full suite of smoke tests against the read-only endpoints.
4.  **Enable Write Operations**: Sequentially enable write operations for each module (e.g., Students, Finance), running targeted tests after each activation.
5.  **Full System Testing**: Once all modules are live, run the full regression and integration test suites.
6.  **Monitoring**: Closely monitor system performance, error rates, and API latency.

## Post-Migration Steps

- [ ] **Final Verification**: Confirm all systems are operating as expected.
- [ ] **Stakeholder Update**: Notify all stakeholders that the migration is complete.
- [ ] **Decommissioning**: Schedule the decommissioning of the old SchoolPilot 3 infrastructure.

