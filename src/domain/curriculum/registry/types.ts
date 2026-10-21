// ABOUTME: The typed model the pack registry works on: the issues a refused pack reports, the
// ABOUTME: loaded pack, programme overrides, upgrade previews and the registry's error codes.

// ------------------------------------------------------------------ references

/** A pinned pack reference, `code@version` (spec 03 §2.3). */
export type PackRef = `${string}@${string}`;

/** The identity every pack-derived record carries. */
export interface PackIdentity {
  readonly code: string;
  readonly version: string;
  /** `code@version`, the form a programme pins. */
  readonly ref: PackRef;
}

export function packRef(code: string, version: string): PackRef {
  return `${code}@${version}`;
}

// --------------------------------------------------------------------- issues

/**
 * The name of the check a pack failed. The first group are JSON-Schema keywords, exactly as
 * `packs/schema/*.json` states them; the second group are the runtime rules spec 03 cannot
 * express in the schema (P2-A01's `packSemantics.ts` is their executable specification).
 */
export type PackCheckName =
  | 'required'
  | 'additionalProperties'
  | 'type'
  | 'enum'
  | 'const'
  | 'pattern'
  | 'minLength'
  | 'maxLength'
  | 'minimum'
  | 'maximum'
  | 'exclusiveMinimum'
  | 'minItems'
  | 'maxItems'
  | 'uniqueItems'
  | 'minProperties'
  | 'oneOf'
  | 'anyOf'
  | 'unique_codes'
  | 'dangling_reference'
  | 'weight_sum'
  | 'band_order'
  | 'band_overlap'
  | 'band_gap'
  | 'locale_coverage'
  | 'impossible_date'
  | 'single_instance_block'
  | 'out_of_scope'
  | 'duplicate_rule'
  | 'programme_mismatch'
  | 'coefficient_missing'
  | 'component_collision'
  | 'calendar_variant'
  | 'unsatisfiable_rule'
  | 'multiplier_scope'
  | 'grade_scale_conflict';

/** One reason a pack was refused, with the check that caught it and the path at fault. */
export interface PackIssue {
  readonly check: PackCheckName;
  /** Dotted path into the pack document, for example `structure.levels[G7].next`. */
  readonly path: string;
  /** A developer diagnostic; never composed for display. */
  readonly message: string;
}

export type PackLoadResult =
  | { readonly ok: true; readonly pack: LoadedPack }
  | { readonly ok: false; readonly issues: readonly PackIssue[] };

// ----------------------------------------------------------------------- pack

export interface PackCitation {
  readonly title: string;
  readonly issuer: string;
  readonly url: string;
  readonly retrieved: string;
}

export interface PackVerification {
  /** `draft` is unreviewed; `reviewed` had a named reviewer; `verified` is reviewed and released. */
  readonly status: 'draft' | 'reviewed' | 'verified';
  readonly verified_by: readonly string[];
  readonly notes?: string;
}

export interface PackStage {
  readonly code: string;
  readonly name: string;
  readonly levels: readonly string[];
}

export interface PackLevel {
  readonly code: string;
  readonly name: string;
  readonly ordinal: number;
  readonly typical_age?: number;
  /** The level a learner moves to; null ends the programme. */
  readonly next?: string | null;
  readonly is_stage_exit?: boolean;
  readonly national_assessment?: string | null;
}

export interface PackPathway {
  readonly code: string;
  readonly name: string;
  readonly levels: readonly string[];
}

export interface PackCalendarPeriod {
  readonly code?: string;
  readonly kind: 'term' | 'semester' | 'trimester' | 'quarter' | 'half_term';
  readonly sequence: number;
  readonly name: string;
  readonly typical: readonly string[];
  readonly half_term?: boolean;
}

export interface PackCalendar {
  /** Variant code; absent on a single template. */
  readonly code?: string;
  readonly name?: string;
  readonly year_kind: 'calendar_year' | 'academic_year';
  readonly periods: readonly PackCalendarPeriod[];
  readonly note?: string;
}

export interface PackStructure {
  readonly stages: readonly PackStage[];
  readonly levels: readonly PackLevel[];
  readonly pathways: readonly PackPathway[];
  /** The template a programme starts from: the only one, or the default variant. */
  readonly calendar: PackCalendar;
  /** Every declared template in declaration order. One entry for a single-template pack. */
  readonly calendars: readonly PackCalendar[];
}

export type LearningAreaKind = 'core' | 'optional' | 'elective' | 'co_curricular' | 'pastoral';
export type ComponentKind = 'paper' | 'practical' | 'coursework' | 'oral' | 'project' | 'strand';
export type CompetencyKind = 'core_competency' | 'value' | 'pertinent_issue' | 'attitude';

export interface PackComponent {
  readonly code: string;
  readonly name: string;
  readonly kind: ComponentKind;
  /** Levels the component is offered at; absent means every level of the learning area. */
  readonly levels?: readonly string[];
  /** Share of the learning-area score when the scheme weights its papers; a policy weight wins. */
  readonly weight?: number;
  readonly max_score?: number;
}

export interface PackGradeScaleChoice {
  readonly levels: readonly string[];
  /** Grading scale code used for this learning area at those levels. */
  readonly scale: string;
}

export interface PackLearningArea {
  readonly code: string;
  readonly name: string;
  readonly short_name?: string;
  readonly kind: LearningAreaKind;
  /** Subject group used by aggregation constraints (spec 03 §6). */
  readonly group?: string;
  /** Required when an aggregation weights by coefficient (spec 03 §6). */
  readonly coefficient?: number;
  readonly levels: readonly string[];
  readonly national_code?: string | null;
  readonly components: readonly PackComponent[];
  readonly pathways: readonly string[];
  readonly alternatives: readonly string[];
  /** Per-level grade-scale choice, for a subject examined on two syllabuses. */
  readonly grade_scales: readonly PackGradeScaleChoice[];
  /** Relative path to the outcomes file the pack ships for this learning area (spec 03 §3). */
  readonly outcomes_ref?: string;
}

export interface PackCompetency {
  readonly code: string;
  readonly name: string;
  readonly kind: CompetencyKind;
  readonly descriptors: readonly string[];
}

export type CombinationRule = 'core_all' | 'electives' | 'group';

export interface PackCombinationRule {
  readonly levels: readonly string[];
  readonly rule: CombinationRule;
  /** Learning areas the rule is about, `|` separating alternatives (spec 03 §3). */
  readonly of: readonly string[];
  readonly count?: number;
  /** Upper bound on the choices the rule counts. */
  readonly max?: number;
  /** Learning-area group the `group` rule counts. */
  readonly group?: string;
  /** Least number of choices the `group` rule requires. */
  readonly min?: number;
  readonly from_pathway?: boolean;
}

export type SlotKind =
  | 'formative'
  | 'cat'
  | 'opener'
  | 'mid_term'
  | 'end_term'
  | 'mock'
  | 'project'
  | 'practical'
  | 'portfolio'
  | 'national';

export interface PackSlot {
  readonly code: string;
  readonly label: string;
  readonly kind: SlotKind;
  readonly max?: number;
  readonly scale_to?: number;
  readonly multi?: boolean;
  readonly combine?: 'mean' | 'sum' | 'best_of';
}

export type MissingPolicy = 'zero' | 'exclude' | 'incomplete' | 'carry_previous';

export interface PackAreaScore {
  readonly op: 'sum' | 'mean';
  readonly of: readonly string[];
  readonly out_of: number;
}

export type ComponentCombine = 'sum' | 'scale_each_then_sum' | 'weighted' | 'best_of';

export interface PackComponentPolicy {
  readonly papers: ComponentCombine;
  readonly out_of: number;
  /** Per learning-area component weights, keyed by area code then component code. */
  readonly weights?: Readonly<Record<string, Readonly<Record<string, number>>>>;
  readonly best_of?: number;
}

/** The assessment engine's rounding vocabulary, which the pack schema adopts (P2-B01). */
export type RoundingMode = 'half_up' | 'half_down' | 'half_even' | 'up' | 'down';

export interface PackRoundingRule {
  readonly stage: string;
  readonly precision: number;
  readonly mode: RoundingMode;
}

export interface PackSummativeSlot {
  readonly code: string;
  readonly label: string;
  readonly max: number;
  /** Scale code the result maps onto. */
  readonly maps_to: string;
}

interface PackSchemeCommon {
  readonly code: string;
  readonly levels: readonly string[];
  /** Paths inside this scheme a school may override (spec 03 §4). */
  readonly overridable: readonly string[];
}

/** A marks-and-slots scheme (spec 03 §4). */
export interface PackMarksScheme extends PackSchemeCommon {
  readonly kind: 'marks';
  readonly slots: readonly PackSlot[];
  readonly learning_area_score: PackAreaScore;
  readonly grading_scale: string;
  readonly missing: Readonly<Record<string, MissingPolicy>>;
  readonly component_policy?: PackComponentPolicy;
  readonly rounding: readonly PackRoundingRule[];
}

/** A rubric-observation scheme (spec 03 §4, CBC observations). */
export interface PackFormativeScheme extends PackSchemeCommon {
  readonly kind: 'formative';
  readonly evidence: 'rubric_observations';
  readonly observation_scale: string;
  readonly term_judgement: { readonly op: 'teacher_best_fit'; readonly suggest?: string };
  /** Empty for a purely observational scheme, which computes a best-fit rubric level instead. */
  readonly summative_slots: readonly PackSummativeSlot[];
  readonly report_shows: readonly string[];
}

export type PackScheme = PackMarksScheme | PackFormativeScheme;

export type GradingScaleKind =
  | 'numeric_bands'
  | 'rubric'
  | 'letter'
  | 'points'
  | 'division'
  | 'gpa'
  | 'mark_out_of_20'
  | 'descriptor';

export interface PackBand {
  readonly code: string;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly points?: number;
  readonly descriptor?: string;
}

export interface PackGradingScale {
  readonly code: string;
  readonly kind: GradingScaleKind;
  readonly input?: string;
  /** Whether a band's max is inclusive; omitted means exclusive (spec 03 §5). */
  readonly upper?: 'inclusive' | 'exclusive';
  readonly bands: readonly PackBand[];
  readonly verification?: string;
}

export type AggregationOp =
  | 'sum'
  | 'mean'
  | 'weighted_mean'
  | 'best_n'
  | 'points_mean'
  | 'sum_points'
  | 'gpa'
  | 'count_where'
  | 'rubric_profile';

export type AggregationValue =
  | 'points'
  | 'grade_points'
  | 'score'
  | 'score_20'
  | 'grade'
  | 'rubric_level';

export type GroupConstraint =
  | { readonly require_all: readonly string[] }
  | { readonly group: string; readonly min: number }
  | { readonly fill_from: 'any' };

export interface PackAggregation {
  readonly code: string;
  readonly op: AggregationOp;
  readonly n?: number;
  readonly value?: AggregationValue;
  readonly groups: readonly GroupConstraint[];
  readonly then?: { readonly op: 'mean' | 'sum' | 'lookup'; readonly precision?: number };
  readonly over: readonly string[];
  readonly fail_if?: {
    readonly any_grade: string;
    readonly in: readonly string[];
    readonly then_max_division: string;
  };
  /** `'coefficient'` or an explicit map of learning-area code to fraction. */
  readonly weights?: 'coefficient' | Readonly<Record<string, number>>;
  /** Per learning-area multipliers, for a rule that counts a subject twice (Attainment 8). */
  readonly multipliers?: Readonly<Record<string, number>>;
  /** What a multiplied aggregate is divided by, declared rather than implied. */
  readonly divisor?: number | 'sum_of_multipliers';
  readonly precision?: number;
  readonly result_scale?: string;
}

export interface PackRanking {
  readonly enabled: boolean;
  readonly scope?: 'class_group' | 'level' | 'programme';
  readonly by?: string;
  readonly ties?: 'competition_1224' | 'dense_1223' | 'shared_average';
  readonly only_complete?: boolean;
  readonly show_on_report?: boolean;
  readonly show_out_of?: boolean;
}

export interface PackAnnual {
  readonly op: 'weighted_mean' | 'mean' | 'final_period_only' | 'cumulative_sum' | 'best_of';
  /** Period weights by period code, or a list of period codes. */
  readonly of?: Readonly<Record<string, number>> | readonly string[];
  readonly missing?: MissingPolicy | 'renormalise';
  readonly n?: number;
}

export interface PackAssessment {
  readonly schemes: readonly PackScheme[];
  readonly gradingScales: readonly PackGradingScale[];
  readonly aggregations: readonly PackAggregation[];
  readonly ranking: PackRanking | null;
  readonly annual: PackAnnual | null;
}

export type PromotionRule = 'automatic' | 'stage_transition' | 'threshold' | 'class_council';

export interface PackCondition {
  readonly metric: string;
  readonly gte: number;
}

export interface PackPromotionRule {
  readonly levels: readonly string[];
  readonly rule: PromotionRule;
  readonly to_stage?: string;
  readonly requires: readonly string[];
  readonly conditions: readonly PackCondition[];
  readonly else?: 'repeat' | 'repeat_or_council';
  readonly suggest?: PackCondition;
}

export interface PackGraduationRule {
  readonly levels: readonly string[];
}

export interface PackProgression {
  readonly progression: readonly PackPromotionRule[];
  readonly graduation: readonly PackGraduationRule[];
}

export type ReportBlockType =
  | 'header'
  | 'learner'
  | 'attendance'
  | 'results_table'
  | 'rubric_table'
  | 'competencies'
  | 'affective_psychomotor'
  | 'co_curricular'
  | 'summary'
  | 'comments'
  | 'progression'
  | 'fees'
  | 'calendar'
  | 'signatures'
  | 'verification';

export interface PackReportBlock {
  readonly type: ReportBlockType;
  readonly label_key?: string;
  readonly columns: readonly string[];
}

export interface PackReportPage {
  readonly size?: 'A4' | 'A5';
  readonly orientation?: 'portrait' | 'landscape';
}

export interface PackReport {
  readonly code: string;
  readonly name: string;
  readonly levels: readonly string[];
  readonly page: PackReportPage | null;
  readonly blocks: readonly PackReportBlock[];
  readonly comment_max_length?: number;
}

export interface PackCommentSeed {
  readonly scope: 'learning_area' | 'overall' | 'conduct';
  readonly band: string;
  readonly text: string;
  readonly learning_area?: string;
}

export interface PackLocale {
  /** The BCP 47 language tag the locale is filed under. */
  readonly locale: string;
  readonly labels: Readonly<Record<string, string>>;
  readonly descriptors: Readonly<Record<string, Readonly<Record<string, string>>>>;
  readonly comment_bank: readonly PackCommentSeed[];
}

export interface PackExpectation {
  readonly selected: readonly string[];
  /** Expected values keyed by aggregation code; scalar values only (spec 03 §12). */
  readonly aggregates: Readonly<Record<string, Readonly<Record<string, string | number | boolean | null>>>>;
}

/** One vector input value: a scalar, or an array or object of further values (spec 03 §12). */
export type PackInputValue =
  | string
  | number
  | boolean
  | null
  | readonly PackInputValue[]
  | { readonly [key: string]: PackInputValue };

export interface PackVector {
  readonly name: string;
  readonly programme?: string;
  readonly input: Readonly<Record<string, PackInputValue>>;
  readonly expect: PackExpectation;
}

/** A validated pack, projected onto the shapes the engine and the registry read. */
export interface LoadedPack extends PackIdentity {
  readonly name: string;
  readonly country: string;
  readonly effective_from: string;
  readonly requires_engine: string;
  readonly supersedes: string | null;
  readonly issuers: readonly string[];
  readonly languages: readonly string[];
  readonly citations: readonly PackCitation[];
  readonly verification: PackVerification;
  /** The manifest's override limits; empty when the pack declares none (spec 03 §2.3). */
  readonly overridable: readonly string[];
  readonly structure: PackStructure;
  readonly learningAreas: readonly PackLearningArea[];
  readonly competencies: readonly PackCompetency[];
  readonly combinationRules: readonly PackCombinationRule[];
  readonly assessment: PackAssessment;
  readonly progression: PackProgression;
  readonly reports: readonly PackReport[];
  readonly locales: readonly PackLocale[];
  readonly vectors: readonly PackVector[];
}

// ----------------------------------------------------------------- overrides

/**
 * One programme override of a pack path.
 *
 * The programme stores each override under the path in `programme.overrides`, wrapped with
 * the actor and the instant so the entry is auditable on its own. A path whose stored value
 * is a bare value rather than the wrapper (a record written before the registry existed) is
 * still reported, with `actor` and `at` null.
 */
export interface PackOverrideRecord {
  /** Dotted path into the pack document. */
  readonly path: string;
  readonly value: unknown;
  readonly actor: string | null;
  readonly at: string | null;
}

/** The wrapper the programme stores for each override. */
export interface StoredPackOverride {
  readonly value: unknown;
  readonly actor: string;
  readonly at: string;
}

// ------------------------------------------------------------------- upgrade

export type PackSection =
  | 'stages'
  | 'levels'
  | 'pathways'
  | 'calendar'
  | 'learning_areas'
  | 'competencies'
  | 'combination_rules'
  | 'schemes'
  | 'grading_scales'
  | 'aggregations'
  | 'ranking'
  | 'annual'
  | 'progression'
  | 'graduation'
  | 'reports'
  | 'locales'
  | 'vectors';

export type ChangeKind = 'added' | 'removed' | 'changed';

/** One difference between two pack versions. */
export interface PackChange {
  readonly section: PackSection;
  readonly kind: ChangeKind;
  /** The code (or locale tag) of the entry; `*` for a single-object section. */
  readonly code: string;
  /** For a changed entry, the top-level fields that differ. */
  readonly fields: readonly string[];
}

export type BreakCode =
  | 'learning_area_row_removed'
  | 'level_row_removed'
  | 'override_path_removed'
  | 'override_not_overridable';

/** Something in the candidate would break state that already exists. */
export interface PackBreak {
  readonly code: BreakCode;
  /** What breaks: an override path, a learning-area code or a level code. */
  readonly subject: string;
  readonly detail: string;
}

export type WarningCode = 'structural_change' | 'version_bump_too_small' | 'language_removed';

export interface PackWarning {
  readonly code: WarningCode;
  readonly detail: string;
}

export type PackVersionBump = 'major' | 'minor' | 'patch' | 'same' | 'downgrade';

/** What an upgrade would change, what it would break, and whether it may proceed. */
export interface UpgradePreview {
  readonly programmeId: string;
  readonly from: PackRef | null;
  readonly to: PackRef;
  readonly versionBump: PackVersionBump;
  readonly changes: readonly PackChange[];
  readonly breaks: readonly PackBreak[];
  readonly warnings: readonly PackWarning[];
  /** True when nothing that exists today would break. */
  readonly safe: boolean;
  /** The overrides the programme holds; they carry across the upgrade. */
  readonly overrides: readonly PackOverrideRecord[];
}

/** The pack source a programme is currently pinned to. */
export interface PackInstallation {
  readonly programmeId: string;
  readonly pack: PackIdentity & { readonly checksum: string };
  /** The `curriculum_pack` row that records the pack source. */
  readonly sourceId: string;
}
