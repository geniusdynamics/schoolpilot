// ABOUTME: The shape of a curriculum pack document, transcribed from packs/schema/*.json: sections,
// ABOUTME: required keys, closed objects, enumerations, ranges and the schema's own conditionals.

import {
  BOOLEAN,
  CODE,
  CODE_LIST,
  DATE,
  NAME,
  NULL,
  SEMVER,
  WEIGHT,
  array,
  count,
  literal,
  object,
  optional,
  record,
  required,
  text,
  union,
  type Shape,
} from './shape';

// `common.schema.json#/$defs/packCode` and `packRef`.
const PACK_CODE = text({ pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, min: 2, max: 50 });
const PACK_REF = text({
  pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*@(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/,
});
const SEMVER_RANGE = text({
  pattern:
    /^\s*(?:\^|~|>=|<=|>|<|=)?\s*[0-9]+\.[0-9]+\.[0-9]+(?:\s+(?:\^|~|>=|<=|>|<|=)\s*[0-9]+\.[0-9]+\.[0-9]+)*\s*$/,
});
const LOCALE_TAG = text({ pattern: /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/ });
const OVERRIDE_PATH = text({
  pattern: /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_*-]+)*$/,
  min: 1,
  max: 200,
});
const PLUS = count({ above: 0 });

// ------------------------------------------------------------------- manifest

const CITATION: Shape = object([
  required('title', NAME),
  required('issuer', NAME),
  required('url', text({ min: 1, max: 2000 })),
  required('retrieved', DATE),
]);

const VERIFICATION: Shape = object([
  required('status', text({ values: ['draft', 'verified'] })),
  required('verified_by', array(NAME, { unique: true })),
  optional('notes', text({ min: 1, max: 2000 })),
]);

const MANIFEST: Shape = object([
  required('code', PACK_CODE),
  required('name', NAME),
  required('version', SEMVER),
  required('country', text({ pattern: /^[A-Z]{2}$/ })),
  required('issuers', array(NAME, { min: 1, unique: true })),
  required('effective_from', DATE),
  optional('supersedes', PACK_REF),
  required('languages', array(LOCALE_TAG, { min: 1, unique: true })),
  required('requires_engine', SEMVER_RANGE),
  required('sources', array(CITATION, { min: 1 })),
  required('verification', VERIFICATION),
  optional('overridable', array(OVERRIDE_PATH, { min: 1, unique: true })),
]);

// ------------------------------------------------------------------ structure

const STAGE: Shape = object([
  required('code', CODE),
  required('name', NAME),
  required('levels', CODE_LIST),
]);

const LEVEL: Shape = object([
  required('code', CODE),
  required('name', NAME),
  required('ordinal', count({ integer: true, min: 0 })),
  optional('typical_age', count({ integer: true, min: 0, max: 100 })),
  optional('next', union(CODE, NULL)),
  optional('is_stage_exit', BOOLEAN),
  optional('national_assessment', union(CODE, NULL)),
]);

const PATHWAY: Shape = object([
  required('code', CODE),
  required('name', NAME),
  required('levels', CODE_LIST),
]);

const CALENDAR_PERIOD: Shape = object([
  optional('code', CODE),
  required('kind', text({ values: ['term', 'semester', 'trimester', 'quarter', 'half_term'] })),
  required('sequence', count({ integer: true, min: 1 })),
  required('name', NAME),
  required('typical', array(text({ pattern: /^(0[1-9]|1[0-2])-([0-2][0-9]|3[01])$/ }), { min: 2, max: 2 })),
  optional('half_term', BOOLEAN),
]);

const CALENDAR: Shape = object([
  required('year_kind', text({ values: ['calendar_year', 'academic_year'] })),
  required('periods', array(CALENDAR_PERIOD, { min: 1 })),
  optional('note', text({ min: 1, max: 1000 })),
]);

const STRUCTURE: Shape = object([
  required('stages', array(STAGE, { min: 1 })),
  required('levels', array(LEVEL, { min: 1 })),
  optional('pathways', array(PATHWAY, { min: 1 })),
  required('calendar_template', CALENDAR),
]);

// -------------------------------------------------------------- learning areas

const COMPONENT: Shape = object([
  required('code', CODE),
  required('name', NAME),
  required('kind', text({ values: ['paper', 'practical', 'coursework', 'oral', 'project', 'strand'] })),
  optional('weight', WEIGHT),
  optional('max_score', count({ above: 0 })),
]);

const LEARNING_AREA: Shape = object([
  required('code', CODE),
  required('name', NAME),
  optional('short_name', NAME),
  required('kind', text({ values: ['core', 'optional', 'elective', 'co_curricular', 'pastoral'] })),
  optional('group', text({ min: 1, max: 100 })),
  optional('coefficient', count({ above: 0 })),
  required('levels', CODE_LIST),
  optional('national_code', union(text({ min: 1, max: 100 }), NULL)),
  optional('components', array(COMPONENT)),
  optional('pathways', CODE_LIST),
  optional('alternatives', CODE_LIST),
  optional('outcomes_ref', text({
    pattern: /^(?:\.\/)?[A-Za-z0-9._/-]+\.json$/,
    min: 1,
    max: 500,
  })),
]);

const COMPETENCY: Shape = object([
  required('code', CODE),
  required('name', NAME),
  required('kind', text({ values: ['core_competency', 'value', 'pertinent_issue', 'attitude'] })),
  optional('descriptors', array(text({ min: 1, max: 500 }), { min: 1 })),
]);

const COMBINATION_RULE: Shape = object(
  [
    required('levels', CODE_LIST),
    required('rule', text({ values: ['core_all', 'electives'] })),
    optional('of', array(text({ pattern: /^[A-Za-z0-9._-]+(?:\|[A-Za-z0-9._-]+)*$/ }), {
      min: 1,
      unique: true,
    })),
    optional('count', count({ integer: true, min: 1 })),
    optional('from_pathway', BOOLEAN),
  ],
  {
    when: [
      { key: 'rule', equals: 'core_all', required: ['of'] },
      { key: 'rule', equals: 'electives', required: ['count'] },
    ],
  }
);

const LEARNING_AREAS_SECTION: Shape = object([
  required('learning_areas', array(LEARNING_AREA, { min: 1 })),
  required('competencies', array(COMPETENCY)),
  optional('combination_rules', array(COMBINATION_RULE, { min: 1 })),
]);

// ----------------------------------------------------------------- assessment

const SLOT: Shape = object(
  [
    required('code', CODE),
    required('label', NAME),
    required('kind', text({
      values: [
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
      ],
    })),
    optional('max', PLUS),
    optional('scale_to', PLUS),
    optional('multi', BOOLEAN),
    optional('combine', text({ values: ['mean', 'sum', 'best_of'] })),
  ],
  { atLeastOne: [['max'], ['scale_to']] }
);

const AREA_SCORE: Shape = object([
  required('op', text({ values: ['sum', 'mean'] })),
  required('of', CODE_LIST),
  required('out_of', PLUS),
]);

const MISSING_POLICY = text({ values: ['zero', 'exclude', 'incomplete', 'carry_previous'] });

const COMPONENT_POLICY: Shape = object(
  [
    required('papers', text({ values: ['sum', 'scale_each_then_sum', 'weighted', 'best_of'] })),
    required('out_of', PLUS),
    optional('best_of', count({ integer: true, min: 1 })),
  ],
  { when: [{ key: 'papers', equals: 'best_of', required: ['best_of'] }] }
);

const ROUNDING_RULE: Shape = object([
  required('stage', text({ pattern: /^[a-z][a-z0-9_]*$/ })),
  required('precision', count({ integer: true, min: 0, max: 6 })),
  required('mode', text({ values: ['half_up', 'half_even', 'floor', 'ceil', 'truncate'] })),
]);

const SUMMATIVE_SLOT: Shape = object([
  required('code', CODE),
  required('label', NAME),
  required('max', PLUS),
  required('maps_to', CODE),
]);

const MARKS_SCHEME: Shape = object([
  required('code', CODE),
  required('levels', CODE_LIST),
  required('slots', array(SLOT, { min: 1 })),
  required('learning_area_score', AREA_SCORE),
  required('grading_scale', CODE),
  optional('missing', record(MISSING_POLICY, { min: 1 })),
  optional('component_policy', COMPONENT_POLICY),
  optional('rounding', array(ROUNDING_RULE, { min: 1 })),
  optional('overridable', array(OVERRIDE_PATH, { min: 1, unique: true })),
]);

const FORMATIVE_SCHEME: Shape = object([
  required('code', CODE),
  required('levels', CODE_LIST),
  required('evidence', literal('rubric_observations')),
  required('observation_scale', CODE),
  required('term_judgement', object([
    required('op', literal('teacher_best_fit')),
    optional('suggest', text({ min: 1, max: 100 })),
  ])),
  required('summative_slots', array(SUMMATIVE_SLOT, { min: 1 })),
  required('report_shows', array(text({ values: ['rubric_level', 'descriptor', 'teacher_comment'] }), {
    min: 1,
    unique: true,
  })),
  optional('overridable', array(OVERRIDE_PATH, { min: 1, unique: true })),
]);

const SCHEME: Shape = { of: 'object', fields: [], variants: [MARKS_SCHEME, FORMATIVE_SCHEME] };

const BAND: Shape = object([
  required('code', CODE),
  required('label', NAME),
  required('min', count()),
  required('max', count()),
  optional('points', count()),
  optional('descriptor', text({ min: 1, max: 1000 })),
]);

const GRADING_SCALE: Shape = object(
  [
    required('code', CODE),
    required('kind', text({
      values: [
        'numeric_bands',
        'rubric',
        'letter',
        'points',
        'division',
        'gpa',
        'out_of_20',
        'descriptor',
      ],
    })),
    optional('input', text({ min: 1, max: 50 })),
    optional('upper', text({ values: ['inclusive', 'exclusive'] })),
    optional('bands', array(BAND, { min: 1 })),
    optional('verification', text({ min: 1, max: 2000 })),
  ],
  { when: [{ key: 'kind', equals: 'numeric_bands', required: ['bands'] }] }
);

const GROUP_CONSTRAINT: Shape = {
  of: 'object',
  fields: [],
  variants: [
    object([required('require_all', CODE_LIST)]),
    object([required('group', CODE), required('min', count({ integer: true, min: 1 }))]),
    object([required('fill_from', literal('any'))]),
  ],
};

const FAIL_CONDITION: Shape = object([
  required('any_grade', CODE),
  optional('in', CODE_LIST),
  required('then_max_division', CODE),
]);

const POST_STEP: Shape = object([
  required('op', text({ values: ['mean', 'sum', 'lookup'] })),
  optional('precision', count({ integer: true, min: 0, max: 6 })),
]);

const AGGREGATION: Shape = object(
  [
    required('code', CODE),
    required('op', text({
      values: [
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
    })),
    optional('n', count({ integer: true, min: 1 })),
    optional('value', text({
      values: ['points', 'grade_points', 'score', 'score_20', 'grade', 'rubric_level'],
    })),
    optional('groups', array(GROUP_CONSTRAINT, { min: 1 })),
    optional('then', POST_STEP),
    optional('over', CODE_LIST),
    optional('fail_if', FAIL_CONDITION),
    optional('weights', union(record(WEIGHT, { min: 1 }), literal('coefficient'))),
    optional('precision', count({ integer: true, min: 0, max: 6 })),
    optional('result_scale', CODE),
  ],
  {
    when: [
      { key: 'op', equals: 'best_n', required: ['n', 'value', 'groups'] },
      { key: 'op', equals: 'weighted_mean', required: ['weights'] },
    ],
  }
);

const RANKING: Shape = object(
  [
    required('enabled', BOOLEAN),
    optional('scope', text({ values: ['class_group', 'level', 'programme'] })),
    optional('by', text({ min: 1, max: 100 })),
    optional('ties', text({ values: ['competition_1224', 'dense_1223', 'shared_average'] })),
    optional('only_complete', BOOLEAN),
    optional('show_on_report', BOOLEAN),
    optional('show_out_of', BOOLEAN),
  ],
  { when: [{ key: 'enabled', equals: true, required: ['scope', 'by', 'ties'] }] }
);

const ANNUAL: Shape = object(
  [
    required('op', text({ values: ['weighted_mean', 'mean', 'final_period_only', 'cumulative_sum', 'best_of'] })),
    optional('of', union(record(WEIGHT, { min: 1 }), array(CODE, { min: 1, unique: true }))),
    optional('missing', text({ values: ['renormalise', 'zero', 'incomplete', 'carry_previous'] })),
    optional('n', count({ integer: true, min: 1 })),
  ],
  {
    when: [
      { key: 'op', equals: 'weighted_mean', required: ['of'] },
      { key: 'op', equals: 'best_of', required: ['n'] },
    ],
  }
);

const ASSESSMENT: Shape = object([
  required('schemes', array(SCHEME, { min: 1 })),
  required('grading_scales', array(GRADING_SCALE, { min: 1 })),
  optional('aggregations', array(AGGREGATION, { min: 1 })),
  optional('ranking', RANKING),
  optional('annual', ANNUAL),
]);

// ----------------------------------------------------------------- progression

const CONDITION: Shape = object([
  required('metric', text({ pattern: /^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+$/, min: 3, max: 100 })),
  required('gte', count()),
]);

const PROMOTION_RULE: Shape = object(
  [
    required('levels', CODE_LIST),
    required('rule', text({ values: ['automatic', 'stage_transition', 'threshold', 'class_council'] })),
    optional('to_stage', CODE),
    optional('requires', array(text({
      values: ['national_assessment_recorded', 'pathway_placement'],
    }), { min: 1, unique: true })),
    optional('conditions', array(CONDITION, { min: 1 })),
    optional('else', text({ values: ['repeat', 'repeat_or_council'] })),
    optional('suggest', CONDITION),
  ],
  {
    when: [
      { key: 'rule', equals: 'stage_transition', required: ['to_stage'] },
      { key: 'rule', equals: 'threshold', required: ['conditions', 'else'] },
      { key: 'rule', equals: 'class_council', required: ['suggest'] },
    ],
  }
);

const GRADUATION_RULE: Shape = object([
  required('levels', CODE_LIST),
  required('rule', literal('graduate')),
]);

const PROGRESSION: Shape = object([
  required('progression', array(PROMOTION_RULE, { min: 1 })),
  optional('graduation', array(GRADUATION_RULE, { min: 1 })),
]);

// --------------------------------------------------------------------- reports

const REPORT_BLOCK: Shape = object([
  required('type', text({
    values: [
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
    ],
  })),
  optional('label_key', text({ pattern: /^[a-z0-9]+(?:[._-][a-z0-9_]+)+$/, min: 1, max: 200 })),
  optional('columns', array(text({
    values: [
      'components',
      'slots',
      'total',
      'grade',
      'points',
      'position',
      'class_mean',
      'highest',
      'lowest',
      'teacher_initials',
      'remark',
    ],
  }), { min: 1, unique: true })),
]);

const REPORT: Shape = object([
  required('code', CODE),
  required('name', NAME),
  required('levels', CODE_LIST),
  optional('page', object([
    optional('size', text({ values: ['A4', 'A5'] })),
    optional('orientation', text({ values: ['portrait', 'landscape'] })),
  ])),
  required('blocks', array(REPORT_BLOCK, { min: 1 })),
  optional('comment_max_length', count({ integer: true, min: 0 })),
]);

// ------------------------------------------------------------------- locales

const COMMENT_SEED: Shape = object([
  required('scope', text({ values: ['learning_area', 'overall', 'conduct'] })),
  required('band', CODE),
  required('text', text({ min: 1, max: 2000 })),
  optional('learning_area', CODE),
]);

const LOCALE: Shape = object([
  optional('labels', record(text({ min: 1, max: 500 }), { min: 1 })),
  optional('descriptors', record(record(text({ min: 1, max: 1000 }), { min: 1 }), { min: 1 })),
  optional('comment_bank', array(COMMENT_SEED, { min: 1 })),
]);

// ----------------------------------------------------------------------- tests

const EXPECTATION_VALUE: Shape = object(
  [
    optional('total_points', count()),
    optional('points', count()),
    optional('value', count()),
    optional('grade', text({ min: 1 })),
    optional('division', text({ min: 1 })),
  ],
  { open: union(count(), text(), BOOLEAN, NULL) }
);

const VECTOR: Shape = object([
  required('name', NAME),
  optional('programme', PACK_CODE),
  required('input', record(union(text(), count(), NULL), { min: 1 })),
  required('expect', object([optional('selected', array(CODE, { min: 1, unique: true }))], {
    open: EXPECTATION_VALUE,
    closed: false,
  })),
]);

const TESTS: Shape = object([required('vectors', array(VECTOR, { min: 1 }))]);

/** The composed pack document, matching `packs/schema/pack.schema.json`. */
export const PACK_DOCUMENT_SHAPE: Shape = object([
  required('pack', MANIFEST),
  required('structure', STRUCTURE),
  required('learning_areas', LEARNING_AREAS_SECTION),
  required('assessment', ASSESSMENT),
  required('progression', PROGRESSION),
  required('reports', array(REPORT, { min: 1 })),
  required('locales', record(LOCALE, { min: 1, name: LOCALE_TAG })),
  required('tests', TESTS),
]);

/** Kept so a caller can validate one locale entry on its own (the locales editor). */
export const LOCALE_SHAPE: Shape = LOCALE;

/** Kept so a caller can validate one report template on its own (the template editor). */
export const REPORT_SHAPE: Shape = REPORT;
