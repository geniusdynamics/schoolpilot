// ABOUTME: Guards byte-for-byte parity of legacy generated DDL against the gate base c8e67c5,
// ABOUTME: covering every entry in collectionsDefinition rather than a hand-written sample.

import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { collectionsDefinition } from '@/services/database/collections';
import { SchemaConverter } from '@/services/database/SchemaConverter';
import type { DatabaseSchema } from '@/utils/databaseAgnosticSchema';

import fixture from './fixtures/legacy-ddl-hashes.json';

function legacySql(name: string, schema: DatabaseSchema): string {
  const conversion = SchemaConverter.convertRxDBToSQLite(name, schema);
  return [
    SchemaConverter.generateCreateTableSQL(conversion.sqlSchema),
    ...SchemaConverter.generateCreateIndexSQL(
      conversion.sqlSchema.tableName,
      conversion.indexes
    ),
  ].join('\n');
}

function legacyHash(name: string, schema: DatabaseSchema): string {
  return createHash('sha256').update(legacySql(name, schema)).digest('hex');
}

describe('legacy DDL parity', () => {
  const expectedHashes: Record<string, string> = fixture.hashes;

  it('hashes all 158 registered collections against the gate base', () => {
    const names = Object.keys(collectionsDefinition);
    expect(names).toHaveLength(fixture.count);
    expect(names).toHaveLength(158);

    const actual = Object.fromEntries(
      names.map((name) => [name, legacyHash(name, collectionsDefinition[name].schema)])
    );

    expect(Object.keys(actual).sort()).toEqual(Object.keys(expectedHashes).sort());
    const drift = names.filter((name) => actual[name] !== expectedHashes[name]);
    expect(drift, `legacy DDL drifted for: ${drift.join(', ')}`).toEqual([]);
  });

  it('keeps the three review-sensitive schemas byte-identical', () => {
    const appSettings = legacySql('app_settings', collectionsDefinition.app_settings.schema);
    expect(appSettings).toContain('"id" TEXT NOT NULL PRIMARY KEY');

    // These declare non-id primary keys. The legacy converter only recognised a column
    // literally named `id`, so no PRIMARY KEY clause must appear.
    const stockLevels = legacySql('stock_levels', collectionsDefinition.stock_levels.schema);
    expect(stockLevels).not.toMatch(/"compositeid"[^\n]*PRIMARY KEY/i);

    const studentWallets = legacySql('student_wallets', collectionsDefinition.student_wallets.schema);
    expect(studentWallets).not.toMatch(/"student_id"[^\n]*PRIMARY KEY/i);
  });
});
