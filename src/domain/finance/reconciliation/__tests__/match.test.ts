// ABOUTME: The matching engine: the amount gate, each rule and its weight, the score cap, the
// ABOUTME: tie-breaks that make the order deterministic, and that suggesting writes nothing.

import { describe, expect, it } from 'vitest';

import { MATCH_WEIGHTS, candidateKey, scoreCandidate, suggestMatches } from '../match';
import type { MatchCandidate, MatchSuggestion, StatementLine } from '../types';

const kes = (minor: number) => ({ amount_minor: minor, currency: 'KES' as const });

function lineWith(overrides: Partial<StatementLine> = {}): StatementLine {
  return {
    id: 'line-1',
    statementId: 'stmt-1',
    institutionId: 'inst-1',
    accountId: 'acct-bank',
    fileLine: 2,
    valueDate: '2027-01-05',
    amount: kes(150_000),
    direction: 'inflow',
    reference: 'RCT2027000101',
    description: 'AMINA OTIENO',
    payerName: null,
    raw: 'raw line 2',
    dedupeKey: 'fp#2',
    ...overrides,
  };
}

function candidateWith(overrides: Partial<MatchCandidate> = {}): MatchCandidate {
  return {
    id: 'pay-1',
    kind: 'payment',
    institutionId: 'inst-1',
    accountId: 'acct-bank',
    date: '2027-01-05',
    amount: kes(150_000),
    direction: 'inflow',
    reference: 'RCT/2027/000101',
    payerName: 'AMINA OTIENO',
    narration: 'Payment RCT/2027/000101',
    ...overrides,
  };
}

const rules = (suggestion: MatchSuggestion) => suggestion.reasons.map((reason) => reason.rule);

describe('the amount rule is the gate', () => {
  it('never suggests a candidate whose amount differs by a minor unit', () => {
    expect(scoreCandidate(lineWith(), candidateWith({ amount: kes(149_999) }))).toBeNull();
    expect(scoreCandidate(lineWith(), candidateWith({ amount: kes(150_001) }))).toBeNull();
    expect(scoreCandidate(lineWith(), candidateWith())).not.toBeNull();
  });

  it('never suggests a candidate counted in another currency', () => {
    const candidate = candidateWith({ amount: { amount_minor: 150_000, currency: 'UGX' } });
    expect(scoreCandidate(lineWith(), candidate)).toBeNull();
  });

  it('never suggests a candidate outside the date window', () => {
    expect(scoreCandidate(lineWith(), candidateWith({ date: '2027-01-11' }))).toBeNull();
    expect(scoreCandidate(lineWith(), candidateWith({ date: '2027-01-10' }))).not.toBeNull();
    expect(
      scoreCandidate(lineWith(), candidateWith({ date: '2027-01-11' }), { windowDays: 7 })
    ).not.toBeNull();
  });
});

describe('the rules a score is built from', () => {
  it('fires every rule when everything agrees, and caps the score at 100', () => {
    const suggestion = scoreCandidate(lineWith(), candidateWith()) as MatchSuggestion;
    expect(rules(suggestion)).toEqual([
      'amount_exact',
      'date_window',
      'reference_exact',
      'payer_name_similar',
      'direction_match',
      'account_match',
    ]);
    expect(suggestion.score).toBe(100);
    expect(suggestion.dayDifference).toBe(0);
    expect(suggestion.rank).toBe(0);
  });

  it('scores a reference that carries the other instead of matching it exactly', () => {
    const candidate = candidateWith({ reference: 'RCT/2027/000101/X' });
    const suggestion = scoreCandidate(lineWith(), candidate) as MatchSuggestion;
    expect(rules(suggestion)).toContain('reference_contains');
    expect(rules(suggestion)).not.toContain('reference_exact');
    expect(weightOf(suggestion, 'reference_contains')).toBe(MATCH_WEIGHTS.reference_contains);
  });

  it('costs four points for each day of distance and nothing at the edge of the window', () => {
    const atEdge = scoreCandidate(lineWith(), candidateWith({ date: '2027-01-10' })) as MatchSuggestion;
    expect(weightOf(atEdge, 'date_window')).toBe(0);
    const near = scoreCandidate(lineWith(), candidateWith({ date: '2027-01-06' })) as MatchSuggestion;
    expect(weightOf(near, 'date_window')).toBe(16);
  });

  it('fires the payer rule against the payer column when there is one, and the description when not', () => {
    const withPayer = lineWith({ payerName: 'AMINA OTIENO', description: 'fees' });
    expect(rules(scoreCandidate(withPayer, candidateWith()) as MatchSuggestion)).toContain(
      'payer_name_similar'
    );

    const other = candidateWith({ payerName: 'BRIAN MWANGI' });
    expect(rules(scoreCandidate(lineWith(), other) as MatchSuggestion)).not.toContain(
      'payer_name_similar'
    );
  });

  it('does not fire the direction rule when the two move the money differently', () => {
    const suggestion = scoreCandidate(lineWith(), candidateWith({ direction: 'outflow' })) as MatchSuggestion;
    expect(rules(suggestion)).not.toContain('direction_match');
  });

  it('does not fire the account rule when the candidate names no account', () => {
    const suggestion = scoreCandidate(lineWith(), candidateWith({ accountId: null })) as MatchSuggestion;
    expect(rules(suggestion)).not.toContain('account_match');
  });
});

describe('the order of a line\'s suggestions', () => {
  it('puts the higher score first and ranks them from 1', () => {
    const suggestions = suggestMatches(
      [lineWith({ description: null })],
      [
        candidateWith({ id: 'pay-far', date: '2027-01-08', reference: null }),
        candidateWith({ id: 'pay-near', date: '2027-01-06' }),
      ]
    );
    expect(suggestions.map((suggestion) => suggestion.candidateId)).toEqual([
      'pay-near',
      'pay-far',
    ]);
    expect(suggestions.map((suggestion) => suggestion.rank)).toEqual([1, 2]);
  });

  it('breaks a tie on the score by the closer date', () => {
    // The same score from different rules: same day with no reference, against five days out with an
    // exact one. The day weight and the reference weight are equal, so the closer date decides.
    const line = lineWith({ description: null });
    const suggestions = suggestMatches(
      [line],
      [
        candidateWith({ id: 'pay-same-day', date: '2027-01-05', reference: null }),
        candidateWith({ id: 'pay-five-days', date: '2027-01-10' }),
      ]
    );
    expect(suggestions.map((s) => s.score)).toEqual([80, 80]);
    expect(suggestions[0].candidateId).toBe('pay-same-day');
  });

  it('breaks a tie on the score and the date by an exact reference', () => {
    const line = lineWith({ description: 'AMINA OTIENO' });
    const suggestions = suggestMatches(
      [line],
      [
        // Five days out with an exact reference.
        candidateWith({ id: 'pay-exact', date: '2027-01-10', payerName: null }),
        // Five days out, a reference that carries the line's and a payer name that agrees.
        candidateWith({
          id: 'pay-partial',
          date: '2027-01-10',
          reference: 'RCT/2027/000101/X',
          payerName: 'AMINA OTIENO',
        }),
      ]
    );
    expect(suggestions.map((s) => s.score)).toEqual([80, 80]);
    expect(suggestions[0].candidateId).toBe('pay-exact');
  });

  it('breaks a tie on the score by payments before ledger entries, then by id', () => {
    const tied = [
      candidateWith({ id: 'ledger-b', kind: 'ledger_entry' }),
      candidateWith({ id: 'pay-b', kind: 'payment' }),
      candidateWith({ id: 'pay-a', kind: 'payment' }),
    ];
    const suggestions = suggestMatches([lineWith()], tied);
    expect(suggestions.map((suggestion) => suggestion.candidateId)).toEqual([
      'pay-a',
      'pay-b',
      'ledger-b',
    ]);
  });

  it('leaves out a line and a candidate that are already matched', () => {
    const suggestions = suggestMatches([lineWith(), lineWith({ id: 'line-2' })], [candidateWith()], {
      excludeLines: ['line-1'],
      excludeCandidates: [candidateKey('payment', 'pay-1')],
    });
    expect(suggestions).toEqual([]);
  });

  it('only suggests the kinds a caller asks for', () => {
    const suggestions = suggestMatches([lineWith()], [candidateWith()], { kinds: ['ledger_entry'] });
    expect(suggestions).toEqual([]);
  });
});

function weightOf(suggestion: MatchSuggestion, rule: string): number {
  return suggestion.reasons.find((reason) => reason.rule === rule)?.weight ?? -1;
}
