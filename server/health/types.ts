// ABOUTME: The hub-side additions to the health contract: the runtime and table detail a
// ABOUTME: diagnostic bundle carries, and the bundle itself.

import type { HubHealthReport } from '@/data/health';

export type {
  HealthLevel,
  HealthSignal,
  HubBackupHealth,
  HubHealthReport,
  HubIntegration,
  HubStorageHealth,
  HubSyncDevice,
  HubSyncHealth,
} from '@/data/health';

/** The runtime facts of the hub process, none of which identify a person. */
export interface DiagnosticRuntime {
  readonly node: string;
  readonly platform: string;
  readonly arch: string;
  readonly uptimeSeconds: number;
}

/** A row count per canonical table, so an operator can see whether the database looks right. */
export interface DiagnosticTable {
  readonly table: string;
  readonly rows: number;
}

/** What a diagnostic bundle carries beyond the report. */
export interface DiagnosticDetail {
  readonly runtime: DiagnosticRuntime;
  readonly tables: readonly DiagnosticTable[];
}

/** The artefact an operator produces and hands to support. */
export interface DiagnosticBundle<D = DiagnosticDetail> {
  readonly format: 'schoolpilot-diagnostic-bundle';
  readonly version: 1;
  readonly application: 'schoolpilot';
  readonly generatedAt: string;
  readonly report: HubHealthReport;
  readonly diagnostics: D;
  /** What the redactor withheld and why, naming fields and patterns, never their values. */
  readonly redactions: readonly string[];
}
