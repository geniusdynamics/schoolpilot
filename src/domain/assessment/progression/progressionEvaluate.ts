// ABOUTME: The progression evaluator of spec 03 section 7: apply a pack's promotion or graduation
// ABOUTME: rule to one learner and return a suggestion with every metric, reason and flag. Nothing
// ABOUTME: here decides, overrides, approves or commits; those belong to the promotion run (E04).

import { compareExact, parseExact } from '../engine';
import { resolveMetric } from './metrics';
import { prepareProgression } from './progressionPrepare';
import type {
  CouncilSuggestion,
  MetricTrace,
  PreparedCondition,
  PreparedPromotionRule,
  ProgressionAction,
  ProgressionContext,
  ProgressionDefinition,
  ProgressionEvaluation,
  ProgressionFlag,
  ProgressionFlagCode,
  ProgressionIssue,
  ProgressionLearner,
  ProgressionReason,
  ProgressionReasonCode,
  ProgressionSuggestion,
  ProgressionTrace,
} from './types';

function flag(
  code: ProgressionFlagCode,
  metric: string | null = null,
  requirement: string | null = null
): ProgressionFlag {
  return { code, metric, requirement };
}

function reason(
  code: ProgressionReasonCode,
  metric: string | null = null,
  requirement: string | null = null,
  detail: string | null = null
): ProgressionReason {
  return { code, metric, requirement, detail };
}

function issue(code: ProgressionIssue['code'], path: string, detail: string): ProgressionIssue {
  return { code, path, detail };
}

/** A requirement is met only by an explicit true or a non-empty record such as a pathway code. */
function requirementMet(value: boolean | string | null | undefined): boolean {
  if (value === true) return true;
  if (typeof value === 'string') return value.trim().length > 0;
  return false;
}

function nextLevelOf(level: string, context: ProgressionContext): string | null {
  const entry = context.levels?.find((candidate) => candidate.code === level);
  return entry?.next ?? null;
}

function stageLevelOf(rule: PreparedPromotionRule, context: ProgressionContext): string | null {
  if (rule.to_stage === undefined) return null;
  const stage = context.stages?.find((candidate) => candidate.code === rule.to_stage);
  return stage?.levels[0] ?? null;
}

/** Compares a resolved metric with its bound; null when either side is not exact. */
function reaches(condition: PreparedCondition, metric: MetricTrace): 'met' | 'failed' | 'unknown' {
  if (metric.status !== 'resolved' || metric.value === null) return 'unknown';
  const value = parseExact(metric.value);
  const bound = parseExact(condition.gte);
  if (value === null || bound === null) return 'unknown';
  return compareExact(value, bound) >= 0 ? 'met' : 'failed';
}

interface EvaluationState {
  readonly metrics: MetricTrace[];
  readonly reasons: ProgressionReason[];
  readonly flags: ProgressionFlag[];
}

function metricReader(context: ProgressionContext, state: EvaluationState): (condition: PreparedCondition) => MetricTrace {
  const cache = new Map<string, MetricTrace>();
  return (condition) => {
    const cached = cache.get(condition.metric);
    if (cached !== undefined) return cached;
    const trace = resolveMetric(condition.metric, context);
    cache.set(condition.metric, trace);
    state.metrics.push(trace);
    if (trace.status === 'resolved') {
      state.reasons.push(reason('metric_resolved', condition.metric, null, null));
    } else {
      state.reasons.push(reason('metric_unknown', condition.metric, null, trace.detail));
      state.flags.push(flag('metric_unknown', condition.metric));
    }
    return trace;
  };
}

/**
 * Evaluates one rule for one learner.
 *
 * A missing next level is a `target_unknown` referral, not a promotion and not a repeat. A
 * threshold with a definitely failed condition still records any unknown sibling, but decides on
 * the definite failure; only a conjunction with no failure and at least one unknown is referred.
 */
function evaluateOne(
  rule: PreparedPromotionRule,
  learner: ProgressionLearner,
  context: ProgressionContext
): ProgressionSuggestion {
  const state: EvaluationState = { metrics: [], reasons: [], flags: [] };
  const metricOf = metricReader(context, state);
  const next = nextLevelOf(learner.level, context);
  const stage = stageLevelOf(rule, context);
  const annualStatus = context.annual?.status ?? null;
  const requirements: Record<string, boolean> = {};

  let action: ProgressionAction = 'council';
  let council: CouncilSuggestion | null = null;
  const target = rule.rule === 'stage_transition' ? stage : next;

  if (learner.complete === false) {
    state.flags.push(flag('data_incomplete'));
    state.reasons.push(reason('learner_incomplete', null, null, 'the learner record is marked incomplete'));
  }

  switch (rule.rule) {
    case 'automatic': {
      state.reasons.push(reason('rule_automatic'));
      action = 'promote';
      break;
    }
    case 'threshold': {
      state.reasons.push(reason('rule_threshold'));
      const outcomes = rule.conditions.map((condition) => reaches(condition, metricOf(condition)));
      const failed = outcomes.includes('failed');
      const unknown = outcomes.includes('unknown');
      if (failed) {
        state.reasons.push(reason('threshold_failed'));
        if (rule.else === 'repeat') {
          action = 'repeat';
          state.reasons.push(reason('else_repeat'));
        } else {
          // `repeat_or_council` leaves the choice to the council, so the engine refers the case.
          action = 'council';
          state.reasons.push(reason('else_refer_to_council'));
        }
      } else if (unknown) {
        action = 'council';
        state.reasons.push(reason('metric_unknown', null, null, 'a threshold condition could not be resolved'));
      } else {
        action = 'promote';
        state.reasons.push(reason('threshold_met'));
      }
      break;
    }
    case 'class_council': {
      state.reasons.push(reason('rule_class_council'));
      const condition = rule.suggest;
      if (condition === undefined) {
        action = 'council';
        state.flags.push(flag('target_unknown'));
        state.reasons.push(reason('metric_unknown', null, null, 'the council rule names no suggestion metric'));
        break;
      }
      const metric = metricOf(condition);
      const outcome = reaches(condition, metric);
      council = {
        metric,
        gte: condition.gte,
        suggested:
          outcome === 'unknown' ? null : outcome === 'met' ? 'promote' : 'refer_to_council',
      };
      action = 'council';
      break;
    }
    case 'stage_transition': {
      state.reasons.push(reason('rule_stage_transition'));
      let blocked = false;
      for (const requirement of rule.requires) {
        const met = requirementMet(learner.requirements?.[requirement]);
        requirements[requirement] = met;
        state.reasons.push(reason(met ? 'requirement_met' : 'requirement_unmet', null, requirement));
        if (!met) {
          blocked = true;
          state.flags.push(flag('requirement_unmet', null, requirement));
        }
      }
      action = blocked ? 'blocked' : 'promote';
      break;
    }
  }

  // A rule that needs the pack structure but did not get it cannot name a destination.
  if (action !== 'repeat' && target === null) {
    state.flags.push(flag('target_unknown'));
    state.reasons.push(reason('target_unknown', null, null, 'the structure names no level this rule can enter'));
    if (action === 'promote') action = 'council';
  }

  if ((rule.rule === 'threshold' || rule.rule === 'class_council') && (annualStatus === 'incomplete' || annualStatus === 'empty')) {
    state.flags.push(flag('data_incomplete'));
    state.reasons.push(reason('annual_incomplete', null, null, `the annual result is ${annualStatus}`));
  }

  const toLevel = action === 'promote' || action === 'council' || action === 'blocked' ? target : null;
  const toStage = rule.rule === 'stage_transition' ? (rule.to_stage ?? null) : null;
  const complete = !state.flags.some(
    (entry) =>
      entry.code === 'metric_unknown' ||
      entry.code === 'data_incomplete' ||
      entry.code === 'no_rule' ||
      entry.code === 'target_unknown'
  );

  const trace: ProgressionTrace = {
    learner: learner.learner,
    level: learner.level,
    rule,
    targets: { next, stage },
    annual_status: annualStatus,
    learner_complete: learner.complete !== false,
    requirements,
    metrics: state.metrics,
    action,
    to_level: toLevel,
    to_stage: toStage,
    council_suggested: council === null ? null : council.suggested,
    flags: state.flags,
    complete,
  };

  return {
    learner: learner.learner,
    level: learner.level,
    rule,
    action,
    to_level: toLevel,
    to_stage: toStage,
    metrics: state.metrics,
    council,
    reasons: state.reasons,
    flags: state.flags,
    complete,
    trace,
  };
}

function learnerIssue(learner: ProgressionLearner, index: number, issues: ProgressionIssue[]): boolean {
  if (typeof learner.learner !== 'string' || learner.learner.trim().length === 0) {
    issues.push(issue('invalid_learner', `learners[${index}].learner`, 'a learner needs a non-empty code'));
    return false;
  }
  if (typeof learner.level !== 'string' || learner.level.trim().length === 0) {
    issues.push(issue('invalid_learner', `learners[${index}].level`, `learner "${learner.learner}" names no level`));
    return false;
  }
  if (learner.complete !== undefined && typeof learner.complete !== 'boolean') {
    issues.push(issue('invalid_learner', `learners[${index}].complete`, 'complete must be a boolean when declared'));
    return false;
  }
  return true;
}

/**
 * Evaluates every learner in the run.
 *
 * The rule document and the pack structure are validated once, then each learner is evaluated
 * against the rule that covers their level. A level with no rule is referred to the council with
 * a `no_rule` flag rather than dropped, so the promotion run cannot lose a learner silently.
 */
export function evaluateProgression(
  definition: ProgressionDefinition,
  learners: readonly ProgressionLearner[],
  context: ProgressionContext = {}
): ProgressionEvaluation {
  const preparation = prepareProgression(definition, context);
  if (!preparation.ok) return preparation;

  const issues: ProgressionIssue[] = [];
  const seen = new Set<string>();
  learners.forEach((learner, index) => {
    if (!learnerIssue(learner, index, issues)) return;
    if (seen.has(learner.learner)) {
      issues.push(issue('duplicate_learner', `learners[${index}].learner`, `learner "${learner.learner}" appears twice`));
    }
    seen.add(learner.learner);
  });
  if (issues.length > 0) return { ok: false, issues };

  const suggestions = learners.map((learner) => {
    const rule = preparation.byLevel.get(learner.level);
    if (rule === undefined) {
      const state: EvaluationState = { metrics: [], reasons: [], flags: [] };
      if (learner.complete === false) {
        state.flags.push(flag('data_incomplete'));
        state.reasons.push(reason('learner_incomplete', null, null, 'the learner record is marked incomplete'));
      }
      state.reasons.push(reason('no_rule', null, null, `no progression rule covers level "${learner.level}"`));
      state.flags.push(flag('no_rule'));
      const trace: ProgressionTrace = {
        learner: learner.learner,
        level: learner.level,
        rule: null,
        targets: { next: null, stage: null },
        annual_status: context.annual?.status ?? null,
        learner_complete: learner.complete !== false,
        requirements: {},
        metrics: [],
        action: 'council',
        to_level: null,
        to_stage: null,
        council_suggested: null,
        flags: state.flags,
        complete: false,
      };
      return {
        learner: learner.learner,
        level: learner.level,
        rule: trace.rule,
        action: 'council' as const,
        to_level: null,
        to_stage: null,
        metrics: [],
        council: null,
        reasons: state.reasons,
        flags: state.flags,
        complete: false,
        trace,
      };
    }
    if (rule.rule === 'graduate') {
      const state: EvaluationState = { metrics: [], reasons: [], flags: [] };
      state.reasons.push(reason('rule_graduate'));
      if (learner.complete === false) {
        state.flags.push(flag('data_incomplete'));
        state.reasons.push(reason('learner_incomplete', null, null, 'the learner record is marked incomplete'));
      }
      const trace: ProgressionTrace = {
        learner: learner.learner,
        level: learner.level,
        rule,
        targets: { next: null, stage: null },
        annual_status: context.annual?.status ?? null,
        learner_complete: learner.complete !== false,
        requirements: {},
        metrics: [],
        action: 'graduate',
        to_level: null,
        to_stage: null,
        council_suggested: null,
        flags: state.flags,
        complete: learner.complete !== false,
      };
      return {
        learner: learner.learner,
        level: learner.level,
        rule: trace.rule,
        action: 'graduate' as const,
        to_level: null,
        to_stage: null,
        metrics: [],
        council: null,
        reasons: state.reasons,
        flags: state.flags,
        complete: learner.complete !== false,
        trace,
      };
    }
    return evaluateOne(rule, learner, context);
  });

  return { ok: true, suggestions };
}

/**
 * Evaluates one learner and hands back the single suggestion, in the same shape a run returns.
 * The caller supplies the whole rule document because which rule applies is a property of it.
 */
export function evaluatePromotion(
  definition: ProgressionDefinition,
  learner: ProgressionLearner,
  context: ProgressionContext = {}
): ProgressionEvaluation {
  return evaluateProgression(definition, [learner], context);
}
