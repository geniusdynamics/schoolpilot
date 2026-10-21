// ABOUTME: The ranking policies of spec 03 section 6.1: a position per learner in a scope, under the
// ABOUTME: competition 1-2-2-4, dense 1-2-2-3 or shared-average tie method, with incomplete learners
// ABOUTME: listed but unranked rather than dropped or pushed to the bottom.

import { compareExact, formatExact, parseExact, type Exact } from '../engine';
import { RANKING_SCOPES, TIE_METHODS } from './types';
import type { AggregationIssue, AggregationIssueCode, RankingScope, TieMethod } from './types';

/** The ranking policy of spec 03 section 6.1. */
export interface RankingPolicy {
  /** Off by default; a school may enable ranking per report. */
  readonly enabled?: boolean;
  readonly scope?: RankingScope;
  /** The aggregate or aggregate field ranked on, for example `kcse_mean_grade.points`. */
  readonly by?: string;
  /** Ties default to competition 1-2-2-4. */
  readonly ties?: TieMethod;
  /** When true, an incomplete learner is listed but not ranked. */
  readonly only_complete?: boolean;
  readonly show_on_report?: boolean;
  readonly show_out_of?: boolean;
}

/** One learner in the population a position is computed within. */
export interface RankingCandidate {
  readonly learner: string;
  /** The class group, level or programme the learner is being ranked inside. */
  readonly scope: string;
  /** The metric named by the policy's `by`, as exact text. */
  readonly value?: string;
  /** An incomplete learner is listed but not ranked when the policy says `only_complete`. */
  readonly complete?: boolean;
}

export type RankingReason = 'ranked' | 'incomplete' | 'no_value';

/** One learner's position. `position` is exact text because a shared average can be a half. */
export interface RankingEntry {
  readonly learner: string;
  readonly scope: string;
  readonly value: string | null;
  readonly position: string | null;
  /** How many learners in the scope were ranked; the M of `N/M`. */
  readonly out_of: number;
  readonly ranked: boolean;
  readonly reason: RankingReason;
}

export interface RankingResult {
  readonly enabled: boolean;
  readonly scope: RankingScope | null;
  readonly by: string | null;
  readonly ties: TieMethod;
  readonly only_complete: boolean;
  readonly show_on_report: boolean;
  readonly show_out_of: boolean;
  readonly entries: readonly RankingEntry[];
  readonly issues: readonly AggregationIssue[];
}

export type RankingEvaluation =
  | { readonly ok: true; readonly result: RankingResult }
  | { readonly ok: false; readonly issues: readonly AggregationIssue[] };

function issue(code: AggregationIssueCode, path: string, detail: string): AggregationIssue {
  return { code, path, detail };
}

const isScope = (value: unknown): value is RankingScope => RANKING_SCOPES.some((scope) => scope === value);
const isTieMethod = (value: unknown): value is TieMethod => TIE_METHODS.some((method) => method === value);

interface Ranked {
  readonly learner: string;
  readonly value: Exact;
  position: Exact;
}

/**
 * Assigns a position to each run of equal values.
 *
 * A run occupies the places it would have under competition; the three methods differ only in what
 * the run reports: its first place (1-2-2-4), its ordinal place (1-2-2-3), or the average of the
 * places it spans (1-2.5-2.5-4).
 */
function positionsOf(values: readonly Exact[], method: TieMethod): readonly Exact[] {
  const positions: Exact[] = [];
  let start = 0;
  let ordinal = 1n;
  while (start < values.length) {
    let end = start;
    while (end + 1 < values.length && compareExact(values[end + 1], values[start]) === 0) end += 1;
    const first = BigInt(start + 1);
    const last = BigInt(end + 1);
    for (let at = start; at <= end; at += 1) {
      if (method === 'competition_1224') positions.push({ numerator: first, denominator: 1n });
      else if (method === 'dense_1223') positions.push({ numerator: ordinal, denominator: 1n });
      else positions.push({ numerator: first + last, denominator: 2n });
    }
    ordinal += 1n;
    start = end + 1;
  }
  return positions;
}

function validatePolicy(policy: RankingPolicy, issues: AggregationIssue[]): void {
  if (policy.enabled !== undefined && typeof policy.enabled !== 'boolean') {
    issues.push(issue('invalid_ranking', 'enabled', 'enabled must be a boolean'));
  }
  if (policy.scope !== undefined && !isScope(policy.scope)) {
    issues.push(issue('invalid_ranking', 'scope', `unknown ranking scope "${String(policy.scope)}"`));
  }
  if (policy.by !== undefined && (typeof policy.by !== 'string' || policy.by.trim().length === 0)) {
    issues.push(issue('invalid_ranking', 'by', 'by must name the metric ranked on'));
  }
  if (policy.ties !== undefined && !isTieMethod(policy.ties)) {
    issues.push(issue('invalid_ranking', 'ties', `unknown tie method "${String(policy.ties)}"`));
  }
}

function validateCandidates(candidates: readonly RankingCandidate[], issues: AggregationIssue[]): void {
  const seen = new Set<string>();
  candidates.forEach((candidate, index) => {
    if (typeof candidate.learner !== 'string' || candidate.learner.trim().length === 0) {
      issues.push(issue('invalid_ranking', `candidates[${index}].learner`, 'a candidate needs a non-empty learner code'));
      return;
    }
    if (seen.has(candidate.learner)) {
      issues.push(issue('duplicate_learner', `candidates[${index}].learner`, `learner "${candidate.learner}" appears twice`));
    }
    seen.add(candidate.learner);
    if (candidate.value !== undefined && parseExact(candidate.value) === null) {
      issues.push(
        issue(
          'invalid_learner_value',
          `candidates[${index}].value`,
          `learner "${candidate.learner}" has a value that is not a decimal`
        )
      );
    }
  });
}

/**
 * Ranks learners inside each scope they belong to.
 *
 * Ranking is off unless the policy enables it, and a disabled policy computes no positions at all.
 * `out_of` counts the learners ranked in the scope, so a learner listed but unranked neither
 * inflates the denominator nor takes a place from a ranked one.
 */
export function rankLearners(policy: RankingPolicy, candidates: readonly RankingCandidate[]): RankingEvaluation {
  const issues: AggregationIssue[] = [];
  validatePolicy(policy, issues);
  if (issues.length > 0) return { ok: false, issues };

  const ties = policy.ties ?? 'competition_1224';
  const onlyComplete = policy.only_complete ?? false;
  const enabled = policy.enabled ?? false;

  const result = (entries: readonly RankingEntry[]): RankingResult => ({
    enabled,
    scope: policy.scope ?? null,
    by: policy.by ?? null,
    ties,
    only_complete: onlyComplete,
    show_on_report: policy.show_on_report ?? false,
    show_out_of: policy.show_out_of ?? true,
    entries,
    issues: [],
  });

  if (!enabled) return { ok: true, result: result([]) };

  if (policy.scope === undefined) {
    issues.push(issue('invalid_ranking', 'scope', 'an enabled policy must state the scope it ranks within'));
  }
  if (policy.by === undefined) {
    issues.push(issue('invalid_ranking', 'by', 'an enabled policy must state the metric it ranks on'));
  }
  validateCandidates(candidates, issues);
  if (issues.length > 0) return { ok: false, issues };

  const scopes = [...new Set(candidates.map((candidate) => candidate.scope))].sort();
  const entries: RankingEntry[] = [];

  for (const scope of scopes) {
    const group = candidates.filter((candidate) => candidate.scope === scope);
    const ranked: Ranked[] = [];
    const unranked: { readonly learner: string; readonly value: string | null; readonly reason: RankingEntry['reason'] }[] = [];

    for (const candidate of group) {
      const value = candidate.value === undefined ? null : parseExact(candidate.value);
      if (value === null) {
        unranked.push({ learner: candidate.learner, value: null, reason: 'no_value' });
      } else if (candidate.complete === false && onlyComplete) {
        unranked.push({ learner: candidate.learner, value: candidate.value ?? null, reason: 'incomplete' });
      } else {
        ranked.push({ learner: candidate.learner, value, position: { numerator: 0n, denominator: 1n } });
      }
    }

    ranked.sort((left, right) => {
      const order = compareExact(right.value, left.value);
      if (order !== 0) return order;
      return left.learner < right.learner ? -1 : left.learner > right.learner ? 1 : 0;
    });
    const positions = positionsOf(
      ranked.map((entry) => entry.value),
      ties
    );
    ranked.forEach((entry, index) => {
      entry.position = positions[index];
    });

    const outOf = ranked.length;
    for (const entry of ranked) {
      entries.push({
        learner: entry.learner,
        scope,
        value: formatExact(entry.value),
        position: formatExact(entry.position),
        out_of: outOf,
        ranked: true,
        reason: 'ranked',
      });
    }
    for (const entry of unranked.sort((left, right) => (left.learner < right.learner ? -1 : 1))) {
      entries.push({
        learner: entry.learner,
        scope,
        value: entry.value,
        position: null,
        out_of: outOf,
        ranked: false,
        reason: entry.reason,
      });
    }
  }

  return { ok: true, result: result(entries) };
}
