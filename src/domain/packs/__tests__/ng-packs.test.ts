// ABOUTME: Validates the Nigerian curriculum packs (ng-ube basic education, ng-sss senior secondary) against the
// ABOUTME: pack schemas and runtime checks, pins the WAEC-style scale and the CA-plus-exam scheme, and runs every vector.

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
  readonly missing?: Readonly<Record<string, string>>;
}

interface Aggregation {
  readonly code: string;
  readonly op: string;
}

interface Assessment {
  readonly schemes: readonly Scheme[];
  readonly grading_scales: readonly GradingScale[];
  readonly aggregations: readonly Aggregation[];
  readonly ranking: {
    readonly enabled: boolean;
    readonly by: string;
    readonly show_on_report: boolean;
    readonly show_out_of: boolean;
  };
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
  readonly calendar_template: { readonly periods: readonly { readonly code: string }[] };
}

interface LearningArea {
  readonly code: string;
  readonly kind: string;
  readonly group?: string;
  readonly levels: readonly string[];
  readonly pathways?: readonly string[];
}

interface CombinationRule {
  readonly levels: readonly string[];
  readonly rule: string;
  readonly of?: readonly string[];
  readonly group?: string;
  readonly min?: number;
  readonly max?: number;
  readonly count?: number;
}

interface LearningAreaDocument {
  readonly learning_areas: readonly LearningArea[];
  readonly competencies: readonly { readonly code: string; readonly kind: string }[];
  readonly combination_rules?: readonly CombinationRule[];
}

interface Report {
  readonly code: string;
  readonly levels: readonly string[];
  readonly blocks: readonly { readonly type: string; readonly label_key?: string; readonly columns?: readonly string[] }[];
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

const WAEC_SCALE = 'ng_waec_9';
const RATING_SCALE = 'ng_domain_rating_5';

// The WAEC-style nine-grade scale of spec 03 Appendix G: the lowest mark of each grade and its top mark.
const WAEC_BANDS: readonly (readonly [string, number, number])[] = [
  ['A1', 75, 100],
  ['B2', 70, 74],
  ['B3', 65, 69],
  ['C4', 60, 64],
  ['C5', 55, 59],
  ['C6', 50, 54],
  ['D7', 45, 49],
  ['E8', 40, 44],
  ['F9', 0, 39],
];

const CREDIT_GRADES = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6'];
const AFFECTIVE_TRAITS = ['PUN', 'NEA', 'POL', 'HON', 'ATT', 'LEA'];
const PSYCHOMOTOR_SKILLS = ['HWR', 'GAM', 'CRA', 'DRA'];
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
    progression: readJson<unknown>(pack, 'progression.json'),
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
  return scale.bands.filter((band) => {
    const atOrAbove = compareExact(value, exactOf(String(band.min))) >= 0;
    const belowUpper = compareExact(value, exactOf(String(band.max))) <= 0;
    return atOrAbove && belowUpper;
  });
}

function scaleOf(assessment: Assessment, code: string): GradingScale {
  const scale = assessment.grading_scales.find((candidate) => candidate.code === code);
  if (!scale) throw new Error(`the pack declares no grading scale ${code}`);
  return scale;
}

const PACKS = ['ng-ube', 'ng-sss'] as const;

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

  it('is a draft pack that ships English and Hausa and translates every report label in each', () => {
    expect(pack.manifest.verification.status).toBe('draft');
    expect(pack.manifest.languages).toEqual(['en', 'ha']);
    expect(Object.keys(pack.locales).sort()).toEqual(['en', 'ha']);
    for (const [language, locale] of Object.entries(pack.locales)) {
      for (const report of pack.reports) {
        for (const block of report.blocks) {
          expect(block.label_key, `${report.code}.${block.type}`).toBeDefined();
          expect(locale.labels[block.label_key ?? ''], `${language}:${block.label_key}`).toBeTruthy();
        }
      }
    }
  });

  it('describes every WAEC grade and every domain rating in both languages', () => {
    for (const locale of Object.values(pack.locales)) {
      for (const [grade] of WAEC_BANDS) expect(locale.descriptors?.[WAEC_SCALE]?.[grade], grade).toBeTruthy();
      for (const rating of ['1', '2', '3', '4', '5']) {
        expect(locale.descriptors?.[RATING_SCALE]?.[rating], rating).toBeTruthy();
      }
    }
  });
});

describe.each(PACKS)('%s assessment', (code) => {
  const { assessment } = loadPack(code);
  const waec = scaleOf(assessment, WAEC_SCALE);

  it('declares the WAEC-style grades with the boundaries of spec 03 Appendix G', () => {
    expect(waec.upper).toBe('inclusive');
    expect(waec.bands.map((band) => [band.code, band.min, band.max])).toEqual(WAEC_BANDS);
    for (const band of waec.bands) expect(band.label, band.code).toBe(band.code);
  });

  it('assigns exactly one grade to every whole mark from 0 to 100', () => {
    for (let mark = 0; mark <= 100; mark += 1) {
      expect(bandsAt(waec, exactOf(String(mark))), `${mark}`).toHaveLength(1);
    }
  });

  it('changes grade exactly at each published boundary and has no band for a fractional mark', () => {
    for (const [grade, lowest] of WAEC_BANDS) {
      expect(bandsAt(waec, exactOf(String(lowest)))[0]?.code, `at ${lowest}`).toBe(grade);
      if (lowest > 0) expect(bandsAt(waec, exactOf(String(lowest - 1)))[0]?.code, `at ${lowest - 1}`).not.toBe(grade);
    }
    expect(bandsAt(waec, exactOf('74.5'))).toEqual([]);
  });

  it('counts A1 to C6 as the credit grades by the grades the pack lists', () => {
    expect(WAEC_BANDS.slice(0, 6).map(([grade]) => grade)).toEqual(CREDIT_GRADES);
  });

  it('grades a learner on two continuous assessments of 20 and an examination of 60', () => {
    const scheme = assessment.schemes[0];
    expect(assessment.schemes).toHaveLength(1);
    expect(scheme?.slots.map((slot) => [slot.code, slot.kind, slot.scale_to])).toEqual([
      ['CA1', 'cat', 20],
      ['CA2', 'cat', 20],
      ['EXAM', 'end_term', 60],
    ]);
    expect(scheme?.grading_scale).toBe(WAEC_SCALE);
    expect(Object.values(scheme?.missing ?? {})).toEqual(['incomplete', 'incomplete', 'incomplete']);
  });

  it('declares a five-point rating scale for the affective and psychomotor domains', () => {
    const rating = scaleOf(assessment, RATING_SCALE);
    expect(rating.kind).toBe('rubric');
    expect(rating.bands.map((band) => band.code)).toEqual(['5', '4', '3', '2', '1']);
  });

  it('totals, averages and ranks the term, and averages the three terms of the session', () => {
    expect(assessment.aggregations.map((aggregation) => aggregation.code)).toEqual(
      expect.arrayContaining(['term_total', 'term_average'])
    );
    expect(assessment.ranking).toMatchObject({
      enabled: true,
      by: 'term_average',
      show_on_report: true,
      show_out_of: true,
    });
    expect(assessment.annual).toEqual({ op: 'mean', of: ['T1', 'T2', 'T3'], missing: 'renormalise' });
  });
});

describe.each(PACKS)('%s terminal report', (code) => {
  const { reports, structure, learningAreas } = loadPack(code);

  it('prints the subject table, the position, both domains, the comments and the next term', () => {
    expect(reports.length).toBeGreaterThan(0);
    for (const report of reports) {
      const types = report.blocks.map((block) => block.type);
      expect(types, report.code).toEqual(
        expect.arrayContaining([
          'header',
          'learner',
          'attendance',
          'results_table',
          'summary',
          'affective_psychomotor',
          'comments',
          'calendar',
          'signatures',
          'verification',
        ])
      );
      const table = report.blocks.find((block) => block.type === 'results_table');
      expect(table?.columns, report.code).toEqual(RESULT_COLUMNS);
    }
  });

  it('covers every level of the pack exactly once', () => {
    const covered = reports.flatMap((report) => report.levels).sort();
    expect(covered).toEqual(structure.levels.map((level) => level.code).sort());
  });

  it('rates six affective traits and four psychomotor skills', () => {
    const attitudes = learningAreas.competencies.filter((c) => c.kind === 'attitude').map((c) => c.code);
    const skills = learningAreas.competencies.filter((c) => c.kind === 'core_competency').map((c) => c.code);
    expect(attitudes).toEqual(AFFECTIVE_TRAITS);
    expect(skills).toEqual(PSYCHOMOTOR_SKILLS);
  });

  it('carries the fees block, which the school policy switches on or off', () => {
    for (const report of reports) {
      expect(report.blocks.some((block) => block.type === 'fees'), report.code).toBe(true);
    }
  });
});

describe('ng-ube structure and subjects', () => {
  const { structure, learningAreas } = loadPack('ng-ube');
  const areas = learningAreas.learning_areas;
  const rules = learningAreas.combination_rules ?? [];

  it('runs primary 1 to 6 then JSS 1 to 3, with the BECE at the end of JSS 3', () => {
    expect(structure.stages.map((stage) => stage.code)).toEqual(['PRI', 'JSS']);
    expect(structure.levels.map((level) => level.code)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'JSS1', 'JSS2', 'JSS3']);
    expect(structure.levels.map((level) => level.ordinal)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(structure.levels.find((level) => level.code === 'JSS3')).toMatchObject({ next: null, national_assessment: 'BECE' });
    expect(structure.calendar_template.periods.map((period) => period.code)).toEqual(['T1', 'T2', 'T3']);
  });

  const SUBJECT_COUNTS: readonly (readonly [string, readonly string[], number, number])[] = [
    ['primary 1 to 3', ['P1', 'P2', 'P3'], 9, 10],
    ['primary 4 to 6', ['P4', 'P5', 'P6'], 11, 13],
    ['JSS 1 to 3', ['JSS1', 'JSS2', 'JSS3'], 12, 14],
  ];

  it.each(SUBJECT_COUNTS)('offers %s the NERDC minimum and maximum number of subjects', (_name, levels, minimum, maximum) => {
    for (const level of levels) {
      const rule = rules.find((candidate) => candidate.rule === 'core_all' && candidate.levels.includes(level));
      const trades = rules.find((candidate) => candidate.rule === 'group' && candidate.levels.includes(level));
      const required = (rule?.of ?? []).length + (trades?.min ?? 0);
      expect(required, `${level} compulsory subjects`).toBe(minimum);

      const optional = areas.filter(
        (area) => area.levels.includes(level) && (area.kind === 'optional' || area.kind === 'elective') && area.group !== 'religion' && area.group !== 'trades'
      );
      const offered = required + (trades?.max ?? 0) - (trades?.min ?? 0) + optional.length;
      expect(offered, `${level} subjects on offer`).toBe(maximum);
    }
  });

  it('lets a learner take Christian or Islamic religious studies as one subject', () => {
    for (const rule of rules.filter((candidate) => candidate.rule === 'core_all')) {
      expect(rule.of, rule.levels.join(',')).toContain('CRS|ISL');
    }
  });

  it('offers six trade subjects at JSS and a learner takes one', () => {
    const trades = areas.filter((area) => area.group === 'trades');
    expect(trades).toHaveLength(6);
    for (const trade of trades) expect(trade.levels).toEqual(['JSS1', 'JSS2', 'JSS3']);
    expect(rules.find((rule) => rule.group === 'trades')).toMatchObject({ rule: 'group', min: 1, max: 1 });
  });

  it('keeps promotion a class-council suggestion at the lowest passing average and graduates JSS 3', () => {
    const { progression } = loadPack('ng-ube') as { progression: { progression: { levels: string[]; rule: string; to_stage?: string }[]; graduation: { levels: string[] }[] } };
    const byLevel = new Map(progression.progression.flatMap((rule) => rule.levels.map((level) => [level, rule] as const)));
    expect(byLevel.get('P6')).toMatchObject({ rule: 'stage_transition', to_stage: 'JSS' });
    expect(byLevel.get('P3')?.rule).toBe('class_council');
    expect(byLevel.get('JSS2')?.rule).toBe('class_council');
    expect(progression.graduation).toEqual([{ levels: ['JSS3'], rule: 'graduate' }]);
  });
});

describe('ng-sss structure and subjects', () => {
  const { structure, learningAreas, assessment } = loadPack('ng-sss');
  const areas = learningAreas.learning_areas;

  it('runs SS 1 to 3 with the WASSCE at the end of SS 3 and four departments as pathways', () => {
    expect(structure.stages.map((stage) => stage.code)).toEqual(['SSS']);
    expect(structure.levels.map((level) => level.code)).toEqual(['SS1', 'SS2', 'SS3']);
    expect(structure.levels.map((level) => level.ordinal)).toEqual([10, 11, 12]);
    expect(structure.levels.find((level) => level.code === 'SS3')).toMatchObject({ next: null, national_assessment: 'WASSCE' });
    expect(structure.pathways?.map((pathway) => pathway.code)).toEqual(['SCI', 'ART', 'COM', 'TEC']);
  });

  it('makes English, Mathematics, Civic Education and the trade subject core and gives each elective a department', () => {
    expect(areas.filter((area) => area.kind === 'core').map((area) => area.code)).toEqual(['ENG', 'MAT', 'CIV', 'TRD']);
    for (const area of areas.filter((candidate) => candidate.kind === 'elective')) {
      expect(area.pathways?.length, area.code).toBeGreaterThan(0);
      expect(area.levels, area.code).toEqual(['SS1', 'SS2', 'SS3']);
    }
  });

  it('counts credits, and credits in English and Mathematics, as aggregations over the WAEC grades', () => {
    const codes = assessment.aggregations.map((aggregation) => aggregation.code);
    expect(codes).toEqual(expect.arrayContaining(['credits_count', 'core_credits']));
    for (const aggregation of assessment.aggregations.filter((candidate) => candidate.op === 'count_where')) {
      expect(aggregation.code).toMatch(/credits/);
    }
  });
});

describe.each(PACKS)('%s conformance vectors', (code) => {
  const { tests } = loadPack(code);

  it('ships vectors for the scheme at every grade boundary, the aggregations and the progression rules', () => {
    expect(tests.vectors.length).toBeGreaterThanOrEqual(9);
    for (const vector of tests.vectors) expect(vector.programme, vector.name).toBe(code);
    const expected = tests.vectors.flatMap((vector) => Object.keys(vector.expect));
    expect(expected).toEqual(expect.arrayContaining(['ng-ca-exam', 'term_total', 'term_average', 'progression']));
    const grades = tests.vectors.map((vector) => (vector.expect['ng-ca-exam'] as { grade?: string } | undefined)?.grade);
    for (const grade of ['A1', 'B2', 'C6', 'D7', 'E8', 'F9']) expect(grades, grade).toContain(grade);
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
