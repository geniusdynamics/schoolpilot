// ABOUTME: The ranking view model: positions for the analysis page, computed by the aggregation
// ABOUTME: engine under the pack's own policy. When the policy is disabled the engine computes no
// ABOUTME: entries and this view carries none, so no position, place or ordinal can be rendered.

import { rankLearners, type RankingPolicy } from '@/domain/assessment/aggregation';
import type { AggregateOutcome } from '@/modules/academics/pages/results';

import type { RankingRowView, RankingView } from './types';

/** One learner the policy may place, with the metric value and completeness already resolved. */
export interface RankingLearner {
  readonly enrolmentId: string;
  readonly learnerName: string;
  readonly scope: string;
  readonly scopeLabel: string;
  /** The value of the policy's `by` metric, exact text, or null when the learner has none. */
  readonly value: string | null;
  /** False for a learner whose result is not complete; listed but unranked when `only_complete`. */
  readonly complete: boolean;
}

/**
 * The value a policy's `by` names, read off a learner's aggregate.
 *
 * `by` is an aggregate code, optionally qualified with the field to read: `cbe_mean_percent`,
 * `kcse_mean_grade.points`. A field the analysis cannot produce yields null, so the learner is
 * listed with no position rather than ranked on a number nobody computed.
 */
export function metricValue(by: string | null, aggregate: AggregateOutcome): string | null {
  if (by === null) return null;
  const [code, field = 'value'] = by.split('.');
  if (code !== aggregate.code) return null;
  switch (field) {
    case 'value':
    case 'score':
      return aggregate.value;
    case 'points':
    case 'grade_points':
      return aggregate.grade?.points ?? null;
    default:
      return null;
  }
}

/**
 * The policy's verdict on this analysis.
 *
 * The engine's `rankLearners` is the single authority: it computes no entries when the policy is
 * disabled, and it lists an incomplete learner without a position when `only_complete` is set. This
 * view only joins names to the entries and carries the policy's own switches, so the page has
 * nothing to show a position from unless the engine produced one.
 */
export function buildRankingView(
  policy: RankingPolicy,
  learners: readonly RankingLearner[]
): RankingView {
  const enabled = policy.enabled ?? false;
  const ties = policy.ties ?? 'competition_1224';
  const onlyComplete = policy.only_complete ?? false;
  const showOutOf = policy.show_out_of ?? true;
  const showOnReport = policy.show_on_report ?? false;
  const scope = policy.scope ?? null;
  const by = policy.by ?? null;

  const byEnrolment = new Map(learners.map((learner) => [learner.enrolmentId, learner] as const));
  const evaluation = rankLearners(
    policy,
    learners.map((learner) => ({
      learner: learner.enrolmentId,
      scope: learner.scope,
      ...(learner.value === null ? {} : { value: learner.value }),
      complete: learner.complete,
    }))
  );

  const base = {
    enabled,
    by,
    scope,
    ties,
    only_complete: onlyComplete,
    show_out_of: showOutOf,
    show_on_report: showOnReport,
  };

  if (!evaluation.ok) return { ...base, rows: [], issues: evaluation.issues };

  const rows: RankingRowView[] = evaluation.result.entries.map((entry) => {
    const learner = byEnrolment.get(entry.learner);
    return {
      enrolmentId: entry.learner,
      learnerName: learner?.learnerName ?? entry.learner,
      scope: entry.scope,
      scopeLabel: learner?.scopeLabel ?? entry.scope,
      value: entry.value,
      position: entry.position,
      out_of: entry.out_of,
      ranked: entry.ranked,
      reason: entry.reason,
    };
  });

  return { ...base, rows, issues: evaluation.result.issues };
}
