// ABOUTME: Where the restricted columns live: the encrypted column list per entity, and the
// ABOUTME: table-existence check the key loader and the sealing sweep both need.

import type { SqliteTransaction } from '@/data/adapters/sqlite';
import { ENTITY_NAMES, storageFor, type EntityName } from '@/domain/schema';

/** One entity that stores encrypted columns, with its table and those columns. */
export interface EncryptedTable {
  readonly entity: EntityName;
  readonly table: string;
  readonly primaryKey: string;
  readonly columns: readonly string[];
}

/** Every entity whose storage metadata declares encrypted columns. */
export function encryptedTables(): readonly EncryptedTable[] {
  const tables: EncryptedTable[] = [];
  for (const entity of ENTITY_NAMES) {
    const storage = storageFor(entity);
    if (storage.encrypted.length === 0) continue;
    tables.push({
      entity,
      table: storage.table,
      primaryKey: storage.primaryKey,
      columns: storage.encrypted,
    });
  }
  return tables;
}

/** True when the database already holds the table. */
export async function tableExists(
  runner: SqliteTransaction,
  table: string
): Promise<boolean> {
  const row = await runner.get<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
    [table]
  );
  return row !== null;
}
