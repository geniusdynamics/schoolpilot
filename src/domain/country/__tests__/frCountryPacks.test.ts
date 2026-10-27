// ABOUTME: Validates the SN, CI and CM country packs against the country schema and its cross-field checks, drives their
// ABOUTME: identifier, holiday and address behaviour from their own vectors, and pins that the address form comes from the pack.

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

interface CountryExpectation {
  readonly code: 'SN' | 'CI' | 'CM';
  readonly name: string;
  readonly currency: string;
  readonly timeZone: string;
  readonly languages: readonly string[];
  readonly topLevel: string;
  readonly topLevelCount: number;
  readonly subLevel: string;
  readonly sampleCode: string;
  readonly sampleName: string;
}

const COUNTRIES: readonly CountryExpectation[] = [
  { code: 'SN', name: 'Senegal', currency: 'XOF', timeZone: 'Africa/Dakar', languages: ['fr', 'en'], topLevel: 'region', topLevelCount: 14, subLevel: 'department', sampleCode: 'SN-DK', sampleName: 'Dakar' },
  { code: 'CI', name: "Cote d'Ivoire", currency: 'XOF', timeZone: 'Africa/Abidjan', languages: ['fr', 'en'], topLevel: 'district', topLevelCount: 14, subLevel: 'region', sampleCode: 'CI-AB', sampleName: 'Abidjan' },
  { code: 'CM', name: 'Cameroon', currency: 'XAF', timeZone: 'Africa/Douala', languages: ['fr', 'en'], topLevel: 'region', topLevelCount: 10, subLevel: 'division', sampleCode: 'CM-LT', sampleName: 'Littoral' },
];

const COUNTRY_DIR = resolve(process.cwd(), 'packs', 'country');
const CURRICULUM_SCHEMA_DIR = resolve(process.cwd(), 'packs', 'schema');
const SCHEMA_ID = 'https://schemas.schoolpilot.app/country-pack/v1/country.schema.json';
const LOCALE_SCHEMA_ID = 'https://schemas.schoolpilot.app/curriculum-pack/v1/locale.schema.json';

function readJson(country: string, ...parts: string[]): Json {
  return JSON.parse(readFileSync(resolve(COUNTRY_DIR, country.toLowerCase(), ...parts), 'utf8')) as Json;
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

describe.each(COUNTRIES)('the $code country pack on disk', (expected) => {
  const pack = readJson(expected.code, 'country.json');
  const labels = (readJson(expected.code, 'locales', 'en.json') as { labels: Record<string, string> }).labels;

  it('passes the country schema', () => {
    const result = check(SCHEMA_ID, pack);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('ships French and English labels that pass the locale schema and share every key, French first', () => {
    const french = readJson(expected.code, 'locales', 'fr.json') as { labels: Record<string, string> };
    for (const locale of ['fr', 'en']) {
      expect(check(LOCALE_SCHEMA_ID, readJson(expected.code, 'locales', `${locale}.json`)).errors).toEqual([]);
    }
    expect(Object.keys(french.labels).sort()).toEqual(Object.keys(labels).sort());
    expect(pack.defaults.languages).toEqual(expected.languages);
    const identity = `country.${expected.code.toLowerCase()}.identifier.national_id`;
    expect(french.labels[identity]).not.toBe(labels[identity]);
  });

  it('has no semantic problem', () => {
    expect(checkCountryPackSemantics(pack as unknown as CountryPack, labels)).toEqual([]);
  });

  it('is a draft pack and says in its notes what it could not confirm', () => {
    expect(pack.verification).toBe('draft');
    expect(pack.notes.length).toBeGreaterThan(0);
    const drafts = [...pack.identifiers, ...pack.holidays, ...pack.statutoryReturns].filter((datum: Json) => datum.verification === 'draft');
    expect(drafts.length).toBeGreaterThan(0);
  });

  it('states no rate, band, percentage or amount of any statutory contribution', () => {
    const text = readFileSync(resolve(COUNTRY_DIR, expected.code.toLowerCase(), 'country.json'), 'utf8');
    expect(text).not.toMatch(/\d\s?%/);
    expect(text).not.toMatch(/"(rate|percent|percentage|amount|band|bands)"/i);
  });

  it('defaults to the local currency, time zone and phone region', () => {
    expect(pack.defaults).toMatchObject({
      currency: expected.currency,
      timeZone: expected.timeZone,
      phoneRegion: expected.code,
      calendar: 'gregorian',
    });
  });

  it('is found in the registry by code in either case', () => {
    expect(getCountryPack(expected.code)?.id).toBe(`country-${expected.code.toLowerCase()}`);
    expect(getCountryPack(expected.code.toLowerCase())?.country).toBe(expected.code);
  });
});

describe.each(COUNTRIES)('$code identifier schemes', (expected) => {
  const prefix = expected.code.toLowerCase();
  const vectors = readJson(expected.code, 'tests', `${prefix}.vectors.json`) as {
    identifiers: { scheme: string; value: string; valid: boolean; normalised?: string }[];
  };

  it('offers the national identity number to guardians and staff and the birth certificate to learners', () => {
    expect(identifierSchemesFor(expected.code, 'guardian').map((scheme) => scheme.value)).toEqual([`${prefix}.national_id`]);
    expect(identifierSchemesFor(expected.code, 'staff').map((scheme) => scheme.value)).toEqual([`${prefix}.national_id`]);
    expect(identifierSchemesFor(expected.code, 'learner').map((scheme) => scheme.value)).toEqual([`${prefix}.birth_certificate`]);
  });

  it('claims no format for an identifier no fetched source describes', () => {
    for (const identifier of (readJson(expected.code, 'country.json') as { identifiers: Json[] }).identifiers) {
      expect(identifier.validation, identifier.scheme).toEqual({ type: 'free' });
      expect(identifier.verification, identifier.scheme).toBe('draft');
    }
  });

  it.each(vectors.identifiers)('validates $scheme "$value" -> valid=$valid', (vector) => {
    const result = validateIdentifier(expected.code, vector.scheme, vector.value);
    if (vector.valid) {
      expect(result).toEqual({ ok: true, value: vector.normalised });
    } else {
      expect(result.ok).toBe(false);
    }
  });
});

describe.each(COUNTRIES)('$code public holidays', (expected) => {
  const vectors = readJson(expected.code, 'tests', `${expected.code.toLowerCase()}.vectors.json`) as {
    easterSunday: Record<string, string>;
    holidays: HolidayVector[];
  };

  it.each(Object.entries(vectors.easterSunday))('computes Easter Sunday %s as %s', (year, date) => {
    expect(easterSunday(Number(year))).toBe(date);
  });

  it.each(vectors.holidays)('lists the holidays of $year, each on its own day', ({ year, days }) => {
    const listed = holidaysOf(expected.code, year).map((day) => ({ id: day.id, nominal: day.date, observed: day.observed }));
    expect(listed).toEqual(days);
  });

  it('lists no Muslim festival, whose dates no fetched source declares', () => {
    for (const year of [2025, 2026, 2027]) {
      expect(holidaysOf(expected.code, year).filter((day) => /korite|tabaski|mawlid|tamkharit|magal|ramadan/.test(day.id))).toEqual([]);
    }
  });

  it('marks every holiday draft, because only a secondary source states them', () => {
    for (const holiday of holidaysOf(expected.code, 2026)) expect(holiday.verification, holiday.id).toBe('draft');
  });
});

describe.each(COUNTRIES)('the $code address hierarchy from the pack', (expected) => {
  const prefix = expected.code.toLowerCase();

  it('gives the top level required, one free sub level, and serves the form from the pack', () => {
    const schema = countryAddressSchema(expected.code);
    expect(schema?.levels).toEqual([
      { key: expected.topLevel, labelKey: `address.${prefix}.${expected.topLevel}`, required: true },
      { key: expected.subLevel, labelKey: `address.${prefix}.${expected.subLevel}`, required: false },
    ]);
    expect(schema).toMatchObject({ hasCity: true, cityRequired: false, postalCodeRequired: false });
    expect(addressSchemaFor(expected.code)).toEqual(schema);
  });

  it('lists the top-level divisions with ISO 3166-2 codes, each once', () => {
    const options = addressLevelOptions(expected.code, expected.topLevel);
    expect(options).toHaveLength(expected.topLevelCount);
    expect(new Set(options.map((option) => option.code)).size).toBe(expected.topLevelCount);
    expect(new Set(options.map((option) => option.name)).size).toBe(expected.topLevelCount);
    for (const option of options) expect(option.code).toMatch(new RegExp(`^${expected.code}-[A-Z]{2}$`));
    expect(options.find((option) => option.code === expected.sampleCode)?.name).toBe(expected.sampleName);
  });

  it('keeps a stored value that is not on the list selectable and bundles no list for the sub level', () => {
    expect(addressLevelChoices(expected.code, expected.topLevel, 'Old Name')[0]).toBe('Old Name');
    expect(addressLevelOptions(expected.code, expected.subLevel)).toEqual([]);
  });
});

describe('the CM statutory return', () => {
  it('lists the monthly return due on the 15th as a draft and no rate', () => {
    const returns = (readJson('CM', 'country.json') as { statutoryReturns: Json[] }).statutoryReturns;
    expect(returns).toHaveLength(1);
    expect(returns[0]).toMatchObject({ frequency: 'monthly', due: { type: 'day_of_following_month', day: 15 }, verification: 'draft' });
  });

  it('is the only one of the three that lists a return, because no fetched source gives the others', () => {
    expect((readJson('SN', 'country.json') as { statutoryReturns: Json[] }).statutoryReturns).toEqual([]);
    expect((readJson('CI', 'country.json') as { statutoryReturns: Json[] }).statutoryReturns).toEqual([]);
  });
});
