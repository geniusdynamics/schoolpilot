// ABOUTME: The acceptance of the module: a learner's balance is explained as the documents that sum
// ABOUTME: to it, and the same balance is read back from the ledger. An invoice, a credit note, a
// ABOUTME: payment, a write-off and an opening balance are each traceable, and the sum equals the
// ABOUTME: ledger's balance for the learner.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createAdjustmentsFixture, decimalOf, money, type AdjustmentsFixture } from './fixtures';

let fixture: AdjustmentsFixture;

beforeEach(async () => {
  fixture = await createAdjustmentsFixture();
});

afterEach(async () => {
  await fixture.close();
});

describe('explaining a balance', () => {
  it('sums the documents and agrees with the ledger', async () => {
    const learner = await fixture.learner('BAL-1');
    const { invoice } = await fixture.invoice({ learnerId: learner.id, amountMinor: 600_000 });

    const service = fixture.service();
    await service.issueCreditNote({
      learnerId: learner.id,
      amount: money(100_000),
      reason: 'Scholarship',
      issueDate: '2027-02-10',
    });
    await fixture.payment({
      learnerId: learner.id,
      amountMinor: 300_000,
      allocateTo: { invoiceId: invoice.id, amountMinor: 300_000 },
    });
    await fixture.payment({ learnerId: learner.id, amountMinor: 50_000 });

    const requested = await service.requestWriteOff({
      learnerId: learner.id,
      amount: money(150_000),
      reason: 'Uncollectable',
    });
    await service.approveWriteOff({
      writeOffId: requested.writeOff.id,
      actor: { id: fixture.checker, roles: ['head_teacher'] },
    });

    const explanation = await service.explainBalance(learner.id);

    expect(explanation.documents).toHaveLength(5);
    expect(explanation.documents.map((document) => document.kind).sort()).toEqual([
      'credit_note',
      'invoice',
      'payment',
      'payment',
      'write_off',
    ]);
    // 600,000 invoiced − 100,000 credited − 300,000 paid − 50,000 credit − 150,000 written off.
    expect(decimalOf(explanation.balance)).toBe('0.00');
    expect(decimalOf(explanation.ledgerBalance)).toBe('0.00');
    expect(explanation.agrees).toBe(true);
  });

  it('traces a debt that is still owed to its documents', async () => {
    const learner = await fixture.learner('BAL-2');
    const { invoice } = await fixture.invoice({ learnerId: learner.id, amountMinor: 600_000 });
    const service = fixture.service();
    await fixture.payment({
      learnerId: learner.id,
      amountMinor: 200_000,
      allocateTo: { invoiceId: invoice.id, amountMinor: 200_000 },
    });

    const explanation = await service.explainBalance(learner.id);
    expect(decimalOf(explanation.balance)).toBe('4000.00');
    expect(explanation.agrees).toBe(true);
    expect(explanation.documents[0]?.kind).toBe('invoice');
    expect(explanation.documents[0]?.number).toBe(invoice.number);
  });

  it('lists an opening balance as its own kind', async () => {
    const learner = await fixture.learner('BAL-3');
    await fixture.invoice({ learnerId: learner.id, amountMinor: 250_000, kind: 'opening_balance' });

    const explanation = await fixture.service().explainBalance(learner.id);
    expect(explanation.documents).toHaveLength(1);
    expect(explanation.documents[0]?.kind).toBe('opening_balance');
    expect(decimalOf(explanation.balance)).toBe('2500.00');
    expect(explanation.agrees).toBe(true);
  });

  it('raises the balance again when a written-off debt is recovered', async () => {
    const learner = await fixture.learner('BAL-4');
    await fixture.invoice({ learnerId: learner.id, amountMinor: 600_000 });
    const service = fixture.service();
    const requested = await service.requestWriteOff({
      learnerId: learner.id,
      amount: money(600_000),
      reason: 'Uncollectable',
    });
    await service.approveWriteOff({
      writeOffId: requested.writeOff.id,
      actor: { id: fixture.checker, roles: ['head_teacher'] },
    });

    const writtenOff = await service.explainBalance(learner.id);
    expect(decimalOf(writtenOff.balance)).toBe('0.00');
    expect(writtenOff.agrees).toBe(true);

    await service.recoverWriteOff({
      writeOffId: requested.writeOff.id,
      reason: 'Sponsor settled the arrears',
      recoveredAt: '2027-03-01',
    });

    const recovered = await service.explainBalance(learner.id);
    expect(decimalOf(recovered.balance)).toBe('6000.00');
    expect(recovered.agrees).toBe(true);
    expect(recovered.documents).toHaveLength(3);
  });

  it('counts only documents dated on or before the as-of day', async () => {
    const learner = await fixture.learner('BAL-5');
    await fixture.invoice({ learnerId: learner.id, amountMinor: 600_000, issueDate: '2027-01-05' });
    const service = fixture.service();
    await service.issueCreditNote({
      learnerId: learner.id,
      amount: money(100_000),
      reason: 'Scholarship',
      issueDate: '2027-02-10',
    });

    const atJanuary = await service.explainBalance(learner.id, { asOf: '2027-01-31' });
    expect(atJanuary.documents).toHaveLength(1);
    expect(decimalOf(atJanuary.balance)).toBe('6000.00');
    expect(atJanuary.agrees).toBe(true);
  });
});
