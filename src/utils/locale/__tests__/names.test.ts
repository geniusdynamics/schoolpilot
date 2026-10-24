// ABOUTME: Pins person-name formatting: the order a locale writes, a single-name learner, several
// ABOUTME: middle names, a preferred name, the placeholder, and sorting by the configured key.

import { describe, expect, it } from 'vitest';

import {
  NO_NAME,
  comparePersonNames,
  formatPersonName,
  formatPersonNameOrPlaceholder,
  personNameOrder,
  sortPersonNames,
} from '../names';

const amina = {
  given_name: 'Amina',
  middle_names: ['Nyambura', 'Wanjiku'],
  family_name: 'Otieno',
};

describe('formatPersonName', () => {
  it('writes given, middle, family in en-GB and family first in hu-HU', () => {
    expect(formatPersonName(amina, { locale: 'en-GB' })).toBe('Amina Nyambura Wanjiku Otieno');
    expect(formatPersonName(amina, { locale: 'hu-HU' })).toBe('Otieno Amina Nyambura Wanjiku');
  });

  it('lets the person record and the caller override the locale order', () => {
    expect(
      formatPersonName({ ...amina, name_order: 'family_first' }, { locale: 'en-GB' })
    ).toBe('Otieno Amina Nyambura Wanjiku');
    expect(formatPersonName(amina, { locale: 'hu-HU', order: 'given_first' })).toBe(
      'Amina Nyambura Wanjiku Otieno'
    );
    expect(personNameOrder(amina, 'en-GB')).toBe('given_first');
    expect(personNameOrder({ ...amina, name_order: 'family_first' }, 'en-GB')).toBe('family_first');
  });

  it('writes a single-name learner once', () => {
    expect(formatPersonName({ given_name: 'Amina', family_name: 'Amina' }, { locale: 'en-GB' })).toBe(
      'Amina'
    );
    expect(formatPersonName({ family_name: 'Otieno' }, { locale: 'en-GB' })).toBe('Otieno');
    expect(formatPersonName({ given_name: 'Amina' }, { locale: 'en-GB' })).toBe('Amina');
  });

  it('uses the preferred name by default and the record name on request', () => {
    const person = { given_name: 'Aminah', preferred_name: 'Amina', family_name: 'Otieno' };
    expect(formatPersonName(person, { locale: 'en-GB' })).toBe('Amina Otieno');
    expect(formatPersonName(person, { locale: 'en-GB', usePreferredName: false })).toBe(
      'Aminah Otieno'
    );
  });

  it('can leave the middle names out and never leaves a stray space', () => {
    expect(formatPersonName(amina, { locale: 'en-GB', includeMiddleNames: false })).toBe('Amina Otieno');
    expect(formatPersonName({ given_name: '  Amina  ', family_name: '  Otieno  ' }, { locale: 'en-GB' })).toBe(
      'Amina Otieno'
    );
    expect(formatPersonName({}, { locale: 'en-GB' })).toBe('');
    expect(formatPersonNameOrPlaceholder({}, { locale: 'en-GB' })).toBe(NO_NAME);
  });
});

describe('sorting names', () => {
  const byFamily = (familyNames: string[], locale: string) =>
    sortPersonNames(
      familyNames.map((family_name) => ({ family_name })),
      locale
    ).map((person) => person.family_name);

  it('sorts Kenyan and English family names in en-GB', () => {
    expect(byFamily(['Otieno', 'Achieng', 'Kamau', 'Wanjiku'], 'en-GB')).toEqual([
      'Achieng',
      'Kamau',
      'Otieno',
      'Wanjiku',
    ]);
  });

  it('folds accents in fr-FR, so Émond sorts with Emond', () => {
    expect(byFamily(['Émond', 'Zoé', 'Adam', 'Emond'], 'fr-FR')).toEqual([
      'Adam',
      'Émond',
      'Emond',
      'Zoé',
    ]);
  });

  it('sorts Arabic family names with the Arabic collation', () => {
    expect(byFamily(['زينب', 'حسن', 'إبراهيم'], 'ar-EG')).toEqual(['إبراهيم', 'حسن', 'زينب']);
  });

  it('can key on the given name instead', () => {
    const people = [
      { given_name: 'Cynthia', family_name: 'Kamau' },
      { given_name: 'Amina', family_name: 'Otieno' },
      { given_name: 'Brian', family_name: 'Achieng' },
    ];
    expect(sortPersonNames(people, 'en-GB', 'given').map((p) => p.given_name)).toEqual([
      'Amina',
      'Brian',
      'Cynthia',
    ]);
    expect(comparePersonNames(people[0], people[1], 'en-GB', 'family')).toBeLessThan(0);
  });
});
