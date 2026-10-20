// ABOUTME: The interactive level mapping: the proposal rule, the operator's corrections, the
// ABOUTME: decisions kept in the database, and the decision a re-run uses.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  applyCanonicalSchema,
  createNodeSqliteAdapter,
  type SqliteAdapter,
} from '@/data/adapters/sqlite';

import { legacyKey } from './001-legacy-calendar';
import { buildClassGroupFixture, migrateCalendar } from './002-legacy-fixture';
import {
  LEVEL_MAPPING_TABLE,
  levelMappingKey,
  proposeAcademicYear,
  proposeLevelMapping,
  readLevelMapping,
  readLevelMappingSource,
  saveLevelMapping,
  type LevelMappingEntry,
  type LevelMappingSource,
} from './002-level-mapping';

async function createAdapter(): Promise<SqliteAdapter> {
  const adapter = createNodeSqliteAdapter({ filename: ':memory:' });
  await adapter.open();
  await applyCanonicalSchema(adapter);
  await buildClassGroupFixture(adapter, {
    withStreamlessClass: false,
    withOrphanStream: false,
    withOrphanLearner: false,
  });
  await migrateCalendar(adapter);
  return adapter;
}

/** The proposal the step shows for the seed classes. */
async function proposeSeed(adapter: SqliteAdapter): Promise<{
  source: LevelMappingSource;
  entries: readonly LevelMappingEntry[];
}> {
  const source = await readLevelMappingSource(adapter);
  const proposal = proposeLevelMapping(source, { referenceDate: '2024-10-01' });
  return { source, entries: proposal.entries };
}

/** Saves the entries the way the step does, with a confirmation timestamp. */
async function save(adapter: SqliteAdapter, entries: readonly LevelMappingEntry[]): Promise<void> {
  await adapter.transaction(async (tx) => {
    await saveLevelMapping(
      tx,
      entries.map((entry) => ({ ...entry, confirmedAt: '2024-10-01T09:00:00Z' }))
    );
  });
}

describe('the level mapping proposal', () => {
  let adapter: SqliteAdapter;

  beforeEach(async () => {
    adapter = await createAdapter();
  });

  afterEach(async () => {
    await adapter.close();
  });

  it('proposes a level from the class name and the year that covers the migration day', async () => {
    const { source, entries } = await proposeSeed(adapter);

    // Four classes, two streams each except Form 3 and Form 4.
    expect(source.classes.map((entry) => entry.name)).toEqual([
      'Form 1',
      'Form 2',
      'Form 3',
      'Form 4',
    ]);
    expect(entries).toHaveLength(6);

    const formOne = entries.filter((entry) => entry.legacyClassName === 'Form 1');
    expect(formOne).toHaveLength(2);
    for (const entry of formOne) {
      expect(entry.level.name).toBe('Form 1');
      expect(entry.level.code).toBe('FORM-1');
      expect(entry.level.ordinal).toBe(1);
      expect(entry.levelConfidence).toBe('high');
      expect(entry.academicYearId).not.toBe('');
      expect(entry.yearConfidence).toBe('high');
      expect(entry.yearRule).toContain('2024-10-01');
      expect(entry.confirmedAt).toBeNull();
    }

    // The last class is the final level.
    const formFour = entries.filter((entry) => entry.legacyClassName === 'Form 4');
    expect(formFour.every((entry) => entry.level.isTerminal)).toBe(true);
    expect(formOne.every((entry) => entry.level.isTerminal)).toBe(false);
  });

  it('keeps two streams with the same name in different classes apart', async () => {
    const { entries } = await proposeSeed(adapter);
    const formOneA = entries.find(
      (entry) => entry.legacyClassName === 'Form 1' && entry.legacyStreamName === 'A'
    );
    const formTwoA = entries.find(
      (entry) => entry.legacyClassName === 'Form 2' && entry.legacyStreamName === 'A'
    );

    expect(formOneA).toBeDefined();
    expect(formTwoA).toBeDefined();
    expect(formOneA?.legacyStreamId).not.toBe(formTwoA?.legacyStreamId);
    expect(formOneA?.level.name).not.toBe(formTwoA?.level.name);
  });

  it('is unsure about a class name that carries no number', async () => {
    await adapter.run(
      `INSERT INTO "classes" (id, name, streams) VALUES (?, ?, ?)`,
      ['6.0', 'Senior', '[]']
    );
    const source = await readLevelMappingSource(adapter);
    const proposal = proposeLevelMapping(source, { referenceDate: '2024-10-01' });
    const senior = proposal.entries.find((entry) => entry.legacyClassName === 'Senior');

    expect(senior).toBeDefined();
    expect(senior?.level.name).toBe('Senior');
    expect(senior?.level.code).toBe('SENIOR');
    expect(senior?.levelConfidence).toBe('low');
    expect(senior?.levelRule).toContain('carries no number');
    // The class with no streams gets one default class group.
    expect(senior?.legacyStreamId).toBe('');
  });

  it('reports a stream whose class the legacy database does not hold', async () => {
    const adapterWithOrphan = createNodeSqliteAdapter({ filename: ':memory:' });
    await adapterWithOrphan.open();
    try {
      await applyCanonicalSchema(adapterWithOrphan);
      await buildClassGroupFixture(adapterWithOrphan, { withStreamlessClass: false });
      await migrateCalendar(adapterWithOrphan);
      const source = await readLevelMappingSource(adapterWithOrphan);
      const proposal = proposeLevelMapping(source, { referenceDate: '2024-10-01' });

      expect(proposal.orphanStreams.map((stream) => stream.id)).toContain('90');
      expect(proposal.entries.some((entry) => entry.legacyStreamId === '90')).toBe(false);
    } finally {
      await adapterWithOrphan.close();
    }
  });

  it('falls back to the current year, then the latest ended year, then the earliest to come', () => {
    const years = [
      { id: 'a', name: 'AY 2023/2024', startDate: '2023-09-01', endDate: '2024-06-30', status: 'closed' },
      { id: 'b', name: 'AY 2024/2025', startDate: '2024-09-01', endDate: '2025-06-30', status: 'current' },
    ];
    expect(proposeAcademicYear(years, '2024-10-01').yearId).toBe('b');
    expect(proposeAcademicYear(years, '2024-07-15').yearId).toBe('b');
    expect(proposeAcademicYear(years, '2025-08-01').yearId).toBe('b');

    const ended = proposeAcademicYear(
      [
        { id: 'a', name: 'AY 2023/2024', startDate: '2023-09-01', endDate: '2024-06-30', status: '' },
        { id: 'b', name: 'AY 2024/2025', startDate: '2024-09-01', endDate: '2025-06-30', status: '' },
      ],
      '2024-07-15'
    );
    expect(ended.yearId).toBe('a');
    expect(ended.rule).toContain('latest academic year that had ended');

    const upcoming = proposeAcademicYear(
      [{ id: 'c', name: 'AY 2025/2026', startDate: '2025-09-01', endDate: '2026-06-30', status: '' }],
      '2024-07-15'
    );
    expect(upcoming.yearId).toBe('c');
    expect(upcoming.confidence).toBe('low');

    expect(proposeAcademicYear([], '2024-07-15').yearId).toBe('');
  });
});

describe('the level mapping the operator confirms', () => {
  let adapter: SqliteAdapter;

  beforeEach(async () => {
    adapter = await createAdapter();
  });

  afterEach(async () => {
    await adapter.close();
  });

  it('saves the proposal with the operator corrections, and reads it back', async () => {
    const { entries } = await proposeSeed(adapter);
    const corrected = entries.map((entry) =>
      entry.legacyClassName === 'Form 2'
        ? {
            ...entry,
            level: { ...entry.level, name: 'Grade 9', code: 'G9', ordinal: 9 },
            operatorCorrected: true,
          }
        : entry
    );
    await save(adapter, corrected);

    const saved = await readLevelMapping(adapter);
    expect(saved).toHaveLength(6);
    const formTwo = saved.filter((entry) => entry.legacyClassName === 'Form 2');
    expect(formTwo).toHaveLength(2);
    for (const entry of formTwo) {
      expect(entry.level.name).toBe('Grade 9');
      expect(entry.level.code).toBe('G9');
      expect(entry.level.ordinal).toBe(9);
      expect(entry.operatorCorrected).toBe(true);
      expect(entry.confirmedAt).toBe('2024-10-01T09:00:00Z');
    }
    const formOne = saved.filter((entry) => entry.legacyClassName === 'Form 1');
    expect(formOne.every((entry) => entry.level.name === 'Form 1')).toBe(true);
    expect(formOne.every((entry) => entry.operatorCorrected === false)).toBe(true);
  });

  it('replaces the saved mapping rather than merging two confirmations', async () => {
    const { entries } = await proposeSeed(adapter);
    await save(adapter, entries);
    expect(await readLevelMapping(adapter)).toHaveLength(6);

    await save(adapter, [entries[0]]);
    const saved = await readLevelMapping(adapter);
    expect(saved).toHaveLength(1);
    expect(saved[0].legacyClassId).toBe(entries[0].legacyClassId);
  });

  it('uses the normalised legacy key, so the doubles the provider writes are one id', async () => {
    const { entries } = await proposeSeed(adapter);
    await save(adapter, entries);

    const rows = await adapter.all<{ legacy_class_id: string; legacy_stream_id: string }>(
      `SELECT legacy_class_id, legacy_stream_id FROM "${LEVEL_MAPPING_TABLE}" ORDER BY legacy_class_id`
    );
    expect(rows.length).toBe(6);
    expect(rows[0].legacy_class_id).toBe('1');
    expect(rows.some((row) => row.legacy_class_id.includes('.0'))).toBe(false);
    expect(legacyKey('1.0')).toBe('1');
    expect(levelMappingKey('1', '2')).not.toBe(levelMappingKey('1', ''));
  });

  it('refuses a row without a level or without an academic year', async () => {
    const { entries } = await proposeSeed(adapter);
    await expect(
      adapter.transaction(async (tx) => {
        await saveLevelMapping(tx, [{ ...entries[0], academicYearId: '' }]);
      })
    ).rejects.toThrow('needs an academic year');

    await expect(
      adapter.transaction(async (tx) => {
        await saveLevelMapping(tx, [
          { ...entries[0], level: { ...entries[0].level, name: '' } },
        ]);
      })
    ).rejects.toThrow('needs a level name and a level code');

    await expect(
      adapter.transaction(async (tx) => {
        await saveLevelMapping(tx, [entries[0], entries[0]]);
      })
    ).rejects.toThrow('twice');
  });

  it('reads the saved decision back as the confirmed mapping', async () => {
    const { entries } = await proposeSeed(adapter);
    await save(adapter, entries);

    const source = await readLevelMappingSource(adapter);
    expect(source.confirmed).toHaveLength(entries.length);
    expect(source.confirmed[0].confirmedAt).toBe('2024-10-01T09:00:00Z');
  });
});
