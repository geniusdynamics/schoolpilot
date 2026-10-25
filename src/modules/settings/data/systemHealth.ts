// ABOUTME: The System Health data layer: it reads the device's own signals from the canonical
// ABOUTME: database, reads the hub's report over HTTP, and merges them without ever calling an
// ABOUTME: unreadable or unconfigured signal healthy.

import type { SqliteAdapter } from '@/data/adapters/sqlite';
import type {
  HealthLevel,
  HealthSignal,
  HubBackupHealth,
  HubHealthReport,
  HubIntegration,
  HubSyncDevice,
} from '@/data/health';
import { parseHlc } from '@/data/sync';

/** The browser storage facts the page shows, structurally typed so a test can hand them over. */
export interface DeviceStorageStatus {
  readonly mode: string;
  readonly persisted: boolean | null;
}

/** How much of the browser's quota the database uses, when the browser will say. */
export interface DeviceStorageEstimate {
  readonly usageBytes: number | null;
  readonly quotaBytes: number | null;
}

/** The device half of the storage signal. */
export interface DeviceStorageHealth {
  readonly mode: string;
  readonly persisted: boolean | null;
  readonly usageBytes: number | null;
  readonly quotaBytes: number | null;
}

/** What is waiting on this device to reach the hub, and what the hub refused. */
export interface OutboxHealth {
  readonly pending: number | null;
  readonly oldestPendingAt: string | null;
  readonly rejected: number | null;
}

/** The device's sync place, merged with the hub's change log. */
export interface SystemSyncHealth {
  readonly hubHead: number | null;
  readonly deviceCursor: number | null;
  /** Changes the device has not pulled yet; null when either side could not say. */
  readonly lagChanges: number | null;
  readonly devices: readonly HubSyncDevice[];
}

/** Both sides of the storage signal: the device's browser and the hub's database. */
export interface SystemStorageHealth {
  readonly device: DeviceStorageHealth | null;
  readonly hub: { readonly databaseFile: string; readonly durable: boolean; readonly bytes: number | null } | null;
}

/** Everything the System Health page shows. */
export interface SystemHealthReport {
  readonly generatedAt: string;
  readonly storage: HealthSignal<SystemStorageHealth>;
  readonly backup: HealthSignal<HubBackupHealth>;
  readonly sync: HealthSignal<SystemSyncHealth>;
  readonly outbox: HealthSignal<OutboxHealth>;
  readonly integrations: HealthSignal<readonly HubIntegration[]>;
}

/** The device signals, before the hub's half is merged in. */
export interface DeviceSignals {
  readonly storage: HealthSignal<DeviceStorageHealth>;
  readonly outbox: HealthSignal<OutboxHealth>;
  /** The highest server sequence this device has pulled; null when it has never pulled. */
  readonly cursor: number | null;
  /** Why the cursor reads as it does, when it is not a number. */
  readonly cursorDetail: string;
}

/** The hub half of the report: whatever can answer `report()`. */
export interface HubHealthSource {
  report(): Promise<HubHealthReport>;
}

export interface HubHealthClientOptions {
  /** The hub's origin, without a trailing slash, e.g. `http://192.168.1.10:3000`. */
  readonly baseUrl: string;
  /** The bearer session; every health route is authenticated like the rest of the hub. */
  readonly token: string;
  /** The fetch implementation; defaults to the platform's. */
  readonly fetch?: typeof fetch;
}

export interface ReadDeviceHealthOptions {
  /** The canonical adapter; null when the device database is not open. */
  readonly adapter: SqliteAdapter | null | undefined;
  /** The browser storage status; null when the provider has not reported one. */
  readonly storage: DeviceStorageStatus | null | undefined;
  /** The browser's storage estimate; read from the platform when omitted. */
  readonly estimate?: DeviceStorageEstimate | null;
  readonly now?: Date;
}

export interface LoadSystemHealthOptions extends ReadDeviceHealthOptions {
  /** The hub to read; null when this device is not connected to one. */
  readonly hub: HubHealthSource | null | undefined;
  /** The device's pulled cursor; when omitted it is read from the canonical database. */
  readonly deviceCursor?: number | null;
}

/**
 * Builds the device side of the hub's health wire.
 *
 * A failed request throws rather than answering an empty report: a page that showed "unknown" for
 * a hub that refused the read would be indistinguishable from one with nothing to report.
 */
export function createHubHealthClient(options: HubHealthClientOptions): HubHealthSource {
  const baseUrl = options.baseUrl.replace(/\/+$/, '');
  const request = options.fetch ?? fetch;

  return {
    async report(): Promise<HubHealthReport> {
      const response = await request(`${baseUrl}/api/health/report`, {
        method: 'GET',
        headers: { accept: 'application/json', authorization: `Bearer ${options.token}` },
      });
      if (!response.ok) {
        throw new Error(`the hub refused the health read: ${response.status} ${response.statusText}`);
      }
      return (await response.json()) as HubHealthReport;
    },
  };
}

/** The diagnostic bundle as a file the operator saves and hands to support. */
export interface DiagnosticDownload {
  readonly filename: string;
  readonly text: string;
}

/**
 * Downloads the hub's diagnostic bundle.
 *
 * The route is authenticated like the rest of the hub, so a plain link cannot fetch it. A refused
 * read throws: an error body saved as `schoolpilot-diagnostics.json` would be handed to support
 * as though it were a bundle.
 */
export async function fetchDiagnosticBundle(
  options: HubHealthClientOptions
): Promise<DiagnosticDownload> {
  const baseUrl = options.baseUrl.replace(/\/+$/, '');
  const request = options.fetch ?? fetch;

  const response = await request(`${baseUrl}/api/health/diagnostics`, {
    method: 'GET',
    headers: { accept: 'application/json', authorization: `Bearer ${options.token}` },
  });
  if (!response.ok) {
    throw new Error(`the hub refused the diagnostic bundle: ${response.status} ${response.statusText}`);
  }

  const named = /filename="([^"]+)"/.exec(response.headers.get('content-disposition') ?? '');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return {
    filename: named?.[1] ?? `schoolpilot-diagnostics-${stamp}.json`,
    text: await response.text(),
  };
}

/** The device's own signals: its storage, its outbox and its pull cursor. */
export async function readDeviceHealth(options: ReadDeviceHealthOptions): Promise<DeviceSignals> {
  const estimate = options.estimate === undefined ? await platformEstimate() : options.estimate;
  const storage = deviceStorageSignal(options.storage ?? null, estimate);

  const adapter = options.adapter;
  if (!adapter) {
    return {
      storage,
      outbox: {
        level: 'unknown',
        detail: 'the device database is not open, so its outbox cannot be read',
        value: null,
      },
      cursor: null,
      cursorDetail: 'the device database is not open',
    };
  }

  if (!(await hasSyncMetadata(adapter))) {
    return {
      storage,
      outbox: {
        level: 'unknown',
        detail: 'this device holds no sync metadata yet, so it has no outbox',
        value: null,
      },
      cursor: null,
      cursorDetail: 'this device holds no sync metadata yet',
    };
  }

  const [outbox, cursor] = await Promise.all([readOutbox(adapter), readCursor(adapter)]);
  return {
    storage,
    outbox,
    cursor: cursor.value,
    cursorDetail: cursor.detail,
  };
}

/** Reads both sides and merges them into the page's report. */
export async function loadSystemHealth(
  options: LoadSystemHealthOptions
): Promise<SystemHealthReport> {
  const now = options.now ?? new Date();
  const device = await readDeviceHealth(options);

  let hub: HubHealthReport | null = null;
  let hubFailure: string | null = null;
  if (options.hub) {
    try {
      hub = await options.hub.report();
    } catch (error) {
      hubFailure = error instanceof Error ? error.message : String(error);
    }
  }

  const cursor = options.deviceCursor === undefined ? device.cursor : options.deviceCursor;

  return {
    generatedAt: now.toISOString(),
    storage: mergeStorage(device.storage, hub, options.hub !== null && options.hub !== undefined, hubFailure),
    backup: hub
      ? hub.backup
      : {
          level: hubFailure ? 'unknown' : 'unavailable',
          detail: hubFailure ?? 'this device is not connected to a hub, so no backup can be read',
          value: null,
        },
    sync: mergeSync(cursor, device.cursorDetail, hub, options.hub !== null && options.hub !== undefined, hubFailure),
    outbox: mergeOutbox(device.outbox, hub),
    integrations: hub
      ? hub.integrations
      : {
          level: hubFailure ? 'unknown' : 'unavailable',
          detail: hubFailure ?? 'this device is not connected to a hub, so integrations cannot be read',
          value: null,
        },
  };
}

// ==================== Device reads ====================

/** True when the sync metadata tables are on this database; a device without one has no outbox. */
async function hasSyncMetadata(adapter: SqliteAdapter): Promise<boolean> {
  try {
    const row = await adapter.get<{ present: number }>(
      `SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = 'sync_outbox'`
    );
    return row !== null && row !== undefined;
  } catch {
    // A database that cannot answer says nothing about its tables, and "no outbox" is the honest
    // answer either way.
    return false;
  }
}

/** The unsent changes and the age of the oldest, dated from its clock. */
async function readOutbox(adapter: SqliteAdapter): Promise<HealthSignal<OutboxHealth>> {
  const row = await adapter.get<{ pending: number; oldest_hlc: string | null }>(
    `SELECT COUNT(*) AS pending, MIN("hlc") AS oldest_hlc
       FROM "sync_outbox" WHERE "sent" = 0`
  );
  const pending = Number(row?.pending ?? 0);
  const oldest = row?.oldest_hlc ? wallTimeOf(String(row.oldest_hlc)) : null;

  return {
    level: pending === 0 ? 'ok' : 'attention',
    detail:
      pending === 0
        ? 'nothing is waiting to reach the hub'
        : `${pending} change(s) have not reached the hub yet`,
    value: { pending, oldestPendingAt: oldest, rejected: null },
  };
}

/** The device's pull cursor and a sentence saying what it means. */
async function readCursor(
  adapter: SqliteAdapter
): Promise<{ readonly value: number | null; readonly detail: string }> {
  const row = await adapter.get<{ value: string }>(
    `SELECT "value" FROM "sync_state" WHERE "key" = 'pulled_seq'`
  );
  const raw = row?.value === undefined || row.value === null ? null : String(row.value);
  const parsed = raw === null ? NaN : Number(raw);
  if (!Number.isFinite(parsed)) {
    return { value: null, detail: 'this device has never pulled from the hub' };
  }
  return { value: parsed, detail: `this device has pulled up to change ${parsed}` };
}

/** The browser storage signal: a mode, the persistence grant and the quota in use. */
function deviceStorageSignal(
  status: DeviceStorageStatus | null,
  estimate: DeviceStorageEstimate | null
): HealthSignal<DeviceStorageHealth> {
  const value: DeviceStorageHealth | null = status
    ? {
        mode: status.mode,
        persisted: status.persisted,
        usageBytes: estimate?.usageBytes ?? null,
        quotaBytes: estimate?.quotaBytes ?? null,
      }
    : null;

  if (!status) {
    return {
      level: 'unknown',
      detail: 'the storage provider has not reported where this device keeps its database',
      value,
    };
  }

  if (status.mode === 'memory') {
    return {
      level: 'attention',
      detail: 'this device keeps its database in memory, so a reload erases every change',
      value,
    };
  }
  if (status.mode === 'unavailable') {
    return {
      level: 'attention',
      detail: 'this device cannot open a database in the browser',
      value,
    };
  }
  if (status.mode === 'uninitialised') {
    return { level: 'unknown', detail: 'the device database has not been opened yet', value };
  }
  if (status.persisted === false) {
    return {
      level: 'attention',
      detail:
        'the browser refused persistent storage, so it may evict the device database under pressure',
      value,
    };
  }
  return {
    level: 'ok',
    detail:
      status.persisted === true
        ? 'this device keeps its database in persistent browser storage'
        : 'this device keeps its database in browser storage; the persistence grant is unknown',
    value,
  };
}

/** Reads the browser's storage estimate, tolerating a platform that will not answer. */
async function platformEstimate(): Promise<DeviceStorageEstimate | null> {
  const storage = typeof navigator === 'undefined' ? undefined : navigator.storage;
  if (!storage || typeof storage.estimate !== 'function') return null;
  try {
    const estimate = await storage.estimate();
    return {
      usageBytes: typeof estimate.usage === 'number' ? estimate.usage : null,
      quotaBytes: typeof estimate.quota === 'number' ? estimate.quota : null,
    };
  } catch {
    return null;
  }
}

// ==================== Merges ====================

/** The storage signal, with the hub's database beside the device's browser. */
function mergeStorage(
  device: HealthSignal<DeviceStorageHealth>,
  hub: HubHealthReport | null,
  hubConfigured: boolean,
  hubFailure: string | null
): HealthSignal<SystemStorageHealth> {
  const value: SystemStorageHealth = {
    device: device.value,
    hub: hub?.storage.value ?? null,
  };

  if (!hubConfigured) {
    return { level: device.level, detail: `${device.detail}; no hub is configured`, value };
  }
  if (!hub) {
    return {
      level: device.level === 'ok' ? 'unknown' : device.level,
      detail: `${device.detail}; the hub's database could not be read${hubFailure ? `: ${hubFailure}` : ''}`,
      value,
    };
  }

  return {
    level: worstLevel(device.level, hub.storage.level),
    detail: `${device.detail}; ${hub.storage.detail}`,
    value,
  };
}

/** The sync signal: the device's cursor against the hub's head, plus the hub's per-device lag. */
function mergeSync(
  cursor: number | null,
  cursorDetail: string,
  hub: HubHealthReport | null,
  hubConfigured: boolean,
  hubFailure: string | null
): HealthSignal<SystemSyncHealth> {
  const devices = hub?.sync.value?.devices ?? [];
  const hubHead = hub?.sync.value?.head ?? null;
  const lagChanges = cursor === null || hubHead === null ? null : Math.max(0, hubHead - cursor);
  const value: SystemSyncHealth = { hubHead, deviceCursor: cursor, lagChanges, devices };

  if (!hubConfigured) {
    return {
      level: 'unknown',
      detail: `${cursorDetail}; no hub is configured, so the sync lag cannot be read`,
      value,
    };
  }
  if (!hub) {
    return {
      level: 'unknown',
      detail: `${cursorDetail}; the hub's change log could not be read${hubFailure ? `: ${hubFailure}` : ''}`,
      value,
    };
  }
  if (lagChanges === null) {
    return { level: 'unknown', detail: `${cursorDetail}, so the lag cannot be measured`, value };
  }
  if (lagChanges > 0) {
    return {
      level: 'attention',
      detail: `this device is ${lagChanges} change(s) behind the hub at ${hubHead}`,
      value,
    };
  }
  if (hub.sync.level !== 'ok') {
    return { level: hub.sync.level, detail: hub.sync.detail, value };
  }
  return { level: 'ok', detail: `this device is in step with the hub at change ${hubHead}`, value };
}

/** The outbox signal: the device's pending changes and the hub's dead-letter count. */
function mergeOutbox(
  device: HealthSignal<OutboxHealth>,
  hub: HubHealthReport | null
): HealthSignal<OutboxHealth> {
  const rejected = hub?.sync.value?.rejected ?? null;
  const value: OutboxHealth = {
    pending: device.value?.pending ?? null,
    oldestPendingAt: device.value?.oldestPendingAt ?? null,
    rejected,
  };

  if (device.level === 'unknown') {
    return { level: 'unknown', detail: device.detail, value };
  }
  if (rejected !== null && rejected > 0) {
    return {
      level: 'attention',
      detail: `${device.detail}; the hub refused ${rejected} change(s)`,
      value,
    };
  }
  return { level: device.level, detail: device.detail, value };
}

// ==================== Helpers ====================

/** The wall time an HLC carries, as an ISO timestamp; null for a clock that cannot be read. */
function wallTimeOf(hlc: string): string | null {
  try {
    return new Date(parseHlc(hlc).wall).toISOString();
  } catch {
    return null;
  }
}

/** The more serious of two levels, so a merged signal never reads better than its worst part. */
function worstLevel(left: HealthLevel, right: HealthLevel): HealthLevel {
  const rank: Record<HealthLevel, number> = { ok: 0, unknown: 1, unavailable: 1, attention: 2 };
  return rank[left] >= rank[right] ? left : right;
}
