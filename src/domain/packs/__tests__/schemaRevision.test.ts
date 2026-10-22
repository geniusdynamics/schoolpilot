// ABOUTME: Pins the P2-A01a pack-schema revision: one positive and one negative case per gap, plus
// ABOUTME: the loader projection, so a field the schema accepts but the loader drops fails here.

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import Ajv2020 from 'ajv/dist/2020';
import { describe, expect, it } from 'vitest';

import { loadPack } from '../../curriculum/registry/load';
import { checkPackSemantics } from './packSemantics';

const SCHEMA_DIR = resolve(process.cwd(), 'packs', 'schema');
const BASE = 'https://schemas.schoolpilot.app/curriculum-pack/v1/';
const PACK = `${BASE}pack.schema.json`;

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
for (const file of readdirSync(SCHEMA_DIR).filter((name) => name.endsWith('.json'))) {
  ajv.addSchema(JSON.parse(readFileSync(resolve(SCHEMA_DIR, file), 'utf8')) as object);
}

type Json = Record<string, unknown>;

function validate(document: unknown): { valid: boolean; errors: string[] } {
  const validator = ajv.getSchema(PACK);
  if (!validator) throw new Error('pack schema is not registered');
  const valid = validator(document) === true;
  const errors = (validator.errors ?? []).map(
    (error) => `${error.instancePath || '(root)'} ${error.keyword}: ${error.message ?? ''}`
  );
  return { valid, errors };
}

function expectValid(document: unknown): void {
  const result = validate(document);
  expect(result.valid, result.errors.join('; ')).toBe(true);
}

function expectSchemaError(document: unknown, keyword: string): void {
  const result = validate(document);
  expect(result.valid, 'the pack must be refused').toBe(false);
  expect(result.errors.join('; '), keyword).toContain(keyword);
}

function child(parent: Json, ...keys: string[]): Json {
  let node = parent;
  for (const key of keys) {
    const next = node[key];
    if (typeof next !== 'object' || next === null || Array.isArray(next)) {
      throw new Error(`the fixture has no object at ${keys.join('.')}`);
    }
    node = next as Json;
  }
  return node;
}

function list(parent: Json, key: string): Json[] {
  const value = parent[key];
  if (!Array.isArray(value)) throw new Error(`the fixture has no array at ${key}`);
  return value as Json[];
}

function scheme(pack: Json, code: string): Json {
  const found = list(child(pack, 'assessment'), 'schemes').find((entry) => entry.code === code);
  if (!found) throw new Error(`the fixture declares no scheme ${code}`);
  return found;
}

function area(pack: Json, code: string): Json {
  const found = list(child(pack, 'learning_areas'), 'learning_areas').find((entry) => entry.code === code);
  if (!found) throw new Error(`the fixture declares no learning area ${code}`);
  return found;
}

function period(code: string, sequence: number): Json {
  return {
    code,
    kind: 'term',
    sequence,
    name: `Term ${sequence}`,
    typical: ['09-01', '12-19'],
    half_term: true,
  };
}

/**
 * A two-key-stage British-shaped pack: A*-G grade codes, two paper sets under the same codes at
 * different levels, a weighted policy and declarative calendar variants. Every case below mutates
 * this document, so a failure names the one field that changed.
 */
function basePack(): Json {
  return {
    pack: {
      code: 'xx-revision',
      name: 'Revision fixture',
      version: '1.0.0',
      country: 'ZZ',
      issuers: ['Fixture Board'],
      effective_from: '2026-01-01',
      languages: ['en'],
      requires_engine: '>=1.0.0',
      sources: [
        {
          title: 'Fixture framework',
          issuer: 'Fixture Board',
          url: 'https://example.org/framework',
          retrieved: '2026-01-01',
        },
      ],
      verification: { status: 'draft', verified_by: [] },
    },
    structure: {
      stages: [
        { code: 'KS4', name: 'Key Stage 4', levels: ['Y10', 'Y11'] },
        { code: 'KS5', name: 'Key Stage 5', levels: ['Y12', 'Y13'] },
      ],
      levels: [
        {
          code: 'Y10',
          name: 'Year 10',
          ordinal: 10,
          next: 'Y11',
          is_stage_exit: false,
          national_assessment: null,
        },
        {
          code: 'Y11',
          name: 'Year 11',
          ordinal: 11,
          next: 'Y12',
          is_stage_exit: true,
          national_assessment: 'GCSE',
        },
        {
          code: 'Y12',
          name: 'Year 12',
          ordinal: 12,
          next: 'Y13',
          is_stage_exit: false,
          national_assessment: null,
        },
        {
          code: 'Y13',
          name: 'Year 13',
          ordinal: 13,
          next: null,
          is_stage_exit: true,
          national_assessment: 'A_LEVEL',
        },
      ],
      calendar_template: {
        year_kind: 'academic_year',
        periods: [period('T1', 1), period('T2', 2)],
      },
    },
    learning_areas: {
      learning_areas: [
        {
          code: 'MAT',
          name: 'Mathematics',
          kind: 'core',
          group: 'mathematics',
          levels: ['Y10', 'Y11', 'Y12', 'Y13'],
          national_code: null,
          components: [
            { code: 'P1', name: 'GCSE Paper 1', kind: 'paper', levels: ['Y10', 'Y11'], max_score: 100 },
            { code: 'P2', name: 'GCSE Paper 2', kind: 'paper', levels: ['Y10', 'Y11'], max_score: 100 },
            { code: 'P1', name: 'A Level Paper 1', kind: 'paper', levels: ['Y12', 'Y13'], max_score: 100 },
          ],
          grade_scales: [{ levels: ['Y10', 'Y11'], scale: 'xx_grades' }],
        },
        {
          code: 'HIS',
          name: 'History',
          kind: 'elective',
          group: 'humanities',
          levels: ['Y10', 'Y11'],
          national_code: null,
          components: [],
        },
        {
          code: 'ENG',
          name: 'English',
          kind: 'core',
          group: 'languages',
          levels: ['Y10', 'Y11'],
          national_code: null,
          components: [],
        },
      ],
      competencies: [],
    },
    assessment: {
      schemes: [
        {
          code: 'xx-terminal',
          levels: ['Y10', 'Y11'],
          slots: [{ code: 'EXAM', label: 'Examination', kind: 'end_term', max: 100 }],
          learning_area_score: { op: 'sum', of: ['EXAM'], out_of: 100 },
          component_policy: {
            papers: 'weighted',
            out_of: 100,
            weights: { MAT: { P1: 0.5, P2: 0.5 } },
          },
          grading_scale: 'xx_grades',
          rounding: [{ stage: 'learning_area_score', precision: 0, mode: 'half_up' }],
        },
      ],
      grading_scales: [
        {
          code: 'xx_grades',
          kind: 'letter',
          input: 'percent',
          upper: 'inclusive',
          bands: [
            { code: 'A*', label: 'A*', min: 90, max: 100 },
            { code: 'A', label: 'A', min: 80, max: 89 },
            { code: 'B', label: 'B', min: 0, max: 79 },
          ],
        },
      ],
      ranking: { enabled: false },
    },
    progression: {
      progression: [{ levels: ['Y10', 'Y11', 'Y12'], rule: 'automatic' }],
      graduation: [{ levels: ['Y13'], rule: 'graduate' }],
    },
    reports: [
      {
        code: 'term',
        name: 'Term report',
        levels: ['Y10', 'Y11'],
        blocks: [{ type: 'header' }, { type: 'results_table', columns: ['total', 'grade'] }],
      },
    ],
    locales: { en: { labels: { 'report.title': 'Report' } } },
    tests: {
      vectors: [
        {
          name: 'A* lookup',
          programme: 'xx-revision',
          input: { MAT: 'A*' },
          expect: { xx_grades: { grade: 'A*' } },
        },
      ],
    },
  };
}

describe('the revision fixture', () => {
  it('is valid and loads, so every case below isolates one change', () => {
    expectValid(basePack());
    expect(checkPackSemantics(basePack())).toEqual([]);
    expect(loadPack(basePack()).ok).toBe(true);
  });
});

describe('gap 1: grade symbols are the printed codes', () => {
  it('accepts A*, A- and B+ as band codes and keeps them through the loader', () => {
    const pack = basePack();
    const bands = list(list(child(pack, 'assessment'), 'grading_scales')[0] as Json, 'bands');
    (bands[1] as Json).code = 'A-';
    (bands[2] as Json).code = 'B+';
    expectValid(pack);
    const result = loadPack(pack);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pack.assessment.gradingScales[0].bands.map((band) => band.code)).toEqual([
      'A*',
      'A-',
      'B+',
    ]);
  });

  it('still refuses a code with a space or punctuation only', () => {
    for (const code of ['A B', '*', '-']) {
      const pack = basePack();
      const bands = list(list(child(pack, 'assessment'), 'grading_scales')[0] as Json, 'bands');
      (bands[0] as Json).code = code;
      expectSchemaError(pack, 'pattern');
    }
  });
});

describe('gap 2: components are scoped by level', () => {
  it('accepts two P1 components whose level sets do not overlap', () => {
    const pack = basePack();
    expectValid(pack);
    expect(checkPackSemantics(pack)).toEqual([]);
    const result = loadPack(pack);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const components = result.pack.learningAreas.find((entry) => entry.code === 'MAT')?.components ?? [];
    expect(components.filter((component) => component.code === 'P1').map((component) => component.levels)).toEqual([
      ['Y10', 'Y11'],
      ['Y12', 'Y13'],
    ]);
  });

  it('refuses two components with the same code and overlapping levels', () => {
    const pack = basePack();
    list(area(pack, 'MAT'), 'components')[2] = {
      code: 'P1',
      name: 'A Level Paper 1',
      kind: 'paper',
      levels: ['Y11', 'Y12'],
      max_score: 100,
    };
    expectValid(pack);
    expect(checkPackSemantics(pack).map((issue) => issue.path)).toContain(
      'learning_areas.learning_areas[MAT].components'
    );
  });
});

describe('gap 3: component_policy declares its own weights', () => {
  it('accepts per-area weights and projects them', () => {
    const pack = basePack();
    expectValid(pack);
    const result = loadPack(pack);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const marks = result.pack.assessment.schemes[0];
    if (marks.kind !== 'marks') throw new Error('the fixture scheme is a marks scheme');
    expect(marks.component_policy?.weights).toEqual({ MAT: { P1: 0.5, P2: 0.5 } });
  });

  it('lets a component weight stand in when the policy names no entry, and refuses a missing one', () => {
    const fallback = basePack();
    delete (scheme(fallback, 'xx-terminal').component_policy as Json).weights;
    for (const component of list(area(fallback, 'MAT'), 'components')) {
      const levels = component.levels as unknown[];
      if (!levels.includes('Y10')) continue;
      (component as Json).weight = 0.5;
    }
    expectValid(fallback);
    expect(checkPackSemantics(fallback)).toEqual([]);

    const missing = basePack();
    delete (scheme(missing, 'xx-terminal').component_policy as Json).weights;
    expectValid(missing);
    expect(checkPackSemantics(missing).map((issue) => issue.path)).toContain(
      'learning_areas.learning_areas[MAT].components'
    );
  });

  it('refuses a weight for an area or component that does not exist, and a sum that is not 1', () => {
    const unknownArea = basePack();
    (scheme(unknownArea, 'xx-terminal').component_policy as Json).weights = { NOPE: { P1: 1 } };
    expectValid(unknownArea);
    expect(checkPackSemantics(unknownArea).map((issue) => issue.path)).toContain(
      'assessment.schemes[xx-terminal].component_policy.weights'
    );

    const unknownComponent = basePack();
    (scheme(unknownComponent, 'xx-terminal').component_policy as Json).weights = { MAT: { P1: 0.5, P9: 0.5 } };
    expectValid(unknownComponent);
    expect(checkPackSemantics(unknownComponent).map((issue) => issue.path)).toContain(
      'assessment.schemes[xx-terminal].component_policy.weights[MAT]'
    );

    const badSum = basePack();
    (scheme(badSum, 'xx-terminal').component_policy as Json).weights = { MAT: { P1: 0.4, P2: 0.4 } };
    expectValid(badSum);
    expect(checkPackSemantics(badSum).map((issue) => issue.path)).toContain(
      'assessment.schemes[xx-terminal].component_policy.weights[MAT]'
    );

    const wrongType = basePack();
    (scheme(wrongType, 'xx-terminal').component_policy as Json).weights = { MAT: 1 };
    expectSchemaError(wrongType, 'type');
  });
});

describe('gap 4: summative slots are optional for an observational scheme', () => {
  it('accepts a formative scheme with no marks-based slot and projects an empty list', () => {
    const pack = basePack();
    list(child(pack, 'assessment'), 'schemes').push({
      code: 'xx-primary',
      levels: ['Y10', 'Y11'],
      evidence: 'rubric_observations',
      observation_scale: 'xx_grades',
      term_judgement: { op: 'teacher_best_fit', suggest: 'mode_of_latest_per_outcome' },
      report_shows: ['rubric_level', 'descriptor', 'teacher_comment'],
    });
    expectValid(pack);
    expect(checkPackSemantics(pack)).toEqual([]);
    const result = loadPack(pack);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const formative = result.pack.assessment.schemes.find((entry) => entry.code === 'xx-primary');
    expect(formative?.kind).toBe('formative');
    if (formative?.kind !== 'formative') return;
    expect(formative.summative_slots).toEqual([]);
  });

  it('still refuses an empty slots list when the key is present', () => {
    const pack = basePack();
    list(child(pack, 'assessment'), 'schemes').push({
      code: 'xx-primary',
      levels: ['Y10', 'Y11'],
      evidence: 'rubric_observations',
      observation_scale: 'xx_grades',
      term_judgement: { op: 'teacher_best_fit' },
      summative_slots: [],
      report_shows: ['rubric_level'],
    });
    expectSchemaError(pack, 'minItems');
  });
});

describe('gap 5: the calendar declares variants with a default', () => {
  it('accepts northern and southern variants and projects the default', () => {
    const pack = basePack();
    const southern = {
      code: 'southern',
      name: 'Southern academic year',
      year_kind: 'academic_year',
      periods: [period('T1', 1), period('T2', 2)],
    };
    child(pack, 'structure').calendar_template = {
      default: 'northern',
      variants: [
        {
          code: 'northern',
          name: 'Northern academic year',
          year_kind: 'academic_year',
          periods: [period('T1', 1), period('T2', 2)],
        },
        southern,
      ],
    };
    expectValid(pack);
    expect(checkPackSemantics(pack)).toEqual([]);
    const result = loadPack(pack);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pack.structure.calendar.code).toBe('northern');
    expect(result.pack.structure.calendars.map((calendar) => calendar.code)).toEqual([
      'northern',
      'southern',
    ]);
  });

  it('refuses a default that names no variant and a variant with different period keys', () => {
    const unknownDefault = basePack();
    child(unknownDefault, 'structure').calendar_template = {
      default: 'equatorial',
      variants: [
        { code: 'northern', year_kind: 'academic_year', periods: [period('T1', 1)] },
        { code: 'southern', year_kind: 'academic_year', periods: [period('T1', 1)] },
      ],
    };
    expectValid(unknownDefault);
    expect(checkPackSemantics(unknownDefault).map((issue) => issue.path)).toContain(
      'structure.calendar_template.default'
    );

    const mismatched = basePack();
    child(mismatched, 'structure').calendar_template = {
      default: 'northern',
      variants: [
        { code: 'northern', year_kind: 'academic_year', periods: [period('T1', 1), period('T2', 2)] },
        { code: 'southern', year_kind: 'academic_year', periods: [period('T1', 1), period('T3', 3)] },
      ],
    };
    expectValid(mismatched);
    expect(checkPackSemantics(mismatched).map((issue) => issue.path)).toContain(
      'structure.calendar_template.variants[southern].periods'
    );
  });
});

describe('gap 6: combination rules express a group minimum and a maximum', () => {
  it('accepts a group rule with min and max, and an electives rule with a maximum', () => {
    const pack = basePack();
    child(pack, 'learning_areas').combination_rules = [
      { levels: ['Y10', 'Y11'], rule: 'core_all', of: ['MAT', 'ENG'] },
      { levels: ['Y10', 'Y11'], rule: 'group', group: 'humanities', min: 1, max: 2 },
      { levels: ['Y10', 'Y11'], rule: 'electives', count: 1, max: 2 },
    ];
    expectValid(pack);
    expect(checkPackSemantics(pack)).toEqual([]);
    const result = loadPack(pack);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pack.combinationRules.map((rule) => rule.rule)).toEqual([
      'core_all',
      'group',
      'electives',
    ]);
    expect(result.pack.combinationRules[1]).toMatchObject({ group: 'humanities', min: 1, max: 2 });
  });

  it('refuses a group minimum the declared learning areas cannot meet', () => {
    const pack = basePack();
    child(pack, 'learning_areas').combination_rules = [
      { levels: ['Y10', 'Y11'], rule: 'group', group: 'humanities', min: 3 },
    ];
    expectValid(pack);
    expect(checkPackSemantics(pack).map((issue) => issue.path)).toContain(
      'learning_areas.combination_rules[group].min'
    );
  });

  it('refuses a maximum below the required count, and a group rule without min', () => {
    const contradictory = basePack();
    child(contradictory, 'learning_areas').combination_rules = [
      { levels: ['Y10', 'Y11'], rule: 'electives', count: 4, max: 2 },
    ];
    expectValid(contradictory);
    expect(checkPackSemantics(contradictory).map((issue) => issue.path)).toContain(
      'learning_areas.combination_rules[electives].max'
    );

    const incomplete = basePack();
    child(incomplete, 'learning_areas').combination_rules = [
      { levels: ['Y10', 'Y11'], rule: 'group', group: 'humanities' },
    ];
    expectSchemaError(incomplete, 'required');
  });
});

describe('gap 7: aggregations carry multipliers and a declared divisor', () => {
  it('expresses Attainment 8: best eight, English and mathematics doubled, divided by ten', () => {
    const pack = basePack();
    child(pack, 'assessment').aggregations = [
      {
        code: 'attainment_8',
        op: 'best_n',
        n: 3,
        value: 'grade_points',
        over: ['MAT', 'ENG', 'HIS'],
        groups: [{ fill_from: 'any' }],
        multipliers: { MAT: 2, ENG: 2 },
        divisor: 10,
        precision: 2,
      },
    ];
    expectValid(pack);
    expect(checkPackSemantics(pack)).toEqual([]);
    const result = loadPack(pack);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pack.assessment.aggregations[0]).toMatchObject({
      multipliers: { MAT: 2, ENG: 2 },
      divisor: 10,
    });
  });

  it('refuses multipliers without a divisor, for an unknown area, or on a distribution', () => {
    const noDivisor = basePack();
    child(noDivisor, 'assessment').aggregations = [
      { code: 'doubled', op: 'mean', multipliers: { MAT: 2 } },
    ];
    expectSchemaError(noDivisor, 'required');

    const unknownArea = basePack();
    child(unknownArea, 'assessment').aggregations = [
      { code: 'doubled', op: 'mean', multipliers: { NOPE: 2 }, divisor: 'sum_of_multipliers' },
    ];
    expectValid(unknownArea);
    expect(checkPackSemantics(unknownArea).map((issue) => issue.path)).toContain(
      'assessment.aggregations[doubled].multipliers'
    );

    const distribution = basePack();
    child(distribution, 'assessment').aggregations = [
      { code: 'profile', op: 'count_where', multipliers: { MAT: 2 }, divisor: 10 },
    ];
    expectSchemaError(distribution, 'not');
  });
});

describe('gap 8: a learning area says which grade set it uses at each level', () => {
  it('accepts a per-level scale choice and projects it', () => {
    const pack = basePack();
    expectValid(pack);
    const result = loadPack(pack);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pack.learningAreas.find((entry) => entry.code === 'MAT')?.grade_scales).toEqual([
      { levels: ['Y10', 'Y11'], scale: 'xx_grades' },
    ]);
  });

  it('refuses two scales for one level and a scale that is not declared', () => {
    const conflict = basePack();
    area(conflict, 'MAT').grade_scales = [
      { levels: ['Y10'], scale: 'xx_grades' },
      { levels: ['Y10'], scale: 'xx_other' },
    ];
    // Declaring the second scale keeps the failure about the level conflict, not a dangling ref.
    list(child(conflict, 'assessment'), 'grading_scales').push({
      code: 'xx_other',
      kind: 'letter',
      upper: 'inclusive',
      bands: [{ code: 'A', label: 'A', min: 0, max: 100 }],
    });
    expectValid(conflict);
    expect(checkPackSemantics(conflict).map((issue) => issue.path)).toContain(
      'learning_areas.learning_areas[MAT].grade_scales'
    );

    const dangling = basePack();
    area(dangling, 'MAT').grade_scales = [{ levels: ['Y10'], scale: 'missing_scale' }];
    expectValid(dangling);
    expect(checkPackSemantics(dangling).map((issue) => issue.path)).toContain(
      'learning_areas.learning_areas[MAT].grade_scales'
    );
  });
});

describe('gap 9: vector inputs may be structured', () => {
  it('accepts nested objects and arrays and keeps them through the loader', () => {
    const pack = basePack();
    list(child(pack, 'tests'), 'vectors')[0].input = {
      MAT: {
        papers: [
          { code: 'P1', score: 72, max: 80 },
          { code: 'P2', score: 56, max: 80 },
        ],
      },
      ENG: 'A*',
      absent: null,
    };
    expectValid(pack);
    const result = loadPack(pack);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pack.vectors[0].input).toEqual({
      MAT: {
        papers: [
          { code: 'P1', score: 72, max: 80 },
          { code: 'P2', score: 56, max: 80 },
        ],
      },
      ENG: 'A*',
      absent: null,
    });
  });

  it('keeps the flat form valid and still refuses an input that is not an object', () => {
    expectValid(basePack());
    const arrayInput = basePack();
    child(arrayInput, 'tests').vectors = [{ name: 'bad', input: ['MAT'], expect: { xx_grades: { grade: 'A' } } }];
    expectSchemaError(arrayInput, 'type');
  });
});

describe('gap 10: a pack claims reviewed only with a named reviewer', () => {
  it('accepts draft and reviewed, and refuses reviewed without a reviewer', () => {
    expectValid(basePack());

    const reviewed = basePack();
    child(reviewed, 'pack').verification = { status: 'reviewed', verified_by: ['A Reviewer'] };
    expectValid(reviewed);
    const result = loadPack(reviewed);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.pack.verification.status).toBe('reviewed');

    const unreviewed = basePack();
    child(unreviewed, 'pack').verification = { status: 'reviewed', verified_by: [] };
    expectSchemaError(unreviewed, 'minItems');
    expect(loadPack(unreviewed).ok).toBe(false);
  });

  it('refuses a status outside draft, reviewed and verified', () => {
    const pack = basePack();
    child(pack, 'pack').verification = { status: 'approved', verified_by: ['A Reviewer'] };
    expectSchemaError(pack, 'enum');
  });
});

describe('gap 11: rounding uses the engine vocabulary', () => {
  it('accepts up, down, half_up, half_down and half_even', () => {
    const pack = basePack();
    scheme(pack, 'xx-terminal').rounding = [
      { stage: 'slot', precision: 1, mode: 'down' },
      { stage: 'learning_area_score', precision: 0, mode: 'up' },
    ];
    expectValid(pack);
    expect(checkPackSemantics(pack)).toEqual([]);
    const result = loadPack(pack);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const marks = result.pack.assessment.schemes[0];
    if (marks.kind !== 'marks') throw new Error('a marks scheme');
    expect(marks.rounding.map((rule) => rule.mode)).toEqual(['down', 'up']);
  });

  it('refuses the superseded floor, ceil and truncate spelling', () => {
    for (const mode of ['floor', 'ceil', 'truncate']) {
      const pack = basePack();
      scheme(pack, 'xx-terminal').rounding = [{ stage: 'learning_area_score', precision: 0, mode }];
      expectSchemaError(pack, 'enum');
    }
  });
});

describe('gap 12: mark_out_of_20 is canonical and out_of_20 is its alias', () => {
  it('accepts both spellings and projects the canonical kind', () => {
    const canonical = basePack();
    list(child(canonical, 'assessment'), 'grading_scales')[0].kind = 'mark_out_of_20';
    expectValid(canonical);
    const loaded = loadPack(canonical);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) expect(loaded.pack.assessment.gradingScales[0].kind).toBe('mark_out_of_20');

    const alias = basePack();
    list(child(alias, 'assessment'), 'grading_scales')[0].kind = 'out_of_20';
    expectValid(alias);
    const aliased = loadPack(alias);
    expect(aliased.ok).toBe(true);
    if (aliased.ok) expect(aliased.pack.assessment.gradingScales[0].kind).toBe('mark_out_of_20');
  });

  it('keeps descriptor as a pack-only reporting kind and refuses an unknown kind', () => {
    const descriptor = basePack();
    list(child(descriptor, 'assessment'), 'grading_scales')[0].kind = 'descriptor';
    expectValid(descriptor);

    const unknown = basePack();
    list(child(unknown, 'assessment'), 'grading_scales')[0].kind = 'percentage';
    expectSchemaError(unknown, 'enum');
  });
});

describe('gap 13: outcomes_ref is defined, not a trap', () => {
  it('accepts a relative path inside the pack', () => {
    const pack = basePack();
    area(pack, 'MAT').outcomes_ref = 'outcomes/mat.json';
    expectValid(pack);
    const result = loadPack(pack);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pack.learningAreas.find((entry) => entry.code === 'MAT')?.outcomes_ref).toBe(
        'outcomes/mat.json'
      );
    }
  });

  it('refuses a path that escapes the pack root or is not JSON', () => {
    for (const path of ['../outside.json', '/etc/passwd.json', 'outcomes/mat.txt']) {
      const pack = basePack();
      area(pack, 'MAT').outcomes_ref = path;
      expectSchemaError(pack, 'pattern');
    }
  });
});

describe('the aggregation and credit fields the engine reads', () => {
  it('accepts an aggregation rounding mode and projects it', () => {
    const pack = basePack();
    child(pack, 'assessment').aggregations = [
      { code: 'mean_score', op: 'mean', precision: 2, mode: 'down' },
    ];
    expectValid(pack);
    expect(checkPackSemantics(pack)).toEqual([]);
    const result = loadPack(pack);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pack.assessment.aggregations[0].mode).toBe('down');
  });

  it('refuses a rounding mode outside the shared vocabulary', () => {
    const pack = basePack();
    child(pack, 'assessment').aggregations = [{ code: 'mean_score', op: 'mean', mode: 'floor' }];
    expectSchemaError(pack, 'enum');
  });

  it('accepts a count_where predicate and projects it', () => {
    const pack = basePack();
    child(pack, 'assessment').aggregations = [
      {
        code: 'merit_count',
        op: 'count_where',
        value: 'grade',
        where: { op: 'in', values: ['A*', 'A'] },
      },
    ];
    expectValid(pack);
    expect(checkPackSemantics(pack)).toEqual([]);
    const result = loadPack(pack);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pack.assessment.aggregations[0].where).toEqual({ op: 'in', values: ['A*', 'A'] });
  });

  it('requires where on count_where and refuses it on every other operator', () => {
    const missing = basePack();
    child(missing, 'assessment').aggregations = [
      { code: 'merit_count', op: 'count_where', value: 'grade' },
    ];
    expectSchemaError(missing, 'required');

    const misplaced = basePack();
    child(misplaced, 'assessment').aggregations = [
      { code: 'mean_score', op: 'mean', where: { op: 'eq', value: 'A' } },
    ];
    expectSchemaError(misplaced, 'not');
  });

  it('requires value for eq and values for in', () => {
    const eq = basePack();
    child(eq, 'assessment').aggregations = [
      { code: 'merit_count', op: 'count_where', value: 'grade', where: { op: 'eq' } },
    ];
    expectSchemaError(eq, 'required');

    const list = basePack();
    child(list, 'assessment').aggregations = [
      { code: 'merit_count', op: 'count_where', value: 'grade', where: { op: 'in' } },
    ];
    expectSchemaError(list, 'required');
  });

  it('refuses a relational predicate against a grade code, which has no declared order', () => {
    const pack = basePack();
    child(pack, 'assessment').aggregations = [
      { code: 'merit_count', op: 'count_where', value: 'grade', where: { op: 'gte', value: 'A' } },
    ];
    expectValid(pack);
    expect(checkPackSemantics(pack).map((issue) => issue.path)).toContain(
      'assessment.aggregations[merit_count].where.op'
    );
  });

  it('accepts a citation on a fail_if rule and projects it', () => {
    const pack = basePack();
    child(pack, 'assessment').aggregations = [
      {
        code: 'mean_score',
        op: 'mean',
        fail_if: {
          any_grade: 'B',
          in: ['MAT'],
          then_max_division: 'IV',
          source: 'KNEC KCSE Regulations 2024, regulation 4.5.2',
        },
      },
    ];
    expectValid(pack);
    expect(checkPackSemantics(pack)).toEqual([]);
    const result = loadPack(pack);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pack.assessment.aggregations[0].fail_if?.source).toBe(
      'KNEC KCSE Regulations 2024, regulation 4.5.2'
    );
  });

  it('refuses a blank citation', () => {
    const pack = basePack();
    child(pack, 'assessment').aggregations = [
      {
        code: 'mean_score',
        op: 'mean',
        fail_if: { any_grade: 'B', then_max_division: 'IV', source: '   ' },
      },
    ];
    expectSchemaError(pack, 'pattern');
  });

  it('accepts a positive learning-area credit for a credit-weighted gpa and projects it', () => {
    const pack = basePack();
    area(pack, 'MAT').credit = 3;
    expectValid(pack);
    expect(checkPackSemantics(pack)).toEqual([]);
    const result = loadPack(pack);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pack.learningAreas.find((entry) => entry.code === 'MAT')?.credit).toBe(3);
  });

  it('refuses a zero or negative credit', () => {
    for (const credit of [0, -1]) {
      const pack = basePack();
      area(pack, 'MAT').credit = credit;
      expectSchemaError(pack, 'exclusiveMinimum');
    }
  });

  it('keeps both divisor spellings: a number and sum_of_multipliers', () => {
    const pack = basePack();
    child(pack, 'assessment').aggregations = [
      {
        code: 'doubled_mean',
        op: 'mean',
        multipliers: { MAT: 2 },
        divisor: 'sum_of_multipliers',
      },
    ];
    expectValid(pack);
    expect(checkPackSemantics(pack)).toEqual([]);
    const result = loadPack(pack);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pack.assessment.aggregations[0]).toMatchObject({
      multipliers: { MAT: 2 },
      divisor: 'sum_of_multipliers',
    });
  });
});

describe('negative controls that must stay refused', () => {
  it('refuses non-contiguous bands, a lower bound above the upper, and overlapping bands', () => {
    const gap = basePack();
    list(list(child(gap, 'assessment'), 'grading_scales')[0] as Json, 'bands').splice(1, 1);
    // B 0-79 and A* 90-100 leave 80-89 ungraded.
    expectValid(gap);
    expect(checkPackSemantics(gap).map((issue) => issue.path)).toContain(
      'assessment.grading_scales[xx_grades].bands'
    );

    const inverted = basePack();
    const invertedBands = list(list(child(inverted, 'assessment'), 'grading_scales')[0] as Json, 'bands');
    (invertedBands[2] as Json).min = 85;
    expectValid(inverted);
    expect(checkPackSemantics(inverted).map((issue) => issue.path)).toContain(
      'assessment.grading_scales[xx_grades].bands[B]'
    );

    const overlap = basePack();
    const overlapBands = list(list(child(overlap, 'assessment'), 'grading_scales')[0] as Json, 'bands');
    (overlapBands[1] as Json).max = 95;
    expectValid(overlap);
    expect(checkPackSemantics(overlap).map((issue) => issue.path)).toContain(
      'assessment.grading_scales[xx_grades].bands'
    );
  });

  it('refuses a dangling level reference and a vector for another programme', () => {
    const level = basePack();
    list(child(level, 'structure'), 'levels')[0].next = 'Y99';
    expectValid(level);
    expect(checkPackSemantics(level).map((issue) => issue.path)).toContain('structure.levels[Y10].next');

    const programme = basePack();
    list(child(programme, 'tests'), 'vectors')[0].programme = 'ke-844';
    expectValid(programme);
    expect(checkPackSemantics(programme).map((issue) => issue.path)).toContain(
      'tests.vectors[A* lookup].programme'
    );
  });
});
