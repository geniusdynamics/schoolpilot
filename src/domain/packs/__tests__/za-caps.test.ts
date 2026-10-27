// ABOUTME: Validates the South African CAPS pack (za-caps, Grade R to Grade 12 with the NSC) against the pack schemas
// ABOUTME: and runtime checks, pins the seven-level scale, the SBA and examination weights and the promotion rules.

import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';

import Ajv2020 from 'ajv/dist/2020';
import { describe, expect, it, vi } from 'vitest';

import { compareExact, parseExact, type Exact } from '../../assessment/engine';
import { evaluateProgression } from '../../assessment/progression';
import { progressionDefinition, suppliedMetrics } from './engineVectors';
import { checkPackSemantics } from './packSemantics';

// The conformance runner is a child Node process; tsx compiles the engines on a cold start.
vi.setConfig({ testTimeout: 120_000 });

interface Band {
  readonly code: string;
  readonly min: number;
  readonly max: number;
  readonly points?: number;
}

interface Slot {
  readonly code: string;
  readonly kind: string;
  readonly scale_to?: number;
}

interface Scheme {
  readonly code: string;
  readonly levels: readonly string[];
  readonly slots: readonly Slot[];
  readonly grading_scale: string;
}

interface Aggregation {
  readonly code: string;
  readonly op: string;
  readonly value?: string;
  readonly over?: readonly string[];
  readonly where?: { readonly op: string; readonly value?: string };
}

interface Assessment {
  readonly schemes: readonly Scheme[];
  readonly grading_scales: readonly { readonly code: string; readonly upper?: string; readonly bands: readonly Band[] }[];
  readonly aggregations: readonly Aggregation[];
  readonly annual: { readonly op: string; readonly of: readonly string[] };
}

interface Structure {
  readonly stages: readonly { readonly code: string; readonly levels: readonly string[] }[];
  readonly levels: readonly { readonly code: string; readonly ordinal: number; readonly next: string | null; readonly national_assessment: string | null }[];
  readonly pathways?: readonly { readonly code: string }[];
  readonly calendar_template: { readonly periods: readonly { readonly code: string }[] };
}

interface CombinationRule {
  readonly levels: readonly string[];
  readonly rule: string;
  readonly of?: readonly string[];
  readonly count?: number;
}

interface Locale {
  readonly labels: Readonly<Record<string, string>>;
  readonly descriptors?: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

interface Vector {
  readonly name: string;
  readonly programme?: string;
  readonly expect: Readonly<Record<string, unknown>>;
}

interface PromotionRule {
  readonly levels: readonly string[];
  readonly rule: string;
  readonly conditions?: readonly { readonly metric: string; readonly gte: number }[];
  readonly else?: string;
}

const CODE = 'za-caps';
const PACKS_DIR = resolve(process.cwd(), 'packs');
const SCHEMA_DIR = resolve(PACKS_DIR, 'schema');
const PACK_SCHEMA_ID = 'https://schemas.schoolpilot.app/curriculum-pack/v1/pack.schema.json';

// DBE National policy pertaining to the programme and promotion requirements (Government Gazette 36042 as amended),
// Tables 4, 17 and 19: the same seven achievement levels for every grade.
const LEVEL_BANDS: readonly (readonly [string, number, number])[] = [
  ['7', 80, 100],
  ['6', 70, 79],
  ['5', 60, 69],
  ['4', 50, 59],
  ['3', 40, 49],
  ['2', 30, 39],
  ['1', 0, 29],
];

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
for (const file of readdirSync(SCHEMA_DIR).filter((name) => name.endsWith('.json'))) {
  ajv.addSchema(JSON.parse(readFileSync(resolve(SCHEMA_DIR, file), 'utf8')) as object);
}

function readJson<T>(...parts: string[]): T {
  return JSON.parse(readFileSync(resolve(PACKS_DIR, CODE, ...parts), 'utf8')) as T;
}

function readJsonDirectory<T>(directory: string): T[] {
  return readdirSync(resolve(PACKS_DIR, CODE, directory))
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => readJson<T>(directory, name));
}

const locales = Object.fromEntries(
  readdirSync(resolve(PACKS_DIR, CODE, 'locales'))
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => [basename(name, '.json'), readJson<Locale>('locales', name)])
);
const testFile = readdirSync(resolve(PACKS_DIR, CODE, 'tests')).find((name) => name.endsWith('.vectors.json'));
if (testFile === undefined) throw new Error(`${CODE} ships no vectors`);

const manifest = readJson<{ languages: string[]; verification: { status: string } }>('pack.json');
const structure = readJson<Structure>('structure.json');
const learningAreas = readJson<{
  learning_areas: { code: string; kind: string; levels: string[] }[];
  competencies: unknown[];
  combination_rules: CombinationRule[];
}>('learning-areas.json');
const assessment = readJson<Assessment>('assessment.json');
const progression = readJson<{ progression: PromotionRule[]; graduation: { levels: string[]; rule: string }[] }>('progression.json');
const reports = readJsonDirectory<{ code: string; levels: string[]; blocks: { type: string; label_key?: string }[] }>('reports');
const tests = readJson<{ vectors: Vector[] }>('tests', testFile);

function exactOf(text: string): Exact {
  const value = parseExact(text);
  if (value === null) throw new Error(`not an exact value: ${text}`);
  return value;
}

function schemeOf(code: string): Scheme {
  const scheme = assessment.schemes.find((candidate) => candidate.code === code);
  if (!scheme) throw new Error(`the pack declares no scheme ${code}`);
  return scheme;
}

describe('za-caps on disk', () => {
  const document = {
    pack: readJson<unknown>('pack.json'),
    structure,
    learning_areas: learningAreas,
    assessment,
    progression,
    reports,
    locales,
    tests,
  };

  it('validates against the composed pack schema', () => {
    const validate = ajv.getSchema(PACK_SCHEMA_ID);
    if (!validate) throw new Error('pack schema is not registered');
    expect(validate(document) === true, JSON.stringify(validate.errors)).toBe(true);
  });

  it('passes every runtime check in checkPackSemantics', () => {
    expect(checkPackSemantics(document)).toEqual([]);
  });

  it('is a draft pack that ships English and isiZulu and translates every report label in each', () => {
    expect(manifest.verification.status).toBe('draft');
    expect(manifest.languages).toEqual(['en', 'zu']);
    expect(Object.keys(locales).sort()).toEqual(['en', 'zu']);
    for (const [language, locale] of Object.entries(locales)) {
      for (const report of reports) {
        for (const block of report.blocks) {
          expect(locale.labels[block.label_key ?? ''], `${language}:${block.label_key}`).toBeTruthy();
        }
      }
      for (const [level] of LEVEL_BANDS) {
        expect(locale.descriptors?.za_achievement_7?.[level], `${language}:${level}`).toBeTruthy();
      }
    }
  });

  it('covers every grade with a report', () => {
    expect(reports.flatMap((report) => report.levels).sort()).toEqual(structure.levels.map((level) => level.code).sort());
  });
});

describe('za-caps structure', () => {
  it('runs Grade R to Grade 12 in four phases, the NSC at the end of Grade 12', () => {
    expect(structure.stages.map((stage) => [stage.code, stage.levels])).toEqual([
      ['FND', ['GR', 'G1', 'G2', 'G3']],
      ['INT', ['G4', 'G5', 'G6']],
      ['SNR', ['G7', 'G8', 'G9']],
      ['FET', ['G10', 'G11', 'G12']],
    ]);
    expect(structure.levels.map((level) => level.ordinal)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(structure.levels.find((level) => level.code === 'G12')).toMatchObject({ next: null, national_assessment: 'NSC' });
    expect(structure.pathways?.map((pathway) => pathway.code)).toEqual(['GEN', 'TPW']);
  });

  it('has four terms in a calendar year', () => {
    expect(structure.calendar_template.periods.map((period) => period.code)).toEqual(['T1', 'T2', 'T3', 'T4']);
  });

  const SUBJECT_COUNTS: readonly (readonly [string, string, number])[] = [
    ['Grade R', 'GR', 3],
    ['Grades 1 to 3', 'G2', 4],
    ['Grades 4 to 6', 'G5', 6],
    ['Grades 7 to 9', 'G8', 9],
  ];

  it.each(SUBJECT_COUNTS)('requires the policy number of subjects in %s', (_name, level, count) => {
    const core = learningAreas.combination_rules.find((rule) => rule.rule === 'core_all' && rule.levels.includes(level));
    expect(core?.of).toHaveLength(count);
    for (const code of core?.of ?? []) {
      for (const alternative of code.split('|')) {
        const area = learningAreas.learning_areas.find((candidate) => candidate.code === alternative);
        expect(area?.levels, `${alternative} at ${level}`).toContain(level);
      }
    }
  });

  it('requires four compulsory slots and three electives, seven subjects, in Grades 10 to 12', () => {
    const core = learningAreas.combination_rules.find((rule) => rule.rule === 'core_all' && rule.levels.includes('G11'));
    expect(core?.of).toEqual(['HL', 'FAL', 'MAT|MLT|TMT', 'LO']);
    expect(learningAreas.combination_rules.find((rule) => rule.rule === 'electives')).toMatchObject({ levels: ['G10', 'G11', 'G12'], count: 3 });
  });
});

describe('za-caps assessment', () => {
  it('grades every mark with the seven achievement levels of the national policy', () => {
    const scale = assessment.grading_scales.find((candidate) => candidate.code === 'za_achievement_7');
    expect(scale?.upper).toBe('inclusive');
    expect(scale?.bands.map((band) => [band.code, band.min, band.max])).toEqual(LEVEL_BANDS);
    for (let mark = 0; mark <= 100; mark += 1) {
      const matching = scale?.bands.filter(
        (band) => compareExact(exactOf(String(mark)), exactOf(String(band.min))) >= 0 && compareExact(exactOf(String(mark)), exactOf(String(band.max))) <= 0
      );
      expect(matching, `${mark}`).toHaveLength(1);
    }
  });

  it('weights school-based assessment and examination by phase as the policy states', () => {
    const weights = (code: string) => schemeOf(code).slots.map((slot) => [slot.code, slot.scale_to]);
    expect(weights('za-foundation')).toEqual([['SBA', 100]]);
    expect(weights('za-intermediate')).toEqual([['SBA', 75], ['EXAM', 25]]);
    expect(weights('za-senior')).toEqual([['SBA', 40], ['EXAM', 60]]);
    expect(weights('za-fet')).toEqual([['SBA', 25], ['EXAM', 75]]);
    expect(schemeOf('za-fet').levels).toEqual(['G10', 'G11']);
    expect(schemeOf('za-nsc').levels).toEqual(['G12']);
    expect(weights('za-nsc')).toEqual([['SBA', 25], ['EXAM', 75]]);
    for (const scheme of assessment.schemes) expect(scheme.grading_scale).toBe('za_achievement_7');
  });

  it('counts the subjects at 40 and at 30 percent, the two thresholds of the NSC pass requirement', () => {
    const counts = assessment.aggregations.filter((aggregation) => aggregation.op === 'count_where');
    expect(counts.map((aggregation) => [aggregation.code, aggregation.where])).toEqual([
      ['nsc_subjects_at_40', { op: 'gte', value: '40' }],
      ['nsc_subjects_at_30', { op: 'gte', value: '30' }],
      ['nsc_home_language_at_40', { op: 'gte', value: '40' }],
    ]);
    expect(counts[2]?.over).toEqual(['HL']);
  });

  it('averages the four terms of the year', () => {
    expect(assessment.annual).toEqual({ op: 'mean', of: ['T1', 'T2', 'T3', 'T4'], missing: 'renormalise' });
  });
});

describe('za-caps promotion', () => {
  const rules = new Map(progression.progression.flatMap((rule) => rule.levels.map((level) => [level, rule] as const)));
  const suggestionAt = (level: string, metrics: Record<string, number>) => {
    const evaluation = evaluateProgression(progressionDefinition(progression), [{ learner: 'learner', level }], {
      metrics: suppliedMetrics({ leaving_level: level, ...metrics }),
      levels: structure.levels.map((entry) => ({ code: entry.code, ...(entry.next === null ? {} : { next: entry.next }) })),
      stages: structure.stages.map((stage) => ({ code: stage.code, levels: [...stage.levels] })),
    });
    if (!evaluation.ok) throw new Error(JSON.stringify(evaluation.issues));
    return evaluation.suggestions[0];
  };

  it('promotes Grade R automatically, guides Grades 1 to 3, and sets thresholds from Grade 4 to Grade 11', () => {
    expect(rules.get('GR')?.rule).toBe('automatic');
    expect(rules.get('G2')?.rule).toBe('class_council');
    for (const level of ['G4', 'G6', 'G7', 'G9', 'G10', 'G11']) expect(rules.get(level)?.rule, level).toBe('threshold');
    expect(progression.graduation).toEqual([{ levels: ['G12'], rule: 'graduate' }]);
  });

  it('requires Adequate Achievement (50) in the home language, and Moderate (40) in the second language and Mathematics, in Grades 4 to 9', () => {
    for (const level of ['G4', 'G5', 'G6', 'G7', 'G8', 'G9']) {
      expect(rules.get(level)?.conditions, level).toEqual([
        { metric: 'annual.HL', gte: 50 },
        { metric: 'annual.FAL', gte: 40 },
        { metric: 'annual.MAT', gte: 40 },
      ]);
      expect(rules.get(level)?.else).toBe('repeat_or_council');
    }
  });

  it('promotes a Grade 5 learner at exactly 50, 40 and 40, and refuses one point under the home-language threshold', () => {
    expect(suggestionAt('G5', { HL: 50, FAL: 40, MAT: 40 })?.action).toBe('promote');
    expect(suggestionAt('G5', { HL: 49, FAL: 40, MAT: 40 })?.action).not.toBe('promote');
    expect(suggestionAt('G5', { HL: 50, FAL: 39, MAT: 40 })?.action).not.toBe('promote');
    expect(suggestionAt('G5', { HL: 50, FAL: 40, MAT: 39 })?.action).not.toBe('promote');
  });

  it('requires 40 in the home language in Grades 10 and 11', () => {
    expect(rules.get('G10')?.conditions).toEqual([{ metric: 'annual.HL', gte: 40 }]);
    expect(suggestionAt('G10', { HL: 40 })?.action).toBe('promote');
    expect(suggestionAt('G10', { HL: 39 })?.action).not.toBe('promote');
  });
});

describe('za-caps conformance vectors', () => {
  it('ships vectors for every phase scheme, every boundary, the rounding rule, the NSC counts and the thresholds', () => {
    expect(tests.vectors.length).toBeGreaterThanOrEqual(16);
    for (const vector of tests.vectors) expect(vector.programme, vector.name).toBe(CODE);
    const keys = tests.vectors.flatMap((vector) => Object.keys(vector.expect));
    expect(keys).toEqual(
      expect.arrayContaining(['za-foundation', 'za-intermediate', 'za-senior', 'za-fet', 'za-nsc', 'nsc_subjects_at_40', 'nsc_subjects_at_30', 'progression'])
    );
    const grades = tests.vectors.flatMap((vector) => Object.values(vector.expect).map((entry) => (entry as { grade?: string }).grade));
    for (const [level] of LEVEL_BANDS) expect(grades, level).toContain(level);
  });

  it('are all executed, none skipped, by the conformance runner', () => {
    const runner = resolve(process.cwd(), 'scripts', 'packs', 'run-vectors.mjs');
    const result = spawnSync(process.execPath, [runner, '--pack', CODE], { cwd: process.cwd(), encoding: 'utf8', timeout: 120_000 });
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
    expect(result.status, output).toBe(0);
    const row = output.split('\n').find((line) => line.startsWith(CODE));
    expect(row, output).toBeDefined();
    const [, total, executed, skipped, failed] = (row ?? '').trim().split(/\s+/);
    expect([Number(total), Number(executed), Number(skipped), Number(failed)], output).toEqual([
      tests.vectors.length,
      tests.vectors.length,
      0,
      0,
    ]);
  });
});
