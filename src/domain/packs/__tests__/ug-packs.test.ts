// ABOUTME: Validates the three Uganda curriculum packs (ug-ple, ug-lsc, ug-uace) against the pack schemas
// ABOUTME: and runtime checks, pins their grading scales, and runs every vector through the pack runner.

import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';

import Ajv2020 from 'ajv/dist/2020';
import { describe, expect, it, vi } from 'vitest';

import { checkPackSemantics } from './packSemantics';

// The runner starts a child Node process that compiles the engines with tsx, which is slow cold.
vi.setConfig({ testTimeout: 120_000 });

type Json = Record<string, any>;

const ROOT = process.cwd();
const SCHEMA_DIR = resolve(ROOT, 'packs', 'schema');
const PACK_SCHEMA_ID = 'https://schemas.schoolpilot.app/curriculum-pack/v1/pack.schema.json';
const PACK_CODES = ['ug-ple', 'ug-lsc', 'ug-uace'] as const;

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
for (const file of readdirSync(SCHEMA_DIR).filter((name) => name.endsWith('.json'))) {
  ajv.addSchema(JSON.parse(readFileSync(resolve(SCHEMA_DIR, file), 'utf8')) as object);
}

function readJson(code: string, ...parts: string[]): Json {
  return JSON.parse(readFileSync(resolve(ROOT, 'packs', code, ...parts), 'utf8')) as Json;
}

function readDirectory(code: string, directory: string): Json[] {
  return readdirSync(resolve(ROOT, 'packs', code, directory))
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => readJson(code, directory, name));
}

function documentOf(code: string): Json {
  const vectorFile = readdirSync(resolve(ROOT, 'packs', code, 'tests')).find((name) => name.endsWith('.vectors.json'));
  return {
    pack: readJson(code, 'pack.json'),
    structure: readJson(code, 'structure.json'),
    learning_areas: readJson(code, 'learning-areas.json'),
    assessment: readJson(code, 'assessment.json'),
    progression: readJson(code, 'progression.json'),
    reports: readDirectory(code, 'reports'),
    locales: Object.fromEntries(
      readdirSync(resolve(ROOT, 'packs', code, 'locales'))
        .filter((name) => name.endsWith('.json'))
        .map((name) => [basename(name, '.json'), readJson(code, 'locales', name)])
    ),
    tests: { vectors: readJson(code, 'tests', vectorFile ?? '').vectors },
  };
}

interface Band {
  readonly code: string;
  readonly min: number;
  readonly max: number;
  readonly points?: number;
}

function scaleOf(code: string, scale: string): Json {
  const found = readJson(code, 'assessment.json').grading_scales.find((candidate: Json) => candidate.code === scale);
  if (!found) throw new Error(`${code} declares no scale ${scale}`);
  return found;
}

/** The codes of every band holding a whole value; more than one means overlap, none means a hole. */
function bandsHolding(scale: Json, value: number): string[] {
  return (scale.bands as Band[]).filter((band) => value >= band.min && value <= band.max).map((band) => band.code);
}

describe.each(PACK_CODES)('%s on disk', (code) => {
  const document = documentOf(code);

  it('validates against the composed pack schema', () => {
    const validate = ajv.getSchema(PACK_SCHEMA_ID);
    if (!validate) throw new Error('pack schema is not registered');
    expect(validate(document), JSON.stringify(validate.errors)).toBe(true);
  });

  it('passes every runtime check in checkPackSemantics', () => {
    expect(checkPackSemantics(document)).toEqual([]);
  });

  it('is a Ugandan draft pack with cited sources and no reviewer claimed', () => {
    const { pack } = document;
    expect(pack.code).toBe(code);
    expect(pack.country).toBe('UG');
    expect(pack.verification.status).toBe('draft');
    expect(pack.verification.verified_by).toEqual([]);
    expect(pack.sources.length).toBeGreaterThan(0);
    for (const source of pack.sources) expect(source.url).toMatch(/^https?:\/\//);
  });

  it('ships English and Kiswahili and translates every report label in each', () => {
    expect(Object.keys(document.locales).sort()).toEqual(['en', 'sw']);
    for (const locale of Object.values(document.locales) as Json[]) {
      for (const report of document.reports as Json[]) {
        for (const block of report.blocks) expect(locale.labels[block.label_key], block.label_key).toBeTruthy();
      }
    }
  });

  it('keeps the same descriptor bands in both languages', () => {
    const { en, sw } = document.locales as Record<string, Json>;
    for (const [scale, bands] of Object.entries(en.descriptors as Record<string, Json>)) {
      expect(Object.keys(sw.descriptors[scale]).sort(), scale).toEqual(Object.keys(bands).sort());
    }
  });

  it('runs every vector through the pack runner with none skipped or failed', () => {
    const result = spawnSync(process.execPath, [resolve(ROOT, 'scripts', 'packs', 'run-vectors.mjs'), '--pack', code], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 120_000,
    });
    const output = `${result.stdout}${result.stderr}`;
    const total = document.tests.vectors.length;
    expect(result.status, output).toBe(0);
    expect(output).toMatch(new RegExp(`${code}\\s+${total}\\s+${total}\\s+0\\s+0`));
  });
});

describe('ug-ple', () => {
  const document = documentOf('ug-ple');

  it('declares Primary 1 to 7 with the PLE at Primary 7', () => {
    expect(document.structure.levels.map((level: Json) => level.code)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']);
    const last = document.structure.levels.at(-1);
    expect(last).toMatchObject({ national_assessment: 'PLE', next: null });
  });

  it('grades every whole percent in exactly one of nine bands, D1 (1) to F9 (9)', () => {
    const scale = scaleOf('ug-ple', 'ple_subject');
    expect(scale.bands.map((band: Json) => [band.code, band.points])).toEqual([
      ['D1', 1], ['D2', 2], ['C3', 3], ['C4', 4], ['C5', 5], ['C6', 6], ['P7', 7], ['P8', 8], ['F9', 9],
    ]);
    for (let percent = 0; percent <= 100; percent += 1) expect(bandsHolding(scale, percent), String(percent)).toHaveLength(1);
  });

  it('puts every aggregate from 4 to 36 in exactly one division, and none outside', () => {
    const scale = scaleOf('ug-ple', 'ple_divisions');
    expect(scale.bands.map((band: Json) => band.code)).toEqual(['I', 'II', 'III', 'IV', 'U']);
    for (let aggregate = 4; aggregate <= 36; aggregate += 1) expect(bandsHolding(scale, aggregate), String(aggregate)).toHaveLength(1);
    expect(bandsHolding(scale, 3)).toEqual([]);
    expect(bandsHolding(scale, 37)).toEqual([]);
  });

  it('aggregates the four examined subjects and models no unsourced fail_if rule', () => {
    const [aggregation] = document.assessment.aggregations;
    expect(aggregation).toMatchObject({ op: 'sum', over: ['ENG', 'MTC', 'SCI', 'SST'], result_scale: 'ple_divisions' });
    expect(aggregation.fail_if).toBeUndefined();
  });

  it('keeps every unconfirmed rule draft in its own notes', () => {
    expect(document.pack.verification.notes).toMatch(/NOT confirmed/);
    expect(scaleOf('ug-ple', 'ple_divisions').verification).toMatch(/NOT confirmed/);
  });
});

describe('ug-lsc', () => {
  const document = documentOf('ug-lsc');

  it('declares Senior 1 to 4 with the UCE at Senior 4 and no national subject codes', () => {
    expect(document.structure.levels.map((level: Json) => level.code)).toEqual(['S1', 'S2', 'S3', 'S4']);
    expect(document.structure.levels.at(-1)).toMatchObject({ national_assessment: 'UCE', next: null });
    for (const area of document.learning_areas.learning_areas) expect(area.national_code, area.code).toBeNull();
  });

  it('weights continuous assessment 20 and the examination 80 as an overridable default', () => {
    const [scheme] = document.assessment.schemes;
    expect(scheme.slots.map((slot: Json) => [slot.code, slot.scale_to])).toEqual([['CA', 20], ['ET', 80]]);
    expect(scheme.overridable).toContain('slots.*.scale_to');
  });

  it('grades every whole percent in exactly one of five bands', () => {
    const scale = scaleOf('ug-lsc', 'lsc_grade');
    for (let percent = 0; percent <= 100; percent += 1) expect(bandsHolding(scale, percent), String(percent)).toHaveLength(1);
  });

  it('says plainly that its scale is not a UNEB scale', () => {
    expect(scaleOf('ug-lsc', 'lsc_grade').verification).toMatch(/NOT a UNEB or NCDC scale/);
  });
});

describe('ug-uace', () => {
  const document = documentOf('ug-uace');
  const areas = document.learning_areas.learning_areas as Json[];

  it('declares Senior 5 and 6 with the UACE at Senior 6 and the PCM, BCM and HEG pathways', () => {
    expect(document.structure.levels.map((level: Json) => level.code)).toEqual(['S5', 'S6']);
    expect(document.structure.levels.at(-1)).toMatchObject({ national_assessment: 'UACE', next: null });
    expect(document.structure.pathways.map((pathway: Json) => pathway.code)).toEqual(['PCM', 'BCM', 'HEG']);
  });

  it('awards principal points A 6, B 5, C 4, D 3, E 2, O 1, F 0 and covers every percent once', () => {
    const scale = scaleOf('ug-uace', 'uace_principal');
    expect(scale.bands.map((band: Json) => [band.code, band.points])).toEqual([
      ['A', 6], ['B', 5], ['C', 4], ['D', 3], ['E', 2], ['O', 1], ['F', 0],
    ]);
    for (let percent = 0; percent <= 100; percent += 1) expect(bandsHolding(scale, percent), String(percent)).toHaveLength(1);
  });

  it('awards a subsidiary 1 point on a pass and covers every percent once', () => {
    const scale = scaleOf('ug-uace', 'uace_subsidiary');
    expect(scale.bands.map((band: Json) => [band.code, band.points])).toEqual([['S', 1], ['F', 0]]);
    for (let percent = 0; percent <= 100; percent += 1) expect(bandsHolding(scale, percent), String(percent)).toHaveLength(1);
  });

  it('grades General Paper, Subsidiary Mathematics and Subsidiary ICT on the subsidiary scale', () => {
    const subsidiaries = areas.filter((area) => area.group === 'subsidiary');
    expect(subsidiaries.map((area) => area.code).sort()).toEqual(['GP', 'SUBICT', 'SUBMATH']);
    for (const area of subsidiaries) {
      expect(area.grade_scales, area.code).toEqual([{ levels: ['S5', 'S6'], scale: 'uace_subsidiary' }]);
    }
    for (const area of areas.filter((candidate) => candidate.group !== 'subsidiary')) expect(area.grade_scales).toBeUndefined();
  });

  it('gives every area a distinct UNEB code from the 2016 timetable', () => {
    const codes = areas.map((area) => area.national_code);
    expect(new Set(codes).size).toBe(areas.length);
    for (const code of codes) expect(code).toMatch(/^[PS][0-9]{3}$/);
  });

  it('declares that its subject codes and points are unconfirmed or legacy', () => {
    expect(document.pack.verification.notes).toMatch(/legacy/);
    expect(document.pack.verification.notes).toMatch(/NOT confirmed/);
  });
});
