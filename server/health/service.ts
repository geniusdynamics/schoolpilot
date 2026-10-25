// ABOUTME: The hub's health service: it reads the storage, the backup surface, the sync change log
// ABOUTME: and the integrations into one report, and never reports an unreadable signal as healthy.

import fs from 'node:fs';

import type { SqliteAdapter } from '@/data/adapters/sqlite';
import { columnsFor } from '@/data/repository';
import { ENTITY_NAMES } from '@/domain/schema';

import type { BackupService } from '../backup/service';
import type { ServerNode } from '@/data/sync';
import type {
  DiagnosticDetail,
  HealthLevel,
  HealthSignal,
  HubBackupHealth,
  HubHealthReport,
  HubIntegration,
  HubStorageHealth,
  HubSyncDevice,
  HubSyncHealth,
} from './types';

/** A device that has not pushed a change for this long is called out rather than counted as fine. */
export const DEFAULT_STALE_DEVICE_MS = 24 * 60 * 60 * 1000;

/** One row of the change log's per-device grouping. */
export interface DeviceChangeRow {
  readonly deviceId: string;
  readonly changes: number;
  readonly lastChangeAt: string | null;
}

/** The per-device summary of the change log. */
export interface SyncSummary {
  readonly devices: readonly HubSyncDevice[];
  /** The devices that have been silent for longer than the staleness window. */
  readonly staleDeviceIds: readonly string[];
  readonly level: HealthLevel;
}

/**
 * Folds the change log's per-device rows into the sync signal's devices.
 *
 * A device that has never pushed is as notable as one that stopped: both are absent from the log
 * and both get a null lag, so neither is quietly counted as in step.
 */
export function summariseSync(
  rows: readonly DeviceChangeRow[],
  now: Date,
  staleAfterMs: number = DEFAULT_STALE_DEVICE_MS
): SyncSummary {
  const devices: HubSyncDevice[] = rows
    .map((row) => {
      const at = row.lastChangeAt === null ? NaN : Date.parse(row.lastChangeAt);
      const lagSeconds = Number.isFinite(at)
        ? Math.max(0, Math.round((now.getTime() - at) / 1000))
        : null;
      return {
        deviceId: row.deviceId,
        changes: row.changes,
        lastChangeAt: row.lastChangeAt,
        lagSeconds,
      };
    })
    .sort((left, right) => left.deviceId.localeCompare(right.deviceId));

  const staleDeviceIds = devices
    .filter((device) => device.lagSeconds === null || device.lagSeconds * 1000 > staleAfterMs)
    .map((device) => device.deviceId);

  return {
    devices,
    staleDeviceIds,
    level: staleDeviceIds.length === 0 ? 'ok' : 'attention',
  };
}

/** How the health service is built. */
export interface HealthServiceOptions {
  readonly adapter: SqliteAdapter;
  /** The SQLite file the hub serves; `:memory:` is read as not durable. */
  readonly databaseFile: string;
  /** The sync node; absent when the hub serves no sync. */
  readonly sync?: ServerNode;
  /** The backup service; absent when backups are disabled. */
  readonly backup?: BackupService;
  /** The outbound integrations to report; read on every report so a probe stays live. */
  readonly integrations?: () => readonly HubIntegration[] | Promise<readonly HubIntegration[]>;
  readonly now?: () => Date;
  /** The staleness window of {@link summariseSync}. */
  readonly staleDeviceAfterMs?: number;
}

/**
 * Assembles the hub's health report.
 *
 * Every section answers with a level even when it cannot answer with a value, so the page shows
 * "not configured" or "could not be read" rather than an empty green box.
 */
export class HealthService {
  private readonly adapter: SqliteAdapter;
  private readonly databaseFile: string;
  private readonly sync: ServerNode | undefined;
  private readonly backup: BackupService | undefined;
  private readonly integrations: (() => readonly HubIntegration[] | Promise<readonly HubIntegration[]>) | undefined;
  private readonly now: () => Date;
  private readonly staleDeviceAfterMs: number;

  constructor(options: HealthServiceOptions) {
    this.adapter = options.adapter;
    this.databaseFile = options.databaseFile;
    this.sync = options.sync;
    this.backup = options.backup;
    this.integrations = options.integrations;
    this.now = options.now ?? (() => new Date());
    this.staleDeviceAfterMs = options.staleDeviceAfterMs ?? DEFAULT_STALE_DEVICE_MS;
  }

  /** The whole report, read now. */
  async report(): Promise<HubHealthReport> {
    const now = this.now();
    const [storage, backup, sync, integrations] = await Promise.all([
      this.storageSignal(),
      this.backupSignal(),
      this.syncSignal(now),
      this.integrationSignal(),
    ]);

    return {
      generatedAt: now.toISOString(),
      storage,
      backup,
      sync,
      integrations,
    };
  }

  /** What the bundle carries beyond the report: the runtime and a row count per canonical table. */
  async diagnostics(): Promise<DiagnosticDetail> {
    const tables = [];
    for (const entity of ENTITY_NAMES) {
      const table = columnsFor(entity).table;
      const row = await this.adapter.get<{ rows: number }>(`SELECT COUNT(*) AS rows FROM "${table}"`);
      tables.push({ table, rows: Number(row?.rows ?? 0) });
    }

    return {
      runtime: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        uptimeSeconds: Math.round(process.uptime()),
      },
      tables,
    };
  }

  // ==================== Signals ====================

  private async storageSignal(): Promise<HealthSignal<HubStorageHealth>> {
    const durable = this.databaseFile !== ':memory:' && !this.databaseFile.startsWith('file::memory:');
    let bytes: number | null = null;
    try {
      bytes = (await fs.promises.stat(this.databaseFile)).size;
    } catch {
      bytes = null;
    }

    const value: HubStorageHealth = { databaseFile: this.databaseFile, durable, bytes };
    if (!durable) {
      return {
        level: 'attention',
        detail: 'the hub holds its database in memory, so a restart erases every change',
        value,
      };
    }
    if (bytes === null) {
      return {
        level: 'unknown',
        detail: `the hub's database at ${this.databaseFile} could not be read`,
        value,
      };
    }
    return {
      level: 'ok',
      detail: `the hub's database is ${this.databaseFile} on disk`,
      value,
    };
  }

  private async backupSignal(): Promise<HealthSignal<HubBackupHealth>> {
    const backup = this.backup;
    if (!backup) {
      return { level: 'unavailable', detail: 'backups are disabled on this hub', value: null };
    }

    const status = await backup.status();
    const value: HubBackupHealth = {
      available: status.available,
      lastBackupAt: status.lastBackupAt,
      drillDue: status.drill.due,
      drillReason: status.drill.reason,
      drillDueAt: status.drill.dueAt,
      directory: status.directory,
      encryption: status.encryption,
      count: status.backups.count,
      totalBytes: status.backups.totalBytes,
      unreadable: status.backups.unreadable,
      lastFailure: status.lastFailure ?? null,
    };

    if (!status.available) {
      return { level: 'attention', detail: 'no backup key is configured, so no backup can be written', value };
    }
    if (status.lastFailure) {
      return {
        level: 'attention',
        detail: `the last backup attempt failed: ${status.lastFailure.message}`,
        value,
      };
    }
    if (status.lastBackupAt === null) {
      return { level: 'attention', detail: 'no backup has been taken yet', value };
    }
    if (status.drill.due) {
      return {
        level: 'attention',
        detail:
          status.drill.reason === 'never_performed'
            ? 'a backup exists but a restore has never been proved'
            : 'the monthly restore drill is due',
        value,
      };
    }
    if (status.backups.unreadable > 0) {
      return {
        level: 'attention',
        detail: `${status.backups.unreadable} archive(s) in the backup directory could not be read`,
        value,
      };
    }
    return { level: 'ok', detail: `the newest backup is from ${status.lastBackupAt}`, value };
  }

  private async syncSignal(now: Date): Promise<HealthSignal<HubSyncHealth>> {
    if (!this.sync) {
      return { level: 'unavailable', detail: 'this hub is not serving sync', value: null };
    }

    const rows = await this.adapter.all<{ device_id: string; changes: number; last_change_at: string | null }>(
      `SELECT "device_id" AS device_id, COUNT(*) AS changes, MAX("applied_at") AS last_change_at
         FROM "sync_change"
        GROUP BY "device_id"`
    );
    const summary = summariseSync(
      rows.map((row) => ({
        deviceId: String(row.device_id),
        changes: Number(row.changes),
        lastChangeAt: row.last_change_at === null ? null : String(row.last_change_at),
      })),
      now,
      this.staleDeviceAfterMs
    );

    const head = Number(
      (await this.adapter.get<{ head: number | null }>(`SELECT MAX("server_seq") AS head FROM "sync_change"`))
        ?.head ?? 0
    );
    const rejected = Number(
      (await this.adapter.get<{ rejected: number }>(`SELECT COUNT(*) AS rejected FROM "sync_reject"`))
        ?.rejected ?? 0
    );

    const value: HubSyncHealth = { head, devices: summary.devices, rejected };
    if (summary.devices.length === 0) {
      return { level: 'unknown', detail: 'no device has pushed a change yet', value };
    }
    if (summary.level === 'attention') {
      return {
        level: 'attention',
        detail: `no change has arrived from ${summary.staleDeviceIds.join(', ')} in over a day`,
        value,
      };
    }
    return {
      level: 'ok',
      detail: `${summary.devices.length} device(s) in step at change ${head}`,
      value,
    };
  }

  private async integrationSignal(): Promise<HealthSignal<readonly HubIntegration[]>> {
    if (!this.integrations) {
      return { level: 'unknown', detail: 'this hub reports no integrations', value: [] };
    }

    const list = [...(await this.integrations())];
    if (list.length === 0) {
      return { level: 'unknown', detail: 'no integration is configured on this hub', value: list };
    }

    const unhealthy = list.filter((entry) => entry.level !== 'ok');
    if (unhealthy.length > 0) {
      return {
        level: 'attention',
        detail: `${unhealthy.length} of ${list.length} integration(s) need attention: ${unhealthy
          .map((entry) => entry.name)
          .join(', ')}`,
        value: list,
      };
    }
    return {
      level: 'ok',
      detail: `${list.length} integration(s) reporting`,
      value: list,
    };
  }
}
