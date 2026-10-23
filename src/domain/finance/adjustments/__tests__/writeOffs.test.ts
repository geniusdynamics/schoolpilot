// ABOUTME: The write-off, proven against a real SQLite database: an uncollectable balance is written
// ABOUTME: off with a reason, approved by a second pair of eyes above the threshold, posting the loss
// ABOUTME: against the bad-debt account and the receivable. The debt is never deleted — the balance
// ABOUTME: stays explainable — and a recovery is a new posting, never a reversal of the write-off.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createAdjustmentsFixture, decimalOf, money, RECEIVABLES, type AdjustmentsFixture } from './fixtures';

let fixture: AdjustmentsFixture;

beforeEach(async () => {
  fixture = await createAdjustmentsFixture();
});

afterEach(async () => {
  await fixture.close();
});

const approver = () => ({ id: fixture.checker, roles: ['head_teacher'] as const });

describe('requesting a write-off', () => {
  it('records the request and posts nothing until a checker approves', async () => {
    const learner = await fixture.learner('WO-1');
    await fixture.invoice({ learnerId: learner.id, amountMinor: 600_000 });

    const requested = await fixture
      .service()
      .requestWriteOff({ learnerId: learner.id, amount: money(200_000), reason: 'Uncollectable' });

    expect(requested.awaitingApproval).toBe(true);
    expect(requested.writeOff.state).toBe('requested');
    expect(requested.ledgerEntryId).toBeNull();
    expect(requested.writeOff.number).toMatch(/^CRN\/2027\/\d{6}$/);

    const ledger = await fixture.ledger();
    const query = { institutionId: fixture.institutionId, currency: fixture.currency };
    expect(decimalOf(await ledger.accountBalance('5100', query))).toBe('0.00');
    expect(decimalOf(await ledger.accountBalance(RECEIVABLES, query))).toBe('6000.00');
  });

  it('refuses a maker approving their own write-off', async () => {
    const learner = await fixture.learner('WO-2');
    await fixture.invoice({ learnerId: learner.id, amountMinor: 600_000 });
    const requested = await fixture
      .service()
      .requestWriteOff({ learnerId: learner.id, amount: money(200_000), reason: 'Uncollectable' });

    await expect(
      fixture
        .service()
        .approveWriteOff({ writeOffId: requested.writeOff.id, actor: { id: fixture.actor, roles: ['administrator'] } })
    ).rejects.toMatchObject({ code: 'maker_cannot_approve' });
  });

  it('requires a reason to reject', async () => {
    const learner = await fixture.learner('WO-3');
    await fixture.invoice({ learnerId: learner.id, amountMinor: 600_000 });
    const requested = await fixture
      .service()
      .requestWriteOff({ learnerId: learner.id, amount: money(200_000), reason: 'Uncollectable' });

    await expect(
      fixture.service().rejectWriteOff({ writeOffId: requested.writeOff.id, actor: approver(), reason: '' })
    ).rejects.toMatchObject({ code: 'approval_denied', detail: { code: 'reason_required' } });
  });
});

describe('approving a write-off', () => {
  it('posts the loss against bad debts written off and the receivable', async () => {
    const learner = await fixture.learner('WO-4');
    await fixture.invoice({ learnerId: learner.id, amountMinor: 600_000 });
    const requested = await fixture
      .service()
      .requestWriteOff({ learnerId: learner.id, amount: money(200_000), reason: 'Uncollectable' });

    const approved = await fixture.service().approveWriteOff({
      writeOffId: requested.writeOff.id,
      actor: approver(),
      reason: 'The family left the country',
    });

    expect(approved.writeOff.state).toBe('approved');
    expect(approved.writeOff.decidedBy).toBe(fixture.checker);
    expect(approved.ledgerEntryId).not.toBeNull();

    const ledger = await fixture.ledger();
    const query = { institutionId: fixture.institutionId, currency: fixture.currency };
    expect(decimalOf(await ledger.accountBalance('5100', query))).toBe('2000.00');
    expect(decimalOf(await ledger.accountBalance(RECEIVABLES, query))).toBe('4000.00');
  });

  it('posts directly at or below the configured threshold', async () => {
    const learner = await fixture.learner('WO-5');
    await fixture.invoice({ learnerId: learner.id, amountMinor: 600_000 });

    const immediate = await fixture
      .service({ writeOffApprovalThresholdMinor: 100_000 })
      .requestWriteOff({ learnerId: learner.id, amount: money(50_000), reason: 'Small balance' });

    expect(immediate.awaitingApproval).toBe(false);
    expect(immediate.writeOff.state).toBe('approved');
    expect(immediate.ledgerEntryId).not.toBeNull();

    const ledger = await fixture.ledger();
    const query = { institutionId: fixture.institutionId, currency: fixture.currency };
    expect(decimalOf(await ledger.accountBalance('5100', query))).toBe('500.00');
  });

  it('keeps the debt explainable after it is written off', async () => {
    const learner = await fixture.learner('WO-6');
    await fixture.invoice({ learnerId: learner.id, amountMinor: 600_000 });
    const requested = await fixture
      .service()
      .requestWriteOff({ learnerId: learner.id, amount: money(200_000), reason: 'Uncollectable' });
    await fixture.service().approveWriteOff({ writeOffId: requested.writeOff.id, actor: approver() });

    const explanation = await fixture.service().explainBalance(learner.id);
    expect(explanation.agrees).toBe(true);
    expect(decimalOf(explanation.balance)).toBe('4000.00');
    expect(explanation.documents.some((document) => document.kind === 'write_off')).toBe(true);
  });
});

describe('recovering a written-off debt', () => {
  it('is a new posting, not a reversal of the write-off', async () => {
    const learner = await fixture.learner('WO-7');
    await fixture.invoice({ learnerId: learner.id, amountMinor: 600_000 });
    const requested = await fixture
      .service()
      .requestWriteOff({ learnerId: learner.id, amount: money(200_000), reason: 'Uncollectable' });
    await fixture.service().approveWriteOff({ writeOffId: requested.writeOff.id, actor: approver() });

    const recovery = await fixture.service().recoverWriteOff({
      writeOffId: requested.writeOff.id,
      reason: 'The sponsor paid the arrears',
      recoveredAt: '2027-03-01',
    });

    expect(recovery.ledgerEntryId).toBeTruthy();

    const ledger = await fixture.ledger();
    const query = { institutionId: fixture.institutionId, currency: fixture.currency };
    // The receivable is owed again and bad debts recovered is credited.
    expect(decimalOf(await ledger.accountBalance(RECEIVABLES, query))).toBe('6000.00');
    expect(decimalOf(await ledger.accountBalance('5101', query))).toBe('-2000.00');
    // The write-off's own entry is still there: the recovery did not reverse it.
    const entries = await ledger.listEntries({ institutionId: fixture.institutionId });
    const writeOffEntry = entries.find((entry) => entry.source.id === requested.writeOff.id);
    expect(writeOffEntry).toBeDefined();
    expect(writeOffEntry?.reversesEntryId).toBeNull();

    // The balance still explains itself, now including the recovery.
    const explanation = await fixture.service().explainBalance(learner.id);
    expect(explanation.agrees).toBe(true);
    expect(decimalOf(explanation.balance)).toBe('6000.00');
    expect(explanation.documents.some((document) => document.kind === 'recovery')).toBe(true);
  });
});
