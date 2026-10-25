// ABOUTME: The startup sweep that seals restricted values a database already held in plaintext,
// ABOUTME: so a hub that adopts encryption does not leave older rows readable.

import type { SqliteAdapter, SqliteBindValue } from '@/data/adapters/sqlite';
import type { FieldCipher } from '@/data/security';
import type { EntityName } from '@/domain/schema';

import { encryptedTables, tableExists } from './encryptedColumns';

/** What the sweep sealed, per entity. */
export interface SealedRowCount {
  readonly entity: EntityName;
  readonly rows: number;
}

/**
 * Seals every plaintext restricted value in the database, in one transaction per table.
 *
 * The sweep is a data migration, not a user write: it does not touch the concurrency counter and
 * it writes no audit event, because the repository's trail records what people did and nobody did
 * this. Values that already carry the envelope are left alone, so the sweep is idempotent and safe
 * on every start.
 */
export async function sealRestrictedData(
  adapter: SqliteAdapter,
  cipher: FieldCipher
): Promise<readonly SealedRowCount[]> {
  const sealed: SealedRowCount[] = [];

  for (const { entity, table, primaryKey, columns } of encryptedTables()) {
    if (!(await tableExists(adapter, table))) continue;

    const project = [primaryKey, ...columns].map((name) => `"${name}"`).join(', ');
    const rows = await adapter.transaction(async (tx) => {
      const stored = await tx.all<Record<string, SqliteBindValue>>(
        `SELECT ${project} FROM "${table}"`
      );

      let count = 0;
      for (const row of stored) {
        const plaintext = columns.filter(
          (column) => typeof row[column] === 'string' && !cipher.isSealed(row[column] as string)
        );
        if (plaintext.length === 0) continue;

        await tx.run(
          `UPDATE "${table}" SET ${plaintext.map((column) => `"${column}" = ?`).join(', ')}
             WHERE "${primaryKey}" = ?`,
          [
            ...plaintext.map((column) => cipher.seal(row[column] as string)),
            row[primaryKey] ?? null,
          ]
        );
        count += 1;
      }
      return count;
    });

    sealed.push({ entity, rows });
  }

  return sealed;
}
