// ABOUTME: The runtime rules of spec 03 that JSON Schema cannot express: unique codes, cross-section
// ABOUTME: references, weight totals, band ordering, locale coverage and impossible dates.
//
// `src/domain/packs/__tests__/packSemantics.ts` is the executable specification of these rules
// (P2-A01). This module is the loader's implementation of the same contract: product code must
// not import a test module, so the rules are stated once here, in the loader's issue shape.

import { isRecord } from './json';
import { at } from './shape';
import type { PackIssue } from './types';

type JsonObject = Record<string, unknown>;

const WEIGHT_TOLERANCE = 1e-9;

function rec(value: unknown): JsonObject {
  return isRecord(value) ? value : {};
}

function list(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function items(value: unknown): readonly JsonObject[] {
  return list(value).map(rec);
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function codes(collection: readonly JsonObject[]): string[] {
  return collection
    .map((item) => str(item.code))
    .filter((code): code is string => code !== undefined);
}

function sumsToOne(weights: readonly number[]): boolean {
  return Math.abs(weights.reduce((total, weight) => total + weight, 0) - 1) <= WEIGHT_TOLERANCE;
}

/** True when `YYYY-MM-DD` names a day that exists; the pattern alone accepts 2026-02-30. */
export function isCalendarDate(value: string): boolean {
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Every rule of spec 03 the schemas cannot state. A document that already failed the shape check
 * is not passed here: the shape is the precondition this walker assumes.
 */
export function checkPackRules(document: unknown): PackIssue[] {
  const issues: PackIssue[] = [];
  const fail = (check: PackIssue['check'], path: string, message: string): void => {
    issues.push({ check, path, message });
  };

  const root = rec(document);
  const manifest = rec(root.pack);
  const structure = rec(root.structure);
  const learningAreaDoc = rec(root.learning_areas);
  const assessment = rec(root.assessment);
  const progressionDoc = rec(root.progression);
  const reports = items(root.reports);
  const locales = rec(root.locales);
  const vectors = items(rec(root.tests).vectors);

  const stages = items(structure.stages);
  const levels = items(structure.levels);
  const pathways = items(structure.pathways);
  const learningAreas = items(learningAreaDoc.learning_areas);
  const competencies = items(learningAreaDoc.competencies);
  const combinationRules = items(learningAreaDoc.combination_rules);
  const schemes = items(assessment.schemes);
  const scales = items(assessment.grading_scales);
  const aggregations = items(assessment.aggregations);
  const promotionRules = items(progressionDoc.progression);
  const graduationRules = items(progressionDoc.graduation);

  // ------------------------------------------------------------- unique codes

  const unique = (path: string, values: readonly string[]): void => {
    const seen = new Set<string>();
    for (const value of values) {
      if (seen.has(value)) fail('unique_codes', path, `duplicate code "${value}"`);
      seen.add(value);
    }
  };

  unique('structure.stages', codes(stages));
  unique('structure.levels', codes(levels));
  unique('structure.pathways', codes(pathways));
  unique('learning_areas.learning_areas', codes(learningAreas));
  unique('learning_areas.competencies', codes(competencies));
  unique('assessment.schemes', codes(schemes));
  unique('assessment.grading_scales', codes(scales));
  unique('assessment.aggregations', codes(aggregations));
  unique('reports', codes(reports));

  // ------------------------------------------------------------- vocabularies

  const levelCodes = new Set(codes(levels));
  const stageCodes = new Set(codes(stages));
  const pathwayCodes = new Set(codes(pathways));
  const areaCodes = new Set(codes(learningAreas));
  const areaGroups = new Set(
    learningAreas
      .map((area) => str(area.group))
      .filter((group): group is string => group !== undefined)
  );
  const scaleCodes = new Set(codes(scales));

  const expectLevel = (path: string, code: string | undefined): void => {
    if (code !== undefined && !levelCodes.has(code)) {
      fail('dangling_reference', path, `unknown level "${code}"`);
    }
  };
  const expectStage = (path: string, code: string | undefined): void => {
    if (code !== undefined && !stageCodes.has(code)) {
      fail('dangling_reference', path, `unknown stage "${code}"`);
    }
  };
  const expectPathway = (path: string, code: string | undefined): void => {
    if (code !== undefined && !pathwayCodes.has(code)) {
      fail('dangling_reference', path, `unknown pathway "${code}"`);
    }
  };
  const expectArea = (path: string, code: string | undefined): void => {
    if (code !== undefined && !areaCodes.has(code)) {
      fail('dangling_reference', path, `unknown learning area "${code}"`);
    }
  };
  const expectScale = (path: string, code: string | undefined): void => {
    if (code !== undefined && !scaleCodes.has(code)) {
      fail('dangling_reference', path, `unknown grading scale "${code}"`);
    }
  };

  // ------------------------------------------------------------- structure refs

  for (const stage of stages) {
    const code = str(stage.code) ?? '?';
    for (const level of list(stage.levels)) {
      expectLevel(`structure.stages[${code}].levels`, str(level));
    }
  }

  for (const level of levels) {
    const code = str(level.code) ?? '?';
    expectLevel(`structure.levels[${code}].next`, str(level.next));
  }

  for (const pathway of pathways) {
    const code = str(pathway.code) ?? '?';
    for (const level of list(pathway.levels)) {
      expectLevel(`structure.pathways[${code}].levels`, str(level));
    }
  }

  // Period keys feed the annual weights: the code, the name or T{sequence} (spec 03 §4.1).
  const periodKeys = new Set<string>();
  for (const period of items(rec(structure.calendar_template).periods)) {
    const code = str(period.code);
    const name = str(period.name);
    const sequence = num(period.sequence);
    if (code !== undefined) periodKeys.add(code);
    if (name !== undefined) periodKeys.add(name);
    if (sequence !== undefined) periodKeys.add(`T${sequence}`);
  }

  // ---------------------------------------------------------- learning areas

  for (const area of learningAreas) {
    const code = str(area.code) ?? '?';
    for (const level of list(area.levels)) {
      expectLevel(`learning_areas.learning_areas[${code}].levels`, str(level));
    }
    for (const pathway of list(area.pathways)) {
      expectPathway(`learning_areas.learning_areas[${code}].pathways`, str(pathway));
    }
    for (const alternative of list(area.alternatives)) {
      expectArea(`learning_areas.learning_areas[${code}].alternatives`, str(alternative));
    }

    const components = items(area.components);
    unique(`learning_areas.learning_areas[${code}].components`, codes(components));
    const weights = components
      .map((component) => num(component.weight))
      .filter((weight): weight is number => weight !== undefined);
    if (weights.length > 0 && !sumsToOne(weights)) {
      fail(
        'weight_sum',
        `learning_areas.learning_areas[${code}].components`,
        'component weights must sum to 1 when any component weight is declared (spec 03 §4)'
      );
    }
  }

  for (const rule of combinationRules) {
    const summary = str(rule.rule) ?? '?';
    for (const level of list(rule.levels)) {
      expectLevel(`learning_areas.combination_rules[${summary}].levels`, str(level));
    }
    for (const entry of list(rule.of)) {
      for (const alternative of (str(entry) ?? '').split('|')) {
        expectArea(`learning_areas.combination_rules[${summary}].of`, alternative);
      }
    }
    if (rule.from_pathway === true && pathwayCodes.size === 0) {
      fail(
        'dangling_reference',
        `learning_areas.combination_rules[${summary}].from_pathway`,
        'rule takes electives from a pathway but the structure declares no pathways'
      );
    }
  }

  const usesComponentWeights = schemes.some(
    (scheme) => str(rec(scheme.component_policy).papers) === 'weighted'
  );
  if (usesComponentWeights) {
    for (const area of learningAreas) {
      const components = items(area.components);
      const declared = components.some((component) => num(component.weight) !== undefined);
      if (components.length > 0 && !declared) {
        const code = str(area.code) ?? '?';
        fail(
          'weight_sum',
          `learning_areas.learning_areas[${code}].components`,
          'a scheme uses component_policy weighted but this learning area declares no component weights'
        );
      }
    }
  }

  // -------------------------------------------------------------- assessment

  for (const scheme of schemes) {
    const code = str(scheme.code) ?? '?';
    for (const level of list(scheme.levels)) {
      expectLevel(`assessment.schemes[${code}].levels`, str(level));
    }

    const slots = items(scheme.slots);
    unique(`assessment.schemes[${code}].slots`, codes(slots));
    const slotCodes = new Set(codes(slots));

    for (const slot of list(rec(scheme.learning_area_score).of)) {
      const slotCode = str(slot);
      if (slotCode !== undefined && !slotCodes.has(slotCode)) {
        fail('dangling_reference', `assessment.schemes[${code}].learning_area_score.of`, `unknown slot "${slotCode}"`);
      }
    }

    for (const slotCode of Object.keys(rec(scheme.missing))) {
      if (!slotCodes.has(slotCode)) {
        fail('dangling_reference', `assessment.schemes[${code}].missing`, `unknown slot "${slotCode}"`);
      }
    }

    expectScale(`assessment.schemes[${code}].grading_scale`, str(scheme.grading_scale));
    expectScale(`assessment.schemes[${code}].observation_scale`, str(scheme.observation_scale));

    const summative = items(scheme.summative_slots);
    unique(`assessment.schemes[${code}].summative_slots`, codes(summative));
    for (const slot of summative) {
      expectScale(
        `assessment.schemes[${code}].summative_slots[${str(slot.code) ?? '?'}].maps_to`,
        str(slot.maps_to)
      );
    }
  }

  for (const scale of scales) {
    const code = str(scale.code) ?? '?';
    const bands = items(scale.bands).map((band) => ({
      code: str(band.code) ?? '?',
      min: num(band.min),
      max: num(band.max),
    }));
    unique(`assessment.grading_scales[${code}].bands`, bands.map((band) => band.code));

    const bounded = bands.filter(
      (band): band is { code: string; min: number; max: number } =>
        band.min !== undefined && band.max !== undefined
    );
    for (const band of bounded) {
      if (band.min > band.max) {
        fail(
          'band_order',
          `assessment.grading_scales[${code}].bands[${band.code}]`,
          `min ${band.min} is greater than max ${band.max}`
        );
      }
    }

    const sorted = [...bounded].sort((left, right) => left.min - right.min);
    const inclusiveUpper = str(scale.upper) === 'inclusive';
    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      const overlaps = inclusiveUpper ? previous.max >= current.min : previous.max > current.min;
      if (overlaps) {
        fail(
          'band_overlap',
          `assessment.grading_scales[${code}].bands`,
          `bands "${previous.code}" and "${current.code}" overlap`
        );
      }
    }
  }

  const usesCoefficients = aggregations.some(
    (aggregation) => aggregation.weights === 'coefficient'
  );
  if (usesCoefficients) {
    for (const area of learningAreas) {
      if (num(area.coefficient) === undefined) {
        fail(
          'coefficient_missing',
          `learning_areas.learning_areas[${str(area.code) ?? '?'}].coefficient`,
          'an aggregation weights by coefficient but this learning area declares no coefficient'
        );
      }
    }
  }

  for (const aggregation of aggregations) {
    const code = str(aggregation.code) ?? '?';
    expectScale(`assessment.aggregations[${code}].result_scale`, str(aggregation.result_scale));

    for (const area of list(rec(aggregation.fail_if).in)) {
      expectArea(`assessment.aggregations[${code}].fail_if.in`, str(area));
    }
    for (const area of list(aggregation.over)) {
      expectArea(`assessment.aggregations[${code}].over`, str(area));
    }

    const scope = list(aggregation.over);
    const scopeSize = scope.length > 0 ? scope.length : learningAreas.length;
    const keep = num(aggregation.n);
    if (keep !== undefined && keep > scopeSize) {
      fail(
        'out_of_scope',
        `assessment.aggregations[${code}].n`,
        `best_n keeps ${keep} results but only ${scopeSize} learning areas are in scope`
      );
    }

    for (const group of items(aggregation.groups)) {
      for (const area of list(group.require_all)) {
        expectArea(`assessment.aggregations[${code}].groups.require_all`, str(area));
      }
      const groupName = str(group.group);
      if (groupName !== undefined && !areaGroups.has(groupName)) {
        fail(
          'dangling_reference',
          `assessment.aggregations[${code}].groups`,
          `unknown learning-area group "${groupName}"`
        );
      }
    }

    const weights = rec(aggregation.weights);
    const explicit = Object.keys(weights)
      .map((key) => num(weights[key]))
      .filter((weight): weight is number => weight !== undefined);
    if (explicit.length > 0 && !sumsToOne(explicit)) {
      fail('weight_sum', `assessment.aggregations[${code}].weights`, 'explicit weights must sum to 1');
    }
  }

  const annual = rec(assessment.annual);
  const annualOf = annual.of;
  if (annual.op === 'weighted_mean' && isRecord(annualOf)) {
    const weights = Object.keys(annualOf)
      .map((key) => num(annualOf[key]))
      .filter((weight): weight is number => weight !== undefined);
    if (!sumsToOne(weights)) {
      fail('weight_sum', 'assessment.annual.of', 'annual weights must sum to 1 (spec 03 §4.1)');
    }
    for (const key of Object.keys(annualOf)) {
      if (!periodKeys.has(key)) {
        fail('dangling_reference', 'assessment.annual.of', `unknown period "${key}"`);
      }
    }
  } else if (Array.isArray(annualOf)) {
    for (const period of annualOf) {
      const key = str(period);
      if (key !== undefined && !periodKeys.has(key)) {
        fail('dangling_reference', 'assessment.annual.of', `unknown period "${key}"`);
      }
    }
  }

  // ----------------------------------------------------------------- reports

  const singleInstanceBlocks = new Set([
    'header',
    'learner',
    'attendance',
    'summary',
    'comments',
    'progression',
    'fees',
    'calendar',
    'signatures',
    'verification',
  ]);
  for (const report of reports) {
    const code = str(report.code) ?? '?';
    for (const level of list(report.levels)) {
      expectLevel(`reports[${code}].levels`, str(level));
    }
    const seen = new Set<string>();
    for (const block of items(report.blocks)) {
      const type = str(block.type);
      if (type === undefined) continue;
      if (singleInstanceBlocks.has(type) && seen.has(type)) {
        fail('single_instance_block', `reports[${code}].blocks`, `block "${type}" appears more than once`);
      }
      seen.add(type);
    }
  }

  // ----------------------------------------------------------------- locales

  const languages = list(manifest.languages)
    .map(str)
    .filter((language): language is string => language !== undefined);

  for (const language of languages) {
    if (!Object.prototype.hasOwnProperty.call(locales, language)) {
      fail('locale_coverage', 'locales', `manifest language "${language}" has no locale entry`);
    }
  }
  for (const language of Object.keys(locales)) {
    if (!languages.includes(language)) {
      fail('locale_coverage', 'locales', `locale "${language}" is not listed in manifest languages`);
    }
  }

  const labelKeys = reports.flatMap((report) =>
    items(report.blocks)
      .map((block) => str(block.label_key))
      .filter((key): key is string => key !== undefined)
  );
  for (const language of Object.keys(locales)) {
    const labels = rec(rec(locales[language]).labels);
    for (const key of labelKeys) {
      if (!Object.prototype.hasOwnProperty.call(labels, key)) {
        fail('locale_coverage', `locales[${language}].labels`, `report label key "${key}" is not translated`);
      }
    }
  }

  // ----------------------------------------------------------------- vectors

  const packCode = str(manifest.code);
  for (const vector of vectors) {
    const programme = str(vector.programme);
    if (programme !== undefined && packCode !== undefined && programme !== packCode) {
      fail(
        'programme_mismatch',
        `tests.vectors[${str(vector.name) ?? '?'}].programme`,
        `vector names programme "${programme}" but the pack code is "${packCode}"`
      );
    }
  }

  // ------------------------------------------------------------- progression

  const promoted = new Set<string>();
  for (const rule of promotionRules) {
    const ruleName = str(rule.rule) ?? '?';
    for (const level of list(rule.levels)) {
      const code = str(level);
      if (code === undefined) continue;
      expectLevel(`progression.progression[${ruleName}].levels`, code);
      if (promoted.has(code)) {
        fail(
          'duplicate_rule',
          `progression.progression[${ruleName}].levels`,
          `level "${code}" has more than one progression rule`
        );
      }
      promoted.add(code);
    }
    expectStage(`progression.progression[${ruleName}].to_stage`, str(rule.to_stage));
  }

  for (const rule of graduationRules) {
    for (const level of list(rule.levels)) {
      expectLevel('progression.graduation.levels', str(level));
    }
  }

  // ------------------------------------------------------------------- dates

  const effectiveFrom = str(manifest.effective_from);
  if (effectiveFrom !== undefined && !isCalendarDate(effectiveFrom)) {
    fail('impossible_date', at('pack', 'effective_from'), `"${effectiveFrom}" is not a real date`);
  }
  for (const source of items(manifest.sources)) {
    const retrieved = str(source.retrieved);
    if (retrieved !== undefined && !isCalendarDate(retrieved)) {
      fail(
        'impossible_date',
        at('pack.sources', str(source.title) ?? '?'),
        `"${retrieved}" is not a real date`
      );
    }
  }

  // A verified pack names at least one reviewer (manifest.schema.json `if`/`then`).
  const verification = rec(manifest.verification);
  if (verification.status === 'verified' && list(verification.verified_by).length === 0) {
    fail('minItems', 'pack.verification.verified_by', 'a verified pack names at least one reviewer');
  }

  return issues;
}
