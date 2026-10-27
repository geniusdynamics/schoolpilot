// ABOUTME: Validates the Ghanaian curriculum packs (gh-sbc Basic 1 to 9 with the BECE, gh-shs SHS 1 to 3 with the WASSCE)
// ABOUTME: against the pack schemas and runtime checks, pins the NaCCA scales and weights, and runs every vector.

import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';

import Ajv2020 from 'ajv/dist/2020';
import { describe, expect, it, vi } from 'vitest';

import { compareExact, parseExact, type Exact } from '../../assessment/engine';
import { checkPackSemantics } from './packSemantics';

// The conformance runner is a child Node process; tsx compiles the engines on a cold start.
vi.setConfig({ testTimeout: 120_000 });

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
  readonly upper?: string;
  readonly bands: readonly Band[];
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
  readonly n?: number;
  readonly value?: string;
  readonly groups?: readonly { readonly require_all?: readonly string[]; readonly fill_from?: string }[];
}

interface Assessment {
  readonly schemes: readonly Scheme[];
  readonly grading_scales: readonly GradingScale[];
  readonly aggregations: readonly Aggregation[];
  readonly annual: { readonly op: string; readonly of: readonly string[] };
}

interface Level {
  readonly code: string;
  readonly ordinal: number;
  readonly next: string | null;
  readonly national_assessment: string | null;
}

interface Structure {
  readonly stages: readonly { readonly code: string; readonly levels: readonly string[] }[];
  readonly levels: readonly Level[];
  readonly pathways?: readonly { readonly code: string }[];
}

interface LearningArea {
  readonly code: string;
  readonly kind: string;
  readonly levels: readonly string[];
  readonly pathways?: readonly string[];
}

interface CombinationRule {
  readonly levels: readonly string[];
  readonly rule: string;
  readonly of?: readonly string[];
  readonly count?: number;
  readonly max?: number;
  readonly from_pathway?: boolean;
}

interface LearningAreaDocument {
  readonly learning_areas: readonly LearningArea[];
  readonly competencies: readonly { readonly code: string; readonly kind: string }[];
  readonly combination_rules?: readonly CombinationRule[];
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

const PACKS_DIR = resolve(process.cwd(), 'packs');
const SCHEMA_DIR = resolve(PACKS_DIR, 'schema');
const PACK_SCHEMA_ID = 'https://schemas.schoolpilot.app/curriculum-pack/v1/pack.schema.json';

// NaCCA National Pre-tertiary Education Curriculum Framework (2019), Tables 4 and 5: whole-mark percentage bands.
const BASIC_BANDS: readonly (readonly [string, number, number])[] = [
  ['A', 80, 100],
  ['B', 65, 79],
  ['C', 45, 64],
  ['D', 30, 44],
  ['E', 0, 29],
];

const SHS_BANDS: readonly (readonly [string, number, number])[] = [
  ['A', 80, 100],
  ['B', 70, 79],
  ['C', 60, 69],
  ['D', 50, 59],
  ['E', 40, 49],
  ['F', 30, 39],
  ['G', 20, 29],
  ['U', 0, 19],
];

const WASSCE_GRADES = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9'];
const CREDIT_GRADES = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6'];
const CORE_COMPETENCES = ['CTP', 'CRI', 'COL', 'CIG', 'PDL', 'DIG'];
const RESULT_COLUMNS = ['slots', 'total', 'grade', 'position', 'class_mean', 'highest', 'lowest', 'remark'];

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
    manifest: readJson<{ readonly languages: readonly string[]; readonly verification: { readonly status: string } }>(pack, 'pack.json'),
    structure: readJson<Structure>(pack, 'structure.json'),
    learningAreas: readJson<LearningAreaDocument>(pack, 'learning-areas.json'),
    assessment: readJson<Assessment>(pack, 'assessment.json'),
    progression: readJson<{
      progression: { levels: string[]; rule: string; to_stage?: string; suggest?: { metric: string; gte: number } }[];
      graduation: { levels: string[]; rule: string }[];
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

function scaleOf(assessment: Assessment, code: string): GradingScale {
  const scale = assessment.grading_scales.find((candidate) => candidate.code === code);
  if (!scale) throw new Error(`the pack declares no grading scale ${code}`);
  return scale;
}

function schemeOf(assessment: Assessment, code: string): Scheme {
  const scheme = assessment.schemes.find((candidate) => candidate.code === code);
  if (!scheme) throw new Error(`the pack declares no scheme ${code}`);
  return scheme;
}

const PACKS = ['gh-sbc', 'gh-shs'] as const;

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
    const valid = validate(document) === true;
    expect(valid, JSON.stringify(validate.errors)).toBe(true);
  });

  it('passes every runtime check in checkPackSemantics', () => {
    expect(checkPackSemantics(document)).toEqual([]);
  });

  it('is a draft pack that ships English and Akan and translates every report label in each', () => {
    expect(pack.manifest.verification.status).toBe('draft');
    expect(pack.manifest.languages).toEqual(['en', 'ak']);
    expect(Object.keys(pack.locales).sort()).toEqual(['ak', 'en']);
    for (const [language, locale] of Object.entries(pack.locales)) {
      for (const report of pack.reports) {
        for (const block of report.blocks) {
          expect(block.label_key, `${report.code}.${block.type}`).toBeDefined();
          expect(locale.labels[block.label_key ?? ''], `${language}:${block.label_key}`).toBeTruthy();
        }
      }
    }
  });

  it('declares NaCCA core competences as the competencies', () => {
    expect(pack.learningAreas.competencies.map((competency) => competency.code)).toEqual(CORE_COMPETENCES);
  });

  it('prints the subject table with position, class statistics and remark, and the next term', () => {
    for (const report of pack.reports) {
      const types = report.blocks.map((block) => block.type);
      expect(types, report.code).toEqual(
        expect.arrayContaining(['header', 'learner', 'attendance', 'results_table', 'summary', 'comments', 'calendar', 'signatures', 'verification'])
      );
    }
    const covered = pack.reports.flatMap((report) => report.levels).sort();
    expect(covered).toEqual(pack.structure.levels.map((level) => level.code).sort());
    for (const report of pack.reports) {
      const table = report.blocks.find((block) => block.type === 'results_table') as { columns?: readonly string[] } | undefined;
      expect(table?.columns, report.code).toEqual(RESULT_COLUMNS);
    }
  });

  it('totals, averages and ranks the term and averages the three terms of the year', () => {
    expect(pack.assessment.aggregations.map((aggregation) => aggregation.code)).toEqual(
      expect.arrayContaining(['term_total', 'term_average'])
    );
    expect(pack.assessment.annual).toEqual({ op: 'mean', of: ['T1', 'T2', 'T3'], missing: 'renormalise' });
  });
});

describe('gh-sbc structure and subjects', () => {
  const { structure, learningAreas, assessment, progression } = loadPack('gh-sbc');
  const areas = learningAreas.learning_areas;
  const rules = learningAreas.combination_rules ?? [];

  it('runs Basic 1 to 6 then JHS Basic 7 to 9, with the BECE at the end of Basic 9', () => {
    expect(structure.stages.map((stage) => stage.code)).toEqual(['PRI', 'JHS']);
    expect(structure.levels.map((level) => level.code)).toEqual(['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9']);
    expect(structure.levels.map((level) => level.ordinal)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(structure.levels.find((level) => level.code === 'B9')).toMatchObject({ next: null, national_assessment: 'BECE' });
  });

  it('lists the NaCCA subjects of each phase', () => {
    const coreOf = (level: string) =>
      rules.find((rule) => rule.rule === 'core_all' && rule.levels.includes(level))?.of ?? [];
    expect([...coreOf('B2')].sort()).toEqual(['CRA', 'ENG', 'GHL', 'HIS', 'MAT', 'OWP', 'PHE', 'RME', 'SCI']);
    expect([...coreOf('B5')].sort()).toEqual(['COM', 'CRA', 'ENG', 'GHL', 'HIS', 'MAT', 'OWP', 'PHE', 'RME', 'SCI']);
    expect([...coreOf('B8')].sort()).toEqual(['CAD', 'COM', 'CTE', 'ENG', 'GHL', 'MAT', 'PHE', 'RME', 'SCI', 'SOC']);
    for (const code of ['FRE', 'ARA']) expect(areas.find((area) => area.code === code)?.kind).toBe('optional');
  });

  it('grades with the NaCCA letter scale of Tables 3 and 4', () => {
    const scale = scaleOf(assessment, 'gh_basic_5');
    expect(scale.upper).toBe('inclusive');
    expect(scale.bands.map((band) => [band.code, band.min, band.max])).toEqual(BASIC_BANDS);
    for (let mark = 0; mark <= 100; mark += 1) expect(bandsAt(scale, exactOf(String(mark))), `${mark}`).toHaveLength(1);
  });

  it('weights continuous assessment and examination by level as NaCCA Tables 6 and 7 and WAEC state', () => {
    const weights = (scheme: Scheme) => scheme.slots.map((slot) => [slot.code, slot.scale_to]);
    expect(weights(schemeOf(assessment, 'gh-lower-primary'))).toEqual([['CA', 100]]);
    expect(weights(schemeOf(assessment, 'gh-upper-primary'))).toEqual([['CA', 50], ['EXAM', 50]]);
    expect(weights(schemeOf(assessment, 'gh-jhs'))).toEqual([['CA', 35], ['EXAM', 65]]);
    expect(weights(schemeOf(assessment, 'gh-bece'))).toEqual([['CA', 30], ['EXAM', 70]]);
    expect(schemeOf(assessment, 'gh-bece').levels).toEqual(['B9']);
    expect(schemeOf(assessment, 'gh-jhs').levels).toEqual(['B7', 'B8']);
    for (const scheme of assessment.schemes) expect(scheme.grading_scale).toBe('gh_basic_5');
  });

  it('reads the nine WAEC grades as a points scale in which grade 1 is the best', () => {
    const scale = scaleOf(assessment, 'gh_bece_9');
    expect(scale.bands.map((band) => [band.code, band.points])).toEqual([
      ['1', 9], ['2', 8], ['3', 7], ['4', 6], ['5', 5], ['6', 4], ['7', 3], ['8', 2], ['9', 1],
    ]);
  });

  it('aggregates the BECE as the best six: the four core subjects, then the best two others', () => {
    const aggregate = assessment.aggregations.find((aggregation) => aggregation.code === 'bece_aggregate');
    expect(aggregate).toMatchObject({ op: 'best_n', n: 6, value: 'points' });
    expect(aggregate?.groups).toEqual([{ require_all: ['ENG', 'MAT', 'SCI', 'SOC'] }, { fill_from: 'any' }]);
  });

  it('suggests promotion at the lowest band that NaCCA calls sufficient to go on, and graduates Basic 9', () => {
    const byLevel = new Map(progression.progression.flatMap((rule) => rule.levels.map((level) => [level, rule] as const)));
    expect(byLevel.get('B3')).toMatchObject({ rule: 'class_council', suggest: { metric: 'annual.term_average', gte: 30 } });
    expect(byLevel.get('B6')).toMatchObject({ rule: 'stage_transition', to_stage: 'JHS' });
    expect(byLevel.get('B8')?.rule).toBe('class_council');
    expect(progression.graduation).toEqual([{ levels: ['B9'], rule: 'graduate' }]);
  });
});

describe('gh-shs structure and subjects', () => {
  const { structure, learningAreas, assessment, progression } = loadPack('gh-shs');
  const areas = learningAreas.learning_areas;
  const rules = learningAreas.combination_rules ?? [];

  it('runs SHS 1 to 3 with the WASSCE at the end of SHS 3 and the six WAEC programmes as pathways', () => {
    expect(structure.stages.map((stage) => stage.code)).toEqual(['SHS']);
    expect(structure.levels.map((level) => [level.code, level.ordinal])).toEqual([['SHS1', 10], ['SHS2', 11], ['SHS3', 12]]);
    expect(structure.levels.find((level) => level.code === 'SHS3')).toMatchObject({ next: null, national_assessment: 'WASSCE' });
    expect(structure.pathways?.map((pathway) => pathway.code)).toEqual(['PAG', 'PBU', 'PTE', 'PVO', 'PGA', 'PGS']);
  });

  it('makes the four WAEC core subjects compulsory and takes three or four electives from one pathway', () => {
    expect(areas.filter((area) => area.kind === 'core').map((area) => area.code)).toEqual(['ENG', 'MAT', 'ISC', 'SOS']);
    expect(rules.find((rule) => rule.rule === 'core_all')?.of).toEqual(['ENG', 'MAT', 'ISC', 'SOS']);
    expect(rules.find((rule) => rule.rule === 'electives')).toMatchObject({ count: 3, max: 4, from_pathway: true });
    for (const area of areas.filter((candidate) => candidate.kind === 'elective')) {
      expect(area.pathways?.length, area.code).toBeGreaterThan(0);
    }
  });

  it('grades with the NaCCA SHS letter scale of Table 5, A to G and U', () => {
    const scale = scaleOf(assessment, 'gh_shs_letter');
    expect(scale.upper).toBe('inclusive');
    expect(scale.bands.map((band) => [band.code, band.min, band.max])).toEqual(SHS_BANDS);
    for (let mark = 0; mark <= 100; mark += 1) expect(bandsAt(scale, exactOf(String(mark))), `${mark}`).toHaveLength(1);
  });

  it('weights continuous assessment 30 and examination 70', () => {
    expect(assessment.schemes).toHaveLength(1);
    expect(assessment.schemes[0]?.levels).toEqual(['SHS1', 'SHS2', 'SHS3']);
    expect(assessment.schemes[0]?.slots.map((slot) => [slot.code, slot.scale_to])).toEqual([['CA', 30], ['EXAM', 70]]);
    expect(assessment.schemes[0]?.grading_scale).toBe('gh_shs_letter');
  });

  it('reads the nine WASSCE grades as an entered-result scale, with no percentage invented for them', () => {
    const scale = scaleOf(assessment, 'gh_wassce_9');
    expect(scale.kind).toBe('rubric');
    expect(scale.bands.map((band) => band.code)).toEqual(WASSCE_GRADES);
  });

  it('counts credits, and credits in English and Mathematics, over the WASSCE grades', () => {
    const credits = assessment.aggregations.filter((aggregation) => aggregation.op === 'count_where');
    expect(credits.map((aggregation) => aggregation.code)).toEqual(['credits_count', 'core_credits']);
    expect(CREDIT_GRADES).toHaveLength(6);
  });

  it('suggests promotion at an annual average of 40 and graduates SHS 3', () => {
    expect(progression.progression).toEqual([
      { levels: ['SHS1', 'SHS2'], rule: 'class_council', suggest: { metric: 'annual.term_average', gte: 40 } },
    ]);
    expect(progression.graduation).toEqual([{ levels: ['SHS3'], rule: 'graduate' }]);
  });
});

describe.each(PACKS)('%s conformance vectors', (code) => {
  const { tests } = loadPack(code);

  it('ships vectors for the scheme at every band boundary, the aggregations and the progression rules', () => {
    expect(tests.vectors.length).toBeGreaterThanOrEqual(12);
    for (const vector of tests.vectors) expect(vector.programme, vector.name).toBe(code);
    const expected = tests.vectors.flatMap((vector) => Object.keys(vector.expect));
    expect(expected).toEqual(expect.arrayContaining(['term_total', 'term_average', 'progression']));
    const bands = code === 'gh-sbc' ? BASIC_BANDS : SHS_BANDS;
    const grades = tests.vectors.flatMap((vector) =>
      Object.values(vector.expect).map((entry) => (entry as { grade?: string }).grade)
    );
    for (const [grade] of bands) expect(grades, grade).toContain(grade);
  });

  it('are all executed, none skipped, by the conformance runner', () => {
    const runner = resolve(process.cwd(), 'scripts', 'packs', 'run-vectors.mjs');
    const result = spawnSync(process.execPath, [runner, '--pack', code], { cwd: process.cwd(), encoding: 'utf8', timeout: 120_000 });
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
    expect(result.status, output).toBe(0);
    const row = output.split('\n').find((line) => line.startsWith(code));
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
