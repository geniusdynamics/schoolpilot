// ABOUTME: Validates the UG country pack against the country schema and its cross-field checks, and
// ABOUTME: drives the registry from the pack's own vectors: identifiers, holidays and the address.

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import Ajv2020 from 'ajv/dist/2020';
import { describe, expect, it } from 'vitest';

import { addressSchemaFor } from '@/utils/locale/addresses';

import {
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

const COUNTRY_DIR = resolve(process.cwd(), 'packs', 'country');
const CURRICULUM_SCHEMA_DIR = resolve(process.cwd(), 'packs', 'schema');
const SCHEMA_ID = 'https://schemas.schoolpilot.app/country-pack/v1/country.schema.json';
const LOCALE_SCHEMA_ID = 'https://schemas.schoolpilot.app/curriculum-pack/v1/locale.schema.json';

function readJson(...parts: string[]): Json {
  return JSON.parse(readFileSync(resolve(COUNTRY_DIR, 'ug', ...parts), 'utf8')) as Json;
}

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
for (const file of readdirSync(CURRICULUM_SCHEMA_DIR).filter((name) => name.endsWith('.json'))) {
  ajv.addSchema(JSON.parse(readFileSync(resolve(CURRICULUM_SCHEMA_DIR, file), 'utf8')) as object);
}
ajv.addSchema(JSON.parse(readFileSync(resolve(COUNTRY_DIR, 'schema.json'), 'utf8')) as object);

function errorsOf(schemaId: string, document: unknown): string[] {
  const validator = ajv.getSchema(schemaId);
  if (!validator) throw new Error(`Schema is not registered: ${schemaId}`);
  validator(document);
  return (validator.errors ?? []).map((error) => `${error.instancePath} ${error.message}`);
}

const pack = (): Json => readJson('country.json');
const labels = (): Record<string, string> => readJson('locales', 'en.json').labels;
const vectors = readJson('tests', 'ug.vectors.json') as {
  identifiers: { scheme: string; value: string; valid: boolean; normalised?: string }[];
  easterSunday: Record<string, string>;
  holidays: { year: number; days: { id: string; nominal: string; observed: string }[] }[];
};

describe('the UG country pack on disk', () => {
  it('passes the country schema', () => {
    expect(errorsOf(SCHEMA_ID, pack())).toEqual([]);
  });

  it('ships English and Kiswahili labels that pass the locale schema, with the same keys', () => {
    for (const language of ['en', 'sw']) {
      expect(errorsOf(LOCALE_SCHEMA_ID, readJson('locales', `${language}.json`))).toEqual([]);
    }
    expect(Object.keys(readJson('locales', 'sw.json').labels).sort()).toEqual(Object.keys(labels()).sort());
  });

  it('has no semantic problem', () => {
    expect(checkCountryPackSemantics(pack() as unknown as CountryPack, labels())).toEqual([]);
  });

  it('is refused when a holiday names a source the pack does not cite', () => {
    const broken = pack();
    broken.holidays[0].sourceRef = 'no-such-source';
    expect(checkCountryPackSemantics(broken as unknown as CountryPack, labels())).toContain(
      'holiday new-year: sourceRef no-such-source is not a source'
    );
  });

  it('states no rate or percentage of any statutory contribution', () => {
    const text = readFileSync(resolve(COUNTRY_DIR, 'ug', 'country.json'), 'utf8');
    expect(text).not.toMatch(/\d\s?%/);
    expect(text).not.toMatch(/"(rate|percent|percentage|amount|band|bands)"/i);
  });

  it('is a draft pack and marks only the URA-confirmed PAYE day as verified', () => {
    const data = [...pack().identifiers, ...pack().holidays, ...pack().statutoryReturns];
    const verified = data.filter((datum: Json) => datum.verification === 'verified').map((datum: Json) => datum.id);
    expect(pack().verification).toBe('draft');
    expect(verified).toEqual(['paye-monthly']);
  });
});

describe('the UG registry entry', () => {
  it('is found by code in either case', () => {
    expect(getCountryPack('UG')?.id).toBe('country-ug');
    expect(getCountryPack('ug')?.defaults.currency).toBe('UGX');
  });

  it('lists a learner\'s schemes with the LIN first', () => {
    expect(identifierSchemesFor('UG', 'learner').map((scheme) => scheme.value)).toEqual([
      'ug.lin',
      'ug.birth_certificate',
      'ug.nin',
    ]);
  });

  it.each(vectors.identifiers)('validates $scheme "$value" -> valid=$valid', (vector) => {
    const result = validateIdentifier('UG', vector.scheme, vector.value);
    if (vector.valid) expect(result).toEqual({ ok: true, value: vector.normalised });
    else expect(result.ok).toBe(false);
  });
});

describe('UG public holidays', () => {
  it.each(Object.entries(vectors.easterSunday))('computes Easter Sunday %s as %s', (year, expected) => {
    expect(easterSunday(Number(year))).toBe(expected);
  });

  it.each(vectors.holidays)('lists the holidays of $year with the Sunday rule applied', ({ year, days }) => {
    const listed = holidaysOf('UG', year).map((day) => ({ id: day.id, nominal: day.date, observed: day.observed }));
    expect(listed).toEqual(days);
  });

  it('never observes a holiday on a Sunday or two holidays on one day', () => {
    for (let year = 2020; year <= 2040; year += 1) {
      const observed = holidaysOf('UG', year).map((day) => day.observed);
      for (const date of observed) expect(new Date(`${date}T00:00:00Z`).getUTCDay(), date).not.toBe(0);
      expect(new Set(observed).size, String(year)).toBe(observed.length);
    }
  });

  it('has no holidays before the pack begins', () => {
    expect(holidaysOf('UG', 2019)).toEqual([]);
  });
});

describe('the UG address hierarchy from the pack', () => {
  const expected = [
    { key: 'district', labelKey: 'address.ug.district', required: true },
    { key: 'sub_county', labelKey: 'address.ug.sub_county', required: true },
    { key: 'parish', labelKey: 'address.ug.parish', required: false },
  ];

  it('gives district, sub-county and parish, the first two required', () => {
    expect(countryAddressSchema('UG')?.levels).toEqual(expected);
  });

  it('is what the address module serves for UG', () => {
    expect(addressSchemaFor('UG')).toEqual(countryAddressSchema('UG'));
    expect(addressSchemaFor('UG')).toMatchObject({
      country: 'UG',
      hasCity: true,
      cityRequired: false,
      postalCodeRequired: false,
    });
  });
});
