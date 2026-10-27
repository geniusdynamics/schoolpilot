// ABOUTME: Validates the GH country pack against the country schema and its cross-field checks, drives its identifier,
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
  return JSON.parse(readFileSync(resolve(COUNTRY_DIR, 'gh', ...parts), 'utf8')) as Json;
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
const vectors = readJson('tests', 'gh.vectors.json') as {
  identifiers: { scheme: string; value: string; valid: boolean; normalised?: string }[];
  easterSunday: Record<string, string>;
  holidays: HolidayVector[];
};

describe('the GH country pack on disk', () => {
  it('passes the country schema', () => {
    const result = check(SCHEMA_ID, pack);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('ships English and Akan labels that pass the locale schema and share every key', () => {
    const akan = readJson('locales', 'ak.json') as { labels: Record<string, string> };
    for (const locale of ['en', 'ak']) {
      expect(check(LOCALE_SCHEMA_ID, readJson('locales', `${locale}.json`)).errors).toEqual([]);
    }
    expect(Object.keys(akan.labels).sort()).toEqual(Object.keys(labels).sort());
    expect(pack.defaults.languages).toEqual(['en', 'ak']);
  });

  it('has no semantic problem', () => {
    expect(checkCountryPackSemantics(pack as unknown as CountryPack, labels)).toEqual([]);
  });

  it('is a draft pack and marks verified only the PAYE due day the Ghana Revenue Authority states', () => {
    expect(pack.verification).toBe('draft');
    const verified = [...pack.identifiers, ...pack.holidays, ...pack.statutoryReturns]
      .filter((datum: Json) => datum.verification === 'verified')
      .map((datum: Json) => datum.id ?? datum.scheme);
    expect(verified).toEqual(['paye-monthly']);
  });

  it('states no rate, band, percentage or amount of any statutory contribution', () => {
    const text = readFileSync(resolve(COUNTRY_DIR, 'gh', 'country.json'), 'utf8');
    expect(text).not.toMatch(/\d\s?%/);
    expect(text).not.toMatch(/"(rate|percent|percentage|amount|band|bands)"/i);
  });

  it('defaults to cedis, Accra time and the Ghanaian phone region', () => {
    expect(pack.defaults).toMatchObject({ currency: 'GHS', timeZone: 'Africa/Accra', phoneRegion: 'GH', calendar: 'gregorian' });
  });
});

describe('the GH registry entry', () => {
  it('is found by code in either case', () => {
    expect(getCountryPack('GH')?.id).toBe('country-gh');
    expect(getCountryPack('gh')?.country).toBe('GH');
  });
});

describe('GH identifier schemes', () => {
  it('lists the Ghana Card first for every owner type', () => {
    for (const owner of ['learner', 'guardian', 'staff'] as const) {
      expect(identifierSchemesFor('GH', owner)[0]).toEqual(expect.objectContaining({ value: 'gh.ghana_card', label: 'Ghana Card number' }));
    }
  });

  it('lists the tax, SSNIT and passport numbers for staff only', () => {
    expect(identifierSchemesFor('GH', 'staff').map((scheme) => scheme.value)).toEqual([
      'gh.ghana_card',
      'gh.tin',
      'gh.ssnit_number',
      'gh.passport',
    ]);
    expect(identifierSchemesFor('GH', 'learner').map((scheme) => scheme.value)).toEqual(['gh.ghana_card', 'gh.birth_certificate']);
  });

  it.each(vectors.identifiers)('validates $scheme "$value" -> valid=$valid', (vector) => {
    const result = validateIdentifier('GH', vector.scheme, vector.value);
    if (vector.valid) {
      expect(result).toEqual({ ok: true, value: vector.normalised });
    } else {
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message.length).toBeGreaterThan(0);
    }
  });
});

describe('GH public holidays', () => {
  it.each(Object.entries(vectors.easterSunday))('computes Easter Sunday %s as %s', (year, expected) => {
    expect(easterSunday(Number(year))).toBe(expected);
  });

  it.each(vectors.holidays)('lists the holidays of $year, each observed on its own day', ({ year, days }) => {
    const listed = holidaysOf('GH', year).map((day) => ({ id: day.id, nominal: day.date, observed: day.observed }));
    expect(listed).toEqual(days);
  });

  it('marks every listed holiday a draft, since no statute was read', () => {
    for (const day of holidaysOf('GH', 2026)) expect(day.verification, day.id).toBe('draft');
  });

  it('has no holidays before the pack begins', () => {
    expect(holidaysOf('GH', 2019)).toEqual([]);
  });
});

describe('the GH address hierarchy from the pack', () => {
  it('gives region and district, both required, with the keys the form has always used', () => {
    const schema = countryAddressSchema('GH');
    expect(schema?.levels).toEqual([
      { key: 'region', labelKey: 'address.gh.region', required: true },
      { key: 'district', labelKey: 'address.gh.district', required: true },
    ]);
    expect(schema).toMatchObject({ hasCity: true, cityRequired: false, postalCodeRequired: false });
  });

  it('serves the address form from the pack, not from a copy', () => {
    expect(addressSchemaFor('GH')).toEqual(countryAddressSchema('GH'));
  });

  it('lists the 16 regions with ISO 3166-2 codes', () => {
    const regions = addressLevelOptions('GH', 'region');
    expect(regions).toHaveLength(16);
    expect(new Set(regions.map((region) => region.code)).size).toBe(16);
    for (const region of regions) expect(region.code).toMatch(/^GH-[A-Z]{2}$/);
    expect(regions.find((region) => region.code === 'GH-AA')?.name).toBe('Greater Accra');
    expect(regions.map((region) => region.name)).toEqual([...regions.map((region) => region.name)].sort((a, b) => a.localeCompare(b)));
  });

  it('keeps a stored region that is not on the list selectable and bundles no district list', () => {
    expect(addressLevelChoices('GH', 'region', 'Brong-Ahafo')[0]).toBe('Brong-Ahafo');
    expect(addressLevelOptions('GH', 'district')).toEqual([]);
  });
});
