// ABOUTME: The clearance rule: a settled account and a credit balance clear, an amount owed is on a
// ABOUTME: plan or in arrears, and a sponsor's unpaid share blocks only when the agreement says so.

import { describe, expect, it } from 'vitest';

import { fromMinor } from '@/domain/money';

import { clearanceStatus } from '..';

const kes = (minor: number) => fromMinor(minor, 'KES');

describe('the clearance rule', () => {
  it('clears a settled account', () => {
    const status = clearanceStatus(kes(0), 'KES');
    expect(status.state).toBe('cleared');
    expect(status.cleared).toBe(true);
    expect(status.outstanding.amount_minor).toBe(0);
    expect(status.credit.amount_minor).toBe(0);
    expect(status.reasons.join(' ')).toContain('settled');
  });

  it('clears a credit balance, and reports the credit', () => {
    const status = clearanceStatus(kes(-250_000), 'KES');
    expect(status.state).toBe('cleared');
    expect(status.cleared).toBe(true);
    expect(status.outstanding.amount_minor).toBe(0);
    expect(status.credit.amount_minor).toBe(250_000);
    expect(status.reasons.join(' ')).toContain('credit');
  });

  it('reports an amount owed with no plan as in arrears', () => {
    const status = clearanceStatus(kes(120_000), 'KES');
    expect(status.state).toBe('in_arrears');
    expect(status.cleared).toBe(false);
    expect(status.outstanding.amount_minor).toBe(120_000);
    expect(status.credit.amount_minor).toBe(0);
  });

  it('reports an amount owed under a payment plan as on plan', () => {
    const status = clearanceStatus(kes(120_000), 'KES', { onPlan: true });
    expect(status.state).toBe('on_plan');
    expect(status.cleared).toBe(false);
    expect(status.reasons.join(' ')).toContain('payment plan');
  });
});

describe('a sponsor\'s unpaid share', () => {
  it('does not block clearance under the default sponsor-liability policy', () => {
    const status = clearanceStatus(kes(120_000), 'KES', { sponsorShortfall: kes(80_000) });
    expect(status.state).toBe('in_arrears');
    expect(status.reasons.join(' ')).toContain('does not block the learner');
  });

  it('blocks clearance only when the agreement makes the family answer for it', () => {
    const status = clearanceStatus(kes(120_000), 'KES', {
      sponsorShortfall: kes(80_000),
      sponsorBlocksClearance: true,
    });
    expect(status.state).toBe('in_arrears');
    expect(status.cleared).toBe(false);
    expect(status.reasons.join(' ')).toContain('makes the family answer for it');
  });

  it('cannot block a learner whose own account is settled or in credit', () => {
    const blocked = { sponsorShortfall: kes(80_000), sponsorBlocksClearance: true } as const;
    expect(clearanceStatus(kes(0), 'KES', blocked).state).toBe('cleared');
    expect(clearanceStatus(kes(-1), 'KES', blocked).state).toBe('cleared');
  });
});
