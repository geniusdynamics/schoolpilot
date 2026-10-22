// ABOUTME: Replay for a progression suggestion: re-verify every metric from the trace that produced
// ABOUTME: it, re-evaluate the rule from the recorded conditions and requirements, and refuse a
// ABOUTME: suggestion whose action does not follow from its own evidence.

import { replayAggregate } from '../aggregation';
import { TraceMismatchError, compareExact, parseExact } from '../engine';
import { replayAnnual } from './annualReplay';
import type {
  CouncilSuggestionOutcome,
  MetricTrace,
  PreparedCondition,
  PreparedPromotionRule,
  ProgressionAction,
  ProgressionFlag,
  ProgressionTrace,
  ReplayedProgression,
} from './types';

function checkText(path: string, recorded: string | null, recomputed: string | null): void {
  if (recorded !== recomputed) {
    throw new TraceMismatchError(path, String(recorded), String(recomputed));
  }
}

function checkBoolean(path: string, recorded: boolean, recomputed: boolean): void {
  if (recorded !== recomputed) {
    throw new TraceMismatchError(path, String(recorded), String(recomputed));
  }
}

/** Re-verifies a metric from the annual or aggregation trace it carries. */
function checkMetric(metric: MetricTrace): void {
  if (metric.annual !== null) {
    const replayed = replayAnnual(metric.annual);
    checkText(`${metric.metric}.value`, metric.value, replayed.value);
  }
  if (metric.aggregate !== null) {
    const replayed = replayAggregate(metric.aggregate);
    checkText(`${metric.metric}.value`, metric.value, replayed.value);
  }
  if (metric.status === 'resolved') {
    if (metric.value === null || parseExact(metric.value) === null) {
      throw new TraceMismatchError(`${metric.metric}.value`, 'an exact decimal', String(metric.value));
    }
  } else if (metric.value !== null) {
    throw new TraceMismatchError(`${metric.metric}.value`, 'no value for an unknown metric', metric.value);
  }
}

function outcome(condition: PreparedCondition, metric: MetricTrace): 'met' | 'failed' | 'unknown' {
  if (metric.status !== 'resolved' || metric.value === null) return 'unknown';
  const value = parseExact(metric.value);
  const bound = parseExact(condition.gte);
  if (value === null || bound === null) return 'unknown';
  return compareExact(value, bound) >= 0 ? 'met' : 'failed';
}

function sameFlags(left: readonly ProgressionFlag[], right: readonly ProgressionFlag[]): boolean {
  return (
    left.length === right.length &&
    left.every(
      (flag, index) =>
        flag.code === right[index].code &&
        flag.metric === right[index].metric &&
        flag.requirement === right[index].requirement
    )
  );
}

function metricMap(trace: ProgressionTrace): Map<string, MetricTrace> {
  const map = new Map<string, MetricTrace>();
  for (const metric of trace.metrics) {
    if (map.has(metric.metric)) {
      throw new TraceMismatchError(`metrics[${metric.metric}]`, 'one entry per metric', 'a duplicate');
    }
    checkMetric(metric);
    map.set(metric.metric, metric);
  }
  return map;
}

function checkFlag(flag: ProgressionFlag, trace: ProgressionTrace, metrics: Map<string, MetricTrace>, needsTarget: boolean): void {
  if (flag.code === 'requirement_unmet') {
    if (flag.requirement === null || trace.requirements[flag.requirement] !== false) {
      throw new TraceMismatchError('flags.requirement_unmet', 'a missing requirement', String(flag.requirement));
    }
    return;
  }
  if (flag.code === 'metric_unknown') {
    const metric = flag.metric === null ? undefined : metrics.get(flag.metric);
    if (metric === undefined || metric.status !== 'unknown') {
      throw new TraceMismatchError('flags.metric_unknown', 'an unknown metric', String(flag.metric));
    }
    return;
  }
  if (flag.code === 'data_incomplete') {
    const annualIncomplete =
      trace.annual_status === 'incomplete' || trace.annual_status === 'empty';
    if (trace.learner_complete && !annualIncomplete) {
      throw new TraceMismatchError('flags.data_incomplete', 'incomplete data', 'complete data');
    }
    return;
  }
  if (flag.code === 'no_rule') {
    if (trace.rule !== null) {
      throw new TraceMismatchError('flags.no_rule', 'no rule', 'a rule');
    }
    return;
  }
  if (flag.code === 'target_unknown' && !needsTarget) {
    throw new TraceMismatchError('flags.target_unknown', 'an action that needs a target', 'none');
  }
}

interface Decision {
  readonly action: ProgressionAction;
  readonly to_level: string | null;
  readonly to_stage: string | null;
  readonly council_suggested: CouncilSuggestionOutcome | null;
  readonly complete: boolean;
}

function decide(rule: PreparedPromotionRule, trace: ProgressionTrace): Decision {
  const metrics = metricMap(trace);
  const used = new Set<string>();
  for (const condition of rule.conditions) used.add(condition.metric);
  if (rule.suggest !== undefined) used.add(rule.suggest.metric);
  for (const metric of metrics.keys()) {
    if (!used.has(metric)) {
      throw new TraceMismatchError(`metrics[${metric}]`, 'a metric the rule reads', 'an unused metric');
    }
  }
  for (const metric of used) {
    if (!metrics.has(metric)) {
      throw new TraceMismatchError(`metrics[${metric}]`, 'a recorded metric', 'nothing');
    }
  }

  const target = rule.rule === 'stage_transition' ? trace.targets.stage : trace.targets.next;
  const flags: ProgressionFlag[] = [];
  let action: ProgressionAction = 'council';
  let councilSuggested: CouncilSuggestionOutcome | null = null;

  if (!trace.learner_complete) flags.push({ code: 'data_incomplete', metric: null, requirement: null });
  if (rule.rule !== 'stage_transition' && Object.keys(trace.requirements).length > 0) {
    throw new TraceMismatchError('requirements', `no requirements`, `[${Object.keys(trace.requirements).join(', ')}]`);
  }

  if (rule.rule === 'automatic') {
    action = 'promote';
  } else if (rule.rule === 'threshold') {
    const outcomes = rule.conditions.map((condition) => outcome(condition, metrics.get(condition.metric) as MetricTrace));
    for (const condition of rule.conditions) {
      if (metrics.get(condition.metric)?.status === 'unknown') {
        flags.push({ code: 'metric_unknown', metric: condition.metric, requirement: null });
      }
    }
    const failed = outcomes.includes('failed');
    const unknown = outcomes.includes('unknown');
    if (failed) action = rule.else === 'repeat' ? 'repeat' : 'council';
    else if (unknown) action = 'council';
    else action = 'promote';
  } else if (rule.rule === 'class_council') {
    action = 'council';
    const condition = rule.suggest;
    if (condition !== undefined) {
      const metric = metrics.get(condition.metric) as MetricTrace;
      const result = outcome(condition, metric);
      councilSuggested =
        result === 'unknown' ? null : result === 'met' ? 'promote' : 'refer_to_council';
      if (metric.status === 'unknown') flags.push({ code: 'metric_unknown', metric: condition.metric, requirement: null });
    }
  } else {
    let blocked = false;
    for (const requirement of rule.requires) {
      const recorded = trace.requirements[requirement];
      if (typeof recorded !== 'boolean') {
        throw new TraceMismatchError(`requirements[${requirement}]`, 'a recorded requirement', 'nothing');
      }
      if (!recorded) {
        blocked = true;
        flags.push({ code: 'requirement_unmet', metric: null, requirement });
      }
    }
    const extra = Object.keys(trace.requirements).filter((name) => !rule.requires.includes(name));
    if (extra.length > 0) {
      throw new TraceMismatchError('requirements', `[${rule.requires.join(', ')}]`, `[${Object.keys(trace.requirements).join(', ')}]`);
    }
    action = blocked ? 'blocked' : 'promote';
  }

  const needsTarget = action !== 'repeat';
  if (needsTarget && target === null) {
    flags.push({ code: 'target_unknown', metric: null, requirement: null });
    if (action === 'promote') action = 'council';
  }

  if (rule.rule === 'threshold' || rule.rule === 'class_council') {
    if (trace.annual_status === 'incomplete' || trace.annual_status === 'empty') {
      flags.push({ code: 'data_incomplete', metric: null, requirement: null });
    }
  }

  for (const flag of trace.flags) checkFlag(flag, trace, metrics, needsTarget);
  if (!sameFlags(flags, trace.flags)) {
    throw new TraceMismatchError(
      'flags',
      `[${trace.flags.map((flag) => flag.code).join(', ')}]`,
      `[${flags.map((flag) => flag.code).join(', ')}]`
    );
  }

  const blocking = flags.some(
    (flag) =>
      flag.code === 'metric_unknown' ||
      flag.code === 'data_incomplete' ||
      flag.code === 'no_rule' ||
      flag.code === 'target_unknown'
  );
  const complete = !blocking;
  const toLevel = action === 'promote' || action === 'council' || action === 'blocked' ? target : null;
  const toStage = rule.rule === 'stage_transition' ? (rule.to_stage ?? null) : null;

  return { action, to_level: toLevel, to_stage: toStage, council_suggested: councilSuggested, complete };
}

/**
 * Replays a suggestion from its trace.
 *
 * A metric is checked against its own annual or aggregation trace before the rule reads it, so a
 * suggestion that swapped a threshold for a better number fails rather than replaying itself. A
 * caller-supplied metric has no trace and is taken as attested; everything else is recomputed.
 */
export function replayProgression(trace: ProgressionTrace): ReplayedProgression {
  if (trace.rule === null) {
    if (trace.action !== 'council' || trace.to_level !== null || trace.to_stage !== null) {
      throw new TraceMismatchError('action', 'council with no destination', trace.action);
    }
    if (trace.complete) throw new TraceMismatchError('complete', 'false', 'true');
    if (!trace.flags.some((flag) => flag.code === 'no_rule')) {
      throw new TraceMismatchError('flags', 'a no_rule flag', 'none');
    }
    return {
      action: 'council',
      to_level: null,
      to_stage: null,
      council_suggested: null,
      complete: false,
    };
  }

  if (!trace.rule.levels.includes(trace.level)) {
    throw new TraceMismatchError('rule.levels', `a rule covering "${trace.level}"`, `[${trace.rule.levels.join(', ')}]`);
  }

  if (trace.rule.rule === 'graduate') {
    checkText('action', trace.action, 'graduate');
    checkText('to_level', trace.to_level, null);
    checkText('to_stage', trace.to_stage, null);
    checkText('council_suggested', trace.council_suggested, null);
    if (trace.metrics.length > 0) throw new TraceMismatchError('metrics', 'no metrics', `${trace.metrics.length}`);
    if (Object.keys(trace.requirements).length > 0) {
      throw new TraceMismatchError('requirements', 'no requirements', `${Object.keys(trace.requirements).length}`);
    }
    const complete = trace.learner_complete;
    checkBoolean('complete', trace.complete, complete);
    return { action: 'graduate', to_level: null, to_stage: null, council_suggested: null, complete };
  }

  const decision = decide(trace.rule, trace);
  checkText('action', trace.action, decision.action);
  checkText('to_level', trace.to_level, decision.to_level);
  checkText('to_stage', trace.to_stage, decision.to_stage);
  checkText('council_suggested', trace.council_suggested, decision.council_suggested);
  checkBoolean('complete', trace.complete, decision.complete);

  return {
    action: decision.action,
    to_level: decision.to_level,
    to_stage: decision.to_stage,
    council_suggested: decision.council_suggested,
    complete: decision.complete,
  };
}
