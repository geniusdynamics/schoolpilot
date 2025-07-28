# Migration Rollback Plan

This document outlines the procedures for rolling back the migration from EduGen OS to SchoolPilot 3 in the event of a critical failure. A rollback should be considered a last resort and must be approved by the project lead.

## Trigger Conditions

A rollback should be initiated if any of the following conditions are met:

- **Critical Test Failures**: Multiple critical path smoke tests are failing post-migration.
- **Data Corruption**: Evidence of widespread data corruption or integrity issues.
- **Performance Degradation**: System performance is severely degraded and does not recover within the acceptable timeframe.
- **Extended Downtime**: The migration window is exceeded by more than 50% without a clear path to resolution.

## Rollback Steps

1.  **Activate Maintenance Mode**: Immediately put the EduGen OS application into maintenance mode to prevent any further data changes.
2.  **Disable Adapters**: Use feature flags to disable all SchoolPilot 3 data provider adapters.
3.  **Restore Database**: Restore the SchoolPilot 3 database from the pre-migration backup.
4.  **Point DNS to SchoolPilot 3**: Update the DNS records to point all traffic back to the original SchoolPilot 3 application servers.
5.  **Verify SchoolPilot 3**: Run a series of health checks and smoke tests to ensure SchoolPilot 3 is fully operational.
6.  **Communication**: Notify all stakeholders that the migration has been rolled back.

## Post-Mortem

After a successful rollback, a thorough post-mortem analysis must be conducted to identify the root cause of the failure. The migration will not be re-attempted until the issues are fully understood and resolved.

