// ABOUTME: Tests for the academic scope resolver: the Year → Class → Stream → Period cascade
// ABOUTME: that every learner-facing report and grid shares. Pure rows in, validated scope out.

import { describe, expect, it } from 'vitest';

import { resolveAcademicScope, type ScopeRows } from '../scope';

const ROWS: ScopeRows = {
  years: [
    { id: 'y2025', name: '2025', start_date: '2025-01-06', end_date: '2025-11-28', status: 'closed' },
    { id: 'y2026', name: '2026', start_date: '2026-01-05', end_date: '2026-11-27', status: 'current' },
    { id: 'y2027', name: '2027', start_date: '2027-01-04', end_date: '2027-11-26', status: 'planned' },
  ],
  periods: [
    { id: 'p2026-1', name: 'Term 1', academic_year_id: 'y2026', kind: 'term', sequence: 1, start_date: '2026-01-05', end_date: '2026-04-03', status: 'closed' },
    { id: 'p2026-2', name: 'Term 2', academic_year_id: 'y2026', kind: 'term', sequence: 2, start_date: '2026-05-04', end_date: '2026-08-07', status: 'current' },
    { id: 'p2025-1', name: 'Term 1', academic_year_id: 'y2025', kind: 'term', sequence: 1, start_date: '2025-01-06', end_date: '2025-04-04', status: 'closed' },
  ],
  levels: [
    { id: 'grade7', name: 'Grade 7', ordinal: 7 },
    { id: 'grade8', name: 'Grade 8', ordinal: 8 },
  ],
  classGroups: [
    { id: 'g7e', name: 'East', academic_year_id: 'y2026', level_id: 'grade7' },
    { id: 'g7w', name: 'West', academic_year_id: 'y2026', level_id: 'grade7' },
    { id: 'g8e', name: 'East', academic_year_id: 'y2026', level_id: 'grade8' },
    { id: 'old7e', name: 'East', academic_year_id: 'y2025', level_id: 'grade7' },
  ],
};

const TODAY = '2026-06-15';

describe('resolveAcademicScope', () => {
  it('defaults to the year the calendar is in, not merely the flagged one', () => {
    const scope = resolveAcademicScope({ rows: ROWS, selection: {}, today: TODAY });
    expect(scope.effective.yearId).toBe('y2026');
  });

  it('falls back to the flagged current year when today is between years', () => {
    const scope = resolveAcademicScope({ rows: ROWS, selection: {}, today: '2026-12-31' });
    expect(scope.effective.yearId).toBe('y2026');
  });

  it('lists only the levels that have a class group in the chosen year, in ordinal order', () => {
    const scope = resolveAcademicScope({ rows: ROWS, selection: { yearId: 'y2026' }, today: TODAY });
    expect(scope.levelsOfYear.map((level) => level.id)).toEqual(['grade7', 'grade8']);
  });

  it('labels every stream with its grade so two Easts cannot be confused', () => {
    const scope = resolveAcademicScope({ rows: ROWS, selection: { yearId: 'y2026' }, today: TODAY });
    const labels = scope.streams.map((stream) => stream.label);
    expect(labels).toContain('Grade 7 · East');
    expect(labels).toContain('Grade 8 · East');
  });

  it('narrows the streams to the chosen class (level), All streams meaning all of the year', () => {
    const all = resolveAcademicScope({
      rows: ROWS,
      selection: { yearId: 'y2026', levelId: '' },
      today: TODAY,
    });
    expect(all.streams).toHaveLength(3);

    const graded = resolveAcademicScope({
      rows: ROWS,
      selection: { yearId: 'y2026', levelId: 'grade7' },
      today: TODAY,
    });
    expect(graded.streams.map((stream) => stream.id)).toEqual(['g7e', 'g7w']);
  });

  it('drops a stream that belongs to another year or grade rather than matching by name', () => {
    const scope = resolveAcademicScope({
      rows: ROWS,
      selection: { yearId: 'y2026', levelId: 'grade8', classGroupId: 'old7e' },
      today: TODAY,
    });
    expect(scope.effective.classGroupId).toBe('');
    expect(scope.adjusted).toContain('classGroupId');
  });

  it('drops a period from another year and keeps one of the chosen year', () => {
    const stale = resolveAcademicScope({
      rows: ROWS,
      selection: { yearId: 'y2026', periodId: 'p2025-1' },
      today: TODAY,
    });
    expect(stale.effective.periodId).toBe('');
    expect(stale.adjusted).toContain('periodId');

    const valid = resolveAcademicScope({
      rows: ROWS,
      selection: { yearId: 'y2026', periodId: 'p2026-1' },
      today: TODAY,
    });
    expect(valid.effective.periodId).toBe('p2026-1');
  });

  it('periods are offered year-scoped and sorted, so Term 1 cannot repeat ambiguously', () => {
    const scope = resolveAcademicScope({ rows: ROWS, selection: { yearId: 'y2026' }, today: TODAY });
    expect(scope.periodsOfYear.map((period) => period.id)).toEqual(['p2026-1', 'p2026-2']);
  });

  it('an explicit All streams survives, an unknown level falls back to All classes', () => {
    const scope = resolveAcademicScope({
      rows: ROWS,
      selection: { yearId: 'y2026', classGroupId: '' },
      today: TODAY,
    });
    expect(scope.effective.classGroupId).toBe('');

    const unknown = resolveAcademicScope({
      rows: ROWS,
      selection: { yearId: 'y2026', levelId: 'grade9' },
      today: TODAY,
    });
    expect(unknown.effective.levelId).toBe('');
    expect(unknown.adjusted).toContain('levelId');
  });

  it('disambiguates level names that repeat across programmes with the programme name', () => {
    const rows: ScopeRows = {
      ...ROWS,
      programmes: [{ id: 'ib', name: 'IB' }, { id: 'kcse', name: 'KCSE' }],
      levels: [
        { id: 'ib7', name: 'Grade 7', ordinal: 7, programme_id: 'ib' },
        { id: 'kcse7', name: 'Grade 7', ordinal: 7, programme_id: 'kcse' },
      ],
      classGroups: [
        { id: 'ib7e', name: 'East', academic_year_id: 'y2026', level_id: 'ib7', programme_id: 'ib' },
        { id: 'kcse7e', name: 'East', academic_year_id: 'y2026', level_id: 'kcse7', programme_id: 'kcse' },
      ],
    };
    const scope = resolveAcademicScope({ rows, selection: { yearId: 'y2026' }, today: TODAY });
    const labels = scope.levelsOfYear.map((level) => level.label);
    expect(labels).toEqual(['Grade 7 · IB', 'Grade 7 · KCSE']);
  });
});
