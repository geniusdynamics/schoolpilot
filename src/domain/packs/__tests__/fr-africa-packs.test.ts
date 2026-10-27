// ABOUTME: Validates the Francophone curriculum packs (fr-africa-ci, fr-africa-cm, fr-africa-sn) against the pack schemas and
// ABOUTME: runtime checks, pins the /20 marks, coefficients, trimestre averages and mentions, and runs every vector.

import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';

import Ajv2020 from 'ajv/dist/2020';
import { describe, expect, it, vi } from 'vitest';

import { compareExact, formatExact, parseExact, type Exact } from '../../assessment/engine';
import { checkPackSemantics } from './packSemantics';

// The conformance runner is a child Node process; tsx compiles the engines on a cold start.
vi.setConfig({ testTimeout: 120_000 });

interface Band {
  readonly code: string;
  readonly label: string;
  readonly min: number;
  readonly max: number;
}

interface GradingScale {
  readonly code: string;
  readonly kind: string;
  readonly upper?: string;
  readonly bands: readonly Band[];
}

interface Aggregation {
  readonly code: string;
  readonly op: string;
  readonly value?: string;
  readonly weights?: unknown;
  readonly precision?: number;
  readonly result_scale?: string;
}

interface Assessment {
  readonly schemes: readonly {
    readonly code: string;
    readonly levels: readonly string[];
    readonly slots: readonly { readonly code: string; readonly scale_to?: number }[];
    readonly learning_area_score: { readonly out_of: number };
  }[];
  readonly grading_scales: readonly GradingScale[];
  readonly aggregations: readonly Aggregation[];
  readonly ranking: { readonly enabled: boolean; readonly by: string };
  readonly annual: { readonly op: string; readonly of: Readonly<Record<string, number>> | readonly string[] };
}

interface Level {
  readonly code: string;
  readonly ordinal: number;
  readonly next: string | null;
  readonly national_assessment: string | null;
}

interface LearningArea {
  readonly code: string;
  readonly kind: string;
  readonly coefficient?: number;
  readonly levels: readonly string[];
}

interface Report {
  readonly code: string;
  readonly levels: readonly string[];
  readonly blocks: readonly { readonly type: string; readonly label_key?: string }[];
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

interface Verification {
  readonly status: string;
  readonly notes?: string;
}

const PACKS_DIR = resolve(process.cwd(), 'packs');
const SCHEMA_DIR = resolve(PACKS_DIR, 'schema');
const PACK_SCHEMA_ID = 'https://schemas.schoolpilot.app/curriculum-pack/v1/pack.schema.json';

const MENTION_SCALE = 'mentions_fr';

// The mention of a moyenne out of 20, as the Cameroon decree on the baccalaureates words it: Passable from 10, Assez bien from
// 12, Bien from 14, Tres bien from 16. A moyenne is kept to two places, so each band ends one hundredth below the next.
const MENTION_BANDS: readonly (readonly [string, number, number])[] = [
  ['INS', 0, 9.99],
  ['P', 10, 11.99],
  ['AB', 12, 13.99],
  ['B', 14, 15.99],
  ['TB', 16, 20],
];

const PACKS = ['fr-africa-ci', 'fr-africa-cm', 'fr-africa-sn'] as const;
const LEVELS = ['6E', '5E', '4E', '3E', '2NDE', '1ERE', 'TLE'];
const RESULT_COLUMNS = ['slots', 'total', 'position', 'class_mean', 'highest', 'lowest', 'remark'];

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
for (const file of readdirSync(SCHEMA_DIR).filter((name) => name.endsWith('.json'))) {
  ajv.addSchema(JSON.parse(readFileSync(resolve(SCHEMA_DIR, file), 'utf8')) as object);
}

function readJson<T>(pack: string, ...parts: string[]): T {
  return JSON.parse(readFileSync(resolve(PACKS_DIR, pack, ...parts), 'utf8')) as T;
}

function readJsonDirectory<T>(pack: string, directory: string): T[] {
  return readdirSync(resolve(PACKS_DIR, pack, directory))
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => readJson<T>(pack, directory, name));
}

function loadPack(pack: string) {
  const locales = Object.fromEntries(
    readdirSync(resolve(PACKS_DIR, pack, 'locales'))
      .filter((name) => name.endsWith('.json'))
      .sort()
      .map((name) => [basename(name, '.json'), readJson<Locale>(pack, 'locales', name)])
  );
  const testFile = readdirSync(resolve(PACKS_DIR, pack, 'tests')).find((name) => name.endsWith('.vectors.json'));
  if (testFile === undefined) throw new Error(`${pack} ships no vectors`);
  return {
    manifest: readJson<{ readonly languages: readonly string[]; readonly verification: Verification }>(pack, 'pack.json'),
    structure: readJson<{
      readonly stages: readonly { readonly code: string; readonly levels: readonly string[] }[];
      readonly levels: readonly Level[];
      readonly calendar_template: { readonly periods: readonly { readonly code: string; readonly kind: string }[] };
    }>(pack, 'structure.json'),
    learningAreas: readJson<{ readonly learning_areas: readonly LearningArea[] }>(pack, 'learning-areas.json'),
    assessment: readJson<Assessment>(pack, 'assessment.json'),
    progression: readJson<{
      readonly progression: readonly { readonly levels: readonly string[]; readonly rule: string; readonly suggest?: { readonly metric: string; readonly gte: number } }[];
      readonly graduation: readonly { readonly levels: readonly string[] }[];
    }>(pack, 'progression.json'),
    reports: readJsonDirectory<Report>(pack, 'reports'),
    locales,
    tests: readJson<{ vectors: readonly Vector[] }>(pack, 'tests', testFile),
  };
}

function exactOf(text: string): Exact {
  const value = parseExact(text);
  if (value === null) throw new Error(`not an exact value: ${text}`);
  return value;
}

/** Every band whose range contains the value; more than one means the bands overlap. */
function bandsAt(scale: GradingScale, value: Exact): Band[] {
  return scale.bands.filter(
    (band) => compareExact(value, exactOf(String(band.min))) >= 0 && compareExact(value, exactOf(String(band.max))) <= 0
  );
}

function mentionScale(assessment: Assessment): GradingScale {
  const scale = assessment.grading_scales.find((candidate) => candidate.code === MENTION_SCALE);
  if (!scale) throw new Error('the pack declares no mention scale');
  return scale;
}

describe.each(PACKS)('%s on disk', (code) => {
  const pack = loadPack(code);
  const document = {
    pack: readJson<unknown>(code, 'pack.json'),
    structure: pack.structure,
    learning_areas: pack.learningAreas,
    assessment: pack.assessment,
    progression: pack.progression,
    reports: pack.reports,
    locales: pack.locales,
    tests: pack.tests,
  };

  it('validates against the composed pack schema', () => {
    const validate = ajv.getSchema(PACK_SCHEMA_ID);
    if (!validate) throw new Error('pack schema is not registered');
    expect(validate(document) === true, JSON.stringify(validate.errors)).toBe(true);
  });

  it('passes every runtime check in checkPackSemantics', () => {
    expect(checkPackSemantics(document)).toEqual([]);
  });

  it('is a draft pack with French as its primary language and English alongside, every report label translated in both', () => {
    expect(pack.manifest.verification.status).toBe('draft');
    expect(pack.manifest.languages).toEqual(['fr', 'en']);
    expect(Object.keys(pack.locales).sort()).toEqual(['en', 'fr']);
    for (const [language, locale] of Object.entries(pack.locales)) {
      for (const report of pack.reports) {
        for (const block of report.blocks) {
          expect(block.label_key, `${report.code}.${block.type}`).toBeDefined();
          expect(locale.labels[block.label_key ?? ''], `${language}:${block.label_key}`).toBeTruthy();
        }
      }
    }
  });

  it('words the French labels differently from the English ones and describes every mention in both languages', () => {
    const { fr, en } = pack.locales;
    expect(fr?.labels['block.results']).not.toBe(en?.labels['block.results']);
    for (const locale of Object.values(pack.locales)) {
      for (const [mention] of MENTION_BANDS) expect(locale.descriptors?.[MENTION_SCALE]?.[mention], mention).toBeTruthy();
    }
  });

  it('lists in the manifest notes every rule it could not confirm', () => {
    expect(pack.manifest.verification.notes ?? '').toMatch(/coefficient/i);
    expect(pack.manifest.verification.notes ?? '').toMatch(/mention/i);
  });
});

describe.each(PACKS)('%s structure and subjects', (code) => {
  const { structure, learningAreas, reports } = loadPack(code);

  it('runs the college from 6e to 3e and the lycee from 2nde to terminale, with the exam at the end of each cycle', () => {
    expect(structure.stages.map((stage) => stage.code)).toEqual(['COL', 'LYC']);
    expect(structure.levels.map((level) => level.code)).toEqual(LEVELS);
    expect(structure.levels.map((level) => level.ordinal)).toEqual([7, 8, 9, 10, 11, 12, 13]);
    expect(structure.levels.find((level) => level.code === 'TLE')).toMatchObject({ next: null, national_assessment: 'BAC' });
    expect(structure.levels.find((level) => level.code === '3E')?.national_assessment).toMatch(/^(BEPC|BFEM)$/);
  });

  it('runs three trimestres', () => {
    expect(structure.calendar_template.periods.map((period) => [period.code, period.kind])).toEqual([
      ['T1', 'term'],
      ['T2', 'term'],
      ['T3', 'term'],
    ]);
  });

  it('gives every learning area a coefficient and keeps religious instruction and manual work out of the moyenne', () => {
    for (const area of learningAreas.learning_areas.filter((candidate) => candidate.kind !== 'pastoral')) {
      expect(area.coefficient, area.code).toBeGreaterThan(0);
    }
    const codes = learningAreas.learning_areas.map((area) => area.code);
    expect(codes).not.toContain('IRE');
    expect(codes).not.toContain('TMA');
  });

  it('prints the results table, the moyenne and rank, the conseil de classe decision and the signatures', () => {
    expect(reports.length).toBeGreaterThan(0);
    for (const report of reports) {
      const types = report.blocks.map((block) => block.type);
      expect(types, report.code).toEqual(
        expect.arrayContaining(['header', 'learner', 'attendance', 'results_table', 'summary', 'comments', 'progression', 'signatures', 'verification'])
      );
    }
    expect(reports.flatMap((report) => report.levels).sort()).toEqual([...LEVELS].sort());
  });
});

describe.each(PACKS)('%s assessment', (code) => {
  const { assessment, progression, structure } = loadPack(code);
  const scale = mentionScale(assessment);

  it('declares the four mentions of the Cameroon baccalaureate decree on a mark out of 20 and nothing else on top', () => {
    // numeric_bands, not mark_out_of_20: the assessment engine's scale preparation refuses the canonical kind.
    expect(scale.kind).toBe('numeric_bands');
    expect(scale.upper).toBe('inclusive');
    expect(scale.bands.map((band) => [band.code, band.min, band.max])).toEqual(MENTION_BANDS);
  });

  it('gives every moyenne from 0.00 to 20.00 kept to two places exactly one band', () => {
    for (let hundredths = 0; hundredths <= 2000; hundredths += 1) {
      const text = (hundredths / 100).toFixed(2);
      expect(bandsAt(scale, exactOf(text)), text).toHaveLength(1);
    }
  });

  it('changes mention exactly at 10, 12, 14 and 16', () => {
    for (const [mention, lowest] of MENTION_BANDS.slice(1)) {
      expect(bandsAt(scale, exactOf(String(lowest)))[0]?.code, `at ${lowest}`).toBe(mention);
      expect(bandsAt(scale, exactOf((lowest - 0.01).toFixed(2)))[0]?.code, `below ${lowest}`).not.toBe(mention);
    }
  });

  it('takes one mark out of 20 per subject and weights the subjects by coefficient into a moyenne kept to two places', () => {
    expect(assessment.schemes).toHaveLength(1);
    expect(assessment.schemes[0]?.slots.map((slot) => [slot.code, slot.scale_to])).toEqual([['MOY', 20]]);
    expect(assessment.schemes[0]?.learning_area_score.out_of).toBe(20);
    expect(assessment.aggregations.find((aggregation) => aggregation.code === 'moyenne_trimestrielle')).toMatchObject({
      op: 'weighted_mean',
      value: 'score_20',
      weights: 'coefficient',
      precision: 2,
      result_scale: MENTION_SCALE,
    });
    expect(assessment.ranking).toMatchObject({ enabled: true, by: 'moyenne_trimestrielle' });
  });

  it('suggests promotion from a moyenne annuelle of 10, graduates the terminale and moves the 3e into the lycee', () => {
    const byLevel = new Map(progression.progression.flatMap((rule) => rule.levels.map((level) => [level, rule] as const)));
    for (const level of ['6E', '5E', '4E', '2NDE', '1ERE']) {
      expect(byLevel.get(level), level).toMatchObject({ rule: 'class_council', suggest: { metric: 'annual.moyenne', gte: 10 } });
    }
    expect(byLevel.get('3E')).toMatchObject({ rule: 'stage_transition', to_stage: 'LYC' });
    expect(progression.graduation).toEqual([{ levels: ['TLE'], rule: 'graduate' }]);
    expect(structure.levels.every((level) => level.code === 'TLE' || level.next !== null)).toBe(true);
  });

  it('is named by the pack', () => {
    expect(code).toMatch(/^fr-africa-(ci|cm|sn)$/);
  });
});

describe('fr-africa-ci annual moyenne', () => {
  const { assessment, learningAreas, progression } = loadPack('fr-africa-ci');

  it('weights the trimestres 1, 2 and 2 over 5 as circular 268 of the Ministry of National Education states', () => {
    expect(assessment.annual).toEqual({ op: 'weighted_mean', of: { T1: 0.2, T2: 0.4, T3: 0.4 }, missing: 'renormalise' });
  });

  it('counts the conduct mark with coefficient 1 as circular 279 states', () => {
    expect(learningAreas.learning_areas.find((area) => area.code === 'CON')).toMatchObject({ coefficient: 1 });
  });

  it('uses the same suggestion threshold for the first and the second cycle', () => {
    expect(progression.progression.every((rule) => rule.suggest === undefined || rule.suggest.gte === 10)).toBe(true);
  });
});

describe.each(['fr-africa-cm', 'fr-africa-sn'] as const)('%s annual moyenne', (code) => {
  it('averages the three trimestres equally, a draft rule no fetched source states', () => {
    const { assessment, manifest } = loadPack(code);
    expect(assessment.annual).toEqual({ op: 'mean', of: ['T1', 'T2', 'T3'], missing: 'renormalise' });
    expect(manifest.verification.notes ?? '').toMatch(/annual/i);
  });
});

describe.each(PACKS)('%s conformance vectors', (code) => {
  const { tests } = loadPack(code);

  it('ships vectors for the moyenne, every mention boundary and the promotion suggestions', () => {
    expect(tests.vectors.length).toBeGreaterThanOrEqual(8);
    for (const vector of tests.vectors) expect(vector.programme, vector.name).toBe(code);
    const grades = tests.vectors.map((vector) => (vector.expect['moyenne_trimestrielle'] as { grade?: string } | undefined)?.grade);
    for (const grade of ['INS', 'P', 'AB', 'B', 'TB']) expect(grades, grade).toContain(grade);
    expect(tests.vectors.flatMap((vector) => Object.keys(vector.expect))).toEqual(
      expect.arrayContaining(['fr-moyenne-matiere', 'moyenne_trimestrielle', 'progression'])
    );
  });

  it('are all executed, none skipped, by the conformance runner', () => {
    const runner = resolve(process.cwd(), 'scripts', 'packs', 'run-vectors.mjs');
    const result = spawnSync(process.execPath, [runner, '--pack', code], { cwd: process.cwd(), encoding: 'utf8', timeout: 120_000 });
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
    expect(result.status, output).toBe(0);
    const row = output.split('\n').find((line) => line.startsWith(code));
    expect(row, output).toBeDefined();
    const [, total, executed, skipped, failed] = (row ?? '').trim().split(/\s+/);
    expect([Number(executed), Number(skipped), Number(failed)], output).toEqual([Number(total), 0, 0]);
    expect(formatExact(exactOf(String(total)))).toBe(String(tests.vectors.length));
  });
});

// RESULT_COLUMNS is the column set the reports print; kept here so a change to it is a visible test change.
describe('report columns', () => {
  it.each(PACKS)('%s prints the same results columns in every report', (code) => {
    for (const report of loadPack(code).reports) {
      const table = report.blocks.find((block) => block.type === 'results_table') as { columns?: readonly string[] } | undefined;
      expect(table?.columns, report.code).toEqual(RESULT_COLUMNS);
    }
  });
});
