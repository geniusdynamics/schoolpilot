// ABOUTME: Tests for the labels the academics screens share: a period with its year, a class group
// ABOUTME: with its grade, and the period the calendar is actually in.

import { describe, expect, it } from 'vitest';

import { classGroupLabel, currentPeriodOf, periodLabel } from '../academicLabels';

describe('periodLabel', () => {
  it('adds the academic year to a period name', () => {
    expect(periodLabel({ name: 'Term 2', academicYear: '2026' })).toBe('Term 2 · 2026');
  });

  it('names the same term differently in two years', () => {
    const lastYear = periodLabel({ name: 'Term 1', academicYear: '2025' });
    const thisYear = periodLabel({ name: 'Term 1', academicYear: '2026' });
    expect(lastYear).not.toBe(thisYear);
  });

  it('does not repeat a year the name already carries', () => {
    expect(periodLabel({ name: 'Term 3 2026', academicYear: '2026' })).toBe('Term 3 2026');
  });

  it('falls back to whatever part it has', () => {
    expect(periodLabel({ name: 'Term 1' })).toBe('Term 1');
    expect(periodLabel({ name: 'Term 1', academicYear: null })).toBe('Term 1');
    expect(periodLabel({ name: '', academicYear: '2026' })).toBe('2026');
  });
});

describe('classGroupLabel', () => {
  it('puts the grade before the stream', () => {
    expect(classGroupLabel({ gradeLevel: 'Grade 7', name: 'East' })).toBe('Grade 7 · East');
  });

  it('uses the stream when the class group has no name', () => {
    expect(classGroupLabel({ gradeLevel: 'Grade 8', name: '', stream: 'West' })).toBe('Grade 8 · West');
  });

  it('does not repeat a grade that is also the name', () => {
    expect(classGroupLabel({ gradeLevel: 'Grade 9', name: 'Grade 9' })).toBe('Grade 9');
  });

  it('shows the stream alone when no grade is known', () => {
    expect(classGroupLabel({ name: 'East' })).toBe('East');
    expect(classGroupLabel({ gradeLevel: null, name: 'East' })).toBe('East');
  });
});

describe('currentPeriodOf', () => {
  const periods = [
    { id: 'last-term-3', status: 'closed', start_date: '2025-09-01', end_date: '2025-11-30' },
    { id: 'term-1', status: 'current', start_date: '2026-01-05', end_date: '2026-04-03' },
    { id: 'term-2', status: 'planned', start_date: '2026-05-04', end_date: '2026-08-07' },
    { id: 'term-3', status: 'planned', start_date: '2026-09-07', end_date: '2026-11-27' },
  ];

  it('picks the period whose dates cover today, not the one flagged current', () => {
    expect(currentPeriodOf(periods, '2026-10-14')?.id).toBe('term-3');
  });

  it('uses the flagged current period when today falls between terms', () => {
    expect(currentPeriodOf(periods, '2026-04-20')?.id).toBe('term-1');
  });

  it('falls back to the first period and then to none', () => {
    expect(currentPeriodOf(periods, '2030-01-01')?.id).toBe('term-1');
    expect(currentPeriodOf([], '2026-10-14')).toBeNull();
  });
});
