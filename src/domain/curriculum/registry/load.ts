// ABOUTME: The pack loader: validate a parsed pack document against the published schema shape and
// ABOUTME: the runtime rules, then project it onto the typed model. An invalid pack is never partial.

import { isRecord, type JsonObject } from './json';
import { PACK_DOCUMENT_SHAPE } from './packShape';
import { checkPackRules } from './rules';
import { checkShape } from './shape';
import type {
  AggregationOp,
  AggregationValue,
  ComponentCombine,
  ComponentKind,
  CompetencyKind,
  GroupConstraint,
  GradingScaleKind,
  LearningAreaKind,
  LoadedPack,
  MissingPolicy,
  PackAggregation,
  PackAnnual,
  PackAreaScore,
  PackAssessment,
  PackBand,
  PackCalendar,
  PackCitation,
  PackCombinationRule,
  PackCommentSeed,
  PackCompetency,
  PackComponent,
  PackCondition,
  PackGradingScale,
  PackIssue,
  PackLearningArea,
  PackLoadResult,
  PackLocale,
  PackMarksScheme,
  PackPathway,
  PackProgression,
  PackPromotionRule,
  PackRanking,
  PackReport,
  PackReportBlock,
  PackReportPage,
  PackScheme,
  PackSlot,
  PackStage,
  PackSummativeSlot,
  PackVector,
  PromotionRule,
  ReportBlockType,
  SlotKind,
} from './types';
import { packRef } from './types';

/** Thrown only when a value the shape check accepted cannot be projected; never a pack refusal. */
function lost(where: string): never {
  throw new Error(`the pack shape check accepted a value the loader cannot read at ${where}`);
}

function asObject(value: unknown, where: string): JsonObject {
  if (!isRecord(value)) return lost(where);
  return value;
}

function text(value: unknown, where: string): string {
  if (typeof value !== 'string') return lost(where);
  return value;
}

function number(value: unknown, where: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return lost(where);
  return value;
}

function bool(value: unknown, where: string): boolean {
  if (typeof value !== 'boolean') return lost(where);
  return value;
}

function array(value: unknown, where: string): readonly unknown[] {
  if (!Array.isArray(value)) return lost(where);
  return value;
}

function oneOf<T extends string>(value: unknown, values: readonly T[], where: string): T {
  const found = text(value, where);
  if (!(values as readonly string[]).includes(found)) return lost(where);
  return found as T;
}

/** A list of strings; an absent optional list projects to an empty one. */
function strings(value: unknown, where: string): readonly string[] {
  return array(value, where).map((entry, index) => text(entry, `${where}[${index}]`));
}

// ------------------------------------------------------------------- manifest

function citations(value: unknown): readonly PackCitation[] {
  return array(value, 'pack.sources').map((entry, index) => {
    const where = `pack.sources[${index}]`;
    const source = asObject(entry, where);
    return {
      title: text(source.title, `${where}.title`),
      issuer: text(source.issuer, `${where}.issuer`),
      url: text(source.url, `${where}.url`),
      retrieved: text(source.retrieved, `${where}.retrieved`),
    };
  });
}

// ------------------------------------------------------------------ structure

function stage(value: unknown, index: number): PackStage {
  const where = `structure.stages[${index}]`;
  const entry = asObject(value, where);
  return {
    code: text(entry.code, `${where}.code`),
    name: text(entry.name, `${where}.name`),
    levels: strings(entry.levels, `${where}.levels`),
  };
}

function level(value: unknown, index: number): PackLevelEntry {
  const where = `structure.levels[${index}]`;
  const entry = asObject(value, where);
  return {
    code: text(entry.code, `${where}.code`),
    name: text(entry.name, `${where}.name`),
    ordinal: number(entry.ordinal, `${where}.ordinal`),
    ...(entry.typical_age === undefined
      ? {}
      : { typical_age: number(entry.typical_age, `${where}.typical_age`) }),
    ...(entry.next === undefined
      ? {}
      : { next: entry.next === null ? null : text(entry.next, `${where}.next`) }),
    ...(entry.is_stage_exit === undefined
      ? {}
      : { is_stage_exit: bool(entry.is_stage_exit, `${where}.is_stage_exit`) }),
    ...(entry.national_assessment === undefined
      ? {}
      : {
          national_assessment:
            entry.national_assessment === null
              ? null
              : text(entry.national_assessment, `${where}.national_assessment`),
        }),
  };
}

type PackLevelEntry = LoadedPack['structure']['levels'][number];

function pathway(value: unknown, index: number): PackPathway {
  const where = `structure.pathways[${index}]`;
  const entry = asObject(value, where);
  return {
    code: text(entry.code, `${where}.code`),
    name: text(entry.name, `${where}.name`),
    levels: strings(entry.levels, `${where}.levels`),
  };
}

function calendarTemplate(value: unknown, where: string): PackCalendar {
  const entry = asObject(value, where);
  return {
    ...(entry.code === undefined ? {} : { code: text(entry.code, `${where}.code`) }),
    ...(entry.name === undefined ? {} : { name: text(entry.name, `${where}.name`) }),
    year_kind: oneOf(entry.year_kind, ['calendar_year', 'academic_year'] as const, `${where}.year_kind`),
    periods: array(entry.periods, `${where}.periods`).map((item, index) => {
      const at = `${where}.periods[${index}]`;
      const period = asObject(item, at);
      return {
        ...(period.code === undefined ? {} : { code: text(period.code, `${at}.code`) }),
        kind: oneOf(
          period.kind,
          ['term', 'semester', 'trimester', 'quarter', 'half_term'] as const,
          `${at}.kind`
        ),
        sequence: number(period.sequence, `${at}.sequence`),
        name: text(period.name, `${at}.name`),
        typical: strings(period.typical, `${at}.typical`),
        ...(period.half_term === undefined
          ? {}
          : { half_term: bool(period.half_term, `${at}.half_term`) }),
      };
    }),
    ...(entry.note === undefined ? {} : { note: text(entry.note, `${where}.note`) }),
  };
}

/**
 * Projects `structure.calendar_template`: one template, or named variants with a default.
 * `calendar` is the template a programme starts from; `calendars` keeps declaration order.
 */
function calendars(value: unknown): { calendar: PackCalendar; calendars: readonly PackCalendar[] } {
  const where = 'structure.calendar_template';
  const entry = asObject(value, where);
  if (entry.variants === undefined) {
    const single = calendarTemplate(entry, where);
    return { calendar: single, calendars: [single] };
  }
  const variants = array(entry.variants, `${where}.variants`).map((item, index) =>
    calendarTemplate(item, `${where}.variants[${index}]`)
  );
  const defaultCode = text(entry.default, `${where}.default`);
  const chosen = variants.find((variant) => variant.code === defaultCode);
  if (chosen === undefined) return lost(`${where}.default`);
  return { calendar: chosen, calendars: variants };
}

// -------------------------------------------------------------- learning areas

function component(value: unknown, index: number, areaCode: string): PackComponent {
  const where = `learning_areas.learning_areas[${areaCode}].components[${index}]`;
  const entry = asObject(value, where);
  return {
    code: text(entry.code, `${where}.code`),
    name: text(entry.name, `${where}.name`),
    kind: oneOf<ComponentKind>(
      entry.kind,
      ['paper', 'practical', 'coursework', 'oral', 'project', 'strand'],
      `${where}.kind`
    ),
    ...(entry.levels === undefined ? {} : { levels: strings(entry.levels, `${where}.levels`) }),
    ...(entry.weight === undefined ? {} : { weight: number(entry.weight, `${where}.weight`) }),
    ...(entry.max_score === undefined
      ? {}
      : { max_score: number(entry.max_score, `${where}.max_score`) }),
  };
}

function learningArea(value: unknown, index: number): PackLearningArea {
  const where = `learning_areas.learning_areas[${index}]`;
  const entry = asObject(value, where);
  const code = text(entry.code, `${where}.code`);
  return {
    code,
    name: text(entry.name, `${where}.name`),
    ...(entry.short_name === undefined
      ? {}
      : { short_name: text(entry.short_name, `${where}.short_name`) }),
    kind: oneOf<LearningAreaKind>(
      entry.kind,
      ['core', 'optional', 'elective', 'co_curricular', 'pastoral'],
      `${where}.kind`
    ),
    ...(entry.group === undefined ? {} : { group: text(entry.group, `${where}.group`) }),
    ...(entry.coefficient === undefined
      ? {}
      : { coefficient: number(entry.coefficient, `${where}.coefficient`) }),
    levels: strings(entry.levels, `${where}.levels`),
    ...(entry.national_code === undefined
      ? {}
      : {
          national_code:
            entry.national_code === null
              ? null
              : text(entry.national_code, `${where}.national_code`),
        }),
    components: array(entry.components ?? [], `${where}.components`).map((item, at) =>
      component(item, at, code)
    ),
    pathways: strings(entry.pathways ?? [], `${where}.pathways`),
    alternatives: strings(entry.alternatives ?? [], `${where}.alternatives`),
    grade_scales: array(entry.grade_scales ?? [], `${where}.grade_scales`).map((item, index) => {
      const at = `${where}.grade_scales[${index}]`;
      const choice = asObject(item, at);
      return {
        levels: strings(choice.levels, `${at}.levels`),
        scale: text(choice.scale, `${at}.scale`),
      };
    }),
    ...(entry.outcomes_ref === undefined
      ? {}
      : { outcomes_ref: text(entry.outcomes_ref, `${where}.outcomes_ref`) }),
  };
}

function competency(value: unknown, index: number): PackCompetency {
  const where = `learning_areas.competencies[${index}]`;
  const entry = asObject(value, where);
  return {
    code: text(entry.code, `${where}.code`),
    name: text(entry.name, `${where}.name`),
    kind: oneOf<CompetencyKind>(
      entry.kind,
      ['core_competency', 'value', 'pertinent_issue', 'attitude'],
      `${where}.kind`
    ),
    descriptors: strings(entry.descriptors ?? [], `${where}.descriptors`),
  };
}

function combinationRule(value: unknown, index: number): PackCombinationRule {
  const where = `learning_areas.combination_rules[${index}]`;
  const entry = asObject(value, where);
  return {
    levels: strings(entry.levels, `${where}.levels`),
    rule: oneOf(entry.rule, ['core_all', 'electives', 'group'] as const, `${where}.rule`),
    of: strings(entry.of ?? [], `${where}.of`),
    ...(entry.count === undefined ? {} : { count: number(entry.count, `${where}.count`) }),
    ...(entry.max === undefined ? {} : { max: number(entry.max, `${where}.max`) }),
    ...(entry.group === undefined ? {} : { group: text(entry.group, `${where}.group`) }),
    ...(entry.min === undefined ? {} : { min: number(entry.min, `${where}.min`) }),
    ...(entry.from_pathway === undefined
      ? {}
      : { from_pathway: bool(entry.from_pathway, `${where}.from_pathway`) }),
  };
}

// ----------------------------------------------------------------- assessment

const SLOT_KINDS: readonly SlotKind[] = [
  'formative',
  'cat',
  'opener',
  'mid_term',
  'end_term',
  'mock',
  'project',
  'practical',
  'portfolio',
  'national',
];

const MISSING_POLICIES: readonly MissingPolicy[] = [
  'zero',
  'exclude',
  'incomplete',
  'carry_previous',
];

function slot(value: unknown, index: number, schemeCode: string): PackSlot {
  const where = `assessment.schemes[${schemeCode}].slots[${index}]`;
  const entry = asObject(value, where);
  return {
    code: text(entry.code, `${where}.code`),
    label: text(entry.label, `${where}.label`),
    kind: oneOf<SlotKind>(entry.kind, SLOT_KINDS, `${where}.kind`),
    ...(entry.max === undefined ? {} : { max: number(entry.max, `${where}.max`) }),
    ...(entry.scale_to === undefined
      ? {}
      : { scale_to: number(entry.scale_to, `${where}.scale_to`) }),
    ...(entry.multi === undefined ? {} : { multi: bool(entry.multi, `${where}.multi`) }),
    ...(entry.combine === undefined
      ? {}
      : { combine: oneOf(entry.combine, ['mean', 'sum', 'best_of'] as const, `${where}.combine`) }),
  };
}

function areaScore(value: unknown, schemeCode: string): PackAreaScore {
  const where = `assessment.schemes[${schemeCode}].learning_area_score`;
  const entry = asObject(value, where);
  return {
    op: oneOf(entry.op, ['sum', 'mean'] as const, `${where}.op`),
    of: strings(entry.of, `${where}.of`),
    out_of: number(entry.out_of, `${where}.out_of`),
  };
}

function componentPolicy(value: unknown, schemeCode: string): ComponentPolicyEntry {
  const where = `assessment.schemes[${schemeCode}].component_policy`;
  const entry = asObject(value, where);
  return {
    papers: oneOf<ComponentCombine>(
      entry.papers,
      ['sum', 'scale_each_then_sum', 'weighted', 'best_of'],
      `${where}.papers`
    ),
    out_of: number(entry.out_of, `${where}.out_of`),
    ...(entry.weights === undefined
      ? {}
      : { weights: componentWeights(entry.weights, `${where}.weights`) }),
    ...(entry.best_of === undefined
      ? {}
      : { best_of: number(entry.best_of, `${where}.best_of`) }),
  };
}

/** `component_policy.weights`: learning-area code -> component code -> share. */
function componentWeights(
  value: unknown,
  where: string
): Readonly<Record<string, Readonly<Record<string, number>>>> {
  const areas = asObject(value, where);
  const result: Record<string, Readonly<Record<string, number>>> = {};
  for (const area of Object.keys(areas)) {
    const weights = asObject(areas[area], `${where}.${area}`);
    const mapped: Record<string, number> = {};
    for (const code of Object.keys(weights)) {
      mapped[code] = number(weights[code], `${where}.${area}.${code}`);
    }
    result[area] = mapped;
  }
  return result;
}

type ComponentPolicyEntry = NonNullable<PackMarksScheme['component_policy']>;

function missingMap(value: unknown, schemeCode: string): Readonly<Record<string, MissingPolicy>> {
  const where = `assessment.schemes[${schemeCode}].missing`;
  const entry = asObject(value, where);
  const result: Record<string, MissingPolicy> = {};
  for (const key of Object.keys(entry)) {
    result[key] = oneOf<MissingPolicy>(entry[key], MISSING_POLICIES, `${where}.${key}`);
  }
  return result;
}

function summativeSlot(value: unknown, index: number, schemeCode: string): PackSummativeSlot {
  const where = `assessment.schemes[${schemeCode}].summative_slots[${index}]`;
  const entry = asObject(value, where);
  return {
    code: text(entry.code, `${where}.code`),
    label: text(entry.label, `${where}.label`),
    max: number(entry.max, `${where}.max`),
    maps_to: text(entry.maps_to, `${where}.maps_to`),
  };
}

function scheme(value: unknown, index: number): PackScheme {
  const where = `assessment.schemes[${index}]`;
  const entry = asObject(value, where);
  const code = text(entry.code, `${where}.code`);
  const levels = strings(entry.levels, `${where}.levels`);
  const overridable = strings(entry.overridable ?? [], `${where}.overridable`);

  if (entry.slots !== undefined) {
    return {
      kind: 'marks',
      code,
      levels,
      overridable,
      slots: array(entry.slots, `${where}.slots`).map((item, at) => slot(item, at, code)),
      learning_area_score: areaScore(entry.learning_area_score, code),
      grading_scale: text(entry.grading_scale, `${where}.grading_scale`),
      missing: entry.missing === undefined ? {} : missingMap(entry.missing, code),
      ...(entry.component_policy === undefined
        ? {}
        : { component_policy: componentPolicy(entry.component_policy, code) }),
      rounding: array(entry.rounding ?? [], `${where}.rounding`).map((item, at) => {
        const rule = asObject(item, `${where}.rounding[${at}]`);
        return {
          stage: text(rule.stage, `${where}.rounding[${at}].stage`),
          precision: number(rule.precision, `${where}.rounding[${at}].precision`),
          mode: oneOf(
            rule.mode,
            ['half_up', 'half_down', 'half_even', 'up', 'down'] as const,
            `${where}.rounding[${at}].mode`
          ),
        };
      }),
    };
  }

  const judgement = asObject(entry.term_judgement, `${where}.term_judgement`);
  return {
    kind: 'formative',
    code,
    levels,
    overridable,
    evidence: 'rubric_observations',
    observation_scale: text(entry.observation_scale, `${where}.observation_scale`),
    term_judgement: {
      op: 'teacher_best_fit',
      ...(judgement.suggest === undefined
        ? {}
        : { suggest: text(judgement.suggest, `${where}.term_judgement.suggest`) }),
    },
    summative_slots: array(entry.summative_slots ?? [], `${where}.summative_slots`).map(
      (item, at) => summativeSlot(item, at, code)
    ),
    report_shows: strings(entry.report_shows, `${where}.report_shows`),
  };
}

function band(value: unknown, index: number, scaleCode: string): PackBand {
  const where = `assessment.grading_scales[${scaleCode}].bands[${index}]`;
  const entry = asObject(value, where);
  return {
    code: text(entry.code, `${where}.code`),
    label: text(entry.label, `${where}.label`),
    min: number(entry.min, `${where}.min`),
    max: number(entry.max, `${where}.max`),
    ...(entry.points === undefined ? {} : { points: number(entry.points, `${where}.points`) }),
    ...(entry.descriptor === undefined
      ? {}
      : { descriptor: text(entry.descriptor, `${where}.descriptor`) }),
  };
}

function gradingScale(value: unknown, index: number): PackGradingScale {
  const where = `assessment.grading_scales[${index}]`;
  const entry = asObject(value, where);
  const code = text(entry.code, `${where}.code`);
  // `out_of_20` is the deprecated spelling of the entity's `mark_out_of_20` (spec 02 §8).
  const kind = oneOf<GradingScaleKind | 'out_of_20'>(
    entry.kind,
    ['numeric_bands', 'rubric', 'letter', 'points', 'division', 'gpa', 'mark_out_of_20', 'out_of_20', 'descriptor'],
    `${where}.kind`
  );
  return {
    code,
    kind: kind === 'out_of_20' ? 'mark_out_of_20' : kind,
    ...(entry.input === undefined ? {} : { input: text(entry.input, `${where}.input`) }),
    ...(entry.upper === undefined
      ? {}
      : { upper: oneOf(entry.upper, ['inclusive', 'exclusive'] as const, `${where}.upper`) }),
    bands: array(entry.bands ?? [], `${where}.bands`).map((item, at) => band(item, at, code)),
    ...(entry.verification === undefined
      ? {}
      : { verification: text(entry.verification, `${where}.verification`) }),
  };
}

function groupConstraint(value: unknown, index: number, aggregationCode: string): GroupConstraint {
  const where = `assessment.aggregations[${aggregationCode}].groups[${index}]`;
  const entry = asObject(value, where);
  if (entry.require_all !== undefined) {
    return { require_all: strings(entry.require_all, `${where}.require_all`) };
  }
  if (entry.group !== undefined) {
    return { group: text(entry.group, `${where}.group`), min: number(entry.min, `${where}.min`) };
  }
  return { fill_from: 'any' };
}

function explicitWeights(
  value: unknown,
  where: string
): 'coefficient' | Readonly<Record<string, number>> {
  if (value === 'coefficient') return 'coefficient';
  const entry = asObject(value, where);
  const result: Record<string, number> = {};
  for (const key of Object.keys(entry)) result[key] = number(entry[key], `${where}.${key}`);
  return result;
}

/** `aggregation.multipliers`: learning-area code -> multiplier. */
function multipliers(value: unknown, where: string): Readonly<Record<string, number>> {
  const entry = asObject(value, where);
  const result: Record<string, number> = {};
  for (const key of Object.keys(entry)) result[key] = number(entry[key], `${where}.${key}`);
  return result;
}

function aggregation(value: unknown, index: number): PackAggregation {
  const where = `assessment.aggregations[${index}]`;
  const entry = asObject(value, where);
  const code = text(entry.code, `${where}.code`);
  return {
    code,
    op: oneOf<AggregationOp>(
      entry.op,
      [
        'sum',
        'mean',
        'weighted_mean',
        'best_n',
        'points_mean',
        'sum_points',
        'gpa',
        'count_where',
        'rubric_profile',
      ],
      `${where}.op`
    ),
    ...(entry.n === undefined ? {} : { n: number(entry.n, `${where}.n`) }),
    ...(entry.value === undefined
      ? {}
      : {
          value: oneOf<AggregationValue>(
            entry.value,
            ['points', 'grade_points', 'score', 'score_20', 'grade', 'rubric_level'],
            `${where}.value`
          ),
        }),
    groups: array(entry.groups ?? [], `${where}.groups`).map((item, at) =>
      groupConstraint(item, at, code)
    ),
    ...postStep(entry.then, where),
    over: strings(entry.over ?? [], `${where}.over`),
    ...failCondition(entry.fail_if, where),
    ...(entry.weights === undefined
      ? {}
      : { weights: explicitWeights(entry.weights, `${where}.weights`) }),
    ...(entry.multipliers === undefined
      ? {}
      : { multipliers: multipliers(entry.multipliers, `${where}.multipliers`) }),
    ...(entry.divisor === undefined
      ? {}
      : {
          divisor:
            entry.divisor === 'sum_of_multipliers'
              ? ('sum_of_multipliers' as const)
              : number(entry.divisor, `${where}.divisor`),
        }),
    ...(entry.precision === undefined
      ? {}
      : { precision: number(entry.precision, `${where}.precision`) }),
    ...(entry.result_scale === undefined
      ? {}
      : { result_scale: text(entry.result_scale, `${where}.result_scale`) }),
  };
}

function postStep(value: unknown, where: string): { then?: NonNullable<PackAggregation['then']> } {
  if (value === undefined) return {};
  const at = `${where}.then`;
  const entry = asObject(value, at);
  return {
    then: {
      op: oneOf(entry.op, ['mean', 'sum', 'lookup'] as const, `${at}.op`),
      ...(entry.precision === undefined
        ? {}
        : { precision: number(entry.precision, `${at}.precision`) }),
    },
  };
}

function failCondition(
  value: unknown,
  where: string
): { fail_if?: NonNullable<PackAggregation['fail_if']> } {
  if (value === undefined) return {};
  const at = `${where}.fail_if`;
  const entry = asObject(value, at);
  return {
    fail_if: {
      any_grade: text(entry.any_grade, `${at}.any_grade`),
      in: strings(entry.in ?? [], `${at}.in`),
      then_max_division: text(entry.then_max_division, `${at}.then_max_division`),
    },
  };
}

function annual(value: unknown): PackAnnual {
  const where = 'assessment.annual';
  const entry = asObject(value, where);
  let of: PackAnnual['of'];
  if (Array.isArray(entry.of)) {
    of = strings(entry.of, `${where}.of`);
  } else if (entry.of !== undefined) {
    const weights = asObject(entry.of, `${where}.of`);
    const mapped: Record<string, number> = {};
    for (const key of Object.keys(weights)) {
      mapped[key] = number(weights[key], `${where}.of.${key}`);
    }
    of = mapped;
  }
  return {
    op: oneOf(
      entry.op,
      ['weighted_mean', 'mean', 'final_period_only', 'cumulative_sum', 'best_of'] as const,
      `${where}.op`
    ),
    ...(of === undefined ? {} : { of }),
    ...(entry.missing === undefined
      ? {}
      : {
          missing: oneOf(
            entry.missing,
            [...MISSING_POLICIES, 'renormalise'] as const,
            `${where}.missing`
          ),
        }),
    ...(entry.n === undefined ? {} : { n: number(entry.n, `${where}.n`) }),
  };
}

function ranking(value: unknown): PackRanking {
  const where = 'assessment.ranking';
  const entry = asObject(value, where);
  return {
    enabled: bool(entry.enabled, `${where}.enabled`),
    ...(entry.scope === undefined
      ? {}
      : { scope: oneOf(entry.scope, ['class_group', 'level', 'programme'] as const, `${where}.scope`) }),
    ...(entry.by === undefined ? {} : { by: text(entry.by, `${where}.by`) }),
    ...(entry.ties === undefined
      ? {}
      : {
          ties: oneOf(
            entry.ties,
            ['competition_1224', 'dense_1223', 'shared_average'] as const,
            `${where}.ties`
          ),
        }),
    ...(entry.only_complete === undefined
      ? {}
      : { only_complete: bool(entry.only_complete, `${where}.only_complete`) }),
    ...(entry.show_on_report === undefined
      ? {}
      : { show_on_report: bool(entry.show_on_report, `${where}.show_on_report`) }),
    ...(entry.show_out_of === undefined
      ? {}
      : { show_out_of: bool(entry.show_out_of, `${where}.show_out_of`) }),
  };
}

function assessment(value: unknown): PackAssessment {
  const entry = asObject(value, 'assessment');
  return {
    schemes: array(entry.schemes, 'assessment.schemes').map((item, at) => scheme(item, at)),
    gradingScales: array(entry.grading_scales, 'assessment.grading_scales').map((item, at) =>
      gradingScale(item, at)
    ),
    aggregations: array(entry.aggregations ?? [], 'assessment.aggregations').map((item, at) =>
      aggregation(item, at)
    ),
    ranking: entry.ranking === undefined ? null : ranking(entry.ranking),
    annual: entry.annual === undefined ? null : annual(entry.annual),
  };
}

// ---------------------------------------------------------------- progression

function condition(value: unknown, where: string): PackCondition {
  const entry = asObject(value, where);
  return { metric: text(entry.metric, `${where}.metric`), gte: number(entry.gte, `${where}.gte`) };
}

function promotionRule(value: unknown, index: number): PackPromotionRule {
  const where = `progression.progression[${index}]`;
  const entry = asObject(value, where);
  return {
    levels: strings(entry.levels, `${where}.levels`),
    rule: oneOf<PromotionRule>(
      entry.rule,
      ['automatic', 'stage_transition', 'threshold', 'class_council'],
      `${where}.rule`
    ),
    ...(entry.to_stage === undefined ? {} : { to_stage: text(entry.to_stage, `${where}.to_stage`) }),
    requires: strings(entry.requires ?? [], `${where}.requires`),
    conditions: array(entry.conditions ?? [], `${where}.conditions`).map((item, at) =>
      condition(item, `${where}.conditions[${at}]`)
    ),
    ...(entry.else === undefined
      ? {}
      : { else: oneOf(entry.else, ['repeat', 'repeat_or_council'] as const, `${where}.else`) }),
    ...(entry.suggest === undefined
      ? {}
      : { suggest: condition(entry.suggest, `${where}.suggest`) }),
  };
}

function progression(value: unknown): PackProgression {
  const entry = asObject(value, 'progression');
  return {
    progression: array(entry.progression, 'progression.progression').map((item, at) =>
      promotionRule(item, at)
    ),
    graduation: array(entry.graduation ?? [], 'progression.graduation').map((item, at) => {
      const where = `progression.graduation[${at}]`;
      return { levels: strings(asObject(item, where).levels, `${where}.levels`) };
    }),
  };
}

// -------------------------------------------------------------------- reports

const REPORT_BLOCK_TYPES: readonly ReportBlockType[] = [
  'header',
  'learner',
  'attendance',
  'results_table',
  'rubric_table',
  'competencies',
  'affective_psychomotor',
  'co_curricular',
  'summary',
  'comments',
  'progression',
  'fees',
  'calendar',
  'signatures',
  'verification',
];

function reportBlock(value: unknown, index: number, reportCode: string): PackReportBlock {
  const where = `reports[${reportCode}].blocks[${index}]`;
  const entry = asObject(value, where);
  return {
    type: oneOf<ReportBlockType>(entry.type, REPORT_BLOCK_TYPES, `${where}.type`),
    ...(entry.label_key === undefined
      ? {}
      : { label_key: text(entry.label_key, `${where}.label_key`) }),
    columns: strings(entry.columns ?? [], `${where}.columns`),
  };
}

function reportPage(value: unknown, reportCode: string): PackReportPage {
  const where = `reports[${reportCode}].page`;
  const entry = asObject(value, where);
  return {
    ...(entry.size === undefined
      ? {}
      : { size: oneOf(entry.size, ['A4', 'A5'] as const, `${where}.size`) }),
    ...(entry.orientation === undefined
      ? {}
      : {
          orientation: oneOf(
            entry.orientation,
            ['portrait', 'landscape'] as const,
            `${where}.orientation`
          ),
        }),
  };
}

function report(value: unknown, index: number): PackReport {
  const where = `reports[${index}]`;
  const entry = asObject(value, where);
  const code = text(entry.code, `${where}.code`);
  return {
    code,
    name: text(entry.name, `${where}.name`),
    levels: strings(entry.levels, `${where}.levels`),
    page: entry.page === undefined ? null : reportPage(entry.page, code),
    blocks: array(entry.blocks, `${where}.blocks`).map((item, at) => reportBlock(item, at, code)),
    ...(entry.comment_max_length === undefined
      ? {}
      : { comment_max_length: number(entry.comment_max_length, `${where}.comment_max_length`) }),
  };
}

// -------------------------------------------------------------------- locales

function stringMap(value: unknown, where: string): Readonly<Record<string, string>> {
  const entry = asObject(value, where);
  const result: Record<string, string> = {};
  for (const key of Object.keys(entry)) result[key] = text(entry[key], `${where}.${key}`);
  return result;
}

function commentSeed(value: unknown, index: number, localeTag: string): PackCommentSeed {
  const where = `locales[${localeTag}].comment_bank[${index}]`;
  const entry = asObject(value, where);
  return {
    scope: oneOf(entry.scope, ['learning_area', 'overall', 'conduct'] as const, `${where}.scope`),
    band: text(entry.band, `${where}.band`),
    text: text(entry.text, `${where}.text`),
    ...(entry.learning_area === undefined
      ? {}
      : { learning_area: text(entry.learning_area, `${where}.learning_area`) }),
  };
}

function locale(localeTag: string, value: unknown): PackLocale {
  const where = `locales[${localeTag}]`;
  const entry = asObject(value, where);
  const descriptors: Record<string, Readonly<Record<string, string>>> = {};
  if (entry.descriptors !== undefined) {
    const scales = asObject(entry.descriptors, `${where}.descriptors`);
    for (const scale of Object.keys(scales)) {
      descriptors[scale] = stringMap(scales[scale], `${where}.descriptors.${scale}`);
    }
  }
  return {
    locale: localeTag,
    labels: entry.labels === undefined ? {} : stringMap(entry.labels, `${where}.labels`),
    descriptors,
    comment_bank: array(entry.comment_bank ?? [], `${where}.comment_bank`).map((item, at) =>
      commentSeed(item, at, localeTag)
    ),
  };
}

// -------------------------------------------------------------------- vectors

type Scalar = string | number | boolean | null;

/** A JSON value at any depth; `tests.schema.json#/$defs/inputValue` accepts the same. */
type JsonValue =
  | Scalar
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

function scalarMap(value: unknown, where: string): Readonly<Record<string, Scalar>> {
  const entry = asObject(value, where);
  const result: Record<string, Scalar> = {};
  for (const key of Object.keys(entry)) {
    const raw = entry[key];
    if (raw === null || typeof raw === 'string' || typeof raw === 'boolean') result[key] = raw;
    else if (typeof raw === 'number' && Number.isFinite(raw)) result[key] = raw;
    else return lost(`${where}.${key}`);
  }
  return result;
}

function jsonValue(value: unknown, where: string): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map((item, index) => jsonValue(item, `${where}[${index}]`));
  if (isRecord(value)) {
    const result: Record<string, JsonValue> = {};
    for (const key of Object.keys(value)) result[key] = jsonValue(value[key], `${where}.${key}`);
    return result;
  }
  return lost(where);
}

function vector(value: unknown, index: number): PackVector {
  const where = `tests.vectors[${index}]`;
  const entry = asObject(value, where);
  const input = asObject(entry.input, `${where}.input`);
  const inputValues: Record<string, JsonValue> = {};
  for (const key of Object.keys(input)) {
    inputValues[key] = jsonValue(input[key], `${where}.input.${key}`);
  }

  const expect = asObject(entry.expect, `${where}.expect`);
  const aggregates: Record<string, Readonly<Record<string, Scalar>>> = {};
  for (const key of Object.keys(expect)) {
    if (key === 'selected') continue;
    aggregates[key] = scalarMap(expect[key], `${where}.expect.${key}`);
  }

  return {
    name: text(entry.name, `${where}.name`),
    ...(entry.programme === undefined
      ? {}
      : { programme: text(entry.programme, `${where}.programme`) }),
    input: inputValues,
    expect: {
      selected: strings(expect.selected ?? [], `${where}.expect.selected`),
      aggregates,
    },
  };
}

// ----------------------------------------------------------------------- load

/**
 * Validates a parsed pack and returns its typed form.
 *
 * The shape check mirrors `packs/schema/pack.schema.json`; the rule check mirrors the runtime
 * rules those schemas document as unexpressible. A pack with one issue of either kind is refused
 * whole: the loader never returns a partially loaded pack.
 */
export function loadPack(document: unknown): PackLoadResult {
  const shapeIssues: PackIssue[] = [];
  checkShape(document, PACK_DOCUMENT_SHAPE, '', shapeIssues);
  if (shapeIssues.length > 0) return { ok: false, issues: shapeIssues };

  const ruleIssues = checkPackRules(document);
  if (ruleIssues.length > 0) return { ok: false, issues: ruleIssues };

  const root = asObject(document, 'document');
  const manifest = asObject(root.pack, 'pack');
  const structure = asObject(root.structure, 'structure');
  const learningAreas = asObject(root.learning_areas, 'learning_areas');
  const verification = asObject(manifest.verification, 'pack.verification');

  const code = text(manifest.code, 'pack.code');
  const version = text(manifest.version, 'pack.version');
  const localeTags = Object.keys(asObject(root.locales, 'locales'));

  const pack: LoadedPack = {
    code,
    version,
    ref: packRef(code, version),
    name: text(manifest.name, 'pack.name'),
    country: text(manifest.country, 'pack.country'),
    effective_from: text(manifest.effective_from, 'pack.effective_from'),
    requires_engine: text(manifest.requires_engine, 'pack.requires_engine'),
    supersedes:
      manifest.supersedes === undefined ? null : text(manifest.supersedes, 'pack.supersedes'),
    issuers: strings(manifest.issuers, 'pack.issuers'),
    languages: strings(manifest.languages, 'pack.languages'),
    citations: citations(manifest.sources),
    verification: {
      status: oneOf(
        verification.status,
        ['draft', 'reviewed', 'verified'] as const,
        'pack.verification.status'
      ),
      verified_by: strings(verification.verified_by, 'pack.verification.verified_by'),
      ...(verification.notes === undefined
        ? {}
        : { notes: text(verification.notes, 'pack.verification.notes') }),
    },
    overridable: strings(manifest.overridable ?? [], 'pack.overridable'),
    structure: {
      stages: array(structure.stages, 'structure.stages').map((item, at) => stage(item, at)),
      levels: array(structure.levels, 'structure.levels').map((item, at) => level(item, at)),
      pathways: array(structure.pathways ?? [], 'structure.pathways').map((item, at) =>
        pathway(item, at)
      ),
      ...calendars(structure.calendar_template),
    },
    learningAreas: array(learningAreas.learning_areas, 'learning_areas.learning_areas').map(
      (item, at) => learningArea(item, at)
    ),
    competencies: array(learningAreas.competencies, 'learning_areas.competencies').map(
      (item, at) => competency(item, at)
    ),
    combinationRules: array(
      learningAreas.combination_rules ?? [],
      'learning_areas.combination_rules'
    ).map((item, at) => combinationRule(item, at)),
    assessment: assessment(root.assessment),
    progression: progression(root.progression),
    reports: array(root.reports, 'reports').map((item, at) => report(item, at)),
    locales: localeTags.map((tag) =>
      locale(tag, asObject(root.locales, 'locales')[tag])
    ),
    vectors: array(asObject(root.tests, 'tests').vectors, 'tests.vectors').map((item, at) =>
      vector(item, at)
    ),
  };

  return { ok: true, pack };
}
