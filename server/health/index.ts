// ABOUTME: The public surface of the hub's health module: the service that assembles the report,
// ABOUTME: the per-device sync summary and the diagnostic bundle's redactor.

export { HealthService, DEFAULT_STALE_DEVICE_MS, summariseSync } from './service';
export type { DeviceChangeRow, HealthServiceOptions, SyncSummary } from './service';

export { buildDiagnosticBundle, redactDiagnosticValue } from './redact';

export type {
  DiagnosticBundle,
  DiagnosticDetail,
  DiagnosticRuntime,
  DiagnosticTable,
  HealthLevel,
  HealthSignal,
  HubBackupHealth,
  HubHealthReport,
  HubIntegration,
  HubStorageHealth,
  HubSyncDevice,
  HubSyncHealth,
} from './types';
