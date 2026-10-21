// ABOUTME: Conformance test for the shipped ke-cbe pack. It validates every section file against the
// ABOUTME: published curriculum-pack schemas, runs the documented runtime checks, and executes every
// ABOUTME: conformance vector through the assessment engine and the pack's declared scales.

import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import Ajv2020 from 'ajv/dist/2020';
import { describe, expect, it } from 'vitest';

import {
  divideExact,
  evaluateScheme,
  formatExactFixed,
  parseExact,
  roundExact,
  sumExact,
  type Exact,
  type MissingPolicy,
  type RoundingMode,
  type RoundingRule,
  type SchemeDefinition,
  type SchemeEvaluationInput,
} from '../../assessment/engine';
import { checkPackSemantics } from './packSemantics';

const PACK_DIR = resolve(process.cwd(), 'packs', 'ke-cbe');
const SCHEMA_DIR = resolve(process.cwd(), 'packs', 'schema');
const BASE = 'https://schemas.schoolpilot.app/curriculum-pack/v1/';

// ---------------------------------------------------------------- pack shapes

interface Source {
  readonly title: string;
  readonly issuer: string;
  readonly url: string;
  readonly retrieved: string;
}

interface Manifest {
  readonly code: string;
  readonly name: string;
  readonly version: string;
  readonly country: string;
  readonly issuers: readonly string[];
  readonly effective_from: string;
  readonly languages: readonly string[];
  readonly requires_engine: string;
  readonly sources: readonly Source[];
  readonly verification: {
    readonly status: 'draft' | 'verified';
    readonly verified_by: readonly string[];
    readonly notes?: string;
  };
  readonly overridable?: readonly string[];
}

interface Level {
  readonly code: string;
  readonly name: string;
  readonly ordinal: number;
  readonly next?: string | null;
  readonly is_stage_exit?: boolean;
  readonly national_assessment?: string | null;
}

interface Structure {
  readonly stages: readonly { readonly code: string; readonly levels: readonly string[] }[];
  readonly levels: readonly Level[];
  readonly pathways?: readonly { readonly code: string; readonly levels: readonly string[] }[];
  readonly calendar_template: {
    readonly year_kind: string;
    readonly periods: readonly { readonly code?: string; readonly sequence: number }[];
  };
}

interface LearningArea {
  readonly code: string;
  readonly name: string;
  readonly kind: string;
  readonly group?: string;
  readonly levels: readonly string[];
  readonly pathways?: readonly string[];
}

interface LearningAreaDocument {
  readonly learning_areas: readonly LearningArea[];
  readonly competencies: readonly { readonly code: string; readonly kind: string }[];
  readonly combination_rules?: readonly {
    readonly levels: readonly string[];
    readonly rule: string;
    readonly of?: readonly string[];
    readonly count?: number;
  }[];
}

interface Band {
  readonly code: string;
  readonly min: number;
  readonly max: number;
  readonly points?: number;
}

interface Scale {
  readonly code: string;
  readonly kind: string;
  readonly upper?: 'inclusive' | 'exclusive';
  readonly bands?: readonly Band[];
}

interface SchemeScore {
  readonly op: string;
  readonly of: readonly string[];
  readonly out_of: number;
}

interface SchemeSlotDocument {
  readonly code: string;
  readonly label?: string;
  readonly max?: number;
  readonly scale_to?: number;
  readonly multi?: boolean;
  readonly combine?: 'mean' | 'sum' | 'best_of';
}

interface SchemeDocument {
  readonly code: string;
  readonly slots?: readonly SchemeSlotDocument[];
  readonly learning_area_score?: SchemeScore;
  readonly missing?: Readonly<Record<string, string>>;
  readonly rounding?: readonly {
    readonly stage: string;
    readonly precision: number;
    readonly mode: string;
  }[];
}

interface Aggregation {
  readonly code: string;
  readonly op: string;
  readonly value?: string;
  readonly precision?: number;
  readonly result_scale?: string;
}

interface Assessment {
  readonly schemes: readonly SchemeDocument[];
  readonly grading_scales: readonly Scale[];
  readonly aggregations?: readonly Aggregation[];
}

interface Progression {
  readonly progression: readonly {
    readonly levels: readonly string[];
    readonly rule: string;
    readonly to_stage?: string;
    readonly requires?: readonly string[];
  }[];
  readonly graduation?: readonly { readonly levels: readonly string[]; readonly rule: string }[];
}

interface ReportTemplate {
  readonly code: string;
  readonly levels: readonly string[];
  readonly blocks: readonly { readonly type: string; readonly label_key?: string }[];
}

interface Locale {
  readonly labels?: Readonly<Record<string, string>>;
  readonly descriptors?: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

interface VectorExpectation {
  readonly value?: number;
  readonly grade?: string;
  readonly points?: number;
}

interface Vector {
  readonly name: string;
  readonly programme?: string;
  readonly input: Readonly<Record<string, string | number | null>>;
  readonly expect: Readonly<Record<string, VectorExpectation | readonly string[]>>;
}

// -------------------------------------------------------------------- loading

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function jsonFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort();
}

const manifest = readJson<Manifest>(join(PACK_DIR, 'pack.json'));
const structure = readJson<Structure>(join(PACK_DIR, 'structure.json'));
const learningAreaDocument = readJson<LearningAreaDocument>(
  join(PACK_DIR, 'learning-areas.json'),
);
const assessment = readJson<Assessment>(join(PACK_DIR, 'assessment.json'));
const progression = readJson<Progression>(join(PACK_DIR, 'progression.json'));
const reports = jsonFiles(join(PACK_DIR, 'reports')).map((file) =>
  readJson<ReportTemplate>(join(PACK_DIR, 'reports', file)),
);
const locales = Object.fromEntries(
  jsonFiles(join(PACK_DIR, 'locales')).map((file) => [
    file.slice(0, -'.json'.length),
    readJson<Locale>(join(PACK_DIR, 'locales', file)),
  ]),
);
const vectors = jsonFiles(join(PACK_DIR, 'tests')).flatMap(
  (file) => readJson<{ vectors: readonly Vector[] }>(join(PACK_DIR, 'tests', file)).vectors,
);

const packDocument = {
  pack: manifest,
  structure,
  learning_areas: learningAreaDocument,
  assessment,
  progression,
  reports,
  locales,
  tests: { vectors },
};

// ------------------------------------------------------------------- schemas

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });

for (const file of jsonFiles(SCHEMA_DIR)) {
  ajv.addSchema(readJson(resolve(SCHEMA_DIR, file)));
}

function schemaErrors(schemaId: string, document: unknown): string {
  const validate = ajv.getSchema(schemaId);
  if (!validate) throw new Error(`schema is not registered: ${schemaId}`);
  const valid = validate(document) === true;
  return valid
    ? ''
    : (validate.errors ?? [])
        .map((error) => `${error.instancePath || '/'} ${error.message ?? ''}`)
        .join('; ');
}

function expectValid(schemaId: string, document: unknown): void {
  expect(schemaErrors(schemaId, document)).toBe('');
}

// ------------------------------------------------------------ vector executor

function mustExact(text: string): Exact {
  const value = parseExact(text);
  if (value === null) throw new Error(`not a decimal value: ${JSON.stringify(text)}`);
  return value;
}

function toRoundingMode(mode: string): RoundingMode {
  switch (mode) {
    case 'half_up':
    case 'half_even':
      return mode;
    // The pack schema names the mathematical floor, ceil and truncate; the engine names the
    // direction away from or towards zero. They agree for the non-negative marks this pack
    // produces, and the two vocabularies are a reported contract gap (schema 03 §4 vs engine B01).
    case 'floor':
    case 'truncate':
      return 'down';
    case 'ceil':
      return 'up';
    default:
      throw new Error(`unsupported rounding mode in the pack: ${mode}`);
  }
}

function toMissingPolicy(policy: string): MissingPolicy {
  if (policy === 'zero' || policy === 'exclude' || policy === 'incomplete' || policy === 'carry_previous') {
    return policy;
  }
  throw new Error(`unsupported missing policy in the pack: ${policy}`);
}

/**
 * Maps the pack's terminal scheme onto the evaluator's typed input. Loading a pack is the job of
 * the registry (P2-A02); until it lands, the test performs the same explicit conversion so the pack
 * is still checked against the engine rather than against a copy of its numbers.
 */
function toEngineScheme(document: SchemeDocument): SchemeDefinition {
  const score = document.learning_area_score;
  if (!score) throw new Error(`${document.code} declares no learning_area_score`);
  const rounding: RoundingRule[] = (document.rounding ?? []).map((rule) => {
    if (rule.stage !== 'slot' && rule.stage !== 'learning_area_score') {
      throw new Error(`${document.code} declares an unknown rounding stage: ${rule.stage}`);
    }
    return { stage: rule.stage, precision: rule.precision, mode: toRoundingMode(rule.mode) };
  });
  const missing = Object.fromEntries(
    Object.entries(document.missing ?? {}).map(([slot, policy]) => [slot, toMissingPolicy(policy)]),
  );

  return {
    code: document.code,
    slots: (document.slots ?? []).map((slot) => ({
      code: slot.code,
      ...(slot.label === undefined ? {} : { label: slot.label }),
      ...(slot.max === undefined ? {} : { max: String(slot.max) }),
      ...(slot.scale_to === undefined ? {} : { scale_to: String(slot.scale_to) }),
      ...(slot.multi === undefined ? {} : { multi: slot.multi }),
      ...(slot.combine === undefined ? {} : { combine: slot.combine }),
    })),
    learning_area_score: {
      op: 'sum',
      of: score.of,
      out_of: String(score.out_of),
    },
    missing,
    ...(rounding.length === 0 ? {} : { rounding }),
  };
}

function numericInput(raw: string | number | null, area: string): number {
  if (raw === null) throw new Error(`vector input for ${area} is null`);
  const value = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(value)) throw new Error(`vector input for ${area} is not a number: ${raw}`);
  return value;
}

/**
 * Feeds one learning-area percentage through the pack's terminal scheme: both slots receive the
 * same percentage, so a complete result must come back at exactly that percentage. This proves the
 * declared slots and weights reproduce the score the vector names.
 */
function scoreThroughTerminalScheme(percent: number): number {
  const terminal = assessment.schemes.find((scheme) => scheme.code === 'ke-cbe-terminal');
  if (!terminal) throw new Error('the pack declares no ke-cbe-terminal scheme');
  const slots = terminal.slots ?? [];
  if (slots.length === 0) throw new Error('the terminal scheme declares no slots');

  const input: SchemeEvaluationInput = {
    scheme: toEngineScheme(terminal),
    marks: slots.map((slot) => ({
      slot: slot.code,
      assessment: `${slot.code}-term`,
      score: String(percent),
      max_score: '100',
      status: 'present',
    })),
  };

  const evaluation = evaluateScheme(input);
  if (!evaluation.ok) {
    throw new Error(
      `the engine refused the pack's terminal scheme: ${evaluation.issues
        .map((issue) => `${issue.code} at ${issue.path}`)
        .join(', ')}`,
    );
  }
  if (evaluation.result.status !== 'complete' || evaluation.result.percent === null) {
    throw new Error(`the terminal scheme produced no complete result for ${percent}`);
  }
  return Number(evaluation.result.percent);
}

function meanOf(values: readonly number[]): Exact {
  const total = sumExact(values.map((value) => mustExact(String(value))));
  return divideExact(total, mustExact(String(values.length)));
}

/**
 * Reference lookup for the declared bands. P2-B02 (grading scales) has not landed, so this
 * implements the documented rule - inclusive lower bound, `upper` deciding the upper bound - over
 * the pack's own band table. It verifies the pack's data, not an engine capability.
 */
function lookupBand(scale: Scale, value: number): Band {
  const band = (scale.bands ?? []).find(
    (candidate) =>
      value >= candidate.min &&
      (scale.upper === 'inclusive' ? value <= candidate.max : value < candidate.max),
  );
  if (!band) throw new Error(`no band in ${scale.code} covers ${value}`);
  return band;
}

interface AggregationResult {
  readonly value: number;
  readonly grade: string;
  readonly points: number | undefined;
}

function evaluateAggregation(
  aggregation: Aggregation,
  input: Vector['input'],
): AggregationResult {
  if (aggregation.op !== 'mean') {
    throw new Error(
      `aggregation ${aggregation.code} uses "${aggregation.op}", which the engine does not implement ` +
        '(P2-B01 evaluates schemes only; P2-B03 owns aggregation operators). Report the gap instead ' +
        'of pinning an expectation this test cannot prove.',
    );
  }
  if (aggregation.value !== 'score' && aggregation.value !== 'rubric_level') {
    throw new Error(`aggregation ${aggregation.code} reads unsupported value "${aggregation.value}"`);
  }

  const values = Object.entries(input).map(([area, raw]) =>
    aggregation.value === 'score'
      ? scoreThroughTerminalScheme(numericInput(raw, area))
      : numericInput(raw, area),
  );
  const precision = aggregation.precision ?? 0;
  const rounded = roundExact(meanOf(values), precision, 'half_up');
  const value = Number(formatExactFixed(rounded, precision, 'half_up'));

  const scale = assessment.grading_scales.find(
    (candidate) => candidate.code === aggregation.result_scale,
  );
  if (!scale) throw new Error(`aggregation ${aggregation.code} names no declared scale`);
  const band = lookupBand(scale, value);

  return { value, grade: band.code, points: band.points };
}

// --------------------------------------------------------------------- tests

describe('ke-cbe pack: schema and runtime contract', () => {
  it('validates against the composed pack schema', () => {
    expectValid(`${BASE}pack.schema.json`, packDocument);
  });

  it('validates each section file against its own schema', () => {
    expectValid(`${BASE}manifest.schema.json`, manifest);
    expectValid(`${BASE}structure.schema.json`, structure);
    expectValid(`${BASE}learning-areas.schema.json`, learningAreaDocument);
    expectValid(`${BASE}assessment.schema.json`, assessment);
    expectValid(`${BASE}progression.schema.json`, progression);
    for (const report of reports) expectValid(`${BASE}report.schema.json`, report);
    for (const locale of Object.values(locales)) expectValid(`${BASE}locale.schema.json`, locale);
    expectValid(`${BASE}tests.schema.json`, { vectors });
  });

  it('passes every documented runtime check', () => {
    expect(checkPackSemantics(packDocument)).toEqual([]);
  });

  it('is a ke-cbe manifest with recorded provenance', () => {
    expect(manifest.code).toBe('ke-cbe');
    expect(manifest.version).toBe('2026.1.0');
    expect(manifest.country).toBe('KE');
    expect(manifest.sources.length).toBeGreaterThanOrEqual(3);
    for (const source of manifest.sources) {
      expect(source.url, source.title).toMatch(/^https:\/\//);
      expect(source.retrieved, source.title).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('records a verification status that matches its evidence', () => {
    expect(manifest.verification.notes ?? '').not.toBe('');
    if (manifest.verification.status === 'verified') {
      expect(manifest.verification.verified_by.length).toBeGreaterThan(0);
    } else {
      expect(manifest.verification.status).toBe('draft');
    }
  });

  it('covers PP1 to G12 with unique, ordered ordinals and the right stage exits', () => {
    const codes = structure.levels.map((level) => level.code);
    expect(codes).toEqual([
      'PP1',
      'PP2',
      'G1',
      'G2',
      'G3',
      'G4',
      'G5',
      'G6',
      'G7',
      'G8',
      'G9',
      'G10',
      'G11',
      'G12',
    ]);
    expect(structure.levels.map((level) => level.ordinal)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
    ]);
    expect(
      structure.levels.filter((level) => level.is_stage_exit === true).map((level) => level.code),
    ).toEqual(['PP2', 'G3', 'G6', 'G9', 'G12']);
    expect(structure.levels.at(-1)?.next ?? null).toBeNull();
  });

  it('declares the three senior pathways and a rule for every promoted level', () => {
    expect(structure.pathways?.map((pathway) => pathway.code)).toEqual(['STEM', 'SOC', 'ASS']);
    const promoted = progression.progression.flatMap((rule) => rule.levels);
    expect(new Set(promoted).size).toBe(promoted.length);
    expect(progression.graduation?.flatMap((rule) => rule.levels)).toEqual(['G12']);
    expect(promoted).not.toContain('G12');
  });

  it('declares learning areas with codes and at least one area with papers', () => {
    const codes = learningAreaDocument.learning_areas.map((area) => area.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toContain('ENG');
    expect(codes).toContain('MAT');
    expect(codes).toContain('INT-SCI');
    expect(learningAreaDocument.competencies.length).toBeGreaterThan(0);
    expect(learningAreaDocument.competencies.every((c) => ['core_competency', 'value', 'pertinent_issue', 'attitude'].includes(c.kind))).toBe(true);
  });

  it('declares both the 4-level and 8-level scales and uses them', () => {
    expect(assessment.grading_scales.map((scale) => scale.code)).toEqual([
      'cbe_8_level',
      'cbe_4_level',
    ]);
    expect(assessment.grading_scales.find((scale) => scale.code === 'cbe_8_level')?.kind).toBe(
      'numeric_bands',
    );
    expect(assessment.grading_scales.find((scale) => scale.code === 'cbe_4_level')?.kind).toBe(
      'rubric',
    );
    expect(assessment.schemes.map((scheme) => scheme.code)).toEqual([
      'ke-cbe-formative',
      'ke-cbe-terminal',
    ]);
  });

  it('leaves no whole percentage ungraded on either scale', () => {
    const eight = assessment.grading_scales.find((scale) => scale.code === 'cbe_8_level');
    const four = assessment.grading_scales.find((scale) => scale.code === 'cbe_4_level');
    if (!eight || !four) throw new Error('the pack must declare cbe_8_level and cbe_4_level');
    for (let percent = 0; percent <= 100; percent += 1) {
      expect(lookupBand(eight, percent).code, `cbe_8_level at ${percent}`).toBeTruthy();
    }
    for (let level = 1; level <= 4; level += 1) {
      expect(lookupBand(four, level).code, `cbe_4_level at ${level}`).toBeTruthy();
    }
  });

  it('ships a primary and a senior report template', () => {
    expect(reports.length).toBeGreaterThanOrEqual(2);
    const levels = new Set(reports.flatMap((report) => report.levels));
    expect(levels.has('G6')).toBe(true);
    expect(levels.has('G12')).toBe(true);
    for (const report of reports) {
      expect(report.blocks.length).toBeGreaterThan(0);
    }
  });

  it('translates every manifest language and every report label', () => {
    for (const language of manifest.languages) {
      const locale = locales[language];
      expect(locale, language).toBeDefined();
      for (const report of reports) {
        for (const block of report.blocks) {
          if (block.label_key === undefined) continue;
          expect(locale?.labels?.[block.label_key], `${language}: ${block.label_key}`).toBeTruthy();
        }
      }
      for (const scale of assessment.grading_scales) {
        for (const band of scale.bands ?? []) {
          expect(
            locale?.descriptors?.[scale.code]?.[band.code],
            `${language}: ${scale.code}.${band.code}`,
          ).toBeTruthy();
        }
      }
    }
  });

  it('carries conformance vectors that cover every aggregation', () => {
    expect(vectors.length).toBeGreaterThan(0);
    const covered = new Set(vectors.flatMap((vector) => Object.keys(vector.expect)));
    for (const aggregation of assessment.aggregations ?? []) {
      expect(covered.has(aggregation.code), `no vector covers ${aggregation.code}`).toBe(true);
    }
    for (const vector of vectors) {
      expect(vector.programme, vector.name).toBe(manifest.code);
    }
  });
});

describe('ke-cbe pack: conformance vectors', () => {
  const aggregations = assessment.aggregations ?? [];

  for (const vector of vectors) {
    it(vector.name, () => {
      const expectations = Object.entries(vector.expect).filter(
        (entry): entry is [string, VectorExpectation] => !Array.isArray(entry[1]),
      );
      expect(expectations.length, `${vector.name} expects nothing`).toBeGreaterThan(0);

      for (const [code, expectation] of expectations) {
        const aggregation = aggregations.find((candidate) => candidate.code === code);
        expect(aggregation, `${vector.name} names unknown aggregation ${code}`).toBeDefined();
        if (!aggregation) continue;

        const actual = evaluateAggregation(aggregation, vector.input);
        if (expectation.value !== undefined) {
          expect(actual.value, `${vector.name}: ${code}.value`).toBe(expectation.value);
        }
        if (expectation.grade !== undefined) {
          expect(actual.grade, `${vector.name}: ${code}.grade`).toBe(expectation.grade);
        }
        if (expectation.points !== undefined) {
          expect(actual.points, `${vector.name}: ${code}.points`).toBe(expectation.points);
        }
      }
    });
  }
});
