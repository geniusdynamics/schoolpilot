// ABOUTME: Validates the ke-844 (Kenya 8-4-4, KCSE) pack against the curriculum pack schemas, runs
// ABOUTME: the runtime checks, and executes every conformance vector, using the assessment engine
// ABOUTME: for scheme results and a reference evaluator for the best-7 operator that P2-B03 owns.

import { readFileSync, readdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';

import Ajv2020 from 'ajv/dist/2020';
import { describe, expect, it } from 'vitest';

import {
  compareExact,
  divideExact,
  evaluateScheme,
  formatExact,
  parseExact,
  roundExact,
  sumExact,
  type ComponentCombine,
  type Exact,
  type RoundingMode,
  type RoundingStage,
  type SchemeDefinition,
  type SchemeMark,
  type SlotCombine,
} from '../../assessment/engine';
import { checkPackSemantics } from './packSemantics';

// ============================================================== pack on disk

interface Band {
  readonly code: string;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly points?: number;
}

interface GradingScale {
  readonly code: string;
  readonly kind: string;
  readonly input?: string;
  readonly upper?: string;
  readonly bands: readonly Band[];
}

interface Component {
  readonly code: string;
  readonly name: string;
  readonly kind: string;
  readonly max_score: number;
}

interface LearningArea {
  readonly code: string;
  readonly name: string;
  readonly group: string;
  readonly levels: readonly string[];
  readonly national_code: string | null;
  readonly components: readonly Component[];
}

interface LearningAreaDocument {
  readonly learning_areas: readonly LearningArea[];
}

interface Level {
  readonly code: string;
  readonly name: string;
  readonly ordinal: number;
  readonly next: string | null;
  readonly national_assessment: string | null;
}

interface Structure {
  readonly stages: readonly { readonly code: string; readonly levels: readonly string[] }[];
  readonly levels: readonly Level[];
}

interface SchemeSlot {
  readonly code: string;
  readonly label: string;
  readonly max?: number;
  readonly scale_to?: number;
  readonly multi?: boolean;
  readonly combine?: string;
}

interface Scheme {
  readonly code: string;
  readonly levels: readonly string[];
  readonly slots: readonly SchemeSlot[];
  readonly learning_area_score: {
    readonly op: string;
    readonly of: readonly string[];
    readonly out_of: number;
  };
  readonly component_policy?: { readonly papers: string; readonly out_of?: number };
  readonly grading_scale: string;
  readonly missing?: Readonly<Record<string, string>>;
  readonly rounding?: readonly { readonly stage: string; readonly precision: number; readonly mode: string }[];
}

interface GroupConstraint {
  readonly require_all?: readonly string[];
  readonly group?: string;
  readonly min?: number;
  readonly fill_from?: string;
}

interface Aggregation {
  readonly code: string;
  readonly op: string;
  readonly n?: number;
  readonly value?: string;
  readonly groups?: readonly GroupConstraint[];
  readonly then?: { readonly op: string; readonly precision?: number };
  readonly result_scale?: string;
}

interface Assessment {
  readonly schemes: readonly Scheme[];
  readonly grading_scales: readonly GradingScale[];
  readonly aggregations: readonly Aggregation[];
}

interface Report {
  readonly code: string;
  readonly name: string;
  readonly levels: readonly string[];
  readonly blocks: readonly { readonly type: string; readonly label_key?: string }[];
}

interface Locale {
  readonly labels: Readonly<Record<string, string>>;
}

interface Vector {
  readonly name: string;
  readonly programme?: string;
  readonly input: Readonly<Record<string, string | number | null>>;
  readonly expect: { readonly selected?: readonly string[]; readonly [code: string]: unknown };
}

interface PackDocument {
  readonly pack: unknown;
  readonly structure: Structure;
  readonly learning_areas: LearningAreaDocument;
  readonly assessment: Assessment;
  readonly progression: unknown;
  readonly reports: readonly Report[];
  readonly locales: Readonly<Record<string, unknown>>;
  readonly tests: { readonly vectors: readonly Vector[] };
}

const PACK_DIR = resolve(process.cwd(), 'packs', 'ke-844');

function readJson<T>(...parts: string[]): T {
  return JSON.parse(readFileSync(resolve(PACK_DIR, ...parts), 'utf8')) as T;
}

function readJsonDirectory<T>(directory: string): T[] {
  return readdirSync(resolve(PACK_DIR, directory))
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => readJson<T>(directory, name));
}

const structure = readJson<Structure>('structure.json');
const learningAreaDocument = readJson<LearningAreaDocument>('learning-areas.json');
const assessment = readJson<Assessment>('assessment.json');
const reports = readJsonDirectory<Report>('reports');
const tests = readJson<{ vectors: readonly Vector[] }>('tests', 'ke-844.vectors.json');
const locales = Object.fromEntries(
  readdirSync(resolve(PACK_DIR, 'locales'))
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => [basename(name, '.json'), readJson<Locale>('locales', name)])
);

const packDocument: PackDocument = {
  pack: readJson<unknown>('pack.json'),
  structure,
  learning_areas: learningAreaDocument,
  assessment,
  progression: readJson<unknown>('progression.json'),
  reports,
  locales,
  tests,
};

const learningAreas = learningAreaDocument.learning_areas;

// ============================================================ schema checks

const SCHEMA_DIR = resolve(process.cwd(), 'packs', 'schema');
const PACK_SCHEMA_ID = 'https://schemas.schoolpilot.app/curriculum-pack/v1/pack.schema.json';

// strictRequired is off because required properties inside `then` branches legitimately refer to
// the parent object's properties; every other strict check stays on.
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
for (const file of readdirSync(SCHEMA_DIR).filter((name) => name.endsWith('.json'))) {
  ajv.addSchema(JSON.parse(readFileSync(resolve(SCHEMA_DIR, file), 'utf8')) as object);
}

describe('ke-844 on disk', () => {
  it('validates against the composed pack schema', () => {
    const validate = ajv.getSchema(PACK_SCHEMA_ID);
    if (!validate) throw new Error('pack schema is not registered');
    const valid = validate(packDocument) === true;
    expect(valid, JSON.stringify(validate.errors)).toBe(true);
  });

  it('passes every runtime check in checkPackSemantics', () => {
    expect(checkPackSemantics(packDocument)).toEqual([]);
  });

  it('declares Forms 1 to 4 in one secondary stage', () => {
    expect(structure.stages.map((stage) => stage.code)).toEqual(['SEC']);
    expect(structure.levels.map((level) => level.code)).toEqual(['F1', 'F2', 'F3', 'F4']);
    expect(structure.levels.at(-1)?.national_assessment).toBe('KCSE');
    expect(structure.levels.at(-1)?.next).toBeNull();
  });

  it('gives every learning area all four forms, a unique KNEC code and papers totalling 200', () => {
    expect(learningAreas).toHaveLength(13);
    const codes = new Set(learningAreas.map((area) => area.national_code));
    expect(codes.size).toBe(learningAreas.length);
    for (const area of learningAreas) {
      expect(area.levels, area.code).toEqual(['F1', 'F2', 'F3', 'F4']);
      expect(area.national_code, area.code).toMatch(/^[0-9]{3}$/);
      const total = area.components.reduce((sum, component) => sum + component.max_score, 0);
      expect(total, `${area.code} paper maxima`).toBe(200);
    }
  });

  it('ships the two manifest languages and translates every report label in each', () => {
    expect(Object.keys(locales).sort()).toEqual(['en', 'sw']);
    for (const [language, locale] of Object.entries(locales)) {
      for (const report of reports) {
        for (const block of report.blocks) {
          expect(block.label_key, `${report.code}.${block.type}`).toBeDefined();
          expect(locale.labels[block.label_key ?? ''], `${language}:${block.label_key}`).toBeTruthy();
        }
      }
    }
  });
});

// ============================================================== scale lookup

const subjectScale = scaleNamed('kcse_subject');
const meanScale = scaleNamed('kcse_mean_grade');

function scaleNamed(code: string): GradingScale {
  const scale = assessment.grading_scales.find((candidate) => candidate.code === code);
  if (!scale) throw new Error(`the pack declares no grading scale ${code}`);
  return scale;
}

function exactOf(text: string): Exact {
  const value = parseExact(text);
  if (value === null) throw new Error(`not an exact value: ${text}`);
  return value;
}

/** Every band whose range contains the value; more than one means the bands overlap. */
function bandsAt(scale: GradingScale, value: Exact): Band[] {
  const inclusiveUpper = scale.upper !== 'exclusive';
  return scale.bands.filter((band) => {
    const min = exactOf(String(band.min));
    const max = exactOf(String(band.max));
    const atOrAbove = compareExact(value, min) >= 0;
    const belowUpper = inclusiveUpper ? compareExact(value, max) <= 0 : compareExact(value, max) < 0;
    return atOrAbove && belowUpper;
  });
}

function bandAt(scale: GradingScale, value: Exact): Band {
  const matches = bandsAt(scale, value);
  if (matches.length !== 1) {
    throw new Error(
      `${formatExact(value)} falls in ${matches.length} bands of ${scale.code}: ${matches
        .map((band) => band.code)
        .join(', ')}`
    );
  }
  return matches[0] as Band;
}

function pointsForGrade(grade: string): number {
  const band = subjectScale.bands.find((candidate) => candidate.code === grade || candidate.label === grade);
  if (band?.points === undefined) throw new Error(`kcse_subject has no point value for ${grade}`);
  return band.points;
}

/** A band by code or by the grade it prints; the vectors state the printed grade. */
function bandForGrade(scale: GradingScale, grade: string | number): Band {
  const band = scale.bands.find(
    (candidate) => candidate.code === grade || candidate.label === grade
  );
  if (!band) throw new Error(`${scale.code} has no band ${grade}`);
  return band;
}

// ============================================================== best-7 rule

/**
 * The reference evaluator for the pack's `best_n` operator.
 *
 * P2-B03 owns the aggregation engine; until it lands this reads the n, value and group
 * constraints the pack declares and applies them with the engine's exact arithmetic. It is
 * not a hard-coded expectation: change the pack's rule and these vectors fail.
 */
function evaluateBestN(
  aggregation: Aggregation,
  grades: ReadonlyMap<string, string>
): { readonly selected: readonly string[]; readonly total: Exact; readonly mean: Exact } {
  const keep = aggregation.n;
  if (keep === undefined) throw new Error(`${aggregation.code} declares no n`);
  const order = new Map(learningAreas.map((area, index) => [area.code, index]));
  const pointsOf = (code: string): Exact => {
    const grade = grades.get(code);
    if (grade === undefined) throw new Error(`no grade supplied for ${code}`);
    return exactOf(String(pointsForGrade(grade)));
  };
  const ranked = (codes: readonly string[]): string[] =>
    [...codes].sort(
      (left, right) =>
        compareExact(pointsOf(right), pointsOf(left)) ||
        (order.get(left) ?? 0) - (order.get(right) ?? 0)
    );

  const selected: string[] = [];
  const constraints = aggregation.groups ?? [];
  for (const constraint of constraints) {
    for (const code of constraint.require_all ?? []) {
      if (!selected.includes(code)) selected.push(code);
    }
  }
  for (const constraint of constraints) {
    const group = constraint.group;
    if (group === undefined) continue;
    const members = learningAreas
      .filter((area) => area.group === group && grades.has(area.code) && !selected.includes(area.code))
      .map((area) => area.code);
    selected.push(...ranked(members).slice(0, constraint.min ?? 0));
  }
  const remaining = ranked(
    learningAreas.filter((area) => grades.has(area.code) && !selected.includes(area.code)).map((area) => area.code)
  );
  while (selected.length < keep) {
    const next = remaining.shift();
    if (next === undefined) throw new Error(`${aggregation.code} cannot select ${keep} subjects from the input`);
    selected.push(next);
  }
  selected.sort((left, right) => (order.get(left) ?? 0) - (order.get(right) ?? 0));

  const total = sumExact(selected.map(pointsOf));
  const precision = aggregation.then?.precision ?? 0;
  const mean = roundExact(divideExact(total, exactOf(String(keep))), precision, 'half_up');
  return { selected, total, mean };
}

// ========================================================== scheme execution

function slotCombine(value: string): SlotCombine {
  if (value === 'sum' || value === 'mean' || value === 'best_of') return value;
  throw new Error(`unsupported slot combine: ${value}`);
}

function paperCombine(value: string): ComponentCombine {
  if (value === 'sum' || value === 'scale_each_then_sum' || value === 'weighted' || value === 'best_of') {
    return value;
  }
  throw new Error(`unsupported paper combine: ${value}`);
}

function roundingStage(value: string): RoundingStage {
  if (value === 'slot' || value === 'learning_area_score') return value;
  throw new Error(`the assessment engine cannot round at stage ${value}`);
}

function roundingMode(value: string): RoundingMode {
  // The pack schema also allows floor, ceil and truncate; the engine does not implement them yet.
  if (value === 'half_up' || value === 'half_down' || value === 'half_even' || value === 'up' || value === 'down') {
    return value;
  }
  throw new Error(`the assessment engine cannot apply rounding mode ${value}`);
}

function engineScheme(): SchemeDefinition {
  const scheme = assessment.schemes[0];
  if (!scheme) throw new Error('the pack declares no scheme');
  return {
    code: scheme.code,
    slots: scheme.slots.map((slot) => ({
      code: slot.code,
      label: slot.label,
      ...(slot.max === undefined ? {} : { max: String(slot.max) }),
      ...(slot.scale_to === undefined ? {} : { scale_to: String(slot.scale_to) }),
      ...(slot.multi === undefined ? {} : { multi: slot.multi }),
      ...(slot.combine === undefined ? {} : { combine: slotCombine(slot.combine) }),
    })),
    learning_area_score: {
      op: 'sum',
      of: scheme.learning_area_score.of,
      out_of: String(scheme.learning_area_score.out_of),
    },
    ...(scheme.component_policy === undefined
      ? {}
      : {
          component_policy: {
            papers: paperCombine(scheme.component_policy.papers),
            ...(scheme.component_policy.out_of === undefined
              ? {}
              : { out_of: String(scheme.component_policy.out_of) }),
          },
        }),
    ...(scheme.missing === undefined
      ? {}
      : { missing: scheme.missing as Readonly<Record<string, 'zero' | 'exclude' | 'incomplete' | 'carry_previous'>> }),
    rounding: (scheme.rounding ?? []).map((rule) => ({
      stage: roundingStage(rule.stage),
      precision: rule.precision,
      mode: roundingMode(rule.mode),
    })),
  };
}

/**
 * Reads `slot.assessment[.component]` keys whose value is `score/max`.
 *
 * A component mark must match the maximum the learning area declares for that paper, so the
 * vector cannot drift away from `learning-areas.json`.
 */
function marksFromInput(input: Vector['input']): SchemeMark[] {
  return Object.entries(input).map(([key, value]) => {
    if (typeof value !== 'string') throw new Error(`the scheme vector needs a score/max string at ${key}`);
    const [slot, assessmentCode, component, ...rest] = key.split('.');
    if (slot === undefined || assessmentCode === undefined || rest.length > 0) {
      throw new Error(`not a slot.assessment[.component] key: ${key}`);
    }
    const [score, max] = value.split('/');
    if (score === undefined || max === undefined) throw new Error(`${key} needs score/max, got ${value}`);
    if (component !== undefined) {
      const area = learningAreas.find((candidate) => candidate.code === assessmentCode);
      const declared = area?.components.find((candidate) => candidate.code === component);
      if (!declared) throw new Error(`${key} names no paper declared on ${assessmentCode}`);
      expect(String(declared.max_score), `${key} paper maximum`).toBe(max);
    }
    return {
      slot,
      assessment: assessmentCode,
      ...(component === undefined ? {} : { component }),
      score,
      max_score: max,
      status: 'present',
    } satisfies SchemeMark;
  });
}

// ================================================================== vectors

describe('ke-844 conformance vectors', () => {
  it('ships at least the four required vectors, all naming this programme', () => {
    expect(tests.vectors.length).toBeGreaterThanOrEqual(4);
    for (const vector of tests.vectors) {
      expect(vector.programme, vector.name).toBe('ke-844');
    }
  });

  for (const vector of tests.vectors) {
    it(vector.name, () => {
      const scheme = assessment.schemes[0];
      const aggregation = assessment.aggregations.find((candidate) => candidate.code === 'kcse_mean_grade');
      if (!scheme || !aggregation) throw new Error('the pack is missing its scheme or best-7 aggregation');

      if (vector.expect[scheme.code] !== undefined) {
        expectSchemeVector(vector, scheme);
        return;
      }
      if (vector.expect[aggregation.code] !== undefined) {
        expectBest7Vector(vector, aggregation);
        return;
      }
      throw new Error(`vector names no known aggregate: ${Object.keys(vector.expect).join(', ')}`);
    });
  }
});

function expectSchemeVector(vector: Vector, scheme: Scheme): void {
  const evaluation = evaluateScheme({ scheme: engineScheme(), marks: marksFromInput(vector.input) });
  expect(evaluation.ok, JSON.stringify(evaluation.ok ? [] : evaluation.issues)).toBe(true);
  if (!evaluation.ok) return;

  const expected = vector.expect[scheme.code] as Readonly<Record<string, number | string>>;
  const result = evaluation.result;
  expect(result.scheme.code).toBe(scheme.code);
  expect(result.status).toBe('complete');
  expect(result.exact_total).toBe(String(expected.exact_total));
  expect(result.total).toBe(String(expected.total));
  expect(result.percent).toBe(String(expected.percent));

  if (result.total === null) throw new Error('a complete result has a total');
  const expectedBand = bandForGrade(subjectScale, expected.grade as string | number);
  const actualBand = bandAt(subjectScale, exactOf(result.total));
  expect(actualBand.code).toBe(expectedBand.code);
  expect(actualBand.points).toBe(expected.points);
}

function expectBest7Vector(vector: Vector, aggregation: Aggregation): void {
  const grades = new Map(
    Object.entries(vector.input).map(([code, grade]) => {
      if (typeof grade !== 'string') throw new Error(`the best-7 vector needs grade strings, got ${code}`);
      return [code, grade] as const;
    })
  );
  const { selected, total, mean } = evaluateBestN(aggregation, grades);
  const expected = vector.expect[aggregation.code] as Readonly<Record<string, number | string>>;

  expect(selected).toEqual(vector.expect.selected);
  expect(formatExact(total)).toBe(String(expected.total_points));
  expect(formatExact(mean)).toBe(String(expected.points));

  const scale = aggregation.result_scale === undefined ? meanScale : scaleNamed(aggregation.result_scale);
  const expectedBand = bandForGrade(scale, expected.grade as string | number);
  expect(bandAt(scale, mean).code).toBe(expectedBand.code);
}

// ================================================================= the scale

describe('ke-844 12-point scale', () => {
  it('assigns exactly one subject band to every whole percent from 0 to 100', () => {
    for (let percent = 0; percent <= 100; percent += 1) {
      const matches = bandsAt(subjectScale, exactOf(String(percent)));
      expect(matches.map((band) => band.code), `${percent}%`).toHaveLength(1);
    }
  });

  it('changes grade exactly at the published boundary', () => {
    for (const band of subjectScale.bands) {
      expect(bandAt(subjectScale, exactOf(String(band.min))).code, `at ${band.min}`).toBe(band.code);
      if (band.min > 0) {
        expect(bandAt(subjectScale, exactOf(String(band.min - 1))).code, `at ${band.min - 1}`).not.toBe(band.code);
      }
    }
  });

  it('has no band for a fractional percent, so the scheme rounds before lookup', () => {
    expect(bandsAt(subjectScale, exactOf('74.5'))).toEqual([]);
    expect(bandAt(subjectScale, exactOf('75')).label).toBe('A-');
    expect(bandAt(subjectScale, exactOf('74')).label).toBe('B+');
  });

  it('reproduces KNEC aggregate-points table through the mean-points scale', () => {
    const table: readonly (readonly [string, number, number])[] = [
      ['A', 78, 84],
      ['A-', 71, 77],
      ['B+', 64, 70],
      ['B', 57, 63],
      ['B-', 50, 56],
      ['C+', 43, 49],
      ['C', 36, 42],
      ['C-', 29, 35],
      ['D+', 22, 28],
      ['D', 15, 21],
      ['D-', 8, 14],
      ['E', 1, 7],
    ];
    for (const [grade, lowest, highest] of table) {
      for (let aggregate = lowest; aggregate <= highest; aggregate += 1) {
        const mean = roundExact(divideExact(exactOf(String(aggregate)), exactOf('7')), 3, 'half_up');
        expect(bandAt(meanScale, mean).label, `${aggregate} aggregate points`).toBe(grade);
      }
    }
  });

  it('puts 64 aggregate points at B+, not at the nearest whole point', () => {
    // 64/7 = 9.143; rounding to the nearest point would say 9 (B), KNEC's table says B+.
    const mean = roundExact(divideExact(exactOf('64'), exactOf('7')), 3, 'half_up');
    expect(bandAt(meanScale, mean).label).toBe('B+');
  });
});
