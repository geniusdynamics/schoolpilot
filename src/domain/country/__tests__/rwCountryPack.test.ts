// ABOUTME: Validates the RW country pack against the country schema and its cross-field checks, drives its identifier,
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
  return JSON.parse(readFileSync(resolve(COUNTRY_DIR, 'rw', ...parts), 'utf8')) as Json;
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
const vectors = readJson('tests', 'rw.vectors.json') as {
  identifiers: { scheme: string; value: string; valid: boolean; normalised?: string }[];
  easterSunday: Record<string, string>;
  holidays: HolidayVector[];
};

describe('the RW country pack on disk', () => {
  it('passes the country schema', () => {
    const result = check(SCHEMA_ID, pack);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('ships English and Kinyarwanda labels that pass the locale schema and share every key', () => {
    const kinyarwanda = readJson('locales', 'rw.json') as { labels: Record<string, string> };
    for (const locale of ['en', 'rw']) {
      expect(check(LOCALE_SCHEMA_ID, readJson('locales', `${locale}.json`)).errors).toEqual([]);
    }
    expect(Object.keys(kinyarwanda.labels).sort()).toEqual(Object.keys(labels).sort());
    expect(pack.defaults.languages).toEqual(['en', 'rw']);
  });

  it('has no semantic problem', () => {
    expect(checkCountryPackSemantics(pack as unknown as CountryPack, labels)).toEqual([]);
  });

  it('is a draft pack while any of its data is a draft, and its identifiers are not claimed verified', () => {
    const data = [...pack.identifiers, ...pack.holidays, ...pack.statutoryReturns];
    expect(data.filter((datum: Json) => datum.verification === 'draft').length).toBeGreaterThan(0);
    expect(pack.identifiers.filter((identifier: Json) => identifier.verification === 'verified')).toEqual([]);
    expect(pack.verification).toBe('draft');
  });

  it('states no rate, band, percentage or amount of any statutory contribution', () => {
    const text = readFileSync(resolve(COUNTRY_DIR, 'rw', 'country.json'), 'utf8');
    expect(text).not.toMatch(/\d\s?%/);
    expect(text).not.toMatch(/"(rate|percent|percentage|amount|band|bands)"/i);
  });

  it('defaults to the franc, Kigali time and the Rwandan phone region', () => {
    expect(pack.defaults).toMatchObject({
      currency: 'RWF',
      timeZone: 'Africa/Kigali',
      phoneRegion: 'RW',
      calendar: 'gregorian',
    });
  });
});

describe('the RW registry entry', () => {
  it('is found by code in either case', () => {
    expect(getCountryPack('RW')?.id).toBe('country-rw');
    expect(getCountryPack('rw')?.country).toBe('RW');
  });
});

describe('RW identifier schemes', () => {
  it('lists the national identification number first for every owner type', () => {
    for (const owner of ['learner', 'guardian', 'staff'] as const) {
      expect(identifierSchemesFor('RW', owner)[0]).toEqual(
        expect.objectContaining({ value: 'rw.nid', label: 'National Identification Number (NIN)' })
      );
    }
  });

  it('lists the tax, social security and passport numbers for staff only', () => {
    const staff = identifierSchemesFor('RW', 'staff').map((scheme) => scheme.value);
    expect(staff).toEqual(expect.arrayContaining(['rw.nid', 'rw.tin', 'rw.rssb_number', 'rw.passport']));
    expect(identifierSchemesFor('RW', 'learner').map((scheme) => scheme.value)).toEqual(['rw.nid', 'rw.birth_certificate']);
  });

  it.each(vectors.identifiers)('validates $scheme "$value" -> valid=$valid', (vector) => {
    const result = validateIdentifier('RW', vector.scheme, vector.value);
    if (vector.valid) {
      expect(result).toEqual({ ok: true, value: vector.normalised });
    } else {
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message.length).toBeGreaterThan(0);
    }
  });

  it('names the sixteen digits in the refusal of a malformed number', () => {
    expect(validateIdentifier('RW', 'rw.nid', '12345')).toEqual({
      ok: false,
      message: expect.stringContaining('Sixteen digits'),
    });
  });
});

describe('RW public holidays', () => {
  it.each(Object.entries(vectors.easterSunday))('computes Easter Sunday %s as %s', (year, expected) => {
    expect(easterSunday(Number(year))).toBe(expected);
  });

  it.each(vectors.holidays)('lists the holidays of $year with a Sunday holiday moved to the next free day', ({ year, days }) => {
    const listed = holidaysOf('RW', year).map((day) => ({ id: day.id, nominal: day.date, observed: day.observed }));
    expect(listed).toEqual(days);
  });

  it('reproduces the government page for 2026: National Heroes Day on Monday 2 February', () => {
    const heroes = holidaysOf('RW', 2026).find((day) => day.id === 'heroes-day');
    expect(heroes).toMatchObject({ date: '2026-02-01', observed: '2026-02-02' });
  });

  it('never moves 7 April, which Article 4 excepts from the weekend rule', () => {
    for (let year = 2017; year <= 2040; year += 1) {
      const memorial = holidaysOf('RW', year).find((day) => day.id === 'genocide-memorial-day');
      expect(memorial?.observed, `${year}`).toBe(`${year}-04-07`);
    }
  });

  it('lists no Eid date for any year, because the Muslim Association announces them', () => {
    for (let year = 2017; year <= 2030; year += 1) {
      expect(holidaysOf('RW', year).filter((day) => day.id.startsWith('id-') || day.id.startsWith('eid')), `${year}`).toEqual([]);
    }
  });

  it('lists Umuganura only for the years the pack gives, marked draft', () => {
    const umuganura = (year: number) => holidaysOf('RW', year).filter((day) => day.id === 'umuganura-day');
    expect(umuganura(2026)).toHaveLength(1);
    expect(umuganura(2026)[0]?.verification).toBe('draft');
    expect(umuganura(2028)).toEqual([]);
  });

  it('has no holidays before the Order began', () => {
    expect(holidaysOf('RW', 2016)).toEqual([]);
  });
});

describe('the RW address hierarchy from the pack', () => {
  it('gives province and district, both required, and sector, with the keys the form has always used', () => {
    const schema = countryAddressSchema('RW');
    expect(schema?.levels).toEqual([
      { key: 'province', labelKey: 'address.rw.province', required: true },
      { key: 'district', labelKey: 'address.rw.district', required: true },
      { key: 'sector', labelKey: 'address.rw.sector', required: false },
    ]);
    expect(schema).toMatchObject({ hasCity: true, cityRequired: false, postalCodeRequired: false });
  });

  it('serves the address form from the pack, not from a copy', () => {
    expect(addressSchemaFor('RW')).toEqual(countryAddressSchema('RW'));
  });

  it('lists the four provinces and the City of Kigali with ISO 3166-2 codes', () => {
    const provinces = addressLevelOptions('RW', 'province');
    expect(provinces.map((province) => province.code).sort()).toEqual(['RW-01', 'RW-02', 'RW-03', 'RW-04', 'RW-05']);
    expect(provinces.find((province) => province.code === 'RW-01')?.name).toBe('City of Kigali');
  });

  it('keeps a stored province that is not on the list selectable and bundles no district list', () => {
    expect(addressLevelChoices('RW', 'province', 'Eastern')).toHaveLength(5);
    expect(addressLevelChoices('RW', 'province', 'Old Name')[0]).toBe('Old Name');
    expect(addressLevelOptions('RW', 'district')).toEqual([]);
  });
});

describe('RW statutory returns', () => {
  it('lists PAYE and RSSB on the 15th of the following month, with no rate', () => {
    const returns = getCountryPack('RW')?.statutoryReturns ?? [];
    expect(returns.map((statutoryReturn) => [statutoryReturn.id, statutoryReturn.due])).toEqual([
      ['paye-monthly', { type: 'day_of_following_month', day: 15 }],
      ['rssb-monthly', { type: 'day_of_following_month', day: 15 }],
    ]);
  });
});
