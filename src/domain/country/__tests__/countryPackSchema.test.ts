// ABOUTME: Validates packs/country/schema.json against the KE country pack, against documents it must
// ABOUTME: refuse, and runs the cross-field checks (sources, label keys, patterns) on the real pack.

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import Ajv2020 from 'ajv/dist/2020';
import { describe, expect, it } from 'vitest';

import type { CountryPack } from '../types';
import { checkCountryPackSemantics } from './countrySemantics';

const COUNTRY_DIR = resolve(process.cwd(), 'packs', 'country');
const CURRICULUM_SCHEMA_DIR = resolve(process.cwd(), 'packs', 'schema');
const SCHEMA_ID = 'https://schemas.schoolpilot.app/country-pack/v1/country.schema.json';
const LOCALE_SCHEMA_ID = 'https://schemas.schoolpilot.app/curriculum-pack/v1/locale.schema.json';

type Json = Record<string, any>;

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, 'utf8')) as Json;
}

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
for (const file of readdirSync(CURRICULUM_SCHEMA_DIR).filter((name) => name.endsWith('.json'))) {
  ajv.addSchema(readJson(resolve(CURRICULUM_SCHEMA_DIR, file)));
}
ajv.addSchema(readJson(resolve(COUNTRY_DIR, 'schema.json')));

function check(schemaId: string, document: unknown): { valid: boolean; errors: string[] } {
  const validator = ajv.getSchema(schemaId);
  if (!validator) throw new Error(`Schema is not registered: ${schemaId}`);
  const valid = validator(document) === true;
  return {
    valid,
    errors: (validator.errors ?? []).map((error) => `${error.instancePath} ${error.message}`),
  };
}

const kePack = (): Json => readJson(resolve(COUNTRY_DIR, 'ke', 'country.json'));
const keLabels = (): Record<string, string> =>
  readJson(resolve(COUNTRY_DIR, 'ke', 'locales', 'en.json')).labels;

function broken(change: (pack: Json) => void): Json {
  const pack = kePack();
  change(pack);
  return pack;
}

describe('the country pack schema', () => {
  it('accepts the KE country pack', () => {
    const result = check(SCHEMA_ID, kePack());
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('accepts the KE English and Kiswahili label files as locale documents', () => {
    for (const locale of ['en', 'sw']) {
      const result = check(LOCALE_SCHEMA_ID, readJson(resolve(COUNTRY_DIR, 'ke', 'locales', `${locale}.json`)));
      expect(result.errors).toEqual([]);
    }
  });

  it('refuses a country code that is not two capital letters', () => {
    expect(check(SCHEMA_ID, broken((pack) => (pack.country = 'KEN'))).valid).toBe(false);
    expect(check(SCHEMA_ID, broken((pack) => (pack.country = 'ke'))).valid).toBe(false);
  });

  it('refuses an id that is not country-<cc>', () => {
    expect(check(SCHEMA_ID, broken((pack) => (pack.id = 'ke'))).valid).toBe(false);
  });

  it('refuses a scheme id without a country prefix', () => {
    const result = check(
      SCHEMA_ID,
      broken((pack) => (pack.identifiers[0].scheme = 'kemis_upi'))
    );
    expect(result.valid).toBe(false);
  });

  it('refuses a byte-for-byte duplicated identifier', () => {
    const result = check(
      SCHEMA_ID,
      broken((pack) => pack.identifiers.push(structuredClone(pack.identifiers[0])))
    );
    expect(result.valid).toBe(false);
  });

  it('refuses a holiday rule of an unknown type', () => {
    const result = check(
      SCHEMA_ID,
      broken((pack) => (pack.holidays[0].rule = { type: 'lunar', month: 1, day: 1 }))
    );
    expect(result.valid).toBe(false);
  });

  it('refuses a fixed holiday rule with an impossible month', () => {
    const result = check(
      SCHEMA_ID,
      broken((pack) => (pack.holidays[0].rule = { type: 'fixed', month: 13, day: 1 }))
    );
    expect(result.valid).toBe(false);
  });

  it('refuses an unknown identifier validation type', () => {
    const result = check(
      SCHEMA_ID,
      broken((pack) => (pack.identifiers[0].validation = { type: 'checksum' }))
    );
    expect(result.valid).toBe(false);
  });

  it('refuses a pattern validation without a pattern', () => {
    const result = check(
      SCHEMA_ID,
      broken((pack) => (pack.identifiers[0].validation = { type: 'pattern', normalise: [] }))
    );
    expect(result.valid).toBe(false);
  });

  it('refuses a property the schema does not name, at every level that matters', () => {
    expect(check(SCHEMA_ID, broken((pack) => (pack.surprise = true))).valid).toBe(false);
    expect(check(SCHEMA_ID, broken((pack) => (pack.defaults.surprise = 1))).valid).toBe(false);
    expect(check(SCHEMA_ID, broken((pack) => (pack.identifiers[0].surprise = 1))).valid).toBe(false);
    expect(check(SCHEMA_ID, broken((pack) => (pack.holidays[0].surprise = 1))).valid).toBe(false);
    expect(check(SCHEMA_ID, broken((pack) => (pack.statutoryReturns[0].surprise = 1))).valid).toBe(false);
  });

  it('refuses a verification state other than draft or verified', () => {
    expect(check(SCHEMA_ID, broken((pack) => (pack.verification = 'reviewed'))).valid).toBe(false);
  });

  it('refuses a statutory return that carries a rate', () => {
    const result = check(
      SCHEMA_ID,
      broken((pack) => (pack.statutoryReturns[0].rate = 0.015))
    );
    expect(result.valid).toBe(false);
  });

  it('refuses a missing required section', () => {
    expect(check(SCHEMA_ID, broken((pack) => delete pack.addressHierarchy)).valid).toBe(false);
    expect(check(SCHEMA_ID, broken((pack) => delete pack.sources)).valid).toBe(false);
  });
});

describe('the KE country pack beyond its schema', () => {
  it('has no semantic problem', () => {
    expect(checkCountryPackSemantics(kePack() as unknown as CountryPack, keLabels())).toEqual([]);
  });

  it('is refused when two identifiers share a scheme', () => {
    const pack = kePack();
    pack.identifiers.push({ ...structuredClone(pack.identifiers[0]), labelKey: pack.identifiers[1].labelKey });
    expect(checkCountryPackSemantics(pack as unknown as CountryPack, keLabels())).toContain(
      `identifier ${pack.identifiers[0].scheme}: duplicate scheme`
    );
  });

  it('is refused when a scheme is not under the country prefix', () => {
    const pack = kePack();
    pack.identifiers[0].scheme = 'ug.kemis_upi';
    expect(checkCountryPackSemantics(pack as unknown as CountryPack, keLabels())).toContain(
      'identifier ug.kemis_upi: does not start with ke.'
    );
  });

  it('is refused when a sourceRef resolves to no source', () => {
    const pack = kePack();
    pack.holidays[0].sourceRef = 'no-such-source';
    expect(checkCountryPackSemantics(pack as unknown as CountryPack, keLabels())).toContain(
      `holiday ${pack.holidays[0].id}: sourceRef no-such-source is not a source`
    );
  });

  it('is refused when a label key is missing from the English labels', () => {
    const labels = keLabels();
    delete labels[kePack().identifiers[0].labelKey];
    expect(checkCountryPackSemantics(kePack() as unknown as CountryPack, labels)).toContain(
      `identifier ${kePack().identifiers[0].scheme}: label key ${kePack().identifiers[0].labelKey} is not in locales/en.json`
    );
  });

  it('is refused when a pattern does not compile', () => {
    const pack = kePack();
    const patterned = pack.identifiers.find((identifier: Json) => identifier.validation.type === 'pattern');
    patterned.validation.pattern = '([';
    expect(checkCountryPackSemantics(pack as unknown as CountryPack, keLabels())).toContain(
      `identifier ${patterned.scheme}: pattern does not compile`
    );
  });

  it('states no rate or percentage of any statutory contribution', () => {
    const text = readFileSync(resolve(COUNTRY_DIR, 'ke', 'country.json'), 'utf8');
    expect(text).not.toMatch(/\d\s?%/);
    expect(text).not.toMatch(/"(rate|percent|percentage|amount|band|bands)"/i);
  });

  it('is a draft pack while any of its data is a draft', () => {
    const pack = kePack();
    const drafts = [...pack.identifiers, ...pack.holidays, ...pack.statutoryReturns].filter(
      (datum: Json) => datum.verification === 'draft'
    );
    expect(drafts.length).toBeGreaterThan(0);
    expect(pack.verification).toBe('draft');
  });
});
