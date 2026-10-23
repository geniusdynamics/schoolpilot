// ABOUTME: The credit note, proven against a real SQLite database: it reduces what the learner owes,
// ABOUTME: it takes its number from the sequences module, it posts through the ledger's own
// ABOUTME: credit-note derivation against a stated fee item or the account as a whole, and it is
// ABOUTME: either applied to an outstanding invoice through the allocation engine or left as a credit.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createAdjustmentsFixture, decimalOf, money, RECEIVABLES, type AdjustmentsFixture } from './fixtures';

let fixture: AdjustmentsFixture;

beforeEach(async () => {
  fixture = await createAdjustmentsFixture();
});

afterEach(async () => {
  await fixture.close();
});

describe('issuing a credit note', () => {
  it('numbers it from the credit-note sequence and posts it against fee revenue as a whole', async () => {
    const learner = await fixture.learner('CN-1');
    await fixture.invoice({ learnerId: learner.id, amountMinor: 600_000 });

    const outcome = await fixture.service().issueCreditNote({
      learnerId: learner.id,
      amount: money(100_000),
      reason: 'Scholarship awarded after billing',
      issueDate: '2027-02-10',
    });

    expect(outcome.number).toMatch(/^CRN\/2027\/\d{6}$/);
    expect(outcome.creditNote.status).toBe('posted');
    expect(outcome.creditNote.reason).toBe('Scholarship awarded after billing');
    expect(outcome.application).toBeNull();
    expect(decimalOf(outcome.remainingCredit)).toBe('1000.00');

    const ledger = await fixture.ledger();
    const query = { institutionId: fixture.institutionId, currency: fixture.currency };
    // The note credits the receivable and debits fee revenue as a whole (4000).
    expect(decimalOf(await ledger.accountBalance(RECEIVABLES, query))).toBe('5000.00');
    expect(decimalOf(await ledger.accountBalance('4000', query))).toBe('1000.00');
    // The invoice's own revenue account is untouched by a note that names no fee item.
    expect(decimalOf(await ledger.accountBalance('4100', query))).toBe('-6000.00');
  });

  it('posts against the fee item it names', async () => {
    const learner = await fixture.learner('CN-2');
    await fixture.invoice({ learnerId: learner.id, amountMinor: 600_000 });

    await fixture.service().issueCreditNote({
      learnerId: learner.id,
      amount: money(100_000),
      reason: 'Tuition corrected',
      issueDate: '2027-02-10',
      lines: [{ feeItemId: fixture.feeItemId, amount: money(100_000) }],
    });

    const ledger = await fixture.ledger();
    const query = { institutionId: fixture.institutionId, currency: fixture.currency };
    expect(decimalOf(await ledger.accountBalance('4100', query))).toBe('-5000.00');
    expect(decimalOf(await ledger.accountBalance('4000', query))).toBe('0.00');
    expect(decimalOf(await ledger.accountBalance(RECEIVABLES, query))).toBe('5000.00');
  });

  it('refuses a note whose fee-item lines do not add up to it', async () => {
    const learner = await fixture.learner('CN-3');
    await expect(
      fixture.service().issueCreditNote({
        learnerId: learner.id,
        amount: money(100_000),
        reason: 'Broken lines',
        issueDate: '2027-02-10',
        lines: [{ feeItemId: fixture.feeItemId, amount: money(40_000) }],
      })
    ).rejects.toMatchObject({ code: 'invalid_entry' });
  });
});

describe('applying a credit note', () => {
  it('applies the note to an outstanding invoice through the allocation engine', async () => {
    const learner = await fixture.learner('CN-4');
    const { invoice } = await fixture.invoice({ learnerId: learner.id, amountMinor: 600_000 });

    const outcome = await fixture.service().issueCreditNote({
      learnerId: learner.id,
      amount: money(100_000),
      reason: 'Adjustment for the term',
      issueDate: '2027-02-10',
      applyToInvoiceId: invoice.id,
    });

    expect(outcome.application).not.toBeNull();
    expect(outcome.application?.invoiceId).toBe(invoice.id);
    expect(decimalOf(outcome.application?.amount)).toBe('1000.00');
    expect(outcome.application?.lines).toHaveLength(1);
    expect(outcome.application?.lines[0]?.invoiceLineId).toBeTruthy();
    expect(decimalOf(outcome.remainingCredit)).toBe('0.00');

    const applications = await fixture.service().creditNoteApplicationsOf(learner.id);
    expect(applications).toHaveLength(1);
    expect(applications[0]?.creditNoteId).toBe(outcome.creditNote.id);
  });

  it('leaves the leftover as a credit balance when the note exceeds the invoice', async () => {
    const learner = await fixture.learner('CN-5');
    const { invoice } = await fixture.invoice({ learnerId: learner.id, amountMinor: 60_000 });

    const outcome = await fixture.service().issueCreditNote({
      learnerId: learner.id,
      amount: money(100_000),
      reason: 'More than the invoice',
      issueDate: '2027-02-10',
      applyToInvoiceId: invoice.id,
    });

    expect(decimalOf(outcome.application?.amount)).toBe('600.00');
    expect(decimalOf(outcome.remainingCredit)).toBe('400.00');
  });

  it('leaves the whole note as a credit balance when it is not applied', async () => {
    const learner = await fixture.learner('CN-6');
    await fixture.invoice({ learnerId: learner.id, amountMinor: 600_000 });

    const outcome = await fixture.service().issueCreditNote({
      learnerId: learner.id,
      amount: money(100_000),
      reason: 'A credit to carry forward',
      issueDate: '2027-02-10',
    });

    expect(outcome.application).toBeNull();
    expect(decimalOf(outcome.remainingCredit)).toBe('1000.00');
    expect(await fixture.service().creditNoteApplicationsOf(learner.id)).toEqual([]);
  });
});
