// ABOUTME: Scheme resolution tests: a pinned programme scheme decides the slots and the maximum,
// ABOUTME: the period's assessments decide them when none is pinned, and a refused score is refused
// ABOUTME: at entry against the declared maximum.

import { describe, expect, it } from 'vitest';

import { checkScore, readSchemeDefinition, resolveScheme } from '../scheme';

const assessments = [
  {
    id: 'a-1',
    name: 'CAT 1',
    slot: 'CAT',
    kind: 'cat',
    max: 20,
    status: 'open',
  },
  {
    id: 'a-2',
    name: 'CAT 2',
    slot: 'CAT',
    kind: 'cat',
    max: 20,
    status: 'open',
  },
  {
    id: 'a-3',
    name: 'End of Term',
    slot: 'ET',
    kind: 'end_term',
    max: 100,
    status: 'open',
  },
];

describe('score validation', () => {
  it('accepts a score inside the range and refuses one above it', () => {
    expect(checkScore('18.5', 20)).toEqual({ ok: true, score: '18.5' });
    expect(checkScore('20', 20)).toEqual({ ok: true, score: '20' });
    expect(checkScore('20.5', 20)).toEqual({
      ok: false,
      code: 'out_of_range',
      message: 'A score cannot be above the maximum of 20.',
    });
  });

  it('refuses something that is not a number and an empty cell', () => {
    expect(checkScore('12a', 20)).toEqual(expect.objectContaining({ ok: false, code: 'invalid' }));
    expect(checkScore('  ', 20)).toEqual(expect.objectContaining({ ok: false, code: 'empty' }));
    expect(checkScore('1e3', 20)).toEqual(expect.objectContaining({ ok: false, code: 'invalid' }));
  });
});

describe('scheme resolution', () => {
  it('derives one column per assessment and one slot per distinct slot code', () => {
    const scheme = resolveScheme({
      assessments,
      schemes: [],
      levelId: 'level-1',
      programmeId: 'programme-1',
    });

    expect(scheme.source).toBe('assessments');
    expect(scheme.columns.map((column) => column.label)).toEqual(['CAT 1', 'CAT 2', 'End of Term']);
    expect(scheme.definition.slots).toEqual([
      { code: 'CAT', max: '20', multi: true, combine: 'mean' },
      { code: 'ET', max: '100' },
    ]);
    expect(scheme.definition.default_missing).toBe('incomplete');
  });

  it('takes the slots, their order and the maximum from the pinned programme scheme', () => {
    const scheme = resolveScheme({
      assessments,
      schemes: [
        {
          id: 'scheme-1',
          programmeId: 'programme-1',
          levelIds: ['level-1'],
          version: '2027.1',
          definition: {
            code: 'ke-844-internal',
            slots: [
              { code: 'ET', label: 'End of term', max: 70 },
              { code: 'CAT', label: 'CATs', multi: true, combine: 'mean', scale_to: 30 },
            ],
            learning_area_score: { op: 'sum', of: ['CAT', 'ET'], out_of: 100 },
            missing: { CAT: 'exclude', ET: 'incomplete' },
          },
        },
      ],
      levelId: 'level-1',
      programmeId: 'programme-1',
    });

    expect(scheme.source).toBe('programme');
    expect(scheme.code).toBe('ke-844-internal');
    expect(scheme.version).toBe('2027.1');
    // ET is declared first, so its column comes first.
    expect(scheme.columns.map((column) => column.label)).toEqual(['End of Term', 'CAT 1', 'CAT 2']);
    expect(scheme.columns[0].max).toBe(100);
    expect(scheme.definition.missing).toEqual({ CAT: 'exclude', ET: 'incomplete' });
  });

  it('falls back to the derived scheme when the stored document has no usable slot', () => {
    const scheme = resolveScheme({
      assessments,
      schemes: [
        {
          id: 'scheme-1',
          programmeId: 'programme-1',
          levelIds: ['level-1'],
          version: '1',
          definition: { code: 'broken', slots: [] },
        },
      ],
      levelId: 'level-1',
      programmeId: 'programme-1',
    });

    expect(scheme.source).toBe('assessments');
  });

  it('reads a stored scheme defensively: numbers become decimal strings, unknown policies are dropped', () => {
    const read = readSchemeDefinition(
      {
        code: 'ke-cbe-internal',
        slots: [{ code: 'ET', max: 100, kind: 'not-used' }],
        missing: { ET: 'incomplete', CAT: 'nonsense' },
        rounding: [{ stage: 'learning_area_score', precision: 0, mode: 'half_up' }],
      },
      'fallback'
    );

    expect(read).toMatchObject({
      code: 'ke-cbe-internal',
      slots: [{ code: 'ET', max: '100' }],
      missing: { ET: 'incomplete' },
      rounding: [{ stage: 'learning_area_score', precision: 0, mode: 'half_up' }],
    });
  });

  it('refuses a document it cannot read', () => {
    expect(readSchemeDefinition(null, 'fallback')).toBeNull();
    expect(readSchemeDefinition({ slots: [{ code: '' }] }, 'fallback')).toBeNull();
  });
});
