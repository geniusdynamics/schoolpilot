// ABOUTME: Integration tests for the spec 02 §12 invariants the repository enforces, one test
// ABOUTME: per invariant, against a real SQLite database.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { RepositoryInvariantError } from '..';
import {
  closeTestContext,
  createTestContext,
  fixtureInput,
  seededId,
  type TestContext,
} from './helpers';

async function expectInvariant(
  work: () => Promise<unknown>,
  invariant: string
): Promise<RepositoryInvariantError> {
  const error = await work()
    .then(() => null)
    .catch((caught: unknown) => caught as RepositoryInvariantError);

  expect(error, `expected the ${invariant} invariant to be enforced`).not.toBeNull();
  expect(error?.code).toBe('invariant');
  expect(error?.invariant).toBe(invariant);
  return error as RepositoryInvariantError;
}

describe('spec 02 §12 invariants', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestContext();
  });

  afterAll(async () => {
    await closeTestContext(context);
  });

  it('§12.1 keeps one active enrolment per learner and academic year', async () => {
    // The seeded learner already holds an active enrolment in the seeded academic year.
    const error = await expectInvariant(
      () =>
        context.repository.create(
          'enrolment',
          fixtureInput(context, 'enrolment', {
            learner_id: seededId(context, 'learner'),
            start_date: '2027-02-01',
          })
        ),
      'enrolment.single_active_per_calendar'
    );
    expect(error.issues.map((issue) => issue.path)).toContain('learner_id');
  });

  it('§12.1 allows a second enrolment once the first one has ended', async () => {
    const learner = await context.repository.create(
      'learner',
      fixtureInput(context, 'learner', { admission_number: 'GA/2027/911' })
    );

    const ended = await context.repository.create(
      'enrolment',
      fixtureInput(context, 'enrolment', {
        learner_id: learner.id,
        status: 'completed',
        exit_reason: 'graduated',
        start_date: '2026-01-05',
        end_date: '2026-11-30',
      })
    );

    expect(ended.status).toBe('completed');

    const current = await context.repository.create(
      'enrolment',
      fixtureInput(context, 'enrolment', {
        learner_id: learner.id,
        start_date: '2027-01-05',
      })
    );

    expect(current.status).toBe('active');
  });

  it('§12.2 keeps the enrolment on the level and the year of its class group', async () => {
    const otherLevel = await context.repository.create(
      'level',
      fixtureInput(context, 'level', { code: 'G8', name: 'Grade 8', ordinal: 2 })
    );

    const learner = await context.repository.create(
      'learner',
      fixtureInput(context, 'learner', { admission_number: 'GA/2027/913' })
    );

    const error = await expectInvariant(
      () =>
        context.repository.create(
          'enrolment',
          fixtureInput(context, 'enrolment', {
            learner_id: learner.id,
            level_id: otherLevel.id,
            start_date: '2027-01-05',
          })
        ),
      'enrolment.class_group_alignment'
    );
    expect(error.issues.map((issue) => issue.path)).toContain('level_id');
  });

  it('§12.2 keeps the enrolments of a class group on its level', async () => {
    const otherLevel = await context.repository.create(
      'level',
      fixtureInput(context, 'level', { code: 'G9', name: 'Grade 9', ordinal: 3 })
    );

    // The seeded class group carries the seeded enrolment.
    const group = await context.repository.get('class_group', seededId(context, 'class_group'));
    expect(group).not.toBeNull();

    const error = await expectInvariant(
      () =>
        context.repository.update(
          'class_group',
          group!.id,
          { level_id: otherLevel.id },
          { expectedVersion: group!.rowVersion }
        ),
      'class_group.enrolment_alignment'
    );
    expect(error.issues.map((issue) => issue.path)).toContain('level_id');
  });

  it('§12.3 keeps the periods of a year from overlapping and inside the year', async () => {
    const overlapping = await expectInvariant(
      () =>
        context.repository.create(
          'academic_period',
          fixtureInput(context, 'academic_period', {
            name: 'Term 2',
            sequence: 2,
            start_date: '2027-04-01',
            end_date: '2027-07-31',
            status: 'planned',
          })
        ),
      'academic_period.no_overlap'
    );
    expect(overlapping.issues.map((issue) => issue.path)).toContain('start_date');

    const outside = await expectInvariant(
      () =>
        context.repository.create(
          'academic_period',
          fixtureInput(context, 'academic_period', {
            name: 'Term 3',
            kind: 'half_term',
            sequence: 3,
            start_date: '2027-12-01',
            end_date: '2028-01-31',
            status: 'planned',
          })
        ),
      'academic_period.no_overlap'
    );
    expect(outside.issues.map((issue) => issue.path)).toContain('end_date');
  });

  it('§12.4 keeps one current academic year per calendar', async () => {
    const error = await expectInvariant(
      () =>
        context.repository.create(
          'academic_year',
          fixtureInput(context, 'academic_year', {
            name: '2028',
            start_date: '2028-01-05',
            end_date: '2028-11-30',
            status: 'current',
          })
        ),
      'academic_year.single_current'
    );
    expect(error.issues.map((issue) => issue.path)).toContain('status');
  });

  it('§12.4 keeps one current term per year', async () => {
    const error = await expectInvariant(
      () =>
        context.repository.create(
          'academic_period',
          fixtureInput(context, 'academic_period', {
            name: 'Term 1 again',
            sequence: 4,
            start_date: '2027-05-01',
            end_date: '2027-07-31',
            status: 'current',
          })
        ),
      'academic_period.single_current'
    );
    expect(error.issues.map((issue) => issue.path)).toContain('status');
  });

  it('§12.5 keeps a mark on an enrolment that is in a teaching group', async () => {
    // A learner who is not a member of the teaching group of the learning area.
    const learner = await context.repository.create(
      'learner',
      fixtureInput(context, 'learner', { admission_number: 'GA/2027/912' })
    );

    const enrolment = await context.repository.create(
      'enrolment',
      fixtureInput(context, 'enrolment', {
        learner_id: learner.id,
        start_date: '2027-01-05',
      })
    );

    const error = await expectInvariant(
      () =>
        context.repository.create(
          'mark',
          fixtureInput(context, 'mark', {
            assessment_id: seededId(context, 'assessment'),
            enrolment_id: enrolment.id,
            learning_area_id: seededId(context, 'learning_area'),
            component_id: seededId(context, 'component'),
          })
        ),
      'mark.teaching_group_membership'
    );
    expect(error.issues.map((issue) => issue.path)).toContain('enrolment_id');
  });

  it('§12.6 keeps the snapshot of a published report card', async () => {
    const reportCard = await context.repository.get(
      'report_card',
      seededId(context, 'report_card')
    );
    expect(reportCard).not.toBeNull();

    const error = await expectInvariant(
      () =>
        context.repository.update(
          'report_card',
          reportCard!.id,
          { snapshot: { lines: [{ score: 90 }] } },
          { expectedVersion: reportCard!.rowVersion }
        ),
      'report_card.published_snapshot_immutable'
    );
    expect(error.issues.map((issue) => issue.path)).toContain('snapshot');
  });

  it('§12.7 keeps a posted invoice immutable', async () => {
    const invoice = await context.repository.get(
      'invoice',
      seededId(context, 'invoice')
    );
    expect(invoice?.status).toBe('posted');

    const error = await expectInvariant(
      () =>
        context.repository.update(
          'invoice',
          invoice!.id,
          { total: { amount_minor: 1, currency: 'KES' } },
          { expectedVersion: invoice!.rowVersion }
        ),
      'finance.posted_immutable'
    );
    expect(error.issues.map((issue) => issue.path)).toContain('total');
  });

  it('§12.7 keeps a posted payment immutable', async () => {
    const payment = await context.repository.get(
      'payment',
      seededId(context, 'payment')
    );
    expect(payment?.status).toBe('posted');

    const error = await expectInvariant(
      () =>
        context.repository.update(
          'payment',
          payment!.id,
          { amount: { amount_minor: 1, currency: 'KES' } },
          { expectedVersion: payment!.rowVersion }
        ),
      'finance.posted_immutable'
    );
    expect(error.issues.map((issue) => issue.path)).toContain('amount');
  });

  it('§12.7 refuses to un-post an invoice', async () => {
    const invoice = await context.repository.get('invoice', seededId(context, 'invoice'));
    expect(invoice?.status).toBe('posted');

    const error = await expectInvariant(
      () =>
        context.repository.update(
          'invoice',
          invoice!.id,
          { status: 'draft' },
          { expectedVersion: invoice!.rowVersion }
        ),
      'finance.posted_immutable'
    );
    expect(error.issues.map((issue) => issue.path)).toContain('status');
  });

  it('§12.7 cannot be bypassed by un-posting the invoice first', async () => {
    const invoice = await context.repository.get('invoice', seededId(context, 'invoice'));

    // Step one: move the posted invoice back to a draft.
    const unposted = await expectInvariant(
      () =>
        context.repository.update(
          'invoice',
          invoice!.id,
          { status: 'draft' },
          { expectedVersion: invoice!.rowVersion }
        ),
      'finance.posted_immutable'
    );
    expect(unposted.issues.map((issue) => issue.path)).toContain('status');

    // Step two: rewrite the total. The invoice is still posted, so the amount is frozen.
    const rewritten = await expectInvariant(
      () =>
        context.repository.update(
          'invoice',
          invoice!.id,
          { total: { amount_minor: 1, currency: 'KES' } },
          { expectedVersion: invoice!.rowVersion }
        ),
      'finance.posted_immutable'
    );
    expect(rewritten.issues.map((issue) => issue.path)).toContain('total');

    const stored = await context.repository.get('invoice', invoice!.id);
    expect(stored?.status).toBe('posted');
    expect(stored?.total).toEqual({ amount_minor: 600000, currency: 'KES' });
  });

  it('§12.7 refuses to un-post a payment', async () => {
    const payment = await context.repository.get('payment', seededId(context, 'payment'));
    expect(payment?.status).toBe('posted');

    const error = await expectInvariant(
      () =>
        context.repository.update(
          'payment',
          payment!.id,
          { status: 'pending' },
          { expectedVersion: payment!.rowVersion }
        ),
      'finance.posted_immutable'
    );
    expect(error.issues.map((issue) => issue.path)).toContain('status');
  });

  it('§12.7 cannot be bypassed by un-posting the payment first', async () => {
    const payment = await context.repository.get('payment', seededId(context, 'payment'));

    const unposted = await expectInvariant(
      () =>
        context.repository.update(
          'payment',
          payment!.id,
          { status: 'pending' },
          { expectedVersion: payment!.rowVersion }
        ),
      'finance.posted_immutable'
    );
    expect(unposted.issues.map((issue) => issue.path)).toContain('status');

    const rewritten = await expectInvariant(
      () =>
        context.repository.update(
          'payment',
          payment!.id,
          { amount: { amount_minor: 1, currency: 'KES' } },
          { expectedVersion: payment!.rowVersion }
        ),
      'finance.posted_immutable'
    );
    expect(rewritten.issues.map((issue) => issue.path)).toContain('amount');

    const stored = await context.repository.get('payment', payment!.id);
    expect(stored?.status).toBe('posted');
    expect(stored?.amount).toEqual({ amount_minor: 300000, currency: 'KES' });
  });

  it('§12.7 refuses to un-post a posted credit note', async () => {
    const creditNote = await context.repository.get('credit_note', seededId(context, 'credit_note'));
    expect(creditNote?.status).toBe('posted');

    const error = await expectInvariant(
      () =>
        context.repository.update(
          'credit_note',
          creditNote!.id,
          { status: 'draft' },
          { expectedVersion: creditNote!.rowVersion }
        ),
      'finance.posted_immutable'
    );
    expect(error.issues.map((issue) => issue.path)).toContain('status');
  });

  it('§12.7 cannot be bypassed by un-posting the credit note first', async () => {
    const creditNote = await context.repository.get('credit_note', seededId(context, 'credit_note'));

    const unposted = await expectInvariant(
      () =>
        context.repository.update(
          'credit_note',
          creditNote!.id,
          { status: 'draft' },
          { expectedVersion: creditNote!.rowVersion }
        ),
      'finance.posted_immutable'
    );
    expect(unposted.issues.map((issue) => issue.path)).toContain('status');

    const rewritten = await expectInvariant(
      () =>
        context.repository.update(
          'credit_note',
          creditNote!.id,
          { amount: { amount_minor: 1, currency: 'KES' } },
          { expectedVersion: creditNote!.rowVersion }
        ),
      'finance.posted_immutable'
    );
    expect(rewritten.issues.map((issue) => issue.path)).toContain('amount');

    const stored = await context.repository.get('credit_note', creditNote!.id);
    expect(stored?.status).toBe('posted');
    expect(stored?.amount).toEqual({ amount_minor: 100000, currency: 'KES' });
  });

  it('§12.7 refuses to un-post a paid refund', async () => {
    const refund = await context.repository.get('refund', seededId(context, 'refund'));
    expect(refund?.status).toBe('paid');

    const error = await expectInvariant(
      () =>
        context.repository.update(
          'refund',
          refund!.id,
          { status: 'requested' },
          { expectedVersion: refund!.rowVersion }
        ),
      'finance.posted_immutable'
    );
    expect(error.issues.map((issue) => issue.path)).toContain('status');
  });

  it('§12.7 cannot be bypassed by un-posting the refund first', async () => {
    const refund = await context.repository.get('refund', seededId(context, 'refund'));

    const unposted = await expectInvariant(
      () =>
        context.repository.update(
          'refund',
          refund!.id,
          { status: 'requested' },
          { expectedVersion: refund!.rowVersion }
        ),
      'finance.posted_immutable'
    );
    expect(unposted.issues.map((issue) => issue.path)).toContain('status');

    const rewritten = await expectInvariant(
      () =>
        context.repository.update(
          'refund',
          refund!.id,
          { amount: { amount_minor: 1, currency: 'KES' } },
          { expectedVersion: refund!.rowVersion }
        ),
      'finance.posted_immutable'
    );
    expect(rewritten.issues.map((issue) => issue.path)).toContain('amount');

    const stored = await context.repository.get('refund', refund!.id);
    expect(stored?.status).toBe('paid');
    expect(stored?.amount).toEqual({ amount_minor: 50000, currency: 'KES' });
  });

  it('§12.7 still lets a posted credit note move to void', async () => {
    const creditNote = await context.repository.get('credit_note', seededId(context, 'credit_note'));

    const voided = await context.repository.update(
      'credit_note',
      creditNote!.id,
      { status: 'void' },
      { expectedVersion: creditNote!.rowVersion }
    );

    expect(voided.status).toBe('void');
    expect(voided.rowVersion).toBe(creditNote!.rowVersion + 1);
  });

  it('§12.7 still lets a draft credit note be posted', async () => {
    const draft = await context.repository.create(
      'credit_note',
      fixtureInput(context, 'credit_note', {
        number: 'CN/2027/000002',
        status: 'draft',
        amount: { amount_minor: 2000, currency: 'KES' },
      })
    );

    const posted = await context.repository.update(
      'credit_note',
      draft.id,
      { status: 'posted' },
      { expectedVersion: draft.rowVersion }
    );

    expect(posted.status).toBe('posted');
  });

  it('§12.7 still lets a requested refund be approved and paid', async () => {
    const requested = await context.repository.create(
      'refund',
      fixtureInput(context, 'refund', {
        number: 'REF/2027/000002',
        status: 'requested',
        amount: { amount_minor: 3000, currency: 'KES' },
        // `paid_at` is optional but not nullable, so a refund that was not paid yet
        // leaves the field out.
        paid_at: undefined,
      })
    );

    const approved = await context.repository.update(
      'refund',
      requested.id,
      { status: 'approved' },
      { expectedVersion: requested.rowVersion }
    );
    expect(approved.status).toBe('approved');

    // The amount is frozen from the approval on, but the transition to paid still
    // carries the annotation it needs.
    const paid = await context.repository.update(
      'refund',
      approved.id,
      { status: 'paid', paid_at: '2027-03-01T00:00:00Z' },
      { expectedVersion: approved.rowVersion }
    );
    expect(paid.status).toBe('paid');
    expect(paid.amount).toEqual({ amount_minor: 3000, currency: 'KES' });
  });

  it('§12.7 still lets a posted invoice move to another posted state', async () => {
    const invoice = await context.repository.get('invoice', seededId(context, 'invoice'));

    const voided = await context.repository.update(
      'invoice',
      invoice!.id,
      { status: 'void' },
      { expectedVersion: invoice!.rowVersion }
    );

    expect(voided.status).toBe('void');
    expect(voided.rowVersion).toBe(invoice!.rowVersion + 1);
  });

  it('§12.7 still lets a draft invoice be posted', async () => {
    const draft = await context.repository.create(
      'invoice',
      fixtureInput(context, 'invoice', {
        number: 'INV/2027/T1/900030',
        status: 'draft',
        total: { amount_minor: 1000, currency: 'KES' },
      })
    );

    const posted = await context.repository.update(
      'invoice',
      draft.id,
      { status: 'posted' },
      { expectedVersion: draft.rowVersion }
    );

    expect(posted.status).toBe('posted');
  });

  it('§12.8 keeps the allocations of a payment within the amount paid', async () => {
    const payment = await context.repository.get(
      'payment',
      seededId(context, 'payment')
    );

    const error = await expectInvariant(
      () =>
        context.repository.create(
          'payment_allocation',
          fixtureInput(context, 'payment_allocation', {
            amount: { amount_minor: 400000, currency: 'KES' },
          })
        ),
      'payment_allocation.within_payment'
    );
    expect(error.issues.map((issue) => issue.path)).toContain('amount.amount_minor');
    expect(payment).not.toBeNull();
  });
});
