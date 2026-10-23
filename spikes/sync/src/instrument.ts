// ABOUTME: Counts the statements the storage engine executes, by wrapping the driver that sits
// ABOUTME: under the adapter, so one sync operation's cost can be read as a number of round trips.

import type { SqliteAdapter, SqliteDriver } from '@/data/adapters/sqlite';

/** The counter around one adapter, read after each operation and restored when the test ends. */
export interface StatementCounter {
  /** The driver calls recorded since the last reset; one call carries one SQL statement. */
  read(): number;
  /** Forgets what was recorded, so the next operation is counted alone. */
  reset(): void;
  /** Puts the driver's own methods back. */
  restore(): void;
}

const DRIVER_METHODS = ['exec', 'all', 'get', 'run'] as const;

/**
 * Counts the driver calls one adapter makes.
 *
 * Every statement the repository issues reaches the engine as a call on the driver below the
 * adapter core: the public methods hand the same work to these, and a transaction callback's
 * statements do too. Wrapping them therefore counts the statements an operation really costs,
 * on SQLite and on Postgres alike, without the repository knowing.
 */
export function countStatements(adapter: SqliteAdapter): StatementCounter {
  const driver = (adapter as unknown as { driver: SqliteDriver }).driver;
  const target = driver as unknown as Record<string, (...args: unknown[]) => unknown>;
  const originals = new Map<string, (...args: unknown[]) => unknown>();
  let statements = 0;

  for (const method of DRIVER_METHODS) {
    const original = target[method];
    if (typeof original !== 'function') continue;
    originals.set(method, original);
    target[method] = (...args: unknown[]) => {
      statements += 1;
      return original.apply(driver, args);
    };
  }

  return {
    read: () => statements,
    reset: () => {
      statements = 0;
    },
    restore: () => {
      for (const [method, original] of originals) target[method] = original;
    },
  };
}
