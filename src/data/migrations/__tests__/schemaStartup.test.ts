// ABOUTME: Proves the canonical start-up path applies the module schemas: opens the repository the
// ABOUTME: app opens, then reads the tables the opening left on the adapter it used.

import { describe, expect, it, vi } from 'vitest';

import type { SqliteAdapter } from '@/data/adapters/sqlite';

import { readSchemaVersion } from '../schemaStartup';

/** The adapters the start-up path handed to the schema migration, in order. */
const opened = vi.hoisted(() => ({ adapters: [] as unknown[] }));

vi.mock('../schemaStartup', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../schemaStartup')>();
  return {
    ...actual,
    applySchemaMigrations: async (adapter: SqliteAdapter) => {
      opened.adapters.push(adapter);
      return actual.applySchemaMigrations(adapter);
    },
  };
});

interface TableRow {
  readonly name: string;
}

describe('the canonical start-up path', () => {
  it('applies the module schemas before it hands the repository out', async () => {
    const { openCanonicalRepository } = await import('@/data/canonicalRepository');

    const repository = await openCanonicalRepository();

    expect(repository).toBeTruthy();
    expect(opened.adapters).toHaveLength(1);

    // The adapter the app opened is the one the schemas were applied to: read the tables back
    // from it, so this is a real opening and not a call that happened to be counted.
    const adapter = opened.adapters[0] as SqliteAdapter;
    const tables = await adapter.all<TableRow>(
      `SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`
    );
    const names = tables.map((row) => row.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'sequence_counter',
        'sequence_number',
        'sequence_block',
        'journal_entry',
        'journal_line',
        'ledger_period',
        'reconciliation_statement',
        'reconciliation_line',
        'reconciliation_match',
        'subscription',
      ])
    );

    const version = await readSchemaVersion(adapter);
    expect(version.complete).toBe(true);
    expect(version.applied.map((entry) => entry.version)).toEqual([100, 101, 102, 103]);
  });
});
