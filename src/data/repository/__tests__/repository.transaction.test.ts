// ABOUTME: Integration tests for the repository transaction: several rows land together, a
// ABOUTME: failed callback rolls everything back, and the change events wait for the commit.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { ChangeEvent } from '..';
import {
  closeTestContext,
  createTestContext,
  fixtureInput,
  type TestContext,
} from './helpers';

describe('repository transaction', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestContext();
  });

  afterAll(async () => {
    await closeTestContext(context);
  });

  it('commits the rows of a transaction together', async () => {
    const first = await context.repository.transaction(async () => {
      const learner = await context.repository.create(
        'learner',
        fixtureInput(context, 'learner', { admission_number: 'GA/2027/TX1' })
      );
      const remark = await context.repository.create(
        'comment_bank_entry',
        fixtureInput(context, 'comment_bank_entry', { text: 'In the same transaction.' })
      );
      return { learner, remark };
    });

    const learner = await context.repository.get('learner', first.learner.id);
    const remark = await context.repository.get('comment_bank_entry', first.remark.id);

    expect(learner?.admission_number).toBe('GA/2027/TX1');
    expect(remark?.text).toBe('In the same transaction.');
  });

  it('rolls the whole transaction back when the callback throws', async () => {
    await expect(
      context.repository.transaction(async () => {
        await context.repository.create(
          'learner',
          fixtureInput(context, 'learner', { admission_number: 'GA/2027/TX2' })
        );
        await context.repository.create(
          'comment_bank_entry',
          fixtureInput(context, 'comment_bank_entry', { text: 'Never committed.' })
        );
        throw new Error('the transaction fails');
      })
    ).rejects.toThrow('the transaction fails');

    const learners = await context.repository.list('learner', {
      where: { admission_number: 'GA/2027/TX2' },
    });
    expect(learners.total).toBe(0);

    const remarks = await context.repository.list('comment_bank_entry', {
      where: { text: 'Never committed.' },
    });
    expect(remarks.total).toBe(0);
  });

  it('leaves no audit trail behind a rolled back transaction', async () => {
    const before = await context.repository.auditLog({ entity: 'comment_bank_entry' });

    await context.repository
      .transaction(async () => {
        await context.repository.create(
          'comment_bank_entry',
          fixtureInput(context, 'comment_bank_entry', { text: 'Rolled back.' })
        );
        throw new Error('the transaction fails');
      })
      .catch(() => undefined);

    const after = await context.repository.auditLog({ entity: 'comment_bank_entry' });
    expect(after).toHaveLength(before.length);
  });

  it('delivers the change events only after the commit, in order', async () => {
    const events: ChangeEvent[] = [];
    const unsubscribe = context.repository.subscribe((event) => {
      events.push(event);
    });

    await context.repository.transaction(async () => {
      await context.repository.create(
        'comment_bank_entry',
        fixtureInput(context, 'comment_bank_entry', { text: 'First in the transaction.' })
      );
      await context.repository.create(
        'comment_bank_entry',
        fixtureInput(context, 'comment_bank_entry', { text: 'Second in the transaction.' })
      );

      // Nothing is announced while the transaction is still open.
      expect(events).toHaveLength(0);
    });

    // The transaction committed, so the events of the writes that joined it are out.
    expect(events).toHaveLength(2);
    expect(events[0]?.type).toBe('create');
    expect(events[1]?.type).toBe('create');
    expect(events[0]?.commitSequence).toBeLessThan(events[1]?.commitSequence as number);

    unsubscribe();
  });

  it('announces nothing when the transaction rolls back', async () => {
    const events: ChangeEvent[] = [];
    const unsubscribe = context.repository.subscribe((event) => {
      events.push(event);
    });

    await context.repository
      .transaction(async () => {
        await context.repository.create(
          'comment_bank_entry',
          fixtureInput(context, 'comment_bank_entry', { text: 'Never announced.' })
        );
        throw new Error('the transaction fails');
      })
      .catch(() => undefined);

    expect(events).toHaveLength(0);

    unsubscribe();
  });

  it('is usable again after a rolled back transaction', async () => {
    await context.repository
      .transaction(async () => {
        await context.repository.create(
          'comment_bank_entry',
          fixtureInput(context, 'comment_bank_entry', { text: 'Rolled back again.' })
        );
        throw new Error('the transaction fails');
      })
      .catch(() => undefined);

    const created = await context.repository.create(
      'comment_bank_entry',
      fixtureInput(context, 'comment_bank_entry', { text: 'After the rollback.' })
    );

    const stored = await context.repository.get('comment_bank_entry', created.id);
    expect(stored?.text).toBe('After the rollback.');
  });

  it('leaves a write outside a transaction exactly as it was', async () => {
    const events: ChangeEvent[] = [];
    const unsubscribe = context.repository.subscribe((event) => {
      events.push(event);
    });

    const created = await context.repository.create(
      'comment_bank_entry',
      fixtureInput(context, 'comment_bank_entry', { text: 'Outside a transaction.' })
    );

    // The event of a write of its own is announced as soon as its own transaction
    // committed, which is before the write promise resolves.
    expect(events).toHaveLength(1);
    expect(events[0]?.entity).toBe('comment_bank_entry');
    expect(events[0]?.ids).toEqual([created.id]);

    unsubscribe();
  });

  it('hands the callback the handle the writes run on', async () => {
    const seen = await context.repository.transaction(async (tx) => {
      const row = await tx.get<{ count: number }>('SELECT COUNT(*) AS count FROM "comment_bank_entry"');
      return row?.count ?? 0;
    });

    expect(seen).toBeGreaterThan(0);
  });
});
