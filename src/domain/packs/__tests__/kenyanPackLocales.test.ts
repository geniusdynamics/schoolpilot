// ABOUTME: Every label, descriptor and comment-bank seed in a Kenyan pack's English locale also exists in its Kiswahili locale.
// ABOUTME: Checks the sw files are translated rather than copied from English, and are valid against the locale schema.

import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import { describe, expect, it } from 'vitest';

interface CommentSeed {
  readonly scope: string;
  readonly band: string;
  readonly learning_area?: string;
  readonly text: string;
}

interface PackLocale {
  readonly labels?: Readonly<Record<string, string>>;
  readonly descriptors?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  readonly comment_bank?: readonly CommentSeed[];
}

const PACKS_DIR = resolve(__dirname, '..', '..', '..', '..', 'packs');
const KENYAN_PACKS = ['ke-cbe', 'ke-844'];

const readJson = <T>(...segments: string[]): T =>
  JSON.parse(readFileSync(resolve(PACKS_DIR, ...segments), 'utf8')) as T;

const seedId = (seed: CommentSeed): string => [seed.scope, seed.band, seed.learning_area ?? ''].join('|');

const flatten = (locale: PackLocale): Map<string, string> => {
  const entries = new Map<string, string>();
  for (const [key, value] of Object.entries(locale.labels ?? {})) entries.set(`labels.${key}`, value);
  for (const [scale, bands] of Object.entries(locale.descriptors ?? {})) {
    for (const [band, value] of Object.entries(bands)) entries.set(`descriptors.${scale}.${band}`, value);
  }
  for (const seed of locale.comment_bank ?? []) entries.set(`comment_bank.${seedId(seed)}`, seed.text);
  return entries;
};

describe.each(KENYAN_PACKS)('%s Kiswahili locale', (pack) => {
  const english = flatten(readJson<PackLocale>(pack, 'locales', 'en.json'));
  const swahili = flatten(readJson<PackLocale>(pack, 'locales', 'sw.json'));

  it('has every key of the English locale', () => {
    const missing = [...english.keys()].filter((key) => !swahili.has(key));
    expect(missing).toEqual([]);
  });

  it('has no key the English locale lacks', () => {
    const extra = [...swahili.keys()].filter((key) => !english.has(key));
    expect(extra).toEqual([]);
  });

  it('translates every value instead of copying English', () => {
    const copied = [...english].filter(([key, text]) => swahili.get(key) === text).map(([key]) => key);
    expect(copied).toEqual([]);
  });

  it('is valid against the locale schema', () => {
    const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
    for (const file of readdirSync(resolve(PACKS_DIR, 'schema')).filter((name) => name.endsWith('.json'))) {
      ajv.addSchema(readJson<object>('schema', file));
    }
    const validate = ajv.getSchema('https://schemas.schoolpilot.app/curriculum-pack/v1/locale.schema.json');
    if (!validate) throw new Error('locale schema is not registered');
    const locale = readJson<PackLocale>(pack, 'locales', 'sw.json');
    expect(validate(locale), JSON.stringify(validate.errors)).toBe(true);
  });
});
