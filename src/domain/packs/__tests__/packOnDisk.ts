// ABOUTME: Shared helpers for the per-pack test files that read a pack from packs/<code>: the composed pack schema
// ABOUTME: validator, the exact band lookup, and the pack loader. Used by the Tanzania and Rwanda pack tests.

import { readFileSync, readdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';

import Ajv2020 from 'ajv/dist/2020';

import { compareExact, parseExact, type Exact } from '../../assessment/engine';

export interface Band {
  readonly code: string;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly points?: number;
}

export interface GradingScale {
  readonly code: string;
  readonly kind: string;
  readonly input?: string;
  readonly upper?: string;
  readonly bands: readonly Band[];
  readonly verification?: string;
}

export interface Slot {
  readonly code: string;
  readonly kind: string;
  readonly scale_to?: number;
}

export interface Scheme {
  readonly code: string;
  readonly levels: readonly string[];
  readonly slots: readonly Slot[];
  readonly grading_scale: string;
  readonly learning_area_score: { readonly op: string; readonly of: readonly string[]; readonly out_of: number };
}

export interface Aggregation {
  readonly code: string;
  readonly op: string;
  readonly value?: string;
  readonly over?: readonly string[];
  readonly result_scale?: string;
}

export interface Assessment {
  readonly schemes: readonly Scheme[];
  readonly grading_scales: readonly GradingScale[];
  readonly aggregations: readonly Aggregation[];
  readonly ranking: { readonly enabled: boolean; readonly by: string };
  readonly annual: { readonly op: string; readonly of: readonly string[] };
}

export interface Level {
  readonly code: string;
  readonly ordinal: number;
  readonly next: string | null;
  readonly national_assessment: string | null;
}

export interface Structure {
  readonly stages: readonly { readonly code: string; readonly levels: readonly string[] }[];
  readonly levels: readonly Level[];
  readonly calendar_template: { readonly year_kind: string; readonly periods: readonly { readonly code: string }[] };
}

export interface LearningArea {
  readonly code: string;
  readonly name: string;
  readonly kind: string;
  readonly group?: string;
  readonly levels: readonly string[];
}

export interface CombinationRule {
  readonly levels: readonly string[];
  readonly rule: string;
  readonly of?: readonly string[];
}

export interface LearningAreaDocument {
  readonly learning_areas: readonly LearningArea[];
  readonly combination_rules?: readonly CombinationRule[];
}

export interface Report {
  readonly code: string;
  readonly levels: readonly string[];
  readonly blocks: readonly { readonly type: string; readonly label_key?: string }[];
}

export interface Locale {
  readonly labels: Readonly<Record<string, string>>;
  readonly descriptors?: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

export interface Vector {
  readonly name: string;
  readonly programme?: string;
  readonly input: Readonly<Record<string, unknown>>;
  readonly expect: Readonly<Record<string, unknown>>;
}

export interface Manifest {
  readonly code: string;
  readonly country: string;
  readonly languages: readonly string[];
  readonly sources: readonly { readonly url: string }[];
  readonly verification: { readonly status: string; readonly notes?: string };
}

export const PACKS_DIR = resolve(process.cwd(), 'packs');
const SCHEMA_DIR = resolve(PACKS_DIR, 'schema');
export const PACK_SCHEMA_ID = 'https://schemas.schoolpilot.app/curriculum-pack/v1/pack.schema.json';

export const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
for (const file of readdirSync(SCHEMA_DIR).filter((name) => name.endsWith('.json'))) {
  ajv.addSchema(JSON.parse(readFileSync(resolve(SCHEMA_DIR, file), 'utf8')) as object);
}

export function readJson<T>(pack: string, ...parts: string[]): T {
  return JSON.parse(readFileSync(resolve(PACKS_DIR, pack, ...parts), 'utf8')) as T;
}

function readJsonDirectory<T>(pack: string, directory: string): T[] {
  return readdirSync(resolve(PACKS_DIR, pack, directory))
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => readJson<T>(pack, directory, name));
}

export function loadPack(pack: string) {
  const locales = Object.fromEntries(
    readdirSync(resolve(PACKS_DIR, pack, 'locales'))
      .filter((name) => name.endsWith('.json'))
      .sort()
      .map((name) => [basename(name, '.json'), readJson<Locale>(pack, 'locales', name)])
  );
  const testFile = readdirSync(resolve(PACKS_DIR, pack, 'tests')).find((name) => name.endsWith('.vectors.json'));
  if (testFile === undefined) throw new Error(`${pack} ships no vectors`);
  return {
    manifest: readJson<Manifest>(pack, 'pack.json'),
    structure: readJson<Structure>(pack, 'structure.json'),
    learningAreas: readJson<LearningAreaDocument>(pack, 'learning-areas.json'),
    assessment: readJson<Assessment>(pack, 'assessment.json'),
    progression: readJson<{
      progression: { levels: string[]; rule: string; to_stage?: string }[];
      graduation: { levels: string[]; rule: string }[];
    }>(pack, 'progression.json'),
    reports: readJsonDirectory<Report>(pack, 'reports'),
    locales,
    tests: readJson<{ vectors: readonly Vector[] }>(pack, 'tests', testFile),
  };
}

export function exactOf(text: string): Exact {
  const value = parseExact(text);
  if (value === null) throw new Error(`not an exact value: ${text}`);
  return value;
}

/** Every band whose range contains the value; more than one means the bands overlap. */
export function bandsAt(scale: GradingScale, value: Exact): Band[] {
  return scale.bands.filter((band) => {
    const atOrAbove = compareExact(value, exactOf(String(band.min))) >= 0;
    const belowUpper = compareExact(value, exactOf(String(band.max))) <= 0;
    return atOrAbove && belowUpper;
  });
}

export function scaleOf(assessment: Assessment, code: string): GradingScale {
  const scale = assessment.grading_scales.find((candidate) => candidate.code === code);
  if (!scale) throw new Error(`the pack declares no grading scale ${code}`);
  return scale;
}
