// ABOUTME: Validates the cambridge-intl (Cambridge Primary to A Level) pack against the curriculum
// ABOUTME: pack schemas, runs the runtime checks, prepares every grading scale with the scale engine
// ABOUTME: and executes the conformance vectors, using the assessment engine for scheme results and a
// ABOUTME: test-local reference for the point totals and progression rules the engine does not own.

import { readFileSync, readdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';

import Ajv2020 from 'ajv/dist/2020';
import { describe, expect, it } from 'vitest';

import {
  compareExact,
  evaluateScheme,
  formatExact,
  parseExact,
  sumExact,
  type ComponentCombine,
  type Exact,
  type RoundingMode,
  type RoundingStage,
  type SchemeDefinition,
  type SchemeMark,
  type SlotCombine,
} from '../../assessment/engine';
import {
  lookupScaleBand,
  prepareGradingScale,
  type GradingScaleBandDefinition,
  type GradingScaleDefinition,
  type PreparedGradingScale,
} from '../../assessment/scales';
import { checkPackSemantics } from './packSemantics';

// ============================================================== pack on disk

interface Component {
  readonly code: string;
  readonly name: string;
  readonly kind: string;
  readonly max_score: number;
  readonly weight?: number;
}

interface LearningArea {
  readonly code: string;
  readonly name: string;
  readonly group: string;
  readonly kind: string;
  readonly levels: readonly string[];
  readonly national_code: string | null;
  readonly pathways?: readonly string[];
  readonly components?: readonly Component[];
}

interface Level {
  readonly code: string;
  readonly name: string;
  readonly ordinal: number;
  readonly typical_age?: number;
  readonly next: string | null;
  readonly is_stage_exit?: boolean;
  readonly national_assessment: string | null;
}

interface Structure {
  readonly stages: readonly { readonly code: string; readonly levels: readonly string[] }[];
  readonly levels: readonly Level[];
  readonly pathways?: readonly { readonly code: string; readonly levels: readonly string[] }[];
  readonly calendar_template: {
    readonly year_kind: string;
    readonly periods: readonly { readonly code?: string; readonly kind: string; readonly sequence: number; readonly name: string; readonly half_term?: boolean }[];
  };
}

interface SchemeSlot {
  readonly code: string;
  readonly label: string;
  readonly kind: string;
  readonly max?: number;
  readonly scale_to?: number;
  readonly multi?: boolean;
  readonly combine?: string;
}

interface Scheme {
  readonly code: string;
  readonly levels: readonly string[];
  readonly slots?: readonly SchemeSlot[];
  readonly evidence?: string;
  readonly observation_scale?: string;
  readonly summative_slots?: readonly { readonly code: string; readonly max: number; readonly maps_to: string }[];
  readonly learning_area_score?: { readonly op: string; readonly of: readonly string[]; readonly out_of: number };
  readonly component_policy?: { readonly papers: string; readonly out_of?: number };
  readonly grading_scale?: string;
  readonly missing?: Readonly<Record<string, string>>;
  readonly rounding?: readonly { readonly stage: string; readonly precision: number; readonly mode: string }[];
}

interface Aggregation {
  readonly code: string;
  readonly op: string;
  readonly value?: string;
  readonly over?: readonly string[];
  readonly precision?: number;
  readonly result_scale?: string;
}

interface Assessment {
  readonly schemes: readonly Scheme[];
  readonly grading_scales: readonly GradingScaleDefinition[];
  readonly aggregations: readonly Aggregation[];
}

interface PromotionRule {
  readonly levels: readonly string[];
  readonly rule: string;
  readonly to_stage?: string;
  readonly requires?: readonly string[];
  readonly conditions?: readonly { readonly metric: string; readonly gte: number }[];
  readonly else?: string;
  readonly suggest?: { readonly metric: string; readonly gte: number };
}

interface Progression {
  readonly progression: readonly PromotionRule[];
  readonly graduation?: readonly { readonly levels: readonly string[]; readonly rule: string }[];
}

interface Report {
  readonly code: string;
  readonly name: string;
  readonly levels: readonly string[];
  readonly blocks: readonly { readonly type: string; readonly label_key?: string }[];
}

interface Locale {
  readonly labels: Readonly<Record<string, string>>;
  readonly descriptors?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  readonly comment_bank?: readonly { readonly scope: string; readonly band: string }[];
}

interface Vector {
  readonly name: string;
  readonly programme?: string;
  readonly input: Readonly<Record<string, string | number | null>>;
  readonly expect: { readonly selected?: readonly string[]; readonly [code: string]: unknown };
}

interface Manifest {
  readonly code: string;
  readonly name: string;
  readonly version: string;
  readonly country: string;
  readonly languages: readonly string[];
  readonly sources: readonly { readonly title: string; readonly issuer: string; readonly url: string; readonly retrieved: string }[];
  readonly verification: { readonly status: string; readonly verified_by: readonly string[]; readonly notes?: string };
  readonly overridable?: readonly string[];
}

interface PackDocument {
  readonly pack: Manifest;
  readonly structure: Structure;
  readonly learning_areas: { readonly learning_areas: readonly LearningArea[] };
  readonly assessment: Assessment;
  readonly progression: Progression;
  readonly reports: readonly Report[];
  readonly locales: Readonly<Record<string, Locale>>;
  readonly tests: { readonly vectors: readonly Vector[] };
}

const PACK_DIR = resolve(process.cwd(), 'packs', 'cambridge-intl');

function readJson<T>(...parts: string[]): T {
  return JSON.parse(readFileSync(resolve(PACK_DIR, ...parts), 'utf8')) as T;
}

function readJsonDirectory<T>(directory: string): T[] {
  return readdirSync(resolve(PACK_DIR, directory))
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => readJson<T>(directory, name));
}

const manifest = readJson<Manifest>('pack.json');
const structure = readJson<Structure>('structure.json');
const learningAreaDocument = readJson<{ learning_areas: readonly LearningArea[] }>('learning-areas.json');
const assessment = readJson<Assessment>('assessment.json');
const progression = readJson<Progression>('progression.json');
const reports = readJsonDirectory<Report>('reports');
const vectors = readJson<{ vectors: readonly Vector[] }>('tests', 'cambridge-intl.vectors.json').vectors;
const locales = Object.fromEntries(
  readdirSync(resolve(PACK_DIR, 'locales'))
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => [basename(name, '.json'), readJson<Locale>('locales', name)])
);

const packDocument: PackDocument = {
  pack: manifest,
  structure,
  learning_areas: learningAreaDocument,
  assessment,
  progression,
  reports,
  locales,
  tests: { vectors },
};

const learningAreas = learningAreaDocument.learning_areas;
const levels = structure.levels;
const levelByCode = new Map(levels.map((level) => [level.code, level]));
const areaByCode = new Map(learningAreas.map((area) => [area.code, area]));

// ============================================================ schema checks

const SCHEMA_DIR = resolve(process.cwd(), 'packs', 'schema');
const SCHEMA_BASE = 'https://schemas.schoolpilot.app/curriculum-pack/v1/';

// strictRequired is off because required properties inside `then` branches legitimately refer to
// the parent object's properties; every other strict check stays on.
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
for (const file of readdirSync(SCHEMA_DIR).filter((name) => name.endsWith('.json'))) {
  ajv.addSchema(JSON.parse(readFileSync(resolve(SCHEMA_DIR, file), 'utf8')) as object);
}

function schemaErrors(schemaId: string, document: unknown): string {
  const validate = ajv.getSchema(schemaId);
  if (!validate) throw new Error(`schema ${schemaId} is not registered`);
  const valid = validate(document) === true;
  return valid ? '' : JSON.stringify(validate.errors);
}

describe('cambridge-intl pack: schema and runtime contract', () => {
  it('validates against the composed pack schema', () => {
    expect(schemaErrors(`${SCHEMA_BASE}pack.schema.json`, packDocument)).toBe('');
  });

  it('validates each section file against its own schema', () => {
    expect(schemaErrors(`${SCHEMA_BASE}manifest.schema.json`, manifest)).toBe('');
    expect(schemaErrors(`${SCHEMA_BASE}structure.schema.json`, structure)).toBe('');
    expect(schemaErrors(`${SCHEMA_BASE}learning-areas.schema.json`, learningAreaDocument)).toBe('');
    expect(schemaErrors(`${SCHEMA_BASE}assessment.schema.json`, assessment)).toBe('');
    expect(schemaErrors(`${SCHEMA_BASE}progression.schema.json`, progression)).toBe('');
    for (const report of reports) {
      expect(schemaErrors(`${SCHEMA_BASE}report.schema.json`, report), report.code).toBe('');
    }
    for (const [language, locale] of Object.entries(locales)) {
      expect(schemaErrors(`${SCHEMA_BASE}locale.schema.json`, locale), language).toBe('');
    }
  });

  it('passes every documented runtime check', () => {
    expect(checkPackSemantics(packDocument)).toEqual([]);
  });

  it('is the cambridge-intl manifest with cited sources and no rewashed verification claim', () => {
    expect(manifest.code).toBe('cambridge-intl');
    expect(manifest.version).toMatch(/^[0-9]+\.[0-9]+\.[0-9]+$/);
    expect(manifest.sources.length).toBeGreaterThanOrEqual(6);
    for (const source of manifest.sources) {
      expect(source.url, source.title).toMatch(/^https:\/\//);
      expect(source.retrieved, source.title).toMatch(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
    }
    expect(manifest.verification.status).toBe('draft');
    expect(manifest.verification.verified_by).toEqual([]);
  });

  it('says in the manifest how session-specific grade thresholds are handled', () => {
    const notes = manifest.verification.notes ?? '';
    expect(notes).toMatch(/grade thresholds/i);
    expect(notes).toMatch(/placeholder/i);
    for (const code of ['igcse_a_star_g', 'igcse_9_1', 'cambridge_a_level']) {
      expect(manifest.overridable).toContain(`grading_scales.${code}.bands`);
      const scale = assessment.grading_scales.find((candidate) => candidate.code === code);
      expect(scale?.verification, code).toMatch(/placeholder/i);
    }
  });

  it('covers primary to advanced in four stages with ordered ordinals and resolved next links', () => {
    expect(structure.stages.map((stage) => stage.code)).toEqual(['CP', 'CLS', 'IGCSE', 'ADV']);
    expect(levels).toHaveLength(13);
    expect(levels.map((level) => level.code)).toEqual([
      'Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'Y7', 'Y8', 'Y9', 'Y10', 'Y11', 'Y12', 'Y13',
    ]);
    for (let index = 1; index < levels.length; index += 1) {
      expect(levels[index].ordinal, levels[index].code).toBeGreaterThan(levels[index - 1].ordinal);
    }
    for (const level of levels) {
      if (level.next !== null) expect(levelByCode.has(level.next), `${level.code}.next`).toBe(true);
    }
  });

  it('names the checkpoint, IGCSE and A level assessments at the four stage exits', () => {
    const exits = levels.filter((level) => level.is_stage_exit === true).map((level) => level.code);
    expect(exits).toEqual(['Y6', 'Y9', 'Y11', 'Y13']);
    expect(levelByCode.get('Y6')?.national_assessment).toBe('CAMBRIDGE_PRIMARY_CHECKPOINT');
    expect(levelByCode.get('Y9')?.national_assessment).toBe('CAMBRIDGE_LOWER_SECONDARY_CHECKPOINT');
    expect(levelByCode.get('Y11')?.national_assessment).toBe('IGCSE');
    expect(levelByCode.get('Y13')?.national_assessment).toBe('A_LEVEL');
    // AS is a separate, optional qualification, so Year 12 carries no required board assessment.
    expect(levelByCode.get('Y12')?.national_assessment).toBeNull();
    expect(levelByCode.get('Y13')?.next).toBeNull();
  });

  it('uses an academic year with three terms, each with a half-term', () => {
    expect(structure.calendar_template.year_kind).toBe('academic_year');
    expect(structure.calendar_template.periods.map((period) => period.code)).toEqual(['T1', 'T2', 'T3']);
    for (const period of structure.calendar_template.periods) {
      expect(period.kind).toBe('term');
      expect(period.half_term).toBe(true);
    }
    expect(manifest.overridable).toContain('structure.calendar_template.periods');
  });

  it('declares learning areas that resolve to declared levels and pathways', () => {
    const levelCodes = new Set(levels.map((level) => level.code));
    const pathwayCodes = new Set((structure.pathways ?? []).map((pathway) => pathway.code));
    expect(learningAreas.length).toBeGreaterThanOrEqual(15);
    expect(new Set(learningAreas.map((area) => area.code)).size).toBe(learningAreas.length);
    for (const area of learningAreas) {
      expect(area.levels.length, area.code).toBeGreaterThan(0);
      for (const level of area.levels) expect(levelCodes.has(level), `${area.code}.${level}`).toBe(true);
      for (const pathway of area.pathways ?? []) {
        expect(pathwayCodes.has(pathway), `${area.code}.${pathway}`).toBe(true);
      }
    }
    expect((structure.pathways ?? []).map((pathway) => pathway.code)).toEqual(['SCI', 'HUM', 'BUS']);
  });

  it('weights the extended mathematics papers and gives every weighted component a share', () => {
    const withPapers = learningAreas.filter((area) => (area.components ?? []).length > 0);
    expect(withPapers.map((area) => area.code)).toEqual(['MAT']);
    const papers = withPapers[0]?.components ?? [];
    expect(papers.map((component) => [component.code, component.max_score])).toEqual([
      ['P2', 70],
      ['P4', 130],
    ]);
    const total = papers.reduce((sum, component) => sum + (component.weight ?? 0), 0);
    expect(total).toBeCloseTo(1, 9);
    const weighted = assessment.schemes.filter((scheme) => scheme.component_policy?.papers === 'weighted');
    expect(weighted.map((scheme) => scheme.code)).toEqual([
      'cambridge-igcse-a-star-g',
      'cambridge-igcse-9-1',
    ]);
  });

  it('declares an assessment scheme for every level, including both IGCSE grade scales', () => {
    const covered = new Set(assessment.schemes.flatMap((scheme) => scheme.levels));
    for (const level of levels) expect(covered.has(level.code), level.code).toBe(true);
    const igcseScales = assessment.schemes
      .filter((scheme) => scheme.levels.includes('Y10'))
      .map((scheme) => scheme.grading_scale);
    expect(igcseScales).toEqual(['igcse_a_star_g', 'igcse_9_1']);
    for (const scheme of assessment.schemes) {
      if (scheme.grading_scale === undefined) continue;
      expect(assessment.grading_scales.some((scale) => scale.code === scheme.grading_scale), scheme.code).toBe(true);
    }
  });

  it('ships a report template for every stage band and translates every block label', () => {
    const covered = new Set(reports.flatMap((report) => report.levels));
    for (const level of levels) expect(covered.has(level.code), level.code).toBe(true);
    expect(Object.keys(locales)).toEqual(['en']);
    for (const [language, locale] of Object.entries(locales)) {
      for (const report of reports) {
        for (const block of report.blocks) {
          expect(block.label_key, `${report.code}.${block.type}`).toBeDefined();
          expect(locale.labels[block.label_key ?? ''], `${language}:${block.label_key}`).toBeTruthy();
        }
      }
    }
  });

  it('only translates descriptors and comment bands that the scales declare', () => {
    const bandCodes = new Set(assessment.grading_scales.flatMap((scale) => scale.bands.map((band) => band.code)));
    for (const [language, locale] of Object.entries(locales)) {
      for (const [scaleCode, bands] of Object.entries(locale.descriptors ?? {})) {
        const scale = assessment.grading_scales.find((candidate) => candidate.code === scaleCode);
        expect(scale, `${language}:${scaleCode}`).toBeDefined();
        for (const bandCode of Object.keys(bands)) {
          expect(scale?.bands.some((band) => band.code === bandCode), `${scaleCode}.${bandCode}`).toBe(true);
        }
      }
      for (const comment of locale.comment_bank ?? []) {
        expect(bandCodes.has(comment.band), `${language}:${comment.band}`).toBe(true);
      }
    }
  });

  it('declares rules for every level that is not terminal, and graduates only the last year', () => {
    const promoted = new Set(progression.progression.flatMap((rule) => rule.levels));
    for (const level of levels) {
      if (level.code === 'Y13') continue;
      expect(promoted.has(level.code), level.code).toBe(true);
    }
    expect(promoted.has('Y13')).toBe(false);
    expect(progression.graduation?.map((rule) => rule.levels)).toEqual([['Y13']]);
  });
});

// ========================================================= grade-scale engine

const preparedScales = new Map<string, PreparedGradingScale>();

function preparedScale(code: string): PreparedGradingScale {
  const cached = preparedScales.get(code);
  if (cached !== undefined) return cached;
  const definition = scaleNamed(code);
  const preparation = prepareGradingScale(definition);
  if (!preparation.ok) {
    throw new Error(`${code}: ${preparation.issues.map((issue) => `${issue.path}: ${issue.detail}`).join('; ')}`);
  }
  preparedScales.set(code, preparation.scale);
  return preparation.scale;
}

function scaleNamed(code: string): GradingScaleDefinition {
  const scale = assessment.grading_scales.find((candidate) => candidate.code === code);
  if (!scale) throw new Error(`the pack declares no grading scale ${code}`);
  return scale;
}

function exactOf(text: string): Exact {
  const value = parseExact(text);
  if (value === null) throw new Error(`not an exact value: ${text}`);
  return value;
}

function bandAt(scale: PreparedGradingScale, value: string): { code: string; label: string; points: string | null } | null {
  const lookup = lookupScaleBand(scale, { source: 'given', value: exactOf(value) });
  return lookup.band;
}

/** A band by code or by the grade it prints; the vectors state the printed grade. */
function bandForGrade(definition: GradingScaleDefinition, grade: string): GradingScaleBandDefinition {
  const band = definition.bands.find((candidate) => candidate.code === grade || candidate.label === grade);
  if (!band) throw new Error(`${definition.code} has no band ${grade}`);
  return band;
}

function percentScales(): readonly GradingScaleDefinition[] {
  return assessment.grading_scales.filter((scale) => scale.input === 'percent');
}

describe('cambridge-intl grading scales', () => {
  it('prepares every declared scale with the scale engine', () => {
    for (const scale of assessment.grading_scales) {
      expect(() => preparedScale(scale.code), scale.code).not.toThrow();
    }
  });

  it('changes grade exactly at every declared boundary', () => {
    for (const definition of percentScales()) {
      const scale = preparedScale(definition.code);
      const ordered = [...definition.bands].sort((left, right) => left.min - right.min);
      for (const band of ordered) {
        expect(bandAt(scale, String(band.min))?.code, `${definition.code} at ${band.min}`).toBe(band.code);
        if (compareExact(exactOf(String(band.min)), scale.lowest) > 0) {
          const below = bandAt(scale, String(band.min - 1));
          expect(below?.code, `${definition.code} at ${band.min - 1}`).not.toBe(band.code);
        }
      }
    }
  });

  it('leaves no whole percent from 0 to 100 ungraded on any grade scale', () => {
    for (const definition of percentScales()) {
      const scale = preparedScale(definition.code);
      for (let percent = 0; percent <= 100; percent += 1) {
        expect(bandAt(scale, String(percent))?.code, `${definition.code} at ${percent}`).toBeTruthy();
      }
    }
  });

  it('has no band for a fractional percent, so the scheme rounds before lookup', () => {
    const igcse = preparedScale('igcse_a_star_g');
    expect(bandAt(igcse, '89.5')).toBeNull();
    expect(bandAt(igcse, '90')?.label).toBe('A*');
    expect(bandAt(igcse, '89')?.label).toBe('A');
  });

  it('spells A* as A_STAR and stops the AS scale at A', () => {
    const alevel = scaleNamed('cambridge_a_level');
    const star = bandForGrade(alevel, 'A*');
    expect(star.code).toBe('A_STAR');
    expect(star.label).toBe('A*');
    expect(star.points).toBe(56);
    for (const band of [...alevel.bands, ...scaleNamed('cambridge_as_level').bands]) {
      expect(band.code, band.label).toMatch(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
    }
    expect(scaleNamed('cambridge_as_level').bands.some((band) => band.code === 'A_STAR')).toBe(false);
  });

  it('does not invent a tariff for AS or IGCSE grades', () => {
    for (const code of ['cambridge_as_level', 'igcse_a_star_g']) {
      const scale = scaleNamed(code);
      expect(scale.bands.every((band) => band.points === undefined), code).toBe(true);
    }
    for (const band of scaleNamed('cambridge_a_level').bands) {
      expect(band.points, band.code).toBeDefined();
    }
  });

  it('points the 9-1 scale at the grade number, not at a DfE score', () => {
    const definition = scaleNamed('igcse_9_1');
    const scale = preparedScale('igcse_9_1');
    for (const band of definition.bands) {
      expect(bandAt(scale, String(band.min))?.points, band.code).toBe(String(band.points));
    }
    expect(bandAt(scale, '0')?.code).toBe('U');
  });
});

// ============================================================ scheme execution

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
  if (value === 'half_up' || value === 'half_down' || value === 'half_even' || value === 'up' || value === 'down') {
    return value;
  }
  throw new Error(`the assessment engine cannot apply rounding mode ${value}`);
}

function schemeNamed(code: string): Scheme {
  const scheme = assessment.schemes.find((candidate) => candidate.code === code);
  if (!scheme) throw new Error(`the pack declares no scheme ${code}`);
  return scheme;
}

/**
 * The component weights a weighted policy needs.
 *
 * `component_policy` in the pack schema has no `weights` field, so the share is declared on each
 * component in `learning-areas.json` and the loader joins it into the engine's policy map. The map
 * is keyed by component code, so two learning areas sharing a paper code with different shares
 * would collide; this pack has one component-bearing area and the test refuses the ambiguity.
 */
function componentWeights(): Readonly<Record<string, string>> {
  const weights = new Map<string, string>();
  for (const area of learningAreas) {
    for (const component of area.components ?? []) {
      if (component.weight === undefined) continue;
      if (weights.has(component.code)) {
        throw new Error(`component code ${component.code} is declared by more than one learning area`);
      }
      weights.set(component.code, String(component.weight));
    }
  }
  return Object.fromEntries(weights);
}

function engineScheme(scheme: Scheme): SchemeDefinition {
  const score = scheme.learning_area_score;
  if (score === undefined || scheme.slots === undefined) {
    throw new Error(`${scheme.code} is not a marks scheme`);
  }
  if (score.op !== 'sum') throw new Error(`${scheme.code}: the engine does not support op ${score.op}`);
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
      of: score.of,
      out_of: String(score.out_of),
    },
    ...(scheme.component_policy === undefined
      ? {}
      : {
          component_policy: {
            papers: paperCombine(scheme.component_policy.papers),
            ...(scheme.component_policy.out_of === undefined ? {} : { out_of: String(scheme.component_policy.out_of) }),
            ...(scheme.component_policy.papers === 'weighted' ? { weights: componentWeights() } : {}),
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
 * Reads `slot[.assessment[.component]]` keys whose value is `score/max`.
 *
 * A component mark must match the maximum the learning area declares for that paper, so the
 * vector cannot drift away from `learning-areas.json`.
 */
function marksFromInput(input: Vector['input']): SchemeMark[] {
  return Object.entries(input).map(([key, value]) => {
    if (typeof value !== 'string') throw new Error(`the scheme vector needs a score/max string at ${key}`);
    const [slot, assessmentCode, component, ...rest] = key.split('.');
    if (slot === undefined || rest.length > 0) throw new Error(`not a slot[.assessment[.component]] key: ${key}`);
    const [score, max] = value.split('/');
    if (score === undefined || max === undefined) throw new Error(`${key} needs score/max, got ${value}`);
    if (component !== undefined && assessmentCode !== undefined) {
      const area = areaByCode.get(assessmentCode);
      const declared = area?.components?.find((candidate) => candidate.code === component);
      if (!declared) throw new Error(`${key} names no paper declared on ${assessmentCode}`);
      expect(String(declared.max_score), `${key} paper maximum`).toBe(max);
    }
    return {
      slot,
      assessment: assessmentCode ?? slot,
      ...(component === undefined || assessmentCode === undefined ? {} : { component }),
      score,
      max_score: max,
      status: 'present',
    } satisfies SchemeMark;
  });
}

// ========================================================== points aggregation

/**
 * The reference evaluator for the pack's point totals.
 *
 * P2-B03 owns the aggregation engine; until it lands this reads each grade against the scale the
 * pack declares for the learning area's level, applies the operator's `value`, and sums. It is not
 * a hard-coded expectation: change a band's points or a subject's level and the vectors fail.
 */
function evaluatePoints(aggregation: Aggregation, grades: ReadonlyMap<string, string>): Exact {
  if (aggregation.op !== 'sum_points') throw new Error(`${aggregation.code} is not a points sum`);
  const codes = aggregation.over === undefined ? [...grades.keys()] : [...aggregation.over];
  const points: Exact[] = [];
  for (const code of codes) {
    const grade = grades.get(code);
    if (grade === undefined) throw new Error(`${aggregation.code} has no grade for ${code}`);
    const area = areaByCode.get(code);
    if (!area) throw new Error(`${aggregation.code} names no learning area ${code}`);
    const scale = scaleForGrade(area, grade);
    const band = bandForGrade(scale, grade);
    if (band.points === undefined) throw new Error(`${scale.code} has no points for ${grade}`);
    points.push(exactOf(String(band.points)));
  }
  return sumExact(points);
}

/**
 * The scale a learning area's grade belongs to: the pack's marks scheme that covers the area and
 * whose scale declares the grade. When more than one scheme still matches (a subject offered at
 * IGCSE and at A level), the scheme covering the area's last level wins, because that is the
 * qualification the subject ends in. A remaining tie is an ambiguity the pack must not have.
 */
function scaleForGrade(area: LearningArea, grade: string): GradingScaleDefinition {
  const covering = assessment.schemes.filter(
    (scheme) =>
      scheme.grading_scale !== undefined &&
      scheme.levels.some((level) => area.levels.includes(level))
  );
  const candidates = covering.filter((scheme) => {
    const scale = assessment.grading_scales.find((candidate) => candidate.code === scheme.grading_scale);
    return scale !== undefined && scale.bands.some((band) => band.code === grade || band.label === grade);
  });
  const lastLevel = area.levels.at(-1);
  const terminal = candidates.filter((scheme) => lastLevel !== undefined && scheme.levels.includes(lastLevel));
  const resolved = terminal.length > 0 ? terminal : candidates;
  if (resolved.length !== 1) {
    throw new Error(
      `${area.code} grade ${grade} matches ${resolved.length} schemes: ${resolved.map((scheme) => scheme.code).join(', ')}`
    );
  }
  const scale = assessment.grading_scales.find((candidate) => candidate.code === resolved[0]?.grading_scale);
  if (!scale) throw new Error(`${area.code} names no scale`);
  return scale;
}

// ============================================================ progression run

/**
 * The reference evaluator for a promotion rule: it reads the rule the pack declares for the level
 * being left and applies only the decision the schema states (a stage transition, or a council
 * suggestion against the declared metric).
 */
function evaluateProgression(levelCode: string, input: Vector['input']): Record<string, string> {
  const rule = progression.progression.find((candidate) => candidate.levels.includes(levelCode));
  if (!rule) throw new Error(`no progression rule for ${levelCode}`);
  const level = levelByCode.get(levelCode);
  if (!level) throw new Error(`no level ${levelCode}`);
  const nextLevel = level.next ?? '';

  if (rule.rule === 'automatic') return { rule: rule.rule, next_level: nextLevel };
  if (rule.rule === 'stage_transition') {
    if (rule.to_stage === undefined) throw new Error(`${levelCode} stage transition names no stage`);
    return { rule: rule.rule, to_stage: rule.to_stage, next_level: nextLevel };
  }
  if (rule.rule === 'class_council') {
    if (rule.suggest === undefined) throw new Error(`${levelCode} council rule names no metric`);
    const field = rule.suggest.metric.split('.').at(-1) ?? '';
    const supplied = input[field];
    if (typeof supplied !== 'number') throw new Error(`${levelCode} needs a numeric ${field}`);
    return {
      rule: rule.rule,
      suggest: supplied >= rule.suggest.gte ? 'promote' : 'refer_to_council',
      next_level: nextLevel,
    };
  }
  throw new Error(`${levelCode} uses a rule this reference does not evaluate: ${rule.rule}`);
}

// =================================================================== vectors

describe('cambridge-intl conformance vectors', () => {
  it('ships vectors that all name this programme and cover schemes, totals and progression', () => {
    expect(vectors.length).toBeGreaterThanOrEqual(9);
    const keys = new Set(vectors.flatMap((vector) => Object.keys(vector.expect)));
    for (const vector of vectors) expect(vector.programme, vector.name).toBe('cambridge-intl');
    for (const aggregation of assessment.aggregations) {
      expect(keys.has(aggregation.code), aggregation.code).toBe(true);
    }
    expect(keys.has('cambridge-igcse-a-star-g')).toBe(true);
    expect(keys.has('cambridge-igcse-9-1')).toBe(true);
    expect(keys.has('cambridge-a-level')).toBe(true);
    expect(keys.has('progression')).toBe(true);
  });

  for (const vector of vectors) {
    it(vector.name, () => {
      const [code] = Object.keys(vector.expect);
      if (code === undefined) throw new Error('the vector expects nothing');

      if (code === 'progression') {
        expectProgressionVector(vector);
        return;
      }
      if (assessment.schemes.some((scheme) => scheme.code === code)) {
        expectSchemeVector(vector, code);
        return;
      }
      if (assessment.aggregations.some((aggregation) => aggregation.code === code)) {
        expectPointsVector(vector, code);
        return;
      }
      throw new Error(`the vector names no known scheme or aggregation: ${code}`);
    });
  }
});

function expectedRecord(vector: Vector, code: string): Readonly<Record<string, number | string>> {
  return vector.expect[code] as Readonly<Record<string, number | string>>;
}

function expectSchemeVector(vector: Vector, schemeCode: string): void {
  const scheme = schemeNamed(schemeCode);
  const evaluation = evaluateScheme({ scheme: engineScheme(scheme), marks: marksFromInput(vector.input) });
  expect(evaluation.ok, JSON.stringify(evaluation.ok ? [] : evaluation.issues)).toBe(true);
  if (!evaluation.ok) return;

  const expected = expectedRecord(vector, schemeCode);
  const result = evaluation.result;
  expect(result.scheme.code).toBe(schemeCode);
  expect(result.status).toBe('complete');
  expect(result.exact_total).toBe(String(expected.exact_total));
  expect(result.total).toBe(String(expected.total));
  expect(result.percent).toBe(String(expected.percent));

  if (result.percent === null) throw new Error('a complete result has a percentage');
  const scaleCode = scheme.grading_scale;
  if (scaleCode === undefined) throw new Error(`${schemeCode} declares no grading scale`);
  const scale = scaleNamed(scaleCode);
  const actual = bandAt(preparedScale(scaleCode), result.percent);
  const expectedBand = bandForGrade(scale, String(expected.grade));
  expect(actual?.code).toBe(expectedBand.code);
  expect(actual?.label).toBe(expected.grade);
  if (expected.points !== undefined) expect(actual?.points).toBe(String(expected.points));
}

function expectPointsVector(vector: Vector, aggregationCode: string): void {
  const aggregation = assessment.aggregations.find((candidate) => candidate.code === aggregationCode);
  if (!aggregation) throw new Error(`no aggregation ${aggregationCode}`);
  const grades = new Map(
    Object.entries(vector.input).map(([code, grade]) => {
      if (typeof grade !== 'string') throw new Error(`the points vector needs grade strings, got ${code}`);
      return [code, grade] as const;
    })
  );
  const total = evaluatePoints(aggregation, grades);
  expect(formatExact(total)).toBe(String(expectedRecord(vector, aggregationCode).value));
}

function expectProgressionVector(vector: Vector): void {
  const leaving = vector.input.leaving_level;
  if (typeof leaving !== 'string') throw new Error('a progression vector needs a leaving_level');
  const actual = evaluateProgression(leaving, vector.input);
  const expected = expectedRecord(vector, 'progression');
  expect(String(expected.level)).toBe(leaving);
  for (const [key, value] of Object.entries(actual)) {
    expect(value, key).toBe(String(expected[key]));
  }
  for (const key of Object.keys(expected)) {
    if (key === 'level') continue;
    expect(actual[key], `expected ${key}`).toBeDefined();
  }
}

// ===================================================================== sanity

describe('cambridge-intl arithmetic sanity', () => {
  it('combines the extended papers with the declared weights', () => {
    // Paper 2 is 70 of 70, paper 4 is 104 of 130: 0.35 * 1 + 0.65 * 0.8 = 0.87 of the mock.
    const evaluation = evaluateScheme({
      scheme: engineScheme(schemeNamed('cambridge-igcse-a-star-g')),
      marks: marksFromInput({ 'CW.CW1': '27/30', 'MOCK.MAT.P2': '70/70', 'MOCK.MAT.P4': '104/130' }),
    });
    expect(evaluation.ok).toBe(true);
    if (!evaluation.ok) return;
    expect(evaluation.result.exact_total).toBe('87.6');
    expect(compareExact(exactOf(String(evaluation.result.exact_total)), exactOf('87.6'))).toBe(0);
  });
});
