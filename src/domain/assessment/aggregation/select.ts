// ABOUTME: The `best_n` selection of spec 03 section 6: required areas first, then each group
// ABOUTME: minimum, then the remaining places by value. Every candidate's fate is recorded, and a
// ABOUTME: tie is always broken the same way, so the same inputs always select the same N.

import { compareExact, formatExact, sumExact, type Exact } from '../engine';
import type { GroupConstraint, SelectionDecision } from './types';

/** One area the selection may pick, with the value it would contribute. */
export interface SelectionCandidate {
  readonly code: string;
  readonly group: string | null;
  /** The exact value, or null when the area has no usable result. */
  readonly value: Exact | null;
}

export type SelectionStatus = 'ok' | 'required_missing' | 'group_minimum_unmet' | 'insufficient';

export interface Selection {
  readonly decisions: readonly SelectionDecision[];
  readonly selected: readonly string[];
  /** The sum of the selected values. */
  readonly value: Exact;
  readonly status: SelectionStatus;
}

/**
 * Orders two candidates: the higher value first, then the lower code.
 *
 * The code tie-break makes a tie intrinsic to the set rather than to the order the caller happened
 * to pass, so two callers that hold the same results always select the same areas.
 */
function compareCandidates(left: SelectionCandidate, right: SelectionCandidate): number {
  const leftValue = left.value;
  const rightValue = right.value;
  if (leftValue === null || rightValue === null) {
    return leftValue === rightValue ? 0 : leftValue === null ? 1 : -1;
  }
  const byValue = compareExact(rightValue, leftValue);
  if (byValue !== 0) return byValue;
  return left.code < right.code ? -1 : left.code > right.code ? 1 : 0;
}

const isRequired = (constraint: GroupConstraint): constraint is { require_all: readonly string[] } =>
  'require_all' in constraint;

const isGroupMinimum = (constraint: GroupConstraint): constraint is { group: string; min: number } =>
  'group' in constraint;

/**
 * Selects the N results that satisfy the declared constraints.
 *
 * The order is fixed: every `require_all` area, then each `{group, min}` filled with the highest
 * values of that group, then the remaining places by value. A minimum is satisfied by required
 * areas already in the selection when they belong to the group, because "at least two sciences"
 * counts a science that was compulsory.
 *
 * `fill_from: any` is not required for places to be filled: a definition that declares only minima
 * would otherwise never reach N. It is accepted, and recorded, as the explicit statement of what
 * this function does by default.
 */
export function selectBest(params: {
  readonly candidates: readonly SelectionCandidate[];
  readonly groups: readonly GroupConstraint[];
  readonly n: number;
}): Selection {
  const { candidates, groups, n } = params;
  const byCode = new Map(candidates.map((candidate) => [candidate.code, candidate]));
  const ordered = [...candidates].filter((candidate) => candidate.value !== null).sort(compareCandidates);

  const selected: string[] = [];
  const reasons = new Map<string, SelectionDecision['reason']>();
  const take = (code: string, reason: SelectionDecision['reason']): void => {
    if (selected.includes(code)) return;
    selected.push(code);
    reasons.set(code, reason);
  };

  let status: SelectionStatus = 'ok';

  for (const constraint of groups) {
    if (!isRequired(constraint)) continue;
    for (const code of constraint.require_all) {
      const candidate = byCode.get(code);
      if (candidate === undefined || candidate.value === null) {
        if (status === 'ok') status = 'required_missing';
        continue;
      }
      take(code, 'required');
    }
  }

  for (const constraint of groups) {
    if (!isGroupMinimum(constraint)) continue;
    const inGroup = selected.filter((code) => byCode.get(code)?.group === constraint.group).length;
    const needed = Math.max(0, constraint.min - inGroup);
    if (needed === 0) continue;
    const pool = ordered.filter(
      (candidate) => candidate.group === constraint.group && !selected.includes(candidate.code)
    );
    if (pool.length < needed) {
      if (status === 'ok') status = 'group_minimum_unmet';
    }
    for (const candidate of pool.slice(0, needed)) take(candidate.code, 'group_minimum');
  }

  const places = Math.max(0, n - selected.length);
  for (const candidate of ordered.filter((entry) => !selected.includes(entry.code)).slice(0, places)) {
    take(candidate.code, 'fill');
  }
  if (selected.length < n && status === 'ok') status = 'insufficient';

  const selectedValues = selected
    .map((code) => byCode.get(code)?.value ?? null)
    .filter((value): value is Exact => value !== null);

  const decisions: readonly SelectionDecision[] = [...candidates]
    .sort((left, right) => compareCandidates(left, right))
    .map((candidate) => {
      const chosen = selected.includes(candidate.code);
      if (chosen) {
        return {
          code: candidate.code,
          group: candidate.group,
          value: candidate.value === null ? null : formatExact(candidate.value),
          selected: true,
          reason: reasons.get(candidate.code) ?? 'fill',
          lost_to: null,
        };
      }
      if (candidate.value === null) {
        return {
          code: candidate.code,
          group: candidate.group,
          value: null,
          selected: false,
          reason: 'missing_value',
          lost_to: null,
        };
      }
      // The selected area that kept this one out: the lowest selected value at or above it, which is
      // the place it would have taken. A candidate better than every selected value lost to the
      // slots the constraints had already filled, not to a value.
      const better = selected
        .map((code) => byCode.get(code))
        .filter((entry): entry is SelectionCandidate => entry !== undefined && entry.value !== null)
        .filter((entry) => compareExact(entry.value as Exact, candidate.value as Exact) >= 0)
        .sort((left, right) => {
          const byValue = compareExact(left.value as Exact, right.value as Exact);
          if (byValue !== 0) return byValue;
          return left.code < right.code ? -1 : left.code > right.code ? 1 : 0;
        });
      return {
        code: candidate.code,
        group: candidate.group,
        value: formatExact(candidate.value),
        selected: false,
        reason: better.length > 0 ? 'lower_value' : 'slots_full',
        lost_to: better.length > 0 ? better[0].code : null,
      };
    });

  return {
    decisions,
    selected,
    value: sumExact(selectedValues),
    status,
  };
}
