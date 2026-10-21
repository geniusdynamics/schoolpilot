// ABOUTME: Validates the Curriculum Pack JSON Schemas against every example in spec 03, a documented
// ABOUTME: example pack, a minimal pack and packs that must be refused by the schema or the runtime checks.

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import Ajv2020 from 'ajv/dist/2020';
import { describe, expect, it } from 'vitest';

import { checkPackSemantics } from './packSemantics';
import { spec03Examples } from './spec03Examples';

// vitest runs with the repository root as cwd (see vitest.config.ts); the schemas are not part of
// the Vite module graph, so they are read from disk rather than imported.
const SCHEMA_DIR = resolve(process.cwd(), 'packs', 'schema');
const BASE = 'https://schemas.schoolpilot.app/curriculum-pack/v1/';

const SCHEMA_ID = {
  pack: `${BASE}pack.schema.json`,
  manifest: `${BASE}manifest.schema.json`,
  structure: `${BASE}structure.schema.json`,
  learningAreas: `${BASE}learning-areas.schema.json`,
  assessment: `${BASE}assessment.schema.json`,
  progression: `${BASE}progression.schema.json`,
  report: `${BASE}report.schema.json`,
  locale: `${BASE}locale.schema.json`,
  tests: `${BASE}tests.schema.json`,
} as const;

interface SchemaError {
  readonly keyword: string;
  readonly path: string;
  readonly message: string;
}

interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly SchemaError[];
}

type Shape = Record<string, unknown>;

function readJson(path: string): Shape {
  return JSON.parse(readFileSync(path, 'utf8')) as Shape;
}

// strictRequired is off because required properties inside `then` branches legitimately refer to
// the parent object's properties; every other strict check stays on.
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });

for (const file of readdirSync(SCHEMA_DIR).filter((name) => name.endsWith('.json'))) {
  ajv.addSchema(readJson(resolve(SCHEMA_DIR, file)));
}

function validate(schemaId: string, document: unknown): ValidationResult {
  const validator = ajv.getSchema(schemaId);
  if (!validator) throw new Error(`Schema is not registered: ${schemaId}`);
  // Ajv is configured synchronously (no async formats), so the result is a boolean at runtime; the
  // type allows a Promise for async schemas.
  const valid = validator(document) === true;
  const errors = (validator.errors ?? []).map((error) => ({
    keyword: error.keyword,
    path: error.instancePath,
    message: error.message ?? '',
  }));
  return { valid, errors };
}

function expectValid(schemaId: string, document: unknown): void {
  const result = validate(schemaId, document);
  expect(result.valid, JSON.stringify(result.errors)).toBe(true);
}

function expectSchemaError(schemaId: string, document: unknown, keyword: string): void {
  const result = validate(schemaId, document);
  expect(result.valid, JSON.stringify(result.errors)).toBe(false);
  expect(result.errors.map((error) => error.keyword), JSON.stringify(result.errors)).toContain(
    keyword,
  );
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

/** Navigates to a nested object, failing the test setup loudly if the shape is wrong. */
function child(parent: Shape, ...keys: string[]): Shape {
  let node = parent;
  for (const key of keys) {
    const next = node[key];
    if (typeof next !== 'object' || next === null || Array.isArray(next)) {
      throw new Error(`Expected an object at ${keys.join('.')}`);
    }
    node = next as Shape;
  }
  return node;
}

function list(parent: Shape, key: string): Shape[] {
  const value = parent[key];
  if (!Array.isArray(value)) throw new Error(`Expected an array at ${key}`);
  return value as Shape[];
}

describe('spec 03 examples', () => {
  it('has one fixture for every JSON block in the spec', () => {
    expect(spec03Examples).toHaveLength(11);
  });

  for (const example of spec03Examples) {
    it(`${example.spec}: ${example.title}`, () => {
      expectValid(example.schema, example.document);
    });
  }
});

describe('schema files', () => {
  const schemaFiles = readdirSync(SCHEMA_DIR).filter((name) => name.endsWith('.json'));

  it('declare draft 2020-12, a unique $id and the spec section they implement', () => {
    const ids = new Set<string>();
    for (const file of schemaFiles) {
      const schema = readJson(resolve(SCHEMA_DIR, file));
      expect(schema.$schema, file).toBe('https://json-schema.org/draft/2020-12/schema');
      expect(typeof schema.$id, file).toBe('string');
      expect(schema.$id, file).toMatch(/^https:\/\/schemas\.schoolpilot\.app\/curriculum-pack\/v1\//);
      expect(ids.has(String(schema.$id)), file).toBe(false);
      ids.add(String(schema.$id));
      expect(typeof schema.$comment, file).toBe('string');
      expect(String(schema.$comment), file).toMatch(/[Ss]pec 0[23]/);
    }
    expect(schemaFiles.length).toBe(13);
  });
});

const EXAMPLE_PACK = readJson(resolve(SCHEMA_DIR, 'examples', 'ke-cbe.pack.json'));

describe('documented example pack', () => {
  it('validates against the composed pack schema', () => {
    expectValid(SCHEMA_ID.pack, EXAMPLE_PACK);
  });

  it('passes every runtime check', () => {
    expect(checkPackSemantics(EXAMPLE_PACK)).toEqual([]);
  });
});

const MINIMAL_PACK: Shape = {
  pack: {
    code: 'xx-demo',
    name: 'Demo pack',
    version: '1.0.0',
    country: 'ZZ',
    issuers: ['Demo Board'],
    effective_from: '2026-01-01',
    languages: ['en'],
    requires_engine: '>=1.0.0',
    sources: [
      {
        title: 'Demo framework',
        issuer: 'Demo Board',
        url: 'https://example.org/framework',
        retrieved: '2026-01-01',
      },
    ],
    verification: { status: 'draft', verified_by: [] },
  },
  structure: {
    stages: [{ code: 'P', name: 'Primary', levels: ['L1'] }],
    levels: [{ code: 'L1', name: 'Level 1', ordinal: 1, next: null, national_assessment: null }],
    calendar_template: {
      year_kind: 'calendar_year',
      periods: [
        { code: 'T1', kind: 'term', sequence: 1, name: 'Term 1', typical: ['01-06', '04-04'], half_term: false },
      ],
    },
  },
  learning_areas: {
    learning_areas: [
      {
        code: 'ENG',
        name: 'English',
        kind: 'core',
        group: 'languages',
        levels: ['L1'],
        national_code: null,
        components: [],
      },
    ],
    competencies: [],
  },
  assessment: {
    schemes: [
      {
        code: 'demo',
        levels: ['L1'],
        slots: [{ code: 'EXAM', label: 'Exam', max: 100, kind: 'end_term' }],
        learning_area_score: { op: 'sum', of: ['EXAM'], out_of: 100 },
        grading_scale: 'demo_scale',
      },
    ],
    grading_scales: [
      {
        code: 'demo_scale',
        kind: 'letter',
        bands: [
          { code: 'A', label: 'A', min: 80, max: 100 },
          { code: 'B', label: 'B', min: 0, max: 79 },
        ],
      },
    ],
    ranking: { enabled: false },
    annual: { op: 'weighted_mean', of: { T1: 1 }, missing: 'renormalise' },
  },
  progression: { progression: [{ levels: ['L1'], rule: 'automatic' }] },
  reports: [
    {
      code: 'term',
      name: 'Term report',
      levels: ['L1'],
      blocks: [
        { type: 'header' },
        { type: 'results_table', columns: ['total', 'grade'] },
        { type: 'summary' },
      ],
    },
  ],
  locales: { en: { labels: { 'block.header': 'Report' } } },
  tests: {
    vectors: [
      {
        name: 'Demo letter lookup',
        programme: 'xx-demo',
        input: { ENG: 'A' },
        expect: { demo_scale: { grade: 'A' } },
      },
    ],
  },
};

describe('minimal pack', () => {
  it('validates against the composed pack schema', () => {
    expectValid(SCHEMA_ID.pack, MINIMAL_PACK);
  });

  it('passes every runtime check', () => {
    expect(checkPackSemantics(MINIMAL_PACK)).toEqual([]);
  });
});

interface SchemaInvalidCase {
  readonly name: string;
  readonly keyword: string;
  readonly build: () => Shape;
}

const schemaInvalidCases: readonly SchemaInvalidCase[] = [
  {
    name: 'refuses a pack with no tests section',
    keyword: 'required',
    build: () => {
      const pack = clone(MINIMAL_PACK);
      delete pack.tests;
      return pack;
    },
  },
  {
    name: 'refuses an unknown manifest key',
    keyword: 'additionalProperties',
    build: () => {
      const pack = clone(MINIMAL_PACK);
      child(pack, 'pack').unexpected = true;
      return pack;
    },
  },
  {
    name: 'refuses an unknown slot kind',
    keyword: 'enum',
    build: () => {
      const pack = clone(MINIMAL_PACK);
      const scheme = list(child(pack, 'assessment'), 'schemes')[0];
      list(scheme, 'slots')[0].kind = 'quiz';
      return pack;
    },
  },
  {
    name: 'refuses an annual weight above 1',
    keyword: 'maximum',
    build: () => {
      const pack = clone(MINIMAL_PACK);
      child(pack, 'assessment', 'annual', 'of').T1 = 1.4;
      return pack;
    },
  },
  {
    name: 'refuses a slot with neither max nor scale_to',
    keyword: 'anyOf',
    build: () => {
      const pack = clone(MINIMAL_PACK);
      const scheme = list(child(pack, 'assessment'), 'schemes')[0];
      delete list(scheme, 'slots')[0].max;
      return pack;
    },
  },
  {
    name: 'refuses a scheme that mixes the marks and formative shapes',
    keyword: 'oneOf',
    build: () => {
      const pack = clone(MINIMAL_PACK);
      const scheme = list(child(pack, 'assessment'), 'schemes')[0];
      scheme.evidence = 'rubric_observations';
      return pack;
    },
  },
  {
    name: 'refuses a scheme with no grading scale',
    keyword: 'required',
    build: () => {
      const pack = clone(MINIMAL_PACK);
      const scheme = list(child(pack, 'assessment'), 'schemes')[0];
      delete scheme.grading_scale;
      return pack;
    },
  },
];

describe('invalid packs refused by the schema', () => {
  for (const testCase of schemaInvalidCases) {
    it(testCase.name, () => {
      expectSchemaError(SCHEMA_ID.pack, testCase.build(), testCase.keyword);
    });
  }
});

interface SemanticInvalidCase {
  readonly name: string;
  readonly path: string;
  readonly build: () => Shape;
}

const semanticInvalidCases: readonly SemanticInvalidCase[] = [
  {
    name: 'refuses duplicate level codes',
    path: 'structure.levels',
    build: () => {
      const pack = clone(MINIMAL_PACK);
      list(child(pack, 'structure'), 'levels').push({
        code: 'L1',
        name: 'Level 1 again',
        ordinal: 2,
        next: null,
      });
      return pack;
    },
  },
  {
    name: 'refuses annual weights that do not sum to 1',
    path: 'assessment.annual.of',
    build: () => {
      const pack = clone(MINIMAL_PACK);
      child(pack, 'assessment', 'annual', 'of').T1 = 0.6;
      return pack;
    },
  },
  {
    name: 'refuses a dangling grading-scale reference',
    path: 'assessment.schemes[demo].grading_scale',
    build: () => {
      const pack = clone(MINIMAL_PACK);
      const scheme = list(child(pack, 'assessment'), 'schemes')[0];
      scheme.grading_scale = 'missing_scale';
      return pack;
    },
  },
  {
    name: 'refuses a missing-mark policy for an undeclared slot',
    path: 'assessment.schemes[demo].missing',
    build: () => {
      const pack = clone(MINIMAL_PACK);
      const scheme = list(child(pack, 'assessment'), 'schemes')[0];
      scheme.missing = { NOPE: 'zero' };
      return pack;
    },
  },
  {
    name: 'refuses duplicate slot codes',
    path: 'assessment.schemes[demo].slots',
    build: () => {
      const pack = clone(MINIMAL_PACK);
      const scheme = list(child(pack, 'assessment'), 'schemes')[0];
      list(scheme, 'slots').push({ code: 'EXAM', label: 'Exam again', max: 50, kind: 'mock' });
      return pack;
    },
  },
  {
    name: 'refuses a report label with no translation',
    path: 'locales[en].labels',
    build: () => {
      const pack = clone(MINIMAL_PACK);
      list(list(pack, 'reports')[0], 'blocks').push({
        type: 'attendance',
        label_key: 'block.attendance',
      });
      return pack;
    },
  },
];

describe('invalid packs refused by the documented runtime checks', () => {
  for (const testCase of semanticInvalidCases) {
    it(testCase.name, () => {
      const pack = testCase.build();
      expect(validate(SCHEMA_ID.pack, pack).valid).toBe(true);
      const issues = checkPackSemantics(pack);
      expect(issues.map((issue) => issue.path), JSON.stringify(issues)).toContain(testCase.path);
    });
  }
});
