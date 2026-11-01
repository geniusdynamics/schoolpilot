// ABOUTME: The setup checklist a school is nagged about: the five rows a blank school needs, and the
// ABOUTME: rule that a profile counts once it has a name (the wizard requires nothing more).

import { describe, expect, it } from 'vitest';

import { buildChecklist, profileRecorded } from '../useSetupChecklist';

const counts = (overrides: Partial<Parameters<typeof buildChecklist>[1]> = {}) => ({
  programmes: 1,
  years: 1,
  periods: 3,
  classGroups: 4,
  learningAreas: 8,
  ...overrides,
});

describe('buildChecklist', () => {
  it('is complete when every table has its rows', () => {
    const items = buildChecklist({ name: 'Mwangaza' }, counts());

    expect(items.every((item) => item.complete)).toBe(true);
  });

  it('names each missing row on a blank school', () => {
    const items = buildChecklist(null, {
      programmes: 0,
      years: 0,
      periods: 0,
      classGroups: 0,
      learningAreas: 0,
    });

    expect(items.filter((item) => !item.complete).map((item) => item.id)).toEqual([
      'school',
      'system',
      'year',
      'classes',
      'subjects',
    ]);
  });

  it('counts a year without terms as incomplete', () => {
    const items = buildChecklist({ name: 'Mwangaza' }, counts({ periods: 0 }));

    expect(items.find((item) => item.id === 'year')?.complete).toBe(false);
  });
});

describe('profileRecorded', () => {
  it('needs a name, as the wizard does', () => {
    expect(profileRecorded({ name: '  ' })).toBe(false);
    expect(profileRecorded({ name: 'Mwangaza' })).toBe(true);
    expect(profileRecorded(null)).toBe(false);
  });
});
