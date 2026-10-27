// ABOUTME: Validates the Rwandan curriculum pack (rw-cbc: P1 to P6 and S1 to S3) against the pack schemas and runtime
// ABOUTME: checks, pins the NESA seven-point scale, the PLE and O-level aggregates, and runs every vector.

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { formatExact } from '../../assessment/engine';
import {
  PACK_SCHEMA_ID,
  ajv,
  bandsAt,
  exactOf,
  loadPack,
  readJson,
  scaleOf,
  type Aggregation,
} from './packOnDisk';
import { checkPackSemantics } from './packSemantics';

// The conformance runner is a child Node process; tsx compiles the engines on a cold start.
vi.setConfig({ testTimeout: 120_000 });

const PACK = 'rw-cbc';
const CORE_SCALE = 'rw_core_7';

// The lowest mark of each grade, its top mark and the grade value NESA prints (6 highest, 0 lowest).
const CORE_BANDS: readonly (readonly [string, number, number, number])[] = [
  ['A', 70, 100, 6],
  ['B', 65, 69, 5],
  ['C', 60, 64, 4],
  ['D', 50, 59, 3],
  ['E', 40, 49, 2],
  ['S', 20, 39, 1],
  ['F', 0, 19, 0],
];

const PLE_SUBJECTS = ['MAT', 'KIN', 'ENG', 'SRS', 'SET'];
const OLEVEL_SUBJECTS = ['MAT', 'BIO', 'CHE', 'PHY', 'GEO', 'HIS', 'KIN', 'ENG', 'ENT'];
const RESULT_COLUMNS = ['slots', 'total', 'grade', 'position', 'class_mean', 'highest', 'lowest', 'remark'];

describe('rw-cbc on disk', () => {
  const pack = loadPack(PACK);
  const document = {
    pack: pack.manifest,
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
    expect(validate(document), JSON.stringify(validate.errors)).toBe(true);
  });

  it('passes every runtime check in checkPackSemantics', () => {
    expect(checkPackSemantics(document)).toEqual([]);
  });

  it('is a draft pack for Rwanda that ships English and Kinyarwanda and translates every report label in each', () => {
    expect(pack.manifest.country).toBe('RW');
    expect(pack.manifest.verification.status).toBe('draft');
    expect(pack.manifest.languages).toEqual(['en', 'rw']);
    expect(Object.keys(pack.locales).sort()).toEqual(['en', 'rw']);
    for (const [language, locale] of Object.entries(pack.locales)) {
      for (const report of pack.reports) {
        for (const block of report.blocks) {
          expect(locale.labels[block.label_key ?? ''], `${language}:${block.label_key}`).toBeTruthy();
        }
      }
    }
  });

  it('says in its manifest what is not modelled: the advanced level, its weights and the NESA paper weights', () => {
    const notes = pack.manifest.verification.notes ?? '';
    expect(notes).toMatch(/S4/);
    expect(notes).toMatch(/weight/i);
    expect(notes).toMatch(/secondary/i);
  });

  it('describes every grade in both languages', () => {
    for (const locale of Object.values(pack.locales)) {
      for (const [grade] of CORE_BANDS) expect(locale.descriptors?.[CORE_SCALE]?.[grade], grade).toBeTruthy();
    }
  });
});

describe('rw-cbc structure and subjects', () => {
  const { structure, learningAreas, progression } = loadPack(PACK);
  const areas = learningAreas.learning_areas;

  it('runs P1 to P6 then S1 to S3 with the PLE and the O-level examination at the exits', () => {
    expect(structure.stages.map((stage) => stage.code)).toEqual(['PRI', 'SEC']);
    expect(structure.levels.map((level) => level.code)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3']);
    expect(structure.levels.map((level) => level.ordinal)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(structure.levels.find((level) => level.code === 'P6')?.national_assessment).toBe('PLE');
    expect(structure.levels.find((level) => level.code === 'S3')).toMatchObject({ next: null, national_assessment: 'OLEVEL' });
    expect(structure.calendar_template.periods.map((period) => period.code)).toEqual(['T1', 'T2', 'T3']);
  });

  it('offers the five PLE subjects in primary and the nine S3 examination subjects in the lower secondary', () => {
    const at = (level: string) => areas.filter((area) => area.levels.includes(level)).map((area) => area.code).sort();
    expect(at('P6')).toEqual([...PLE_SUBJECTS].sort());
    expect(at('S3')).toEqual([...OLEVEL_SUBJECTS].sort());
    const rule = (level: string) => learningAreas.combination_rules?.find((candidate) => candidate.rule === 'core_all' && candidate.levels.includes(level));
    expect([...(rule('P4')?.of ?? [])].sort()).toEqual([...PLE_SUBJECTS].sort());
    expect([...(rule('S2')?.of ?? [])].sort()).toEqual([...OLEVEL_SUBJECTS].sort());
  });

  it('moves P6 into secondary, leaves other levels to the class council and graduates S3', () => {
    const byLevel = new Map(progression.progression.flatMap((rule) => rule.levels.map((level) => [level, rule] as const)));
    expect(byLevel.get('P6')).toMatchObject({ rule: 'stage_transition', to_stage: 'SEC' });
    expect(byLevel.get('P2')?.rule).toBe('class_council');
    expect(byLevel.get('S1')?.rule).toBe('class_council');
    expect(progression.graduation).toEqual([{ levels: ['S3'], rule: 'graduate' }]);
  });
});

describe('rw-cbc assessment', () => {
  const { assessment } = loadPack(PACK);
  const core = scaleOf(assessment, CORE_SCALE);

  it('declares the seven-point scale: grades A to F, grade values 6 to 0 and the marks of the secondary report', () => {
    expect(core.upper).toBe('inclusive');
    expect(core.bands.map((band) => [band.code, band.min, band.max, band.points])).toEqual(CORE_BANDS);
    expect(core.verification).toMatch(/draft/i);
    expect(core.verification).toMatch(/KT Press/);
  });

  it('assigns exactly one grade to every whole mark from 0 to 100 and changes grade at each boundary', () => {
    for (let mark = 0; mark <= 100; mark += 1) expect(bandsAt(core, exactOf(String(mark))), `${mark}`).toHaveLength(1);
    for (const [grade, lowest] of CORE_BANDS) {
      expect(bandsAt(core, exactOf(String(lowest)))[0]?.code, `at ${lowest}`).toBe(grade);
      if (lowest > 0) expect(bandsAt(core, exactOf(String(lowest - 1)))[0]?.code, `at ${lowest - 1}`).not.toBe(grade);
    }
  });

  it('adds the grade values of the five PLE subjects and of the nine O-level subjects, with no division', () => {
    const find = (code: string) => assessment.aggregations.find((candidate: Aggregation) => candidate.code === code);
    expect(find('ple_aggregate')).toMatchObject({ op: 'sum', value: 'points' });
    expect([...(find('ple_aggregate')?.over ?? [])].sort()).toEqual([...PLE_SUBJECTS].sort());
    expect(find('olevel_aggregate')).toMatchObject({ op: 'sum', value: 'points' });
    expect([...(find('olevel_aggregate')?.over ?? [])].sort()).toEqual([...OLEVEL_SUBJECTS].sort());
    expect(assessment.grading_scales.map((scale) => scale.code)).toEqual([CORE_SCALE]);
  });

  it('totals, averages and ranks the term and averages the three terms of the year', () => {
    expect(assessment.aggregations.map((aggregation) => aggregation.code)).toEqual(
      expect.arrayContaining(['term_total', 'term_average'])
    );
    expect(assessment.ranking).toMatchObject({ enabled: true, by: 'term_average' });
    expect(assessment.annual).toEqual(expect.objectContaining({ op: 'mean', of: ['T1', 'T2', 'T3'] }));
  });
});

describe('rw-cbc terminal reports', () => {
  const { reports, structure } = loadPack(PACK);

  it('prints the subject table, the summary, the comments and the next term for every level exactly once', () => {
    const covered = reports.flatMap((report) => report.levels).sort();
    expect(covered).toEqual(structure.levels.map((level) => level.code).sort());
    for (const report of reports) {
      const types = report.blocks.map((block) => block.type);
      expect(types, report.code).toEqual(
        expect.arrayContaining(['header', 'learner', 'attendance', 'results_table', 'summary', 'comments', 'calendar', 'signatures', 'verification'])
      );
      const table = report.blocks.find((block) => block.type === 'results_table') as { columns?: string[] } | undefined;
      expect(table?.columns, report.code).toEqual(RESULT_COLUMNS);
    }
  });
});

describe('rw-cbc conformance vectors', () => {
  const { tests } = loadPack(PACK);

  it('ships vectors for every grade boundary, both aggregates at their maximum and minimum and the progression rules', () => {
    for (const vector of tests.vectors) expect(vector.programme, vector.name).toBe(PACK);
    const expected = tests.vectors.flatMap((vector) => Object.keys(vector.expect));
    expect(expected).toEqual(expect.arrayContaining(['rw-term', 'ple_aggregate', 'olevel_aggregate', 'term_total', 'term_average', 'progression']));
    const grades = tests.vectors.map((vector) => (vector.expect['rw-term'] as { grade?: string } | undefined)?.grade);
    for (const [grade] of CORE_BANDS) expect(grades, grade).toContain(grade);
    const ple = tests.vectors.map((vector) => (vector.expect['ple_aggregate'] as { value?: number } | undefined)?.value);
    expect(ple).toEqual(expect.arrayContaining([30, 0]));
    const olevel = tests.vectors.map((vector) => (vector.expect['olevel_aggregate'] as { value?: number } | undefined)?.value);
    expect(olevel).toEqual(expect.arrayContaining([54, 0]));
  });

  it('are all executed, none skipped, by the conformance runner', () => {
    const runner = resolve(process.cwd(), 'scripts', 'packs', 'run-vectors.mjs');
    const result = spawnSync(process.execPath, [runner, '--pack', PACK], { cwd: process.cwd(), encoding: 'utf8', timeout: 120_000 });
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
    expect(result.status, output).toBe(0);
    const row = output.split('\n').find((line) => line.startsWith(PACK));
    expect(row, output).toBeDefined();
    const [, total, executed, skipped, failed] = (row ?? '').trim().split(/\s+/);
    expect([Number(executed), Number(skipped), Number(failed)], output).toEqual([Number(total), 0, 0]);
    expect(formatExact(exactOf(String(total)))).toBe(String(tests.vectors.length));
    expect(readJson<{ vectors: unknown[] }>(PACK, 'tests', 'rw-cbc.vectors.json').vectors).toHaveLength(tests.vectors.length);
  });
});
