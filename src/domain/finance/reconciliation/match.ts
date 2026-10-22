// ABOUTME: The matching engine: it scores a statement line against the payments and ledger entries
// ABOUTME: that could correspond to it and returns suggestions with their reasons. It writes
// ABOUTME: nothing - a suggestion is a proposal, and a human confirms it.

import { dayDifference, nameSimilarity, normaliseReference } from './normalise';
import type {
  CandidateKind,
  MatchCandidate,
  MatchReason,
  MatchSuggestion,
  StatementLine,
} from './types';

/**
 * The weight each rule contributes to a score.
 *
 * The amount is the gate, not a weight: a candidate whose amount differs from the line's by one
 * minor unit is never suggested, so the weights below only order the candidates that could be the
 * one. The window and the exact reference are the two strong signals after the amount; the payer
 * name and the account corroborate.
 */
export const MATCH_WEIGHTS = {
  amount_exact: 50,
  date_window: 20,
  reference_exact: 20,
  reference_contains: 10,
  payer_name_similar: 10,
  direction_match: 5,
  account_match: 5,
} as const;

/** The default window: a line and its payment may be five days apart. */
export const DEFAULT_DATE_WINDOW_DAYS = 5;
/** What each day of distance costs, so a suggestion five days out scores nothing for its date. */
export const DATE_WINDOW_STEP = MATCH_WEIGHTS.date_window / DEFAULT_DATE_WINDOW_DAYS;
/** The score of the best possible suggestion. */
export const MAX_MATCH_SCORE = 100;
/** The shortest reference a containment test is allowed to consider. */
export const MIN_CONTAINMENT_REFERENCE = 4;
/** How alike two names must be before the payer-name rule fires. */
export const PAYER_NAME_THRESHOLD = 0.5;

/** How the engine is tuned, and which candidates it leaves out. */
export interface MatchEngineOptions {
  /** How many days apart a line and a candidate may be. Defaults to {@link DEFAULT_DATE_WINDOW_DAYS}. */
  readonly windowDays?: number;
  /** Only suggest candidates of these kinds. Defaults to both. */
  readonly kinds?: readonly CandidateKind[];
  /** Candidates already matched, by `kind:id`, which are never suggested again. */
  readonly excludeCandidates?: readonly string[];
  /** Statement lines already matched, which get no suggestions. */
  readonly excludeLines?: readonly string[];
}

/** The key a candidate is held under: its kind and its id. */
export function candidateKey(kind: CandidateKind, id: string): string {
  return `${kind}:${id}`;
}

/**
 * Scores one candidate against one statement line.
 *
 * Returns null when the amount rule or the window rule rules the candidate out; otherwise a
 * suggestion whose `score` is the sum of the weights of the rules that fired and whose `reasons`
 * name each one. `rank` is 0 here and set by {@link suggestMatches}.
 */
export function scoreCandidate(
  line: StatementLine,
  candidate: MatchCandidate,
  options: MatchEngineOptions = {}
): MatchSuggestion | null {
  if (options.kinds !== undefined && !options.kinds.includes(candidate.kind)) return null;
  if (line.amount.currency !== candidate.amount.currency) return null;
  if (line.amount.amount_minor !== candidate.amount.amount_minor) return null;

  const days = dayDifference(line.valueDate, candidate.date);
  if (days === null) return null;
  const window = options.windowDays ?? DEFAULT_DATE_WINDOW_DAYS;
  if (days > window) return null;

  const reasons: MatchReason[] = [
    {
      rule: 'amount_exact',
      weight: MATCH_WEIGHTS.amount_exact,
      detail: `${line.amount.amount_minor} ${line.amount.currency} on both sides`,
    },
    {
      rule: 'date_window',
      weight: Math.max(0, MATCH_WEIGHTS.date_window - days * DATE_WINDOW_STEP),
      detail:
        days === 0
          ? `both dated ${line.valueDate}`
          : `${days} day(s) apart (${line.valueDate} against ${candidate.date})`,
    },
  ];

  const lineReference = normaliseReference(line.reference);
  const candidateReference = normaliseReference(candidate.reference);
  if (lineReference !== null && candidateReference !== null) {
    if (lineReference === candidateReference) {
      reasons.push({
        rule: 'reference_exact',
        weight: MATCH_WEIGHTS.reference_exact,
        detail: `both carry the reference ${lineReference}`,
      });
    } else if (containsReference(lineReference, candidateReference)) {
      reasons.push({
        rule: 'reference_contains',
        weight: MATCH_WEIGHTS.reference_contains,
        detail: `${candidateReference} and ${lineReference} carry one another`,
      });
    }
  }

  // A bank narration usually names the payer, so the candidate's payer is compared with the
  // line's payer column when it has one and with its description when it does not.
  const lineName = line.payerName ?? line.description;
  const similarity = nameSimilarity(candidate.payerName, lineName);
  if (similarity >= PAYER_NAME_THRESHOLD) {
    reasons.push({
      rule: 'payer_name_similar',
      weight: MATCH_WEIGHTS.payer_name_similar,
      detail: `"${candidate.payerName ?? ''}" reads as "${lineName ?? ''}"`,
    });
  }

  if (line.direction === candidate.direction) {
    reasons.push({
      rule: 'direction_match',
      weight: MATCH_WEIGHTS.direction_match,
      detail: `both ${line.direction}`,
    });
  }

  if (candidate.accountId !== null && candidate.accountId === line.accountId) {
    reasons.push({
      rule: 'account_match',
      weight: MATCH_WEIGHTS.account_match,
      detail: `both on account ${line.accountId}`,
    });
  }

  const score = Math.min(
    MAX_MATCH_SCORE,
    reasons.reduce((total, reason) => total + reason.weight, 0)
  );
  return {
    lineId: line.id,
    candidateId: candidate.id,
    candidateKind: candidate.kind,
    score,
    rank: 0,
    dayDifference: days,
    reasons,
  };
}

/**
 * Suggests, for every line, the candidates that could correspond to it.
 *
 * The engine writes nothing: a suggestion is a proposal, and only {@link confirmMatch} records a
 * match. Lines and candidates that already carry a confirmed match are left out, so a suggestion is
 * always available to be confirmed.
 *
 * The candidates of a line are ordered by score, then by the closer date, then by an exact
 * reference, then payments before ledger entries, then by the candidate's date and id - so the same
 * inputs always produce the same order.
 */
export function suggestMatches(
  lines: readonly StatementLine[],
  candidates: readonly MatchCandidate[],
  options: MatchEngineOptions = {}
): readonly MatchSuggestion[] {
  const excludedCandidates = new Set(options.excludeCandidates ?? []);
  const excludedLines = new Set(options.excludeLines ?? []);
  const results: MatchSuggestion[] = [];

  for (const line of lines) {
    if (excludedLines.has(line.id)) continue;
    const scored = candidates
      .filter((candidate) => !excludedCandidates.has(candidateKey(candidate.kind, candidate.id)))
      .map((candidate) => scoreCandidate(line, candidate, options))
      .filter((suggestion): suggestion is MatchSuggestion => suggestion !== null)
      .sort((left, right) => compareSuggestions(left, right, candidates));

    scored.forEach((suggestion, index) => {
      results.push({ ...suggestion, rank: index + 1 });
    });
  }
  return results;
}

/** The order a line's suggestions are listed in. */
function compareSuggestions(
  left: MatchSuggestion,
  right: MatchSuggestion,
  candidates: readonly MatchCandidate[]
): number {
  if (left.score !== right.score) return right.score - left.score;
  if (left.dayDifference !== right.dayDifference) return left.dayDifference - right.dayDifference;
  const leftExact = hasRule(left, 'reference_exact') ? 1 : 0;
  const rightExact = hasRule(right, 'reference_exact') ? 1 : 0;
  if (leftExact !== rightExact) return rightExact - leftExact;
  if (left.candidateKind !== right.candidateKind) {
    return left.candidateKind === 'payment' ? -1 : 1;
  }
  const leftDate = candidates.find((candidate) => candidate.id === left.candidateId)?.date ?? '';
  const rightDate = candidates.find((candidate) => candidate.id === right.candidateId)?.date ?? '';
  if (leftDate !== rightDate) return leftDate < rightDate ? -1 : 1;
  return left.candidateId < right.candidateId ? -1 : left.candidateId > right.candidateId ? 1 : 0;
}

function hasRule(suggestion: MatchSuggestion, rule: MatchReason['rule']): boolean {
  return suggestion.reasons.some((reason) => reason.rule === rule);
}

/** Whether two normalised references carry one another, ignoring the very short ones. */
function containsReference(left: string, right: string): boolean {
  if (left.length < MIN_CONTAINMENT_REFERENCE || right.length < MIN_CONTAINMENT_REFERENCE) {
    return false;
  }
  return left.includes(right) || right.includes(left);
}
