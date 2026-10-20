// ABOUTME: Adapter contract tests parameterised over the real Node driver and the sqlite-wasm
// ABOUTME: engine, covering CRUD, transactions, concurrency, binding, generated DDL and constraints.

import { describe, expect, it } from 'vitest';

import { applyCanonicalSchema, canonicalDatabaseSchema, type SqliteAdapter } from '..';
import { ENTITY_NAMES } from '@/domain/schema';

import {
  CONTRACT_ENTITIES,
  driverCases,
  fixtureRow,
  insertRow,
  testId,
} from './helpers';

async function applyContractSchema(adapter: SqliteAdapter): Promise<void> {
  await adapter.applySchema(CONTRACT_ENTITIES.map(canonicalDatabaseSchema));
}

describe.each(driverCases)('SQLite adapter contract ($name)', ({ create }) => {
  it('round-trips a row with a UUID string id', async () => {
    const adapter = await create();
    try {
      await adapter.exec(
        'CREATE TABLE note (id TEXT PRIMARY KEY, body TEXT NOT NULL, created_at TEXT)'
      );

      const id = testId(1);
      const inserted = await adapter.run('INSERT INTO note (id, body) VALUES (?, ?)', [
        id,
        'first note',
      ]);
      expect(inserted.changes).toBe(1);

      expect(await adapter.get<{ id: string; body: string }>('SELECT * FROM note WHERE id = ?', [id]))
        .toEqual({ id, body: 'first note', created_at: null });

      await adapter.run('UPDATE note SET body = ? WHERE id = ?', ['edited', id]);
      expect(await adapter.all('SELECT id, body FROM note')).toEqual([
        { id, body: 'edited' },
      ]);

      const deleted = await adapter.run('DELETE FROM note WHERE id = ?', [id]);
      expect(deleted.changes).toBe(1);
      expect(await adapter.get('SELECT * FROM note')).toBeNull();
    } finally {
      await adapter.close();
    }
  });

  it('commits a transaction and rolls one back', async () => {
    const adapter = await create();
    try {
      await adapter.exec('CREATE TABLE account (id TEXT PRIMARY KEY, balance INTEGER NOT NULL)');

      await adapter.transaction(async (tx) => {
        await tx.run('INSERT INTO account (id, balance) VALUES (?, ?)', [testId(10), 100]);
        await tx.run('INSERT INTO account (id, balance) VALUES (?, ?)', [testId(11), 250]);
      });
      expect(await adapter.get<{ total: number }>('SELECT SUM(balance) AS total FROM account')).toEqual({
        total: 350,
      });

      await expect(
        adapter.transaction(async (tx) => {
          await tx.run('INSERT INTO account (id, balance) VALUES (?, ?)', [testId(12), 999]);
          throw new Error('deliberate rollback');
        })
      ).rejects.toThrow('deliberate rollback');

      expect(await adapter.all('SELECT id FROM account ORDER BY id')).toHaveLength(2);
      // The connection is usable again after a rollback.
      await adapter.run('INSERT INTO account (id, balance) VALUES (?, ?)', [testId(13), 1]);
      expect(await adapter.all('SELECT id FROM account')).toHaveLength(3);
    } finally {
      await adapter.close();
    }
  });

  it('rejects nested transactions and keeps the outer transaction usable', async () => {
    const adapter = await create();
    try {
      await adapter.exec('CREATE TABLE marker (id TEXT PRIMARY KEY)');
      await adapter.transaction(async (tx) => {
        await expect(adapter.transaction(async () => undefined)).rejects.toMatchObject({
          code: 'nested_transaction',
        });
        await expect(adapter.open()).rejects.toMatchObject({ code: 'nested_transaction' });
        await expect(adapter.close()).rejects.toMatchObject({ code: 'nested_transaction' });
        await tx.run('INSERT INTO marker (id) VALUES (?)', [testId(20)]);
      });
      expect(await adapter.all('SELECT id FROM marker')).toEqual([{ id: testId(20) }]);
    } finally {
      await adapter.close();
    }
  });

  it('serves concurrent reads consistently', async () => {
    const adapter = await create();
    try {
      await adapter.exec('CREATE TABLE item (id TEXT PRIMARY KEY, value INTEGER NOT NULL)');
      await adapter.transaction(async (tx) => {
        for (let index = 0; index < 25; index += 1) {
          await tx.run('INSERT INTO item (id, value) VALUES (?, ?)', [testId(1000 + index), index]);
        }
      });

      const reads = await Promise.all(
        Array.from({ length: 10 }, () => adapter.all<{ id: string }>('SELECT id FROM item ORDER BY id'))
      );
      for (const rows of reads) {
        expect(rows).toHaveLength(25);
      }
    } finally {
      await adapter.close();
    }
  });

  it('binds strings, numbers, nulls and booleans without splicing SQL', async () => {
    const adapter = await create();
    try {
      await adapter.exec('CREATE TABLE note (id TEXT PRIMARY KEY, body TEXT NOT NULL, flag INTEGER)');
      const injection = 'quote \' and ? and ; DROP TABLE note; --';
      const id = testId(30);

      await adapter.run('INSERT INTO note (id, body, flag) VALUES (?, ?, ?)', [id, injection, true]);
      expect(await adapter.get('SELECT body FROM note WHERE id = ?', [id])).toEqual({
        body: injection,
      });
      expect(await adapter.get<{ flag: number }>('SELECT flag FROM note WHERE id = ?', [id])).toEqual({
        flag: 1,
      });
      expect(await adapter.get('SELECT ? AS bound', [null])).toEqual({ bound: null });
      expect(await adapter.get<{ echo: string }>('SELECT ? AS echo', ['parameter'])).toEqual({
        echo: 'parameter',
      });
    } finally {
      await adapter.close();
    }
  });

  it('enforces learner and enrolment unique / NOT NULL keys', async () => {
    const adapter = await create();
    try {
      await applyContractSchema(adapter);

      const learner = fixtureRow('learner');
      await insertRow(adapter, 'learner', learner);

      await expect(
        insertRow(adapter, 'learner', { ...learner, id: testId(2001) })
      ).rejects.toMatchObject({ code: 'constraint', constraint: 'unique' });

      const withoutName: Record<string, unknown> = {
        ...fixtureRow('learner'),
        id: testId(2002),
      };
      delete withoutName.given_name;
      await expect(insertRow(adapter, 'learner', withoutName)).rejects.toMatchObject({
        code: 'constraint',
        constraint: 'not_null',
      });

      const enrolment = fixtureRow('enrolment');
      await insertRow(adapter, 'enrolment', enrolment);
      await expect(
        insertRow(adapter, 'enrolment', { ...enrolment, id: testId(2003) })
      ).rejects.toMatchObject({ code: 'constraint', constraint: 'unique' });
    } finally {
      await adapter.close();
    }
  });

  it('rejects a NULL canonical primary key on learner and enrolment', async () => {
    const adapter = await create();
    try {
      await applyContractSchema(adapter);

      const learner = { ...fixtureRow('learner'), id: null };
      await expect(insertRow(adapter, 'learner', learner)).rejects.toMatchObject({
        code: 'constraint',
        constraint: 'not_null',
      });

      const enrolment = { ...fixtureRow('enrolment'), id: null };
      await expect(insertRow(adapter, 'enrolment', enrolment)).rejects.toMatchObject({
        code: 'constraint',
        constraint: 'not_null',
      });
    } finally {
      await adapter.close();
    }
  });

  it('enforces invoice numbers and campus-scoped fee schedule names', async () => {
    const adapter = await create();
    try {
      await applyContractSchema(adapter);

      const invoice = fixtureRow('invoice');
      await insertRow(adapter, 'invoice', invoice);
      await expect(
        insertRow(adapter, 'invoice', { ...invoice, id: testId(3001) })
      ).rejects.toMatchObject({ code: 'constraint', constraint: 'unique' });

      const east = fixtureRow('fee_schedule');
      await insertRow(adapter, 'fee_schedule', east);

      const west = { ...fixtureRow('fee_schedule'), id: testId(3002), campus_id: testId(3999) };
      await insertRow(adapter, 'fee_schedule', west);

      await expect(
        insertRow(adapter, 'fee_schedule', { ...east, id: testId(3003) })
      ).rejects.toMatchObject({ code: 'constraint', constraint: 'unique' });
    } finally {
      await adapter.close();
    }
  });

  it('enforces the partial unique index for campus-less fee schedules', async () => {
    const adapter = await create();
    try {
      await applyContractSchema(adapter);

      const first: Record<string, unknown> = { ...fixtureRow('fee_schedule'), id: testId(4001) };
      delete first.campus_id;
      await insertRow(adapter, 'fee_schedule', first);

      const second: Record<string, unknown> = { ...fixtureRow('fee_schedule'), id: testId(4002) };
      delete second.campus_id;
      await expect(insertRow(adapter, 'fee_schedule', second)).rejects.toMatchObject({
        code: 'constraint',
        constraint: 'unique',
      });

      const campusScoped = { ...fixtureRow('fee_schedule'), id: testId(4003), campus_id: testId(4999) };
      await insertRow(adapter, 'fee_schedule', campusScoped);
    } finally {
      await adapter.close();
    }
  });

  it('enforces mark uniqueness with and without a component', async () => {
    const adapter = await create();
    try {
      await applyContractSchema(adapter);

      const mark = fixtureRow('mark');
      await insertRow(adapter, 'mark', mark);
      await expect(
        insertRow(adapter, 'mark', { ...mark, id: testId(5001) })
      ).rejects.toMatchObject({ code: 'constraint', constraint: 'unique' });

      const componentless: Record<string, unknown> = { ...fixtureRow('mark'), id: testId(5002) };
      delete componentless.component_id;
      await insertRow(adapter, 'mark', componentless);

      const duplicateComponentless: Record<string, unknown> = {
        ...fixtureRow('mark'),
        id: testId(5003),
      };
      delete duplicateComponentless.component_id;
      await expect(insertRow(adapter, 'mark', duplicateComponentless)).rejects.toMatchObject({
        code: 'constraint',
        constraint: 'unique',
      });

      const distinctComponent = { ...componentless, id: testId(5004), component_id: testId(5999) };
      await insertRow(adapter, 'mark', distinctComponent);
    } finally {
      await adapter.close();
    }
  });

  it('applies the full 68-entity DDL to an empty database', async () => {
    const adapter = await create();
    try {
      await applyCanonicalSchema(adapter);

      const tables = await adapter.all<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      );
      expect(ENTITY_NAMES).toHaveLength(68);
      expect(tables).toHaveLength(ENTITY_NAMES.length);

      const uniqueIndexes = await adapter.all<{ name: string; sql: string | null }>(
        "SELECT name, sql FROM sqlite_master WHERE type = 'index' AND name LIKE 'uq_%'"
      );
      const byName = new Map(uniqueIndexes.map((index) => [index.name, index.sql ?? '']));
      expect(byName.has('uq_learner_institution_id_admission_number')).toBe(true);
      expect(
        byName.get('uq_mark_assessment_id_enrolment_id_learning_area_id_partial')
      ).toMatch(/WHERE component_id IS NULL/);
      expect(byName.get('uq_fee_schedule_institution_id_name_version_partial')).toMatch(
        /WHERE campus_id IS NULL/
      );
      expect(
        await adapter.all("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_learner_status'")
      ).toEqual([{ name: 'idx_learner_status' }]);

      const learnerTable = await adapter.get<{ sql: string }>(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'learner'"
      );
      expect(learnerTable?.sql).toContain('REFERENCES "institution"("id")');
      expect(learnerTable?.sql).toContain('"given_name" TEXT NOT NULL');
      expect(learnerTable?.sql).toContain('"id" TEXT NOT NULL PRIMARY KEY');

      const learnerColumns = await adapter.all<{ name: string; notnull: number }>(
        'PRAGMA table_info("learner")'
      );
      expect(learnerColumns.find((column) => column.name === 'id')).toMatchObject({
        name: 'id',
        notnull: 1,
      });

      // Re-applying is a no-op: every statement uses IF NOT EXISTS.
      await applyCanonicalSchema(adapter);
      const afterSecondApply = await adapter.all(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
      );
      expect(afterSecondApply).toHaveLength(ENTITY_NAMES.length);
    } finally {
      await adapter.close();
    }
  }, 30000);
});

describe('SQLite adapter lifecycle (node)', () => {
  it('refuses statements before open and after close', async () => {
    const adapter = await driverCases[0].create();
    await adapter.close();

    try {
      await expect(adapter.all('SELECT 1')).rejects.toMatchObject({ code: 'not_open' });
      await adapter.open();
      expect(await adapter.get('SELECT 1 AS value')).toEqual({ value: 1 });
    } finally {
      await adapter.close();
    }
  });
});
