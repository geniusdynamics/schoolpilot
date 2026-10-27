// ABOUTME: Validates the TZ country pack against the country schema and its cross-field checks, drives its identifier,
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
  return JSON.parse(readFileSync(resolve(COUNTRY_DIR, 'tz', ...parts), 'utf8')) as Json;
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
const vectors = readJson('tests', 'tz.vectors.json') as {
  identifiers: { scheme: string; value: string; valid: boolean; normalised?: string }[];
  easterSunday: Record<string, string>;
  holidays: HolidayVector[];
};

describe('the TZ country pack on disk', () => {
  it('passes the country schema', () => {
    const result = check(SCHEMA_ID, pack);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('ships English and Swahili labels that pass the locale schema and share every key', () => {
    const swahili = readJson('locales', 'sw.json') as { labels: Record<string, string> };
    for (const locale of ['en', 'sw']) {
      expect(check(LOCALE_SCHEMA_ID, readJson('locales', `${locale}.json`)).errors).toEqual([]);
    }
    expect(Object.keys(swahili.labels).sort()).toEqual(Object.keys(labels).sort());
    expect(pack.defaults.languages).toEqual(['en', 'sw']);
  });

  it('has no semantic problem', () => {
    expect(checkCountryPackSemantics(pack as unknown as CountryPack, labels)).toEqual([]);
  });

  it('is a draft pack while any of its data is a draft, and nothing in it is claimed verified without a fetched source', () => {
    const data = [...pack.identifiers, ...pack.holidays, ...pack.statutoryReturns];
    expect(data.filter((datum: Json) => datum.verification === 'draft').length).toBeGreaterThan(0);
    expect(data.filter((datum: Json) => datum.verification === 'verified')).toEqual([]);
    expect(pack.verification).toBe('draft');
  });

  it('states no rate, band, percentage or amount of any statutory contribution', () => {
    const text = readFileSync(resolve(COUNTRY_DIR, 'tz', 'country.json'), 'utf8');
    expect(text).not.toMatch(/\d\s?%/);
    expect(text).not.toMatch(/"(rate|percent|percentage|amount|band|bands)"/i);
  });

  it('defaults to the shilling, Dar es Salaam time and the Tanzanian phone region', () => {
    expect(pack.defaults).toMatchObject({
      currency: 'TZS',
      timeZone: 'Africa/Dar_es_Salaam',
      phoneRegion: 'TZ',
      calendar: 'gregorian',
    });
  });
});

describe('the TZ registry entry', () => {
  it('is found by code in either case', () => {
    expect(getCountryPack('TZ')?.id).toBe('country-tz');
    expect(getCountryPack('tz')?.country).toBe('TZ');
  });
});

describe('TZ identifier schemes', () => {
  it('lists the NIDA number first for every owner type', () => {
    for (const owner of ['learner', 'guardian', 'staff'] as const) {
      expect(identifierSchemesFor('TZ', owner)[0]).toEqual(
        expect.objectContaining({ value: 'tz.nida', label: 'National Identification Number (NIDA)' })
      );
    }
  });

  it('lists the tax, social security and passport numbers for staff only', () => {
    const staff = identifierSchemesFor('TZ', 'staff').map((scheme) => scheme.value);
    expect(staff).toEqual(expect.arrayContaining(['tz.nida', 'tz.tin', 'tz.nssf_number', 'tz.passport']));
    expect(identifierSchemesFor('TZ', 'learner').map((scheme) => scheme.value)).toEqual(['tz.nida', 'tz.birth_certificate']);
  });

  it.each(vectors.identifiers)('validates $scheme "$value" -> valid=$valid', (vector) => {
    const result = validateIdentifier('TZ', vector.scheme, vector.value);
    if (vector.valid) {
      expect(result).toEqual({ ok: true, value: vector.normalised });
    } else {
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message.length).toBeGreaterThan(0);
    }
  });

  it('names the twenty digits in the refusal of a malformed NIDA number', () => {
    expect(validateIdentifier('TZ', 'tz.nida', '12345')).toEqual({
      ok: false,
      message: expect.stringContaining('Twenty digits'),
    });
  });
});

describe('TZ public holidays', () => {
  it.each(Object.entries(vectors.easterSunday))('computes Easter Sunday %s as %s', (year, expected) => {
    expect(easterSunday(Number(year))).toBe(expected);
  });

  it.each(vectors.holidays)('lists the holidays of $year with a Sunday holiday moved to the next free day', ({ year, days }) => {
    const listed = holidaysOf('TZ', year).map((day) => ({ id: day.id, nominal: day.date, observed: day.observed }));
    expect(listed).toEqual(days);
  });

  it('moves a Sunday holiday and no other: Zanzibar Revolution Day 2025 falls on a Sunday and is kept on Monday', () => {
    const revolution = holidaysOf('TZ', 2025).find((day) => day.id === 'revolution-day');
    expect(revolution).toMatchObject({ date: '2025-01-12', observed: '2025-01-13' });
    const union = holidaysOf('TZ', 2025).find((day) => day.id === 'union-day');
    expect(union).toMatchObject({ date: '2025-04-26', observed: '2025-04-26' });
  });

  it('adds Nyerere Day only from the revised Schedule', () => {
    const has = (year: number) => holidaysOf('TZ', year).some((day) => day.id === 'nyerere-day');
    expect(has(2021)).toBe(false);
    expect(has(2023)).toBe(true);
  });

  it('lists the moon-dependent days only for 2025, the one year the pack cites', () => {
    const moon = (year: number) => holidaysOf('TZ', year).filter((day) => ['id-ul-fitr', 'id-el-haj', 'maulidi-day'].includes(day.id)).length;
    expect(moon(2025)).toBe(3);
    expect(moon(2026)).toBe(0);
  });

  it('has no holidays before the pack begins', () => {
    expect(holidaysOf('TZ', 1999)).toEqual([]);
  });
});

describe('the TZ address hierarchy from the pack', () => {
  it('gives region and district, both required, and ward, with the keys the form has always used', () => {
    const schema = countryAddressSchema('TZ');
    expect(schema?.levels).toEqual([
      { key: 'region', labelKey: 'address.tz.region', required: true },
      { key: 'district', labelKey: 'address.tz.district', required: true },
      { key: 'ward', labelKey: 'address.tz.ward', required: false },
    ]);
    expect(schema).toMatchObject({ hasCity: true, cityRequired: false, postalCodeRequired: false });
  });

  it('serves the address form from the pack, not from a copy', () => {
    expect(addressSchemaFor('TZ')).toEqual(countryAddressSchema('TZ'));
  });

  it('lists the 31 regions with ISO 3166-2 codes', () => {
    const regions = addressLevelOptions('TZ', 'region');
    expect(regions).toHaveLength(31);
    expect(new Set(regions.map((region) => region.code)).size).toBe(31);
    expect(new Set(regions.map((region) => region.name)).size).toBe(31);
    for (const region of regions) expect(region.code).toMatch(/^TZ-(0[1-9]|[12][0-9]|3[01])$/);
    expect(regions.find((region) => region.code === 'TZ-02')?.name).toBe('Dar es Salaam');
    expect(regions.find((region) => region.code === 'TZ-31')?.name).toBe('Songwe');
  });

  it('keeps a stored region that is not on the list selectable and bundles no district list', () => {
    expect(addressLevelChoices('TZ', 'region', 'Arusha')).toHaveLength(31);
    expect(addressLevelChoices('TZ', 'region', 'Old Name')[0]).toBe('Old Name');
    expect(addressLevelOptions('TZ', 'district')).toEqual([]);
  });
});

describe('TZ statutory returns', () => {
  it('lists PAYE and the skills levy on the 7th of the following month, both draft, and no rate', () => {
    const returns = getCountryPack('TZ')?.statutoryReturns ?? [];
    expect(returns.map((statutoryReturn) => [statutoryReturn.id, statutoryReturn.due, statutoryReturn.verification])).toEqual([
      ['paye-monthly', { type: 'day_of_following_month', day: 7 }, 'draft'],
      ['sdl-monthly', { type: 'day_of_following_month', day: 7 }, 'draft'],
    ]);
  });
});
