// ABOUTME: Tests for the spec 02 §9 attendance and pastoral schemas: the refinements they
// ABOUTME: carry, the natural keys that keep registers unambiguous and the DDL they produce.

import { describe, expect, it } from 'vitest';

import {
  applyCanonicalSchema,
  createNodeSqliteAdapter,
  type SqliteAdapter,
  type SqliteBindValue,
} from '@/data/adapters/sqlite';
import { SchemaConverter } from '@/services/database/SchemaConverter';

import { databaseSchemaFor, entityDefinitions, labelOf, type EntityName } from '../index';
import { validFixtures } from './fixtures';

function accepts(name: EntityName, row: unknown): boolean {
  return entityDefinitions[name].schema.safeParse(row).success;
}

function tableFor(entity: EntityName) {
  const storage = entityDefinitions[entity].storage;
  const schema = databaseSchemaFor(entity);
  const conversion = SchemaConverter.convertRxDBToSQLite(storage.table, schema);
  return {
    schema,
    storage,
    conversion,
    sql: SchemaConverter.generateCreateTableSQL(conversion.sqlSchema),
  };
}

describe('attendance session refinements', () => {
  it('accepts a register for a class group', () => {
    expect(accepts('attendance_session', validFixtures.attendance_session)).toBe(true);
  });

  it('accepts a register for a teaching group', () => {
    const row = structuredClone(validFixtures.attendance_session);
    delete row.class_group_id;
    row.teaching_group_id = validFixtures.teaching_group.id;
    expect(accepts('attendance_session', row)).toBe(true);
  });

  it('accepts a boarding roll-call for a residence', () => {
    const row = structuredClone(validFixtures.attendance_session);
    delete row.class_group_id;
    row.residence_id = validFixtures.residence.id;
    row.session = 'roll_call';
    expect(accepts('attendance_session', row)).toBe(true);
  });

  it('rejects a register that covers two scopes', () => {
    const row = structuredClone(validFixtures.attendance_session);
    row.teaching_group_id = validFixtures.teaching_group.id;
    expect(accepts('attendance_session', row)).toBe(false);
  });

  it('rejects a register that covers no scope', () => {
    const row = structuredClone(validFixtures.attendance_session);
    delete row.class_group_id;
    expect(accepts('attendance_session', row)).toBe(false);
  });

  it('accepts a register without an academic period', () => {
    const row: Record<string, unknown> = { ...structuredClone(validFixtures.attendance_session) };
    delete row.academic_period_id;
    expect(accepts('attendance_session', row)).toBe(true);
  });

  it('requires a lesson for a period_n register', () => {
    const row = structuredClone(validFixtures.attendance_session);
    row.session = 'period_n';
    expect(accepts('attendance_session', row)).toBe(false);

    row.period_number = 2;
    expect(accepts('attendance_session', row)).toBe(true);
  });

  it('rejects a negative lesson number', () => {
    const row = structuredClone(validFixtures.attendance_session);
    row.session = 'period_n';
    row.period_number = -1;
    expect(accepts('attendance_session', row)).toBe(false);
  });
});

describe('attendance mark refinements', () => {
  it('requires a reason when the learner did not attend', () => {
    for (const status of ['absent', 'excused', 'medical', 'exeat', 'suspended'] as const) {
      const row = structuredClone(validFixtures.attendance_mark);
      row.status = status;
      delete row.reason;
      expect(accepts('attendance_mark', row), status).toBe(false);
    }
  });

  it('accepts a present mark without a reason', () => {
    const row = structuredClone(validFixtures.attendance_mark);
    row.status = 'present';
    delete row.reason;
    expect(accepts('attendance_mark', row)).toBe(true);
  });

  it('requires the minutes late for a late mark', () => {
    const row = structuredClone(validFixtures.attendance_mark);
    row.status = 'late';
    row.minutes_late = 20;
    expect(accepts('attendance_mark', row)).toBe(true);

    delete row.minutes_late;
    expect(accepts('attendance_mark', row)).toBe(false);
  });

  it('rejects an unknown status and an unknown reason', () => {
    const unknownStatus = { ...structuredClone(validFixtures.attendance_mark), status: 'unknown' };
    expect(accepts('attendance_mark', unknownStatus)).toBe(false);

    const unknownReason = { ...structuredClone(validFixtures.attendance_mark), reason: 'traffic' };
    expect(accepts('attendance_mark', unknownReason)).toBe(false);
  });

  it('rejects an id that is not a uuid version 7', () => {
    const row = structuredClone(validFixtures.attendance_mark);
    row.id = '00000000-0000-4000-8000-000000000001';
    expect(accepts('attendance_mark', row)).toBe(false);
  });

  it('rejects unknown keys', () => {
    const row = { ...structuredClone(validFixtures.attendance_mark), __unexpected: true };
    expect(accepts('attendance_mark', row)).toBe(false);
  });
});

describe('leave out refinements', () => {
  it('rejects a due back before the learner left', () => {
    const row = structuredClone(validFixtures.leave_out);
    row.due_back_at = '2027-01-06T09:00:00Z';
    expect(accepts('leave_out', row)).toBe(false);
  });

  it('rejects a return before the learner left', () => {
    const row = structuredClone(validFixtures.leave_out);
    row.returned_at = '2027-01-06T09:00:00Z';
    expect(accepts('leave_out', row)).toBe(false);
  });

  it('accepts a leave-out that has not come back yet', () => {
    const row = structuredClone(validFixtures.leave_out);
    row.returned_at = null;
    expect(accepts('leave_out', row)).toBe(true);
  });

  it('rejects an unknown leave-out kind', () => {
    const row = { ...structuredClone(validFixtures.leave_out), kind: 'vacation' };
    expect(accepts('leave_out', row)).toBe(false);
  });
});

describe('conduct and health records', () => {
  it('rejects an unknown incident category', () => {
    const row = { ...structuredClone(validFixtures.conduct_incident), category: 'misconduct' };
    expect(accepts('conduct_incident', row)).toBe(false);
  });

  it('records incidents without a natural key', () => {
    expect(entityDefinitions.conduct_incident.storage.unique).toEqual([]);
  });

  it('keeps the clinical detail of a health visit encrypted', () => {
    expect(entityDefinitions.health_visit.storage.encrypted).toEqual(['complaint', 'treatment']);
  });

  it('rejects a health visit with a non-boolean referral flag', () => {
    const row = { ...structuredClone(validFixtures.health_visit), referred: 'yes' };
    expect(accepts('health_visit', row)).toBe(false);
  });
});

describe('attendance natural keys', () => {
  it('keeps one mark per session and learner', () => {
    expect(entityDefinitions.attendance_mark.storage.unique).toEqual([
      ['attendance_session_id', 'learner_id'],
    ]);
  });

  it('gives every register scope and every lesson case its own partial unique key', () => {
    expect(entityDefinitions.attendance_session.storage.unique).toEqual([
      {
        columns: ['institution_id', 'class_group_id', 'date', 'session', 'period_number'],
        where: 'class_group_id IS NOT NULL AND period_number IS NOT NULL',
      },
      {
        columns: ['institution_id', 'class_group_id', 'date', 'session'],
        where: 'class_group_id IS NOT NULL AND period_number IS NULL',
      },
      {
        columns: ['institution_id', 'teaching_group_id', 'date', 'session', 'period_number'],
        where: 'teaching_group_id IS NOT NULL AND period_number IS NOT NULL',
      },
      {
        columns: ['institution_id', 'teaching_group_id', 'date', 'session'],
        where: 'teaching_group_id IS NOT NULL AND period_number IS NULL',
      },
      {
        columns: ['institution_id', 'residence_id', 'date', 'session', 'period_number'],
        where: 'residence_id IS NOT NULL AND period_number IS NOT NULL',
      },
      {
        columns: ['institution_id', 'residence_id', 'date', 'session'],
        where: 'residence_id IS NOT NULL AND period_number IS NULL',
      },
    ]);
  });
});

describe('attendance DDL bridge', () => {
  it('generates the attendance_session table with its scope references', () => {
    const { conversion, sql, schema } = tableFor('attendance_session');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "attendance_session"');
    expect(sql).toContain('"date" TEXT');
    expect(sql).toContain('"session" TEXT');
    expect(sql).toContain('"period_number" INTEGER');
    expect(sql).toContain('"locked" INTEGER');
    expect(sql).toContain('"class_group_id" TEXT');

    // A04 turns the required list into NOT NULL and the refs into foreign keys.
    expect(schema.required).toEqual(
      expect.arrayContaining(['date', 'session', 'locked', 'taken_by'])
    );
    // The academic period is optional: a register for a date no period covers is writable.
    expect(schema.required).not.toContain('academic_period_id');
    expect(schema.properties.class_group_id.ref).toBe('class_group');
    expect(schema.properties.academic_period_id.ref).toBe('academic_period');
    expect(schema.properties.taken_by.ref).toBe('staff');

    expect(conversion.relationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ localColumn: 'academic_period_id', targetTable: 'academic_period' }),
        expect.objectContaining({ localColumn: 'residence_id', targetTable: 'residence' }),
      ])
    );
    expect(conversion.indexes.map((index) => index.name)).toEqual(
      expect.arrayContaining([
        'idx_attendance_session_date',
        'idx_attendance_session_period_number',
        'idx_attendance_session_class_group_id',
      ])
    );
  });

  it('generates the attendance_mark table with its session and learner references', () => {
    const { conversion, sql, schema } = tableFor('attendance_mark');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "attendance_mark"');
    expect(sql).toContain('"status" TEXT');
    expect(sql).toContain('"minutes_late" INTEGER');
    expect(schema.required).toEqual(expect.arrayContaining(['status', 'learner_id']));
    expect(schema.properties.attendance_session_id.ref).toBe('attendance_session');
    expect(schema.properties.learner_id.ref).toBe('learner');

    expect(conversion.relationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          localColumn: 'attendance_session_id',
          targetTable: 'attendance_session',
        }),
        expect.objectContaining({ localColumn: 'learner_id', targetTable: 'learner' }),
      ])
    );
    expect(entityDefinitions.attendance_mark.storage.unique).toEqual([
      ['attendance_session_id', 'learner_id'],
    ]);
  });
});

describe('attendance labels', () => {
  it('labels a register by its session and date', () => {
    expect(labelOf('attendance_session', validFixtures.attendance_session)).toBe('am · 2027-01-06');
  });

  it('labels a mark, a leave-out, an incident and a health visit', () => {
    const learner = validFixtures.learner.id;
    expect(labelOf('attendance_mark', validFixtures.attendance_mark)).toBe(`absent · ${learner}`);
    expect(labelOf('leave_out', validFixtures.leave_out)).toBe(`exeat · ${learner}`);
    expect(labelOf('conduct_incident', validFixtures.conduct_incident)).toBe('behaviour · 2027-01-07');
    expect(labelOf('health_visit', validFixtures.health_visit)).toBe(`2027-01-07 · ${learner}`);
  });
});

describe('attendance register uniqueness in a real database', () => {
  const DATE = '2027-01-06';

  function sessionRow(overrides: Record<string, SqliteBindValue> = {}): Record<string, SqliteBindValue> {
    return {
      id: '00000000-0000-7000-8000-000000000401',
      institution_id: validFixtures.institution.id,
      academic_period_id: validFixtures.academic_period.id,
      date: DATE,
      session: 'period_n',
      period_number: 2,
      class_group_id: validFixtures.class_group.id,
      teaching_group_id: null,
      residence_id: null,
      taken_by: validFixtures.staff.id,
      taken_at: '2027-01-06T08:05:00Z',
      locked: 0,
      created_at: '2027-01-06T08:05:00Z',
      updated_at: '2027-01-06T08:05:00Z',
      ...overrides,
    };
  }

  async function insertRegister(
    adapter: SqliteAdapter,
    row: Record<string, SqliteBindValue>
  ): Promise<void> {
    const columns = Object.keys(row);
    const sql = `INSERT INTO "attendance_session" (${columns
      .map((column) => `"${column}"`)
      .join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
    await adapter.run(
      sql,
      columns.map((column) => row[column])
    );
  }

  async function withDatabase(run: (adapter: SqliteAdapter) => Promise<void>): Promise<void> {
    const adapter = createNodeSqliteAdapter({ filename: ':memory:' });
    await adapter.open();
    try {
      await applyCanonicalSchema(adapter);
      await run(adapter);
    } finally {
      await adapter.close();
    }
  }

  it('accepts two lessons of the same day and rejects a repeated one', async () => {
    await withDatabase(async (adapter) => {
      await insertRegister(adapter, sessionRow({ id: '00000000-0000-7000-8000-000000000401' }));
      await insertRegister(adapter, sessionRow({ id: '00000000-0000-7000-8000-000000000402', period_number: 3 }));

      await expect(
        insertRegister(adapter, sessionRow({ id: '00000000-0000-7000-8000-000000000403' }))
      ).rejects.toMatchObject({ code: 'constraint', constraint: 'unique' });
    });
  });

  it('still rejects two registers without a lesson', async () => {
    await withDatabase(async (adapter) => {
      await insertRegister(adapter, sessionRow({
        id: '00000000-0000-7000-8000-000000000404',
        session: 'am',
        period_number: null,
      }));

      await expect(
        insertRegister(adapter, sessionRow({
          id: '00000000-0000-7000-8000-000000000405',
          session: 'am',
          period_number: null,
        }))
      ).rejects.toMatchObject({ code: 'constraint', constraint: 'unique' });
    });
  });

  it('keeps the scopes apart and accepts a register without an academic period', async () => {
    await withDatabase(async (adapter) => {
      await insertRegister(adapter, sessionRow({
        id: '00000000-0000-7000-8000-000000000406',
        academic_period_id: null,
      }));
      await insertRegister(adapter, sessionRow({
        id: '00000000-0000-7000-8000-000000000407',
        class_group_id: null,
        teaching_group_id: validFixtures.teaching_group.id,
      }));

      const rows = await adapter.all<{ id: string; period_number: number | null }>(
        'SELECT id, period_number FROM "attendance_session" ORDER BY id'
      );
      expect(rows).toHaveLength(2);
    });
  });
});
