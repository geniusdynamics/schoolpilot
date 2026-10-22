// ABOUTME: Tests for sequence scopes: what a definition is partitioned by, how a reset fills the
// ABOUTME: year and month, and that two scopes never share a counter key.

import { describe, expect, it } from 'vitest';

import { SequenceDefinitionError } from '../errors';
import { SEQUENCE_DEFINITIONS } from '../catalog';
import {
  SCOPE_SEGMENT_ORDER,
  resetSegmentsFor,
  resolveScope,
  resolveScopeKey,
  scopeKey,
  validateDefinition,
} from '../scope';
import type { SequenceDefinition } from '../types';

const ADMISSION = SEQUENCE_DEFINITIONS.admission;
const INVOICE = SEQUENCE_DEFINITIONS.invoice;
const STUDENT = SEQUENCE_DEFINITIONS.student_number;

const JANUARY_2027 = new Date('2027-01-15T09:00:00.000Z');

describe('resetSegmentsFor', () => {
  it('makes a reset a scope of its own', () => {
    expect(resetSegmentsFor('never')).toEqual([]);
    expect(resetSegmentsFor('yearly')).toEqual(['year']);
    expect(resetSegmentsFor('monthly')).toEqual(['year', 'month']);
  });
});

describe('resolveScope', () => {
  it('fills the year and the month from the clock when the caller does not', () => {
    expect(resolveScope(ADMISSION, { institution: 'INST-1' }, JANUARY_2027)).toEqual({
      institution: 'INST-1',
      year: 2027,
    });

    const monthly: SequenceDefinition = {
      name: 'monthly_voucher',
      pattern: 'MV/{YYYY}/{MM}/{SEQ:4}',
      scope: ['institution', 'year', 'month'],
      reset: 'monthly',
    };
    expect(resolveScope(monthly, { institution: 'INST-1' }, JANUARY_2027)).toEqual({
      institution: 'INST-1',
      year: 2027,
      month: 1,
    });
  });

  it('keeps the year and month the caller gave, as numbers', () => {
    expect(resolveScope(ADMISSION, { institution: 'INST-1', year: '2028' }, JANUARY_2027).year).toBe(2028);
    expect(
      resolveScope(INVOICE, { institution: 'INST-1', year: 2028, term: 'T3' }, JANUARY_2027)
    ).toEqual({ institution: 'INST-1', year: 2028, term: 'T3' });
  });

  it('refuses a missing segment the clock cannot fill, and a bad year', () => {
    expect(() => resolveScope(INVOICE, { institution: 'INST-1' }, JANUARY_2027)).toThrow(/term/);
    expect(() => resolveScope(ADMISSION, { institution: 'INST-1', year: 0 }, JANUARY_2027)).toThrow(
      SequenceDefinitionError
    );
    expect(() => resolveScope(ADMISSION, { institution: 'INST-1', year: 'nope' }, JANUARY_2027)).toThrow(
      SequenceDefinitionError
    );
  });

  it('returns only the segments the definition needs', () => {
    expect(Object.keys(resolveScope(STUDENT, { institution: 'GA' }, JANUARY_2027))).toEqual(['institution']);
  });
});

describe('scopeKey', () => {
  it('is independent of the order the values were written in', () => {
    expect(scopeKey({ year: 2027, institution: 'INST-1' })).toBe(
      scopeKey({ institution: 'INST-1', year: 2027 })
    );
  });

  it('uses the fixed segment order, so a key is stable', () => {
    expect(SCOPE_SEGMENT_ORDER.indexOf('institution')).toBeLessThan(SCOPE_SEGMENT_ORDER.indexOf('year'));
    expect(scopeKey({ institution: 'INST-1', year: 2027 })).toBe('institution=INST-1|year=2027');
  });

  it('gives two institutions and two years different keys', () => {
    const first = scopeKey({ institution: 'INST-1', year: 2027 });
    expect(first).not.toBe(scopeKey({ institution: 'INST-2', year: 2027 }));
    expect(first).not.toBe(scopeKey({ institution: 'INST-1', year: 2028 }));
  });

  it('refuses an empty scope, which would share one counter with everything', () => {
    expect(() => scopeKey({})).toThrow(SequenceDefinitionError);
  });
});

describe('resolveScopeKey', () => {
  it('resolves the scope and its key in one step', () => {
    expect(resolveScopeKey(ADMISSION, { institution: 'INST-1', year: 2027 }, JANUARY_2027)).toEqual({
      scope: { institution: 'INST-1', year: 2027 },
      scopeKey: 'institution=INST-1|year=2027',
    });
  });
});

describe('validateDefinition', () => {
  const base: SequenceDefinition = {
    name: 'test',
    pattern: 'TST/{YYYY}/{SEQ:3}',
    scope: ['institution', 'year'],
    reset: 'yearly',
  };

  it('accepts every built-in definition', () => {
    for (const definition of Object.values(SEQUENCE_DEFINITIONS)) {
      expect(() => validateDefinition(definition), definition.name).not.toThrow();
    }
  });

  it('refuses a name, and a scope segment declared twice', () => {
    expect(() => validateDefinition({ ...base, name: '' })).toThrow(/name/);
    expect(() => validateDefinition({ ...base, scope: ['year', 'year'] })).toThrow(/twice/);
  });

  it('refuses a pattern that renders a segment nothing declares', () => {
    expect(() => validateDefinition({ ...base, scope: ['institution'] })).toThrow(/not a declared scope/);
  });

  it('refuses a yearly reset whose year is not in the scope or the pattern', () => {
    expect(() => validateDefinition({ ...base, scope: ['institution'], pattern: 'TST/{SEQ:3}' })).toThrow(
      /needs "year" in its scope/
    );
    expect(() =>
      validateDefinition({ ...base, scope: ['institution', 'year'], pattern: 'TST/{SEQ:3}' })
    ).toThrow(/in its pattern/);
  });

  it('refuses a monthly reset that does not print the month', () => {
    const monthly: SequenceDefinition = {
      name: 'monthly',
      pattern: 'MV/{YYYY}/{SEQ:3}',
      scope: ['institution', 'year', 'month'],
      reset: 'monthly',
    };
    expect(() => validateDefinition(monthly)).toThrow(/needs "month" in its pattern/);
  });

  it('refuses a sequence with no scope, which would share one counter with everything', () => {
    expect(() =>
      validateDefinition({ name: 'global', pattern: 'GL/{SEQ:3}', scope: [], reset: 'never' })
    ).toThrow(/no scope/);
  });

  it('accepts a scope segment the pattern does not print', () => {
    const scoped: SequenceDefinition = {
      name: 'scoped',
      pattern: 'SC/{YYYY}/{SEQ:3}',
      scope: ['institution', 'year'],
      reset: 'yearly',
    };
    expect(() => validateDefinition(scoped)).not.toThrow();
  });
});
