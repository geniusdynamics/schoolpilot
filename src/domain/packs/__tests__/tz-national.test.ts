// ABOUTME: Validates the Tanzanian curriculum pack (tz-national: Standard I to VII and Form I to IV) against the pack
// ABOUTME: schemas and runtime checks, pins the NECTA grades and the CSEE division bands, and runs every vector.

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

const PACK = 'tz-national';
const CSEE_SUBJECT = 'tz_csee_subject';
const CSEE_DIVISION = 'tz_csee_division';
const PSLE_SUBJECT = 'tz_psle_subject';

// The lowest mark of each CSEE grade, its top mark and its points (secondary sources agree; draft).
const CSEE_BANDS: readonly (readonly [string, number, number, number])[] = [
  ['A', 75, 100, 1],
  ['B', 65, 74, 2],
  ['C', 45, 64, 3],
  ['D', 30, 44, 4],
  ['F', 0, 29, 5],
];

const CSEE_DIVISIONS: readonly (readonly [string, number, number])[] = [
  ['I', 7, 17],
  ['II', 18, 21],
  ['III', 22, 25],
  ['IV', 26, 33],
  ['0', 34, 35],
];

// The PSLE paper grades of the NECTA 2024 item response analysis (A 41-50 marks of 50, B 31-40, C 21-30, D 11-20, E 0-10)
// as the percent of the paper: the scheme looks a grade up by percent, and 41 of 50 is 82 percent.
const PSLE_BANDS: readonly (readonly [string, number, number])[] = [
  ['A', 82, 100],
  ['B', 62, 81],
  ['C', 42, 61],
  ['D', 22, 41],
  ['E', 0, 21],
];

const CORE_SUBJECTS = ['CIV', 'HIS', 'GEO', 'KIS', 'ENG', 'BIO', 'BMA'];
const RESULT_COLUMNS = ['slots', 'total', 'grade', 'position', 'class_mean', 'highest', 'lowest', 'remark'];

describe('tz-national on disk', () => {
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

  it('is a draft pack for Tanzania that ships English and Swahili and translates every report label in each', () => {
    expect(pack.manifest.country).toBe('TZ');
    expect(pack.manifest.verification.status).toBe('draft');
    expect(pack.manifest.languages).toEqual(['en', 'sw']);
    expect(Object.keys(pack.locales).sort()).toEqual(['en', 'sw']);
    for (const [language, locale] of Object.entries(pack.locales)) {
      for (const report of pack.reports) {
        for (const block of report.blocks) {
          expect(locale.labels[block.label_key ?? ''], `${language}:${block.label_key}`).toBeTruthy();
        }
      }
    }
  });

  it('says in its manifest that the grade tables come from secondary sources and what is not modelled', () => {
    const notes = pack.manifest.verification.notes ?? '';
    expect(notes).toMatch(/secondary/i);
    expect(notes).toMatch(/ACSEE/);
    expect(notes).toMatch(/best seven/i);
  });

  it('describes every CSEE grade, PSLE grade and division in both languages', () => {
    for (const locale of Object.values(pack.locales)) {
      for (const [grade] of CSEE_BANDS) expect(locale.descriptors?.[CSEE_SUBJECT]?.[grade], grade).toBeTruthy();
      for (const [grade] of PSLE_BANDS) expect(locale.descriptors?.[PSLE_SUBJECT]?.[grade], grade).toBeTruthy();
      for (const [division] of CSEE_DIVISIONS) {
        expect(locale.descriptors?.[CSEE_DIVISION]?.[division], division).toBeTruthy();
      }
    }
  });
});

describe('tz-national structure and subjects', () => {
  const { structure, learningAreas } = loadPack(PACK);
  const areas = learningAreas.learning_areas;

  it('runs Standard I to VII then Form I to IV, with the national assessments NECTA names', () => {
    expect(structure.stages.map((stage) => stage.code)).toEqual(['PRI', 'SEC']);
    expect(structure.levels.map((level) => level.code)).toEqual([
      'STD1', 'STD2', 'STD3', 'STD4', 'STD5', 'STD6', 'STD7', 'F1', 'F2', 'F3', 'F4',
    ]);
    expect(structure.levels.map((level) => level.ordinal)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const exams = Object.fromEntries(structure.levels.filter((level) => level.national_assessment).map((level) => [level.code, level.national_assessment]));
    expect(exams).toEqual({ STD4: 'SFNA', STD7: 'PSLE', F2: 'FTNA', F4: 'CSEE' });
    expect(structure.levels.find((level) => level.code === 'F4')?.next).toBeNull();
  });

  it('is a calendar-year school year in two terms', () => {
    expect(structure.calendar_template.year_kind).toBe('calendar_year');
    expect(structure.calendar_template.periods.map((period) => period.code)).toEqual(['T1', 'T2']);
  });

  it('makes the seven CSEE core subjects compulsory in every form', () => {
    const core = areas.filter((area) => area.kind === 'core' && area.levels.includes('F4')).map((area) => area.code);
    expect(core.sort()).toEqual([...CORE_SUBJECTS].sort());
    const rule = learningAreas.combination_rules?.find((candidate) => candidate.rule === 'core_all' && candidate.levels.includes('F3'));
    expect([...(rule?.of ?? [])].sort()).toEqual([...CORE_SUBJECTS].sort());
  });

  it('offers the six PSLE subjects in every standard', () => {
    const primary = areas.filter((area) => area.levels.includes('STD7')).map((area) => area.name);
    expect(primary).toEqual([
      'Kiswahili',
      'English Language',
      'Social Studies and Vocational Skills',
      'Mathematics',
      'Science and Technology',
      'Civic and Moral Education',
    ]);
  });

  it('graduates Form IV, moves Standard VII into secondary and leaves the other levels to the class council', () => {
    const { progression } = loadPack(PACK);
    const byLevel = new Map(progression.progression.flatMap((rule) => rule.levels.map((level) => [level, rule] as const)));
    expect(byLevel.get('STD7')).toMatchObject({ rule: 'stage_transition', to_stage: 'SEC' });
    expect(byLevel.get('STD3')?.rule).toBe('class_council');
    expect(byLevel.get('F3')?.rule).toBe('class_council');
    expect(progression.graduation).toEqual([{ levels: ['F4'], rule: 'graduate' }]);
  });
});

describe('tz-national assessment', () => {
  const { assessment } = loadPack(PACK);
  const csee = scaleOf(assessment, CSEE_SUBJECT);
  const division = scaleOf(assessment, CSEE_DIVISION);
  const psle = scaleOf(assessment, PSLE_SUBJECT);

  it('declares the CSEE grades A to F with points 1 to 5 and the marks of the secondary sources', () => {
    expect(csee.upper).toBe('inclusive');
    expect(csee.bands.map((band) => [band.code, band.min, band.max, band.points])).toEqual(CSEE_BANDS);
    expect(csee.verification).toMatch(/draft/i);
    expect(csee.verification).toMatch(/secondary/i);
  });

  it('assigns exactly one CSEE grade to every whole mark from 0 to 100 and changes grade at each boundary', () => {
    for (let mark = 0; mark <= 100; mark += 1) {
      expect(bandsAt(csee, exactOf(String(mark))), `${mark}`).toHaveLength(1);
    }
    for (const [grade, lowest] of CSEE_BANDS) {
      expect(bandsAt(csee, exactOf(String(lowest)))[0]?.code, `at ${lowest}`).toBe(grade);
      if (lowest > 0) expect(bandsAt(csee, exactOf(String(lowest - 1)))[0]?.code, `at ${lowest - 1}`).not.toBe(grade);
    }
  });

  it('declares the PSLE paper grades A to E as percents that are the NECTA marks out of 50', () => {
    expect(psle.upper).toBe('inclusive');
    expect(psle.bands.map((band) => [band.code, band.min, band.max])).toEqual(PSLE_BANDS);
    for (let percent = 0; percent <= 100; percent += 1) expect(bandsAt(psle, exactOf(String(percent))), `${percent}`).toHaveLength(1);
    const marksOutOf50: readonly (readonly [string, number])[] = [['A', 41], ['B', 31], ['C', 21], ['D', 11], ['E', 0]];
    for (const [grade, lowestMark] of marksOutOf50) {
      expect(bandsAt(psle, exactOf(String(lowestMark * 2)))[0]?.code, `${lowestMark} of 50`).toBe(grade);
      if (lowestMark > 0) expect(bandsAt(psle, exactOf(String((lowestMark - 1) * 2)))[0]?.code, `${lowestMark - 1} of 50`).not.toBe(grade);
    }
  });

  it('declares the five divisions over the total points of seven subjects, from 7 to 35', () => {
    expect(division.input).toBe('total_points');
    expect(division.bands.map((band) => [band.code, band.min, band.max])).toEqual(CSEE_DIVISIONS);
    for (let total = 7; total <= 35; total += 1) expect(bandsAt(division, exactOf(String(total))), `${total}`).toHaveLength(1);
  });

  it('computes the division from the seven core subjects only and says so', () => {
    const aggregation = assessment.aggregations.find((candidate: Aggregation) => candidate.code === 'csee_division');
    expect(aggregation).toMatchObject({ op: 'sum_points', value: 'points', result_scale: CSEE_DIVISION });
    expect([...(aggregation?.over ?? [])].sort()).toEqual([...CORE_SUBJECTS].sort());
  });

  it('grades a Standard learner on a term paper of 50 marks and a Form learner on 100', () => {
    expect(assessment.schemes.map((scheme) => [scheme.code, scheme.slots.map((slot) => [slot.code, slot.scale_to]), scheme.grading_scale])).toEqual([
      ['tz-primary-term', [['EXAM', 50]], PSLE_SUBJECT],
      ['tz-secondary-term', [['EXAM', 100]], CSEE_SUBJECT],
    ]);
  });

  it('totals, averages and ranks the term and averages the two terms of the year', () => {
    expect(assessment.aggregations.map((aggregation) => aggregation.code)).toEqual(
      expect.arrayContaining(['term_total', 'term_average'])
    );
    expect(assessment.ranking).toMatchObject({ enabled: true, by: 'term_average' });
    expect(assessment.annual).toEqual(expect.objectContaining({ op: 'mean', of: ['T1', 'T2'] }));
  });
});

describe('tz-national terminal reports', () => {
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

describe('tz-national conformance vectors', () => {
  const { tests } = loadPack(PACK);

  it('ships vectors for every grade boundary, every division boundary and the progression rules', () => {
    for (const vector of tests.vectors) expect(vector.programme, vector.name).toBe(PACK);
    const expected = tests.vectors.flatMap((vector) => Object.keys(vector.expect));
    expect(expected).toEqual(expect.arrayContaining(['tz-primary-term', 'tz-secondary-term', 'csee_division', 'term_total', 'term_average', 'progression']));
    const grades = tests.vectors.map((vector) => (vector.expect['tz-secondary-term'] as { grade?: string } | undefined)?.grade);
    for (const [grade] of CSEE_BANDS) expect(grades, grade).toContain(grade);
    const divisions = tests.vectors.map((vector) => (vector.expect['csee_division'] as { division?: string } | undefined)?.division);
    for (const [name] of CSEE_DIVISIONS) expect(divisions, name).toContain(name);
    const primary = tests.vectors.map((vector) => (vector.expect['tz-primary-term'] as { grade?: string } | undefined)?.grade);
    for (const [grade] of PSLE_BANDS) expect(primary, grade).toContain(grade);
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
    expect(readJson<{ vectors: unknown[] }>(PACK, 'tests', 'tz-national.vectors.json').vectors).toHaveLength(tests.vectors.length);
  });
});
