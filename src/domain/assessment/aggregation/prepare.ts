// ABOUTME: Validation and normalisation for result aggregation: turns a pack's definition into the
// ABOUTME: prepared form the operators and the trace read, refusing a definition whose operator
// ABOUTME: cannot run with the fields it declared, and nothing else.

import { MAX_PRECISION, ROUNDING_MODES, parseExact, type RoundingMode } from '../engine';
import {
  AGGREGATION_OPERATORS,
  RESULT_VALUE_FIELDS,
  type AggregationDefinition,
  type AggregationIssue,
  type AggregationIssueCode,
  type AggregationOperator,
  type CountPredicate,
  type FailIfRule,
  type GroupConstraint,
  type PostStep,
  type PreparedAggregation,
  type ResultValueField,
} from './types';

/** Fields whose values are numbers an operator can do arithmetic on. */
const NUMERIC_FIELDS: readonly ResultValueField[] = ['points', 'grade_points', 'score', 'score_20', 'rubric_level'];

/** Operators whose `result_scale` is the whole point of the operator, not an optional extra. */
const SCALE_REQUIRED: readonly AggregationOperator[] = ['points_mean', 'sum_points'];

const PREDICATE_OPS: readonly CountPredicate['op'][] = ['eq', 'in', 'gte', 'gt', 'lte', 'lt'];

const THEN_OPS: readonly PostStep['op'][] = ['mean', 'sum', 'lookup'];

export function isNumericField(field: ResultValueField): boolean {
  return NUMERIC_FIELDS.includes(field);
}

const isAggregationOperator = (value: unknown): value is AggregationOperator =>
  AGGREGATION_OPERATORS.some((op) => op === value);

const isResultValueField = (value: unknown): value is ResultValueField =>
  RESULT_VALUE_FIELDS.some((field) => field === value);

const isRoundingMode = (value: unknown): value is RoundingMode => ROUNDING_MODES.some((mode) => mode === value);

/** A non-empty string, or null when the value cannot be a code. */
function textOf(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

/** A decimal or exact-fraction string that parses, or null. */
function exactText(value: unknown): string | null {
  const text = textOf(value);
  return text !== null && parseExact(text) !== null ? text : null;
}

function issue(code: AggregationIssueCode, path: string, detail: string): AggregationIssue {
  return { code, path, detail };
}

function readPrecision(value: unknown, path: string, issues: AggregationIssue[]): number | null {
  if (value === undefined) return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > MAX_PRECISION) {
    issues.push(issue('invalid_precision', path, `precision must be an integer between 0 and ${MAX_PRECISION}`));
    return null;
  }
  return value;
}

function readGroup(raw: unknown, index: number, issues: AggregationIssue[]): GroupConstraint | null {
  const path = `groups[${index}]`;
  if (typeof raw !== 'object' || raw === null) {
    issues.push(issue('invalid_group_constraint', path, 'a group constraint must be an object'));
    return null;
  }
  const record = raw as Record<string, unknown>;
  const keys = ['require_all', 'group', 'min', 'fill_from'].filter((key) => record[key] !== undefined);

  if (record.require_all !== undefined) {
    if (keys.length !== 1 || !Array.isArray(record.require_all) || record.require_all.length === 0) {
      issues.push(issue('invalid_group_constraint', `${path}.require_all`, 'require_all must be the constraint and name at least one area'));
      return null;
    }
    const codes: string[] = [];
    for (let at = 0; at < record.require_all.length; at += 1) {
      const code = textOf(record.require_all[at]);
      if (code === null) {
        issues.push(issue('invalid_group_constraint', `${path}.require_all[${at}]`, 'a required area must be a non-empty code'));
        return null;
      }
      codes.push(code);
    }
    return { require_all: [...new Set(codes)] };
  }

  if (record.group !== undefined) {
    const group = textOf(record.group);
    const min = record.min;
    if (keys.length !== 2 || group === null || typeof min !== 'number' || !Number.isInteger(min) || min < 1) {
      issues.push(issue('invalid_group_constraint', path, 'a group minimum needs a group code and an integer min of at least one'));
      return null;
    }
    return { group, min };
  }

  if (record.fill_from !== undefined) {
    if (keys.length !== 1 || record.fill_from !== 'any') {
      issues.push(issue('invalid_group_constraint', `${path}.fill_from`, 'fill_from must be "any"'));
      return null;
    }
    return { fill_from: 'any' };
  }

  issues.push(issue('invalid_group_constraint', path, 'a group constraint must require areas, name a group minimum or fill from any'));
  return null;
}

function readThen(raw: unknown, issues: AggregationIssue[]): PostStep | null {
  if (raw === undefined) return null;
  if (typeof raw !== 'object' || raw === null) {
    issues.push(issue('invalid_then', 'then', 'the post-step must be an object'));
    return null;
  }
  const record = raw as Record<string, unknown>;
  const op = record.op;
  if (!THEN_OPS.some((candidate) => candidate === op)) {
    issues.push(issue('invalid_then', 'then.op', 'the post-step must be mean, sum or lookup'));
    return null;
  }
  const precision = readPrecision(record.precision, 'then.precision', issues);
  return { op: op as PostStep['op'], ...(precision === null ? {} : { precision }) };
}

function readWeights(
  raw: unknown,
  issues: AggregationIssue[]
): 'coefficient' | Readonly<Record<string, string>> | null {
  if (raw === 'coefficient') return 'coefficient';
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    issues.push(issue('invalid_weights', 'weights', 'weights must be "coefficient" or a map of area code to weight'));
    return null;
  }
  const entries = Object.entries(raw as Record<string, unknown>);
  if (entries.length === 0) {
    issues.push(issue('invalid_weights', 'weights', 'an explicit weights map must name at least one area'));
    return null;
  }
  const weights: Record<string, string> = {};
  for (const [code, value] of entries) {
    const text = exactText(value);
    const parsed = text === null ? null : parseExact(text);
    if (text === null || parsed === null || parsed.numerator < 0n) {
      issues.push(issue('invalid_weight', `weights.${code}`, 'a weight must be a non-negative decimal'));
      return null;
    }
    weights[code] = text;
  }
  return weights;
}

function readPredicate(raw: unknown, issues: AggregationIssue[]): CountPredicate | null {
  if (raw === undefined) {
    issues.push(issue('missing_where', 'where', 'count_where needs a predicate'));
    return null;
  }
  if (typeof raw !== 'object' || raw === null) {
    issues.push(issue('invalid_predicate', 'where', 'the predicate must be an object'));
    return null;
  }
  const record = raw as Record<string, unknown>;
  const op = record.op;
  if (!PREDICATE_OPS.some((candidate) => candidate === op)) {
    issues.push(issue('invalid_predicate', 'where.op', 'the predicate must be eq, in, gte, gt, lte or lt'));
    return null;
  }
  const predicateOp = op as CountPredicate['op'];
  if (predicateOp === 'in') {
    if (!Array.isArray(record.values) || record.values.length === 0) {
      issues.push(issue('invalid_predicate', 'where.values', 'the in predicate needs a non-empty values list'));
      return null;
    }
    const values: string[] = [];
    for (let index = 0; index < record.values.length; index += 1) {
      const value = textOf(record.values[index]);
      if (value === null) {
        issues.push(issue('invalid_predicate', `where.values[${index}]`, 'a predicate value must be a non-empty string'));
        return null;
      }
      values.push(value);
    }
    return { op: predicateOp, values };
  }
  const value = textOf(record.value);
  if (value === null) {
    issues.push(issue('invalid_predicate', 'where.value', 'the predicate needs a value'));
    return null;
  }
  return { op: predicateOp, value };
}

function readFailIf(raw: unknown, issues: AggregationIssue[]): FailIfRule | null {
  if (typeof raw !== 'object' || raw === null) {
    issues.push(issue('invalid_fail_rule', 'fail_if', 'fail_if must be an object'));
    return null;
  }
  const record = raw as Record<string, unknown>;
  const anyGrade = textOf(record.any_grade);
  const cap = textOf(record.then_max_division);
  if (anyGrade === null || cap === null) {
    issues.push(issue('invalid_fail_rule', 'fail_if', 'fail_if needs any_grade and then_max_division'));
    return null;
  }
  let scope: string[] | undefined;
  if (record.in !== undefined) {
    if (!Array.isArray(record.in) || record.in.length === 0) {
      issues.push(issue('invalid_fail_rule', 'fail_if.in', 'fail_if.in must name at least one area'));
      return null;
    }
    scope = [];
    for (let index = 0; index < record.in.length; index += 1) {
      const code = textOf(record.in[index]);
      if (code === null) {
        issues.push(issue('invalid_fail_rule', `fail_if.in[${index}]`, 'a fail_if area must be a non-empty code'));
        return null;
      }
      scope.push(code);
    }
  }
  const source = record.source === undefined ? null : textOf(record.source);
  if (record.source !== undefined && source === null) {
    issues.push(issue('invalid_fail_rule', 'fail_if.source', 'fail_if.source must be a non-empty citation when declared'));
    return null;
  }
  return {
    any_grade: anyGrade,
    ...(scope === undefined ? {} : { in: scope }),
    then_max_division: cap,
    ...(source === null ? {} : { source }),
  };
}

export type AggregationPreparation =
  | { readonly ok: true; readonly aggregation: PreparedAggregation }
  | { readonly ok: false; readonly issues: readonly AggregationIssue[] };

/**
 * Validates a definition and resolves its defaults.
 *
 * Only the fields the named operator reads are validated: the pack schema allows every property on
 * every operator, so a field this operator ignores is ignored rather than refused. The defaults a
 * trace depends on are resolved here - `mode` to `half_up` and a `best_n` post-step to `mean` - so
 * replay never has to guess them.
 */
export function prepareAggregation(definition: AggregationDefinition): AggregationPreparation {
  const issues: AggregationIssue[] = [];

  if (textOf(definition.code) === null) {
    issues.push(issue('invalid_code', 'code', 'an aggregation code must be a non-empty string'));
  }
  if (!isAggregationOperator(definition.op)) {
    issues.push(issue('unsupported_op', 'op', `unknown aggregation operator "${String(definition.op)}"`));
    return { ok: false, issues };
  }
  const op = definition.op;

  const precision = readPrecision(definition.precision, 'precision', issues);
  let mode: RoundingMode = 'half_up';
  if (definition.mode !== undefined) {
    if (!isRoundingMode(definition.mode)) {
      issues.push(issue('invalid_rounding_mode', 'mode', `unknown rounding mode "${String(definition.mode)}"`));
    } else {
      mode = definition.mode;
    }
  }

  let value: ResultValueField | null = null;
  if (definition.value !== undefined) {
    if (!isResultValueField(definition.value)) {
      issues.push(issue('invalid_value_field', 'value', `unknown value field "${String(definition.value)}"`));
    } else {
      value = definition.value;
    }
  }
  if (op === 'rubric_profile' && value === null) value = 'rubric_level';
  if (value === null && op !== 'rubric_profile') {
    issues.push(issue('missing_value_field', 'value', `operator "${op}" must name the value it consumes`));
  }
  if (value !== null) {
    if (op === 'points_mean' || op === 'sum_points') {
      if (value !== 'points' && value !== 'grade_points') {
        issues.push(issue('invalid_value_field', 'value', `operator "${op}" consumes points or grade_points, not "${value}"`));
      }
    } else if (op === 'gpa') {
      if (value !== 'grade_points' && value !== 'points') {
        issues.push(issue('invalid_value_field', 'value', `operator "gpa" consumes grade_points, not "${value}"`));
      }
    } else if (op === 'rubric_profile') {
      if (value !== 'rubric_level') {
        issues.push(issue('invalid_value_field', 'value', 'operator "rubric_profile" consumes rubric_level'));
      }
    } else if (op !== 'count_where' && !isNumericField(value)) {
      issues.push(issue('invalid_value_field', 'value', `operator "${op}" needs a numeric value, not "${value}"`));
    }
  }

  let n: number | null = null;
  if (op === 'best_n') {
    if (typeof definition.n !== 'number' || !Number.isInteger(definition.n) || definition.n < 1) {
      issues.push(issue('invalid_n', 'n', 'best_n needs an integer n of at least one'));
    } else {
      n = definition.n;
    }
  }

  let groups: readonly GroupConstraint[] = [];
  if (op === 'best_n') {
    if (!Array.isArray(definition.groups) || definition.groups.length === 0) {
      issues.push(issue('missing_groups', 'groups', 'best_n needs at least one group constraint'));
    } else {
      const read: GroupConstraint[] = [];
      for (let index = 0; index < definition.groups.length; index += 1) {
        const constraint = readGroup(definition.groups[index], index, issues);
        if (constraint !== null) read.push(constraint);
      }
      if (read.filter((constraint) => 'fill_from' in constraint).length > 1) {
        issues.push(issue('duplicate_fill_from', 'groups', 'only one constraint may fill the remaining places'));
      }
      groups = read;
      // A required area may also satisfy a group minimum, and which group an area belongs to is
      // learner data, not definition data, so the only check that is sound here is the one that
      // cannot be satisfied whatever the areas are: more compulsory areas than places.
      const compulsory = read.reduce(
        (total, constraint) => ('require_all' in constraint ? total + constraint.require_all.length : total),
        0
      );
      if (n !== null && compulsory > n) {
        issues.push(
          issue('constraints_exceed_n', 'groups', `the constraints make ${compulsory} areas compulsory but n is ${n}`)
        );
      }
    }
  }

  let then: PostStep | null = null;
  if (op === 'best_n') {
    then = readThen(definition.then, issues);
    if (then === null) then = { op: 'mean' };
    if (then.op === 'lookup' && definition.result_scale === undefined) {
      issues.push(issue('missing_result_scale', 'result_scale', 'a lookup post-step needs a result scale'));
    }
  }

  let over: readonly string[] | null = null;
  if (definition.over !== undefined) {
    if (!Array.isArray(definition.over) || definition.over.length === 0) {
      issues.push(issue('invalid_over', 'over', 'over must name at least one area'));
    } else {
      const codes: string[] = [];
      for (let index = 0; index < definition.over.length; index += 1) {
        const code = textOf(definition.over[index]);
        if (code === null) {
          issues.push(issue('invalid_over', `over[${index}]`, 'an area code must be a non-empty string'));
        } else if (codes.includes(code)) {
          issues.push(issue('duplicate_over', `over[${index}]`, `area "${code}" is named twice`));
        } else {
          codes.push(code);
        }
      }
      over = codes;
    }
  }

  let weights: 'coefficient' | Readonly<Record<string, string>> | null = null;
  if (op === 'weighted_mean') {
    if (definition.weights === undefined) {
      issues.push(issue('missing_weights', 'weights', 'weighted_mean needs weights: "coefficient" or a map'));
    } else {
      weights = readWeights(definition.weights, issues);
    }
  }

  let resultScale: string | null = null;
  if (definition.result_scale !== undefined) {
    resultScale = textOf(definition.result_scale);
    if (resultScale === null) {
      issues.push(issue('missing_result_scale', 'result_scale', 'a result scale code must be a non-empty string'));
    }
  }
  if (resultScale === null && SCALE_REQUIRED.includes(op)) {
    issues.push(issue('missing_result_scale', 'result_scale', `operator "${op}" must name the scale it looks up`));
  }

  let where: CountPredicate | null = null;
  if (op === 'count_where') where = readPredicate(definition.where, issues);
  if (where !== null && value === 'grade') {
    const relational = where.op === 'gte' || where.op === 'gt' || where.op === 'lte' || where.op === 'lt';
    if (relational) {
      issues.push(
        issue('relational_predicate_on_code', 'where.op', 'a grade code has no declared order; compare it by eq or in')
      );
    }
  }
  if (where !== null && value !== null && value !== 'grade') {
    const compared = where.op === 'in' ? (where.values ?? []) : where.value === undefined ? [] : [where.value];
    for (const text of compared) {
      if (parseExact(text) === null) {
        issues.push(
          issue('invalid_predicate', 'where', `"${text}" is compared against the numeric field "${value}"`)
        );
      }
    }
  }

  let failIf: FailIfRule | null = null;
  if (definition.fail_if !== undefined) {
    failIf = readFailIf(definition.fail_if, issues);
    if (failIf !== null && resultScale === null) {
      issues.push(issue('fail_if_without_scale', 'fail_if', 'a fail_if cap needs the result scale whose band it caps'));
    }
  }
  if (op === 'rubric_profile' && failIf !== null) {
    issues.push(issue('unsupported_option', 'fail_if', 'a rubric profile has no band to cap'));
  }
  if (op === 'rubric_profile' && precision !== null) {
    issues.push(issue('unsupported_option', 'precision', 'a rubric profile counts levels; it has no value to round'));
  }

  if (issues.length > 0) return { ok: false, issues };

  return {
    ok: true,
    aggregation: {
      code: definition.code,
      op,
      groups,
      mode,
      ...(n === null ? {} : { n }),
      ...(value === null ? {} : { value }),
      ...(then === null ? {} : { then }),
      ...(over === null ? {} : { over }),
      ...(failIf === null ? {} : { fail_if: failIf }),
      ...(weights === null ? {} : { weights }),
      ...(precision === null ? {} : { precision }),
      ...(resultScale === null ? {} : { result_scale: resultScale }),
      ...(where === null ? {} : { where }),
    },
  };
}
