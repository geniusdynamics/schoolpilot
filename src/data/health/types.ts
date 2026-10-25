// ABOUTME: The health contract a device and a hub share: the report the System Health page reads,
// ABOUTME: with an explicit level per signal so an unknown reading is never shown as healthy.

/** How a signal reads. `unknown` and `unavailable` are answers, not failures to be hidden. */
export type HealthLevel = 'ok' | 'attention' | 'unavailable' | 'unknown';

/**
 * One signal of the report.
 *
 * `value` is null exactly when there is nothing to show, and `level` says why: `unknown` when the
 * hub could not read it, `unavailable` when the surface is not configured on this hub. A reader
 * that treats a missing value as fine is the defect this shape exists to prevent.
 */
export interface HealthSignal<T> {
  readonly level: HealthLevel;
  readonly detail: string;
  readonly value: T | null;
}

/** Where the hub keeps its database and whether that survives a restart. */
export interface HubStorageHealth {
  readonly databaseFile: string;
  /** False for an in-memory database, which a restart erases. */
  readonly durable: boolean;
  /** The size on disk, or null when the file could not be read. */
  readonly bytes: number | null;
}

/** The backup surface as the health page reads it. */
export interface HubBackupHealth {
  readonly available: boolean;
  readonly lastBackupAt: string | null;
  readonly drillDue: boolean;
  readonly drillReason: string;
  readonly drillDueAt: string | null;
  readonly directory: string;
  readonly encryption: {
    readonly algorithm: string;
    readonly kdf: string;
    /** The key's short identifier; never the key itself. */
    readonly keyId: string | null;
  };
  readonly count: number;
  readonly totalBytes: number;
  readonly unreadable: number;
  readonly lastFailure: { readonly at: string; readonly message: string } | null;
}

/** One device's place in the hub's change log. */
export interface HubSyncDevice {
  readonly deviceId: string;
  readonly changes: number;
  readonly lastChangeAt: string | null;
  /** Seconds since the last change this device pushed, or null when it never has. */
  readonly lagSeconds: number | null;
}

/** The sync surface: the change-log head and what each device last sent. */
export interface HubSyncHealth {
  readonly head: number;
  readonly devices: readonly HubSyncDevice[];
  /** Changes the hub refused, the dead-letter view of a device's outbox. */
  readonly rejected: number;
}

/** One outbound integration and whether it is working. */
export interface HubIntegration {
  readonly id: string;
  readonly name: string;
  readonly level: HealthLevel;
  readonly detail: string;
  readonly checkedAt: string | null;
}

/** Everything the System Health page reads from a hub. */
export interface HubHealthReport {
  readonly generatedAt: string;
  readonly storage: HealthSignal<HubStorageHealth>;
  readonly backup: HealthSignal<HubBackupHealth>;
  readonly sync: HealthSignal<HubSyncHealth>;
  readonly integrations: HealthSignal<readonly HubIntegration[]>;
}
