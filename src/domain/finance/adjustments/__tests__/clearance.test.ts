// ABOUTME: Exit clearance, proven against a real SQLite database: a learner is cleared only when the
// ABOUTME: stated conditions hold — the balance is settled or written off and nothing is still out —
// ABOUTME: the document has a state, and the engine's guard carries the rule so a clear of a learner
// ABOUTME: who still owes is refused.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { evaluateClearance } from '../service';
import { createAdjustmentsFixture, decimalOf, money, type AdjustmentsFixture } from './fixtures';

let fixture: AdjustmentsFixture;

beforeEach(async () => {
  fixture = await createAdjustmentsFixture();
});

afterEach(async () => {
  await fixture.close();
});

const finance = () => ({ id: fixture.clerk, roles: ['accountant'] as const });

describe('the clearance rule', () => {
  it('is clearable when nothing is owed and nothing is out', () => {
    const assessment = evaluateClearance({
      learnerId: 'lrn-1',
      currency: 'KES',
      outstanding: money(0),
      writtenOff: money(0),
    });

    expect(assessment.clearable).toBe(true);
    expect(assessment.checks.every((check) => check.passed)).toBe(true);
  });

  it('is not clearable while a balance is owed', () => {
    const assessment = evaluateClearance({
      learnerId: 'lrn-1',
      currency: 'KES',
      outstanding: money(150_000),
      writtenOff: money(0),
    });

    expect(assessment.clearable).toBe(false);
    expect(assessment.checks.find((check) => check.code === 'balance_settled_or_written_off')?.passed).toBe(
      false
    );
  });

  it('is not clearable while a library book is out', () => {
    const assessment = evaluateClearance({
      learnerId: 'lrn-1',
      currency: 'KES',
      outstanding: money(0),
      writtenOff: money(0),
      libraryBooksOut: 1,
    });

    expect(assessment.clearable).toBe(false);
    expect(assessment.checks.find((check) => check.code === 'library_books_returned')?.passed).toBe(false);
  });

  it('counts a written-off balance as settled', async () => {
    const learner = await fixture.learner('CLR-1');
    await fixture.invoice({ learnerId: learner.id, amountMinor: 600_000 });
    const requested = await fixture
      .service()
      .requestWriteOff({ learnerId: learner.id, amount: money(600_000), reason: 'Uncollectable' });
    await fixture
      .service()
      .approveWriteOff({ writeOffId: requested.writeOff.id, actor: { id: fixture.checker, roles: ['head_teacher'] } });

    const assessment = await fixture.service().assessClearance(learner.id);
    expect(decimalOf(assessment.outstanding)).toBe('0.00');
    expect(decimalOf(assessment.writtenOff)).toBe('6000.00');
    expect(assessment.clearable).toBe(true);
  });
});

describe('the clearance document', () => {
  it('is raised pending, cleared by a decision, and read back by learner', async () => {
    const learner = await fixture.learner('CLR-2');

    const document = await fixture
      .service()
      .requestClearance({ learnerId: learner.id, reason: 'Transferring to another school' });
    expect(document.state).toBe('pending');

    const cleared = await fixture
      .service()
      .decideClearance({ clearanceId: document.id, actor: finance(), decision: 'clear' });
    expect(cleared.state).toBe('cleared');
    expect(cleared.decidedBy).toBe(fixture.clerk);

    const read = await fixture.service().clearanceOf(learner.id);
    expect(read?.state).toBe('cleared');
    expect(read?.id).toBe(document.id);
  });

  it('refuses to clear a learner who still owes', async () => {
    const learner = await fixture.learner('CLR-3');
    await fixture.invoice({ learnerId: learner.id, amountMinor: 600_000 });

    const document = await fixture
      .service()
      .requestClearance({ learnerId: learner.id, reason: 'Leaving' });
    expect(document.assessment.clearable).toBe(false);

    await expect(
      fixture.service().decideClearance({ clearanceId: document.id, actor: finance(), decision: 'clear' })
    ).rejects.toMatchObject({ code: 'not_clearable' });

    // The document is still pending, so it can be refused.
    const refused = await fixture
      .service()
      .decideClearance({
        clearanceId: document.id,
        actor: finance(),
        decision: 'refuse',
        reason: 'Fees outstanding',
      });
    expect(refused.state).toBe('refused');
    expect(refused.decisionReason).toBe('Fees outstanding');
  });

  it('needs a reason to refuse', async () => {
    const learner = await fixture.learner('CLR-4');
    const document = await fixture
      .service()
      .requestClearance({ learnerId: learner.id, reason: 'Leaving' });

    await expect(
      fixture.service().decideClearance({ clearanceId: document.id, actor: finance(), decision: 'refuse' })
    ).rejects.toMatchObject({ code: 'approval_denied', detail: { code: 'reason_required' } });
  });
});
