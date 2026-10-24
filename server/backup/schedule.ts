// ABOUTME: The automatic backup cadence: one backup per UTC day at a configured time, due at start
// ABOUTME: when none has run, with a small retry window after a failure and an unref'd timer.

import { BackupError } from './errors';
import type { BackupService } from './service';
import type { BackupEntry, BackupState } from './types';

/** How long a failed automatic backup waits before it is tried again. */
export const RETRY_DELAY_MS = 15 * 60 * 1000;

const DEFAULT_DAILY_AT = '02:00';

export interface BackupSchedulerOptions {
  readonly service: BackupService;
  /** `HH:MM` in UTC; defaults to `02:00`. */
  readonly dailyAt?: string;
  /** How often the timer asks whether a backup is due; defaults to one minute. */
  readonly intervalMs?: number;
  readonly now?: () => Date;
  readonly logger?: (message: string, error?: unknown) => void;
}

/**
 * Runs the daily backup.
 *
 * `runDue()` is called once from the hub's start path before it listens, so a hub that was off
 * at the scheduled time still backs up as soon as it comes back, and a fresh hub backs up
 * immediately. The interval is unref'd: it never keeps a process alive on its own.
 */
export class BackupScheduler {
  private readonly service: BackupService;
  private readonly dailyAt: string;
  private readonly intervalMs: number;
  private readonly now: () => Date;
  private readonly logger: (message: string, error?: unknown) => void;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(options: BackupSchedulerOptions) {
    this.service = options.service;
    this.dailyAt = options.dailyAt ?? DEFAULT_DAILY_AT;
    parseDailyTime(this.dailyAt);
    this.intervalMs = options.intervalMs ?? 60_000;
    this.now = options.now ?? (() => new Date());
    this.logger =
      options.logger ??
      ((message, error) => {
        console.error(message, error instanceof Error ? error.message : error ?? '');
      });
  }

  /** Takes one backup when it is due; returns the entry, or null when none was taken. */
  async runDue(): Promise<BackupEntry | null> {
    if (this.running) return null;
    this.running = true;
    try {
      const now = this.now();
      const state = await this.service.readState();
      if (!isBackupDue(state, this.dailyAt, now)) return null;

      try {
        return await this.service.create('automatic', now);
      } catch (error) {
        await this.service.recordFailure(now, error);
        this.logger('the automatic backup failed:', error);
        return null;
      }
    } finally {
      this.running = false;
    }
  }

  /** Starts the timer that keeps checking the cadence. */
  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.runDue();
    }, this.intervalMs);
    this.timer.unref?.();
  }

  /** Stops the timer. Idempotent. */
  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }
}

/** True when an automatic backup is due at `now`. */
export function isBackupDue(
  state: BackupState,
  dailyAt: string,
  now: Date,
  retryDelayMs: number = RETRY_DELAY_MS
): boolean {
  // A failed attempt is retried no sooner than the retry delay, so a missing key does not
  // produce a log line every minute.
  if (state.lastFailure && state.lastAttemptAt) {
    const attempted = Date.parse(state.lastAttemptAt);
    if (Number.isFinite(attempted) && now.getTime() - attempted < retryDelayMs) return false;
  }

  if (!state.lastAutomaticAt) return true;

  const last = Date.parse(state.lastAutomaticAt);
  if (!Number.isFinite(last)) return true;

  return now.getTime() >= nextDailyTime(new Date(last), dailyAt).getTime();
}

/** The next occurrence of `dailyAt` strictly after `after`, in UTC. */
export function nextDailyTime(after: Date, dailyAt: string): Date {
  const { hours, minutes } = parseDailyTime(dailyAt);
  const candidate = new Date(
    Date.UTC(after.getUTCFullYear(), after.getUTCMonth(), after.getUTCDate(), hours, minutes, 0, 0)
  );
  if (candidate.getTime() <= after.getTime()) {
    candidate.setUTCDate(candidate.getUTCDate() + 1);
  }
  return candidate;
}

/** Parses `HH:MM` as UTC, refusing anything else. */
export function parseDailyTime(value: string): { hours: number; minutes: number } {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) {
    throw new BackupError('backup_failed', `the backup daily time must be HH:MM in UTC, got "${value}"`);
  }
  return { hours: Number(match[1]), minutes: Number(match[2]) };
}
