// ABOUTME: The sign-in lockout policy: consecutive failures inside one window lock a key for a
// ABOUTME: duration that doubles with each lock, and only a successful sign-in clears the escalation.

import type { SqliteAdapter } from '@/data/adapters/sqlite';

/**
 * How a repeated sign-in failure is punished.
 *
 * `level` counts the locks a key has already served; a successful sign-in resets it to zero.
 * The window bounds how long a failure keeps counting, so a user who mistypes once a week is
 * never locked while an attacker guessing in a burst is.
 */
export interface LockoutPolicy {
  /** Consecutive failures inside the window that trigger a lock. */
  readonly maxFailures: number;
  /** How long a failure keeps counting towards the next lock. */
  readonly windowMs: number;
  /** The first lock's duration; every later lock doubles it. */
  readonly baseLockMs: number;
  /** The ceiling the doubling stops at. */
  readonly maxLockMs: number;
}

/** The spec 06 §5.1 back-off: five failures lock for fifteen minutes, then double to four hours. */
export const DEFAULT_LOCKOUT_POLICY: LockoutPolicy = {
  maxFailures: 5,
  windowMs: 15 * 60_000,
  baseLockMs: 15 * 60_000,
  maxLockMs: 4 * 60 * 60_000,
};

/**
 * The duration of the lock a level earns.
 *
 * Level 1 is the first lock, so it lasts the base duration; level 2 doubles it, and the
 * doubling stops at the ceiling rather than growing without bound.
 */
export function lockoutDurationMs(
  level: number,
  policy: LockoutPolicy = DEFAULT_LOCKOUT_POLICY
): number {
  if (!Number.isInteger(level) || level <= 0) return 0;
  return Math.min(policy.baseLockMs * 2 ** (level - 1), policy.maxLockMs);
}

/** What one key's lockout record means at a given instant. */
export interface LockoutState {
  /** Failures inside the current window; zero while locked. */
  readonly failures: number;
  /** Locks this key has served since its last successful sign-in. */
  readonly level: number;
  /** When the lock lifts, or null when the key is not locked. */
  readonly lockedUntil: Date | null;
  /** Whole seconds until the lock lifts; zero when it is not locked. */
  readonly retryAfterSeconds: number;
}

interface LockoutRow {
  readonly key: string;
  readonly failures: number;
  readonly level: number;
  readonly first_failure_at: string;
  readonly last_failure_at: string;
  readonly locked_until: string | null;
  readonly updated_at: string;
}

export interface LockoutStoreOptions {
  readonly policy?: LockoutPolicy;
  /** The clock. Injectable so a test can step over a lock without waiting. */
  readonly now?: () => Date;
}

/**
 * The lockout state of the hub, one row per key.
 *
 * A key is a namespace plus the normalized username. It is kept apart from the `user` row on
 * purpose: an unknown username is locked exactly like a known one, so the lockout itself
 * cannot be used to learn which accounts exist.
 */
export class LockoutStore {
  private readonly adapter: SqliteAdapter;
  private readonly policy: LockoutPolicy;
  private readonly clock: () => Date;

  constructor(adapter: SqliteAdapter, options: LockoutStoreOptions = {}) {
    this.adapter = adapter;
    this.policy = options.policy ?? DEFAULT_LOCKOUT_POLICY;
    this.clock = options.now ?? (() => new Date());
  }

  /** The policy this store enforces. */
  get currentPolicy(): LockoutPolicy {
    return this.policy;
  }

  /** The state of one key now. */
  async state(key: string): Promise<LockoutState> {
    const row = await this.adapter.get<LockoutRow>(
      'SELECT * FROM auth_lockout WHERE "key" = ?',
      [key]
    );
    return this.stateOf(row, this.clock());
  }

  /**
   * Records a failed sign-in and returns the state it produced.
   *
   * A failure that arrives while the key is locked is not recorded and does not extend the
   * lock: the client is already being refused, and extending it would let an attacker keep a
   * real account locked indefinitely.
   */
  async recordFailure(key: string): Promise<LockoutState> {
    const now = this.clock();
    const row = await this.adapter.get<LockoutRow>(
      'SELECT * FROM auth_lockout WHERE "key" = ?',
      [key]
    );

    const current = this.stateOf(row, now);
    if (current.lockedUntil !== null) return current;

    const withinWindow =
      row !== null && now.getTime() - Date.parse(row.first_failure_at) <= this.policy.windowMs;
    const failures = (withinWindow ? row.failures : 0) + 1;

    let level = row?.level ?? 0;
    let firstFailureAt = withinWindow && row ? row.first_failure_at : now.toISOString();
    let lockedUntil: Date | null = null;
    let storedFailures = failures;

    if (failures >= this.policy.maxFailures) {
      level += 1;
      lockedUntil = new Date(now.getTime() + lockoutDurationMs(level, this.policy));
      // The window restarts at the lock: the failures that caused it are spent, and the next
      // window begins when the lock lifts rather than continuing to accumulate.
      storedFailures = 0;
      firstFailureAt = now.toISOString();
    }

    const timestamp = now.toISOString();
    await this.adapter.run(
      `INSERT INTO auth_lockout
         ("key", "failures", "level", "first_failure_at", "last_failure_at", "locked_until", "updated_at")
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT("key") DO UPDATE SET
         "failures" = excluded."failures",
         "level" = excluded."level",
         "first_failure_at" = excluded."first_failure_at",
         "last_failure_at" = excluded."last_failure_at",
         "locked_until" = excluded."locked_until",
         "updated_at" = excluded."updated_at"`,
      [
        key,
        storedFailures,
        level,
        firstFailureAt,
        timestamp,
        lockedUntil?.toISOString() ?? null,
        timestamp,
      ]
    );

    return {
      failures: storedFailures,
      level,
      lockedUntil,
      retryAfterSeconds:
        lockedUntil === null
          ? 0
          : Math.max(1, Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000)),
    };
  }

  /** Forgets a key: a successful sign-in resets both its failures and its escalation. */
  async clear(key: string): Promise<void> {
    await this.adapter.run('DELETE FROM auth_lockout WHERE "key" = ?', [key]);
  }

  private stateOf(row: LockoutRow | null, now: Date): LockoutState {
    if (row === null) {
      return { failures: 0, level: 0, lockedUntil: null, retryAfterSeconds: 0 };
    }

    const lockedUntilAt = row.locked_until === null ? null : Date.parse(row.locked_until);
    if (lockedUntilAt !== null && lockedUntilAt > now.getTime()) {
      return {
        failures: row.failures,
        level: row.level,
        lockedUntil: new Date(lockedUntilAt),
        retryAfterSeconds: Math.max(1, Math.ceil((lockedUntilAt - now.getTime()) / 1000)),
      };
    }

    // The escalation survives an expired window; only a successful sign-in clears it.
    const elapsed = now.getTime() - Date.parse(row.first_failure_at);
    return {
      failures: elapsed > this.policy.windowMs ? 0 : row.failures,
      level: row.level,
      lockedUntil: null,
      retryAfterSeconds: 0,
    };
  }
}
