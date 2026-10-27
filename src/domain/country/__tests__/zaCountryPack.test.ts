// ABOUTME: Validates the ZA country pack against the country schema and its cross-field checks, drives its identifier,
// ABOUTME: holiday and address behaviour from its own vectors, and pins that the address form comes from the pack.

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import Ajv2020 from 'ajv/dist/2020';
import { describe, expect, it } from 'vitest';

import { addressSchemaFor } from '@/utils/locale/addresses';

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
import type { CountryPack } from '../types';
import { checkCountryPackSemantics } from './countrySemantics';

type Json = Record<string, any>;

interface HolidayVector {
  readonly year: number;
  readonly days: readonly { id: string; nominal: string; observed: string }[];
}

const COUNTRY_DIR = resolve(process.cwd(), 'packs', 'country');
const CURRICULUM_SCHEMA_DIR = resolve(process.cwd(), 'packs', 'schema');
const SCHEMA_ID = 'https://schemas.schoolpilot.app/country-pack/v1/country.schema.json';
const LOCALE_SCHEMA_ID = 'https://schemas.schoolpilot.app/curriculum-pack/v1/locale.schema.json';

function readJson(...parts: string[]): Json {
  return JSON.parse(readFileSync(resolve(COUNTRY_DIR, 'za', ...parts), 'utf8')) as Json;
}

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
for (const file of readdirSync(CURRICULUM_SCHEMA_DIR).filter((name) => name.endsWith('.json'))) {
  ajv.addSchema(JSON.parse(readFileSync(resolve(CURRICULUM_SCHEMA_DIR, file), 'utf8')) as object);
}
ajv.addSchema(JSON.parse(readFileSync(resolve(COUNTRY_DIR, 'schema.json'), 'utf8')) as object);

function check(schemaId: string, document: unknown): { valid: boolean; errors: string[] } {
  const validator = ajv.getSchema(schemaId);
  if (!validator) throw new Error(`Schema is not registered: ${schemaId}`);
  const valid = validator(document) === true;
  return { valid, errors: (validator.errors ?? []).map((error) => `${error.instancePath} ${error.message}`) };
}

const pack = readJson('country.json');
const labels = (readJson('locales', 'en.json') as { labels: Record<string, string> }).labels;
const vectors = readJson('tests', 'za.vectors.json') as {
  identifiers: { scheme: string; value: string; valid: boolean; normalised?: string }[];
  easterSunday: Record<string, string>;
  holidays: HolidayVector[];
};

describe('the ZA country pack on disk', () => {
  it('passes the country schema', () => {
    const result = check(SCHEMA_ID, pack);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('ships English and isiZulu labels that pass the locale schema and share every key', () => {
    const zulu = readJson('locales', 'zu.json') as { labels: Record<string, string> };
    for (const locale of ['en', 'zu']) {
      expect(check(LOCALE_SCHEMA_ID, readJson('locales', `${locale}.json`)).errors).toEqual([]);
    }
    expect(Object.keys(zulu.labels).sort()).toEqual(Object.keys(labels).sort());
    expect(pack.defaults.languages).toEqual(['en', 'zu']);
  });

  it('has no semantic problem', () => {
    expect(checkCountryPackSemantics(pack as unknown as CountryPack, labels)).toEqual([]);
  });

  it('is a draft pack, with the twelve holidays verified and every identifier and the return a draft', () => {
    expect(pack.verification).toBe('draft');
    expect(pack.holidays.filter((holiday: Json) => holiday.verification === 'verified')).toHaveLength(12);
    for (const datum of [...pack.identifiers, ...pack.statutoryReturns]) expect(datum.verification).toBe('draft');
  });

  it('states no rate, band, percentage or amount of any statutory contribution', () => {
    const text = readFileSync(resolve(COUNTRY_DIR, 'za', 'country.json'), 'utf8');
    expect(text).not.toMatch(/\d\s?%/);
    expect(text).not.toMatch(/"(rate|percent|percentage|amount|band|bands)"/i);
  });

  it('defaults to rand, Johannesburg time and the South African phone region', () => {
    expect(pack.defaults).toMatchObject({ currency: 'ZAR', timeZone: 'Africa/Johannesburg', phoneRegion: 'ZA', calendar: 'gregorian' });
  });
});

describe('the ZA registry entry', () => {
  it('is found by code in either case', () => {
    expect(getCountryPack('ZA')?.id).toBe('country-za');
    expect(getCountryPack('za')?.country).toBe('ZA');
  });
});

describe('ZA identifier schemes', () => {
  it('lists the ID number first for every owner type', () => {
    for (const owner of ['learner', 'guardian', 'staff'] as const) {
      expect(identifierSchemesFor('ZA', owner)[0]).toEqual(expect.objectContaining({ value: 'za.id_number' }));
    }
  });

  it('lists the LURITS number for learners and the tax number for staff', () => {
    expect(identifierSchemesFor('ZA', 'learner').map((scheme) => scheme.value)).toEqual(['za.id_number', 'za.lurits', 'za.passport']);
    expect(identifierSchemesFor('ZA', 'staff').map((scheme) => scheme.value)).toEqual(['za.id_number', 'za.tax_number', 'za.passport']);
  });

  it.each(vectors.identifiers)('validates $scheme "$value" -> valid=$valid', (vector) => {
    const result = validateIdentifier('ZA', vector.scheme, vector.value);
    if (vector.valid) {
      expect(result).toEqual({ ok: true, value: vector.normalised });
    } else {
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message.length).toBeGreaterThan(0);
    }
  });
});

describe('ZA public holidays', () => {
  it.each(Object.entries(vectors.easterSunday))('computes Easter Sunday %s as %s', (year, expected) => {
    expect(easterSunday(Number(year))).toBe(expected);
  });

  it.each(vectors.holidays)('lists the holidays of $year, with a Sunday holiday moved to the next free day', ({ year, days }) => {
    const listed = holidaysOf('ZA', year).map((day) => ({ id: day.id, nominal: day.date, observed: day.observed }));
    expect([...listed].sort((a, b) => a.id.localeCompare(b.id))).toEqual([...days].sort((a, b) => a.id.localeCompare(b.id)));
    expect(listed.map((day) => day.observed)).toEqual([...listed.map((day) => day.observed)].sort());
  });

  it('matches the government list for 2026: Women\'s Day on Sunday 9 August is observed on Monday 10 August', () => {
    const womens = holidaysOf('ZA', 2026).find((day) => day.id === 'womens-day');
    expect(womens).toMatchObject({ date: '2026-08-09', observed: '2026-08-10' });
  });

  it('never moves a Sunday holiday onto a day another holiday already has', () => {
    for (let year = 2000; year <= 2040; year += 1) {
      const days = holidaysOf('ZA', year);
      for (const moved of days.filter((day) => day.observed !== day.date)) {
        const sharing = days.filter((day) => day.observed === moved.observed);
        expect(sharing, `${year} ${moved.id}`).toHaveLength(1);
      }
    }
  });

  it('has no holidays before the pack begins', () => {
    expect(holidaysOf('ZA', 1999)).toEqual([]);
  });
});

describe('the ZA address hierarchy from the pack', () => {
  it('gives province and municipality, both required, and a required postal code', () => {
    const schema = countryAddressSchema('ZA');
    expect(schema?.levels).toEqual([
      { key: 'province', labelKey: 'address.za.province', required: true },
      { key: 'municipality', labelKey: 'address.za.municipality', required: true },
    ]);
    expect(schema).toMatchObject({ hasCity: true, cityRequired: false, postalCodeRequired: true });
  });

  it('serves the address form from the pack, not from a copy', () => {
    expect(addressSchemaFor('ZA')).toEqual(countryAddressSchema('ZA'));
  });

  it('lists the nine provinces with ISO 3166-2 codes', () => {
    const provinces = addressLevelOptions('ZA', 'province');
    expect(provinces).toHaveLength(9);
    expect(new Set(provinces.map((province) => province.code)).size).toBe(9);
    for (const province of provinces) expect(province.code).toMatch(/^ZA-[A-Z]{2,3}$/);
    expect(provinces.find((province) => province.code === 'ZA-KZN')?.name).toBe('KwaZulu-Natal');
  });

  it('keeps a stored province that is not on the list selectable and bundles no municipality list', () => {
    expect(addressLevelChoices('ZA', 'province', 'Transvaal')[0]).toBe('Transvaal');
    expect(addressLevelOptions('ZA', 'municipality')).toEqual([]);
  });
});
