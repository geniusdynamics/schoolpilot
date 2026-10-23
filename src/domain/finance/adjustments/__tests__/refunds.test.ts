// ABOUTME: The refund, proven against a real SQLite database: a maker requests it and nothing posts,
// ABOUTME: a checker approves it or rejects it with a reason, a maker may not approve their own
// ABOUTME: request, and on approval the payout posts through the ledger with a number from the
// ABOUTME: sequences module. A rejected request leaves the request recorded and nothing posted.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createAdjustmentsFixture,
  decimalOf,
  money,
  RECEIVABLES,
  type AdjustmentsFixture,
} from './fixtures';

let fixture: AdjustmentsFixture;

beforeEach(async () => {
  fixture = await createAdjustmentsFixture();
});

afterEach(async () => {
  await fixture.close();
});

const approver = () => ({ id: fixture.checker, roles: ['head_teacher'] as const });
const clerk = () => ({ id: fixture.clerk, roles: ['accountant'] as const });

describe('requesting a refund', () => {
  it('records the request, numbers it and posts nothing', async () => {
    const learner = await fixture.learner('RF-1');

    const requested = await fixture.service().requestRefund({
      learnerId: learner.id,
      amount: money(50_000),
      reason: 'Deposit refund on transfer',
      channel: 'mobile_money',
    });

    expect(requested.refund.status).toBe('requested');
    expect(requested.number).toMatch(/^PV\/2027\/\d{6}$/);
    expect(requested.ledgerEntryId).toBeNull();
    expect(requested.awaitingApproval).toBe(true);

    const ledger = await fixture.ledger();
    const query = { institutionId: fixture.institutionId, currency: fixture.currency };
    expect(decimalOf(await ledger.accountBalance('2100', query))).toBe('0.00');
  });
});

describe('the maker-checker approval', () => {
  it('refuses a maker approving their own request', async () => {
    const learner = await fixture.learner('RF-2');
    const requested = await fixture
      .service()
      .requestRefund({ learnerId: learner.id, amount: money(50_000), reason: 'Refund', channel: 'cash' });

    await expect(
      fixture
        .service()
        .approveRefund({ refundId: requested.refund.id, actor: { id: fixture.actor, roles: ['administrator'] } })
    ).rejects.toMatchObject({ code: 'maker_cannot_approve' });

    // Nothing moved: the refund is still waiting for a checker.
    const still = await fixture.context.repository.get('refund', requested.refund.id);
    expect(still?.status).toBe('requested');
  });

  it('refuses an actor without the approval role', async () => {
    const learner = await fixture.learner('RF-3');
    const requested = await fixture
      .service()
      .requestRefund({ learnerId: learner.id, amount: money(50_000), reason: 'Refund', channel: 'cash' });

    await expect(
      fixture.service().approveRefund({ refundId: requested.refund.id, actor: clerk() })
    ).rejects.toMatchObject({ code: 'approval_denied' });
  });

  it('approves it and posts the payout through the ledger', async () => {
    const learner = await fixture.learner('RF-4');
    const requested = await fixture.service().requestRefund({
      learnerId: learner.id,
      amount: money(50_000),
      reason: 'Deposit refund',
      channel: 'bank_deposit',
    });

    const approved = await fixture
      .service()
      .approveRefund({ refundId: requested.refund.id, actor: approver(), reason: 'Approved by the head' });

    expect(approved.refund.status).toBe('paid');
    expect(approved.refund.approved_by).toBe(fixture.checker);
    expect(approved.refund.paid_at).toBeTruthy();
    expect(approved.ledgerEntryId).not.toBeNull();

    const ledger = await fixture.ledger();
    const query = { institutionId: fixture.institutionId, currency: fixture.currency };
    // Refunds payable is debited and the bank the money leaves through is credited.
    expect(decimalOf(await ledger.accountBalance('2100', query))).toBe('500.00');
    expect(decimalOf(await ledger.accountBalance('1020', query))).toBe('-500.00');
  });

  it('records a reasoned rejection and posts nothing', async () => {
    const learner = await fixture.learner('RF-5');
    const requested = await fixture
      .service()
      .requestRefund({ learnerId: learner.id, amount: money(50_000), reason: 'Refund', channel: 'cash' });

    // A rejection without a reason is refused by the engine's guard.
    await expect(
      fixture.service().rejectRefund({ refundId: requested.refund.id, actor: approver(), reason: '   ' })
    ).rejects.toMatchObject({ code: 'approval_denied', detail: { code: 'reason_required' } });

    const rejected = await fixture
      .service()
      .rejectRefund({ refundId: requested.refund.id, actor: approver(), reason: 'Not a refundable item' });

    expect(rejected.refund.status).toBe('rejected');
    expect(rejected.ledgerEntryId).toBeNull();

    const ledger = await fixture.ledger();
    const query = { institutionId: fixture.institutionId, currency: fixture.currency };
    expect(decimalOf(await ledger.accountBalance('2100', query))).toBe('0.00');
  });

  it('does not offer the maker the decision they may not make', async () => {
    const learner = await fixture.learner('RF-6');
    const requested = await fixture
      .service()
      .requestRefund({ learnerId: learner.id, amount: money(50_000), reason: 'Refund', channel: 'cash' });

    const makerMoves = await fixture
      .service()
      .availableRefundMoves(requested.refund.id, { id: fixture.actor, roles: ['administrator'] });
    expect(makerMoves.map((move) => move.transition.key)).not.toContain('approve');

    const checkerMoves = await fixture
      .service()
      .availableRefundMoves(requested.refund.id, { id: fixture.checker, roles: ['head_teacher'] });
    expect(checkerMoves.map((move) => move.transition.key)).toContain('approve');
  });
});

describe('the refund channel', () => {
  it('pays out through the channel the request named', async () => {
    const learner = await fixture.learner('RF-7');
    const requested = await fixture.service().requestRefund({
      learnerId: learner.id,
      amount: money(50_000),
      reason: 'M-Pesa refund',
      channel: 'mobile_money',
    });

    await fixture.service().approveRefund({ refundId: requested.refund.id, actor: approver() });

    const ledger = await fixture.ledger();
    const query = { institutionId: fixture.institutionId, currency: fixture.currency };
    // The mobile-money clearing account is where a mobile-money refund leaves.
    expect(decimalOf(await ledger.accountBalance('1030', query))).toBe('-500.00');
    expect(decimalOf(await ledger.accountBalance(RECEIVABLES, query))).toBe('0.00');
  });
});
