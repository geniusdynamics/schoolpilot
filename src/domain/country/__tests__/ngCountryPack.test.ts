// ABOUTME: Validates the NG country pack against the country schema and its cross-field checks, drives its identifier,
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
  return JSON.parse(readFileSync(resolve(COUNTRY_DIR, 'ng', ...parts), 'utf8')) as Json;
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
const vectors = readJson('tests', 'ng.vectors.json') as {
  identifiers: { scheme: string; value: string; valid: boolean; normalised?: string }[];
  easterSunday: Record<string, string>;
  holidays: HolidayVector[];
};

describe('the NG country pack on disk', () => {
  it('passes the country schema', () => {
    const result = check(SCHEMA_ID, pack);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('ships English and Hausa labels that pass the locale schema and share every key', () => {
    const hausa = readJson('locales', 'ha.json') as { labels: Record<string, string> };
    for (const locale of ['en', 'ha']) {
      expect(check(LOCALE_SCHEMA_ID, readJson('locales', `${locale}.json`)).errors).toEqual([]);
    }
    expect(Object.keys(hausa.labels).sort()).toEqual(Object.keys(labels).sort());
    expect(pack.defaults.languages).toEqual(['en', 'ha']);
  });

  it('has no semantic problem', () => {
    expect(checkCountryPackSemantics(pack as unknown as CountryPack, labels)).toEqual([]);
  });

  it('is a draft pack while any of its data is a draft', () => {
    const drafts = [...pack.identifiers, ...pack.holidays, ...pack.statutoryReturns].filter(
      (datum: Json) => datum.verification === 'draft'
    );
    expect(drafts.length).toBeGreaterThan(0);
    expect(pack.verification).toBe('draft');
  });

  it('states no rate, band, percentage or amount of any statutory contribution', () => {
    const text = readFileSync(resolve(COUNTRY_DIR, 'ng', 'country.json'), 'utf8');
    expect(text).not.toMatch(/\d\s?%/);
    expect(text).not.toMatch(/"(rate|percent|percentage|amount|band|bands)"/i);
  });

  it('defaults to naira, Lagos time and the Nigerian phone region', () => {
    expect(pack.defaults).toMatchObject({
      currency: 'NGN',
      timeZone: 'Africa/Lagos',
      phoneRegion: 'NG',
      calendar: 'gregorian',
    });
  });
});

describe('the NG registry entry', () => {
  it('is found by code in either case', () => {
    expect(getCountryPack('NG')?.id).toBe('country-ng');
    expect(getCountryPack('ng')?.country).toBe('NG');
  });
});

describe('NG identifier schemes', () => {
  it('lists the national identification number first for every owner type', () => {
    for (const owner of ['learner', 'guardian', 'staff'] as const) {
      expect(identifierSchemesFor('NG', owner)[0]).toEqual(
        expect.objectContaining({ value: 'ng.nin', label: 'National Identification Number (NIN)' })
      );
    }
  });

  it('lists the tax, retirement savings and teacher numbers for staff only', () => {
    const staff = identifierSchemesFor('NG', 'staff').map((scheme) => scheme.value);
    expect(staff).toEqual(
      expect.arrayContaining(['ng.nin', 'ng.tin', 'ng.rsa_pin', 'ng.trcn_number', 'ng.passport'])
    );
    expect(identifierSchemesFor('NG', 'learner').map((scheme) => scheme.value)).toEqual(['ng.nin', 'ng.birth_certificate']);
  });

  it.each(vectors.identifiers)('validates $scheme "$value" -> valid=$valid', (vector) => {
    const result = validateIdentifier('NG', vector.scheme, vector.value);
    if (vector.valid) {
      expect(result).toEqual({ ok: true, value: vector.normalised });
    } else {
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message.length).toBeGreaterThan(0);
    }
  });

  it('names the eleven digits in the refusal of a malformed NIN', () => {
    expect(validateIdentifier('NG', 'ng.nin', '12345')).toEqual({
      ok: false,
      message: expect.stringContaining('Eleven digits'),
    });
  });
});

describe('NG public holidays', () => {
  it.each(Object.entries(vectors.easterSunday))('computes Easter Sunday %s as %s', (year, expected) => {
    expect(easterSunday(Number(year))).toBe(expected);
  });

  it.each(vectors.holidays)('lists the holidays of $year as the Act names them, with no day in lieu', ({ year, days }) => {
    const listed = holidaysOf('NG', year).map((day) => ({ id: day.id, nominal: day.date, observed: day.observed }));
    expect(listed).toEqual(days);
  });

  it('observes a holiday on its own day, including a Saturday or a Sunday (section 5 of the Act)', () => {
    for (let year = 2000; year <= 2040; year += 1) {
      for (const day of holidaysOf('NG', year)) expect(day.observed, `${day.id} ${year}`).toBe(day.date);
    }
  });

  it('moves Democracy Day from 29 May to 12 June with the 2019 amendment', () => {
    const democracy = (year: number) =>
      holidaysOf('NG', year)
        .filter((day) => day.id.startsWith('democracy-day'))
        .map((day) => day.date);
    expect(democracy(2018)).toEqual(['2018-05-29']);
    expect(democracy(2019)).toEqual(['2019-05-29', '2019-06-12']);
    expect(democracy(2024)).toEqual(['2024-06-12']);
  });

  it('lists the Muslim festivals only for the years whose declaration the pack cites', () => {
    const festivals = (year: number) => holidaysOf('NG', year).filter((day) => day.id.startsWith('id-el')).length;
    expect(festivals(2026)).toBe(5);
    expect(festivals(2027)).toBe(0);
  });

  it('has no holidays before the pack begins', () => {
    expect(holidaysOf('NG', 1999)).toEqual([]);
  });
});

describe('the NG address hierarchy from the pack', () => {
  it('gives state and local government area, both required, with the keys the form has always used', () => {
    const schema = countryAddressSchema('NG');
    expect(schema?.levels).toEqual([
      { key: 'state', labelKey: 'address.ng.state', required: true },
      { key: 'lga', labelKey: 'address.ng.lga', required: true },
    ]);
    expect(schema).toMatchObject({ hasCity: true, cityRequired: false, postalCodeRequired: false });
  });

  it('serves the address form from the pack, not from a copy', () => {
    expect(addressSchemaFor('NG')).toEqual(countryAddressSchema('NG'));
  });

  it('lists the 36 states and the Federal Capital Territory with ISO 3166-2 codes', () => {
    const states = addressLevelOptions('NG', 'state');
    expect(states).toHaveLength(37);
    expect(new Set(states.map((state) => state.code)).size).toBe(37);
    expect(new Set(states.map((state) => state.name)).size).toBe(37);
    for (const state of states) expect(state.code).toMatch(/^NG-[A-Z]{2}$/);
    expect(states.find((state) => state.code === 'NG-LA')?.name).toBe('Lagos');
    expect(states.find((state) => state.code === 'NG-FC')?.name).toBe('Federal Capital Territory');
    expect(states.map((state) => state.name)).toEqual([...states.map((state) => state.name)].sort((a, b) => a.localeCompare(b)));
  });

  it('keeps a stored state that is not on the list selectable and bundles no LGA list', () => {
    expect(addressLevelChoices('NG', 'state', 'Kano')).toHaveLength(37);
    expect(addressLevelChoices('NG', 'state', 'Old Name')[0]).toBe('Old Name');
    expect(addressLevelOptions('NG', 'lga')).toEqual([]);
  });
});
