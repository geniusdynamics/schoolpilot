// ABOUTME: Drives the country registry from the KE pack's own vectors: identifier schemes and their
// ABOUTME: validation, public holidays with the Sunday rule, the address hierarchy and the county list.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  addressLevelChoices,
  addressLevelOptions,
  countryAddressSchema,
  easterSunday,
  getCountryPack,
  holidaysOf,
  identifierSchemesFor,
  validateIdentifier,
} from '..';

interface IdentifierVector {
  readonly scheme: string;
  readonly value: string;
  readonly valid: boolean;
  readonly normalised?: string;
}

interface HolidayVector {
  readonly year: number;
  readonly days: readonly { id: string; nominal: string; observed: string }[];
}

const vectors = JSON.parse(
  readFileSync(resolve(process.cwd(), 'packs', 'country', 'ke', 'tests', 'ke.vectors.json'), 'utf8')
) as {
  identifiers: IdentifierVector[];
  easterSunday: Record<string, string>;
  holidays: HolidayVector[];
};

describe('the country registry', () => {
  it('finds the KE pack by code in either case', () => {
    expect(getCountryPack('KE')?.id).toBe('country-ke');
    expect(getCountryPack('ke')?.country).toBe('KE');
  });

  it('has no pack for a country that ships none', () => {
    expect(getCountryPack('ZZ')).toBeUndefined();
    expect(getCountryPack('')).toBeUndefined();
    expect(getCountryPack(undefined)).toBeUndefined();
  });
});

describe('identifier schemes', () => {
  it('lists a learner\'s schemes with the labels and order the admission form has always shown', () => {
    expect(identifierSchemesFor('KE', 'learner').slice(0, 3)).toEqual([
      expect.objectContaining({ value: 'ke.kemis_upi', label: 'KEMIS unique pupil identifier (UPI)' }),
      expect.objectContaining({ value: 'ke.birth_certificate', label: 'Birth certificate number' }),
      expect.objectContaining({ value: 'ke.national_id', label: 'National ID' }),
    ]);
  });

  it('lists a guardian\'s schemes with national ID first', () => {
    expect(identifierSchemesFor('KE', 'guardian').slice(0, 2)).toEqual([
      expect.objectContaining({ value: 'ke.national_id', label: 'National ID' }),
      expect.objectContaining({ value: 'ke.birth_certificate', label: 'Birth certificate number' }),
    ]);
  });

  it('lists the tax, social security, health and teacher numbers for staff', () => {
    const staff = identifierSchemesFor('KE', 'staff').map((scheme) => scheme.value);
    expect(staff).toEqual(
      expect.arrayContaining(['ke.national_id', 'ke.kra_pin', 'ke.nssf_number', 'ke.sha_number', 'ke.tsc_number', 'ke.passport'])
    );
    expect(staff).not.toContain('ke.kemis_upi');
  });

  it('gives a hint for a scheme that has one, and none otherwise', () => {
    const pin = identifierSchemesFor('KE', 'staff').find((scheme) => scheme.value === 'ke.kra_pin');
    expect(pin?.hint).toMatch(/A or P/);
  });

  it('lists nothing for a country without a pack', () => {
    expect(identifierSchemesFor('ZZ', 'learner')).toEqual([]);
  });

  it.each(vectors.identifiers)('validates $scheme "$value" -> valid=$valid', (vector) => {
    const result = validateIdentifier('KE', vector.scheme, vector.value);
    if (vector.valid) {
      expect(result).toEqual({ ok: true, value: vector.normalised });
    } else {
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message.length).toBeGreaterThan(0);
    }
  });

  it('refuses a scheme the pack does not define, and a country without a pack', () => {
    expect(validateIdentifier('KE', 'ke.driving_licence', 'X')).toEqual({
      ok: false,
      message: 'ke.driving_licence is not an identifier scheme of this country.',
    });
    expect(validateIdentifier('ZZ', 'zz.id', 'X').ok).toBe(false);
  });

  it('names the expected form in the refusal of a malformed KRA PIN', () => {
    const result = validateIdentifier('KE', 'ke.kra_pin', 'A12345');
    expect(result).toEqual({ ok: false, message: expect.stringContaining('A or P') });
  });

  it('refuses a value longer than the form stores', () => {
    expect(validateIdentifier('KE', 'ke.passport', 'A'.repeat(201)).ok).toBe(false);
  });
});

describe('public holidays', () => {
  it.each(Object.entries(vectors.easterSunday))('computes Easter Sunday %s as %s', (year, expected) => {
    expect(easterSunday(Number(year))).toBe(expected);
  });

  it.each(vectors.holidays)('lists the holidays of $year with the Sunday rule applied', ({ year, days }) => {
    const listed = holidaysOf('KE', year).map((day) => ({
      id: day.id,
      nominal: day.date,
      observed: day.observed,
    }));
    expect(listed).toEqual(days);
  });

  it('never observes a holiday on a Sunday', () => {
    for (let year = 2011; year <= 2040; year += 1) {
      for (const day of holidaysOf('KE', year)) {
        expect(new Date(`${day.observed}T00:00:00Z`).getUTCDay(), `${day.id} ${year}`).not.toBe(0);
      }
    }
  });

  it('never gives two holidays the same observed day', () => {
    for (let year = 2011; year <= 2040; year += 1) {
      const dates = holidaysOf('KE', year).map((day) => day.observed);
      expect(new Set(dates).size, String(year)).toBe(dates.length);
    }
  });

  it('carries a name key and a verification state on each holiday', () => {
    const [first] = holidaysOf('KE', 2026);
    expect(first).toMatchObject({ id: 'new-year', nameKey: 'country.ke.holiday.new_year' });
    expect(['draft', 'verified']).toContain(first?.verification);
  });

  it('names the 10 October day by the year it falls in', () => {
    const name = (year: number) => holidaysOf('KE', year).find((day) => day.date === `${year}-10-10`)?.nameKey;
    expect(name(2022)).toBe('country.ke.holiday.utamaduni_day');
    expect(name(2025)).toBe('country.ke.holiday.mazingira_day');
  });

  it('has no holidays for a country without a pack, a year before the pack begins, or a bad year', () => {
    expect(holidaysOf('ZZ', 2026)).toEqual([]);
    expect(holidaysOf('KE', 2005)).toEqual([]);
    expect(holidaysOf('KE', 2026.5)).toEqual([]);
  });
});

describe('the address hierarchy from the pack', () => {
  it('gives county, sub-county and ward, county and sub-county required', () => {
    const schema = countryAddressSchema('KE');
    expect(schema?.country).toBe('KE');
    expect(schema?.levels).toEqual([
      { key: 'county', labelKey: 'address.ke.county', required: true },
      { key: 'sub_county', labelKey: 'address.ke.sub_county', required: true },
      { key: 'ward', labelKey: 'address.ke.ward', required: false },
    ]);
    expect(schema).toMatchObject({
      hasCity: true,
      cityRequired: false,
      postalCodeRequired: false,
      postalCodeLabelKey: 'address.postal_code',
      line1LabelKey: 'address.line1',
      line2LabelKey: 'address.line2',
    });
  });

  it('has no schema for a country without a pack', () => {
    expect(countryAddressSchema('ZZ')).toBeUndefined();
  });

  it('lists the 47 counties of the First Schedule, coded 001 to 047', () => {
    const counties = addressLevelOptions('KE', 'county');
    expect(counties).toHaveLength(47);
    expect(counties[0]).toEqual({ code: '001', name: 'Mombasa' });
    expect(counties[46]).toEqual({ code: '047', name: 'Nairobi' });
    expect(counties.map((county) => county.code)).toEqual(
      Array.from({ length: 47 }, (_, index) => String(index + 1).padStart(3, '0'))
    );
    expect(new Set(counties.map((county) => county.name)).size).toBe(47);
    expect(counties.find((county) => county.code === '021')?.name).toBe("Murang'a");
  });

  it('offers the county names, and keeps a stored value that is not on the list selectable', () => {
    const names = addressLevelChoices('KE', 'county', 'Kisumu');
    expect(names).toHaveLength(47);
    expect(names[41]).toBe('Kisumu');
    expect(addressLevelChoices('KE', 'county', '')).toHaveLength(47);

    const withLegacy = addressLevelChoices('KE', 'county', 'Nakuru Town');
    expect(withLegacy).toHaveLength(48);
    expect(withLegacy[0]).toBe('Nakuru Town');
    expect(withLegacy.slice(1)).toEqual(names);
    expect(addressLevelChoices('KE', 'county', '  ')).toHaveLength(47);
  });

  it('offers nothing for a level with no fixed list', () => {
    expect(addressLevelChoices('KE', 'sub_county', 'Ruiru')).toEqual([]);
  });

  it('bundles no sub-county or ward list', () => {
    expect(addressLevelOptions('KE', 'sub_county')).toEqual([]);
    expect(addressLevelOptions('KE', 'ward')).toEqual([]);
    expect(addressLevelOptions('KE', 'no_such_level')).toEqual([]);
    expect(addressLevelOptions('ZZ', 'county')).toEqual([]);
  });
});
