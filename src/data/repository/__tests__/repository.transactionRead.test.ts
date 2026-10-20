// ABOUTME: Integration tests for the reads inside a transaction: they join the open
// ABOUTME: transaction, see its uncommitted rows and leave the committed state alone.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type Id } from '@/domain/ids';

import { createRepository, type Repository } from '..';
import {
  closeTestContext,
  createTestContext,
  fixtureInput,
  TEST_ACTOR,
  type TestContext,
} from './helpers';

describe('repository reads inside a transaction', () => {
  let context: TestContext;
  let repository: Repository;

  beforeAll(async () => {
    context = await createTestContext();
    repository = context.repository;
  });

  afterAll(async () => {
    await closeTestContext(context);
  });

  it('sees the row the transaction wrote, and loses it when the transaction fails', async () => {
    const committed = await repository.transaction(async () => {
      const created = await repository.create(
        'comment_bank_entry',
        fixtureInput(context, 'comment_bank_entry', { text: 'Written in the transaction.' })
      );

      // The read joins the transaction, so it sees the row the transaction wrote.
      const read = await repository.get('comment_bank_entry', created.id);
      expect(read?.text).toBe('Written in the transaction.');

      return created;
    });

    // The transaction committed, so the row is there for every later read.
    const afterCommit = await repository.get('comment_bank_entry', committed.id);
    expect(afterCommit?.text).toBe('Written in the transaction.');

    let doomed: Id<'comment_bank_entry'> | undefined;
    await repository
      .transaction(async () => {
        const created = await repository.create(
          'comment_bank_entry',
          fixtureInput(context, 'comment_bank_entry', { text: 'Never committed.' })
        );
        doomed = created.id;

        const read = await repository.get('comment_bank_entry', created.id);
        expect(read?.text).toBe('Never committed.');

        throw new Error('the transaction fails');
      })
      .catch(() => undefined);

    // The transaction rolled back, so the row it read is gone.
    expect(await repository.get('comment_bank_entry', doomed as Id<'comment_bank_entry'>)).toBeNull();
  });

  it('does not let the write of another repository join the transaction', async () => {
    // A second repository over the same database, with a transaction of its own.
    const other = createRepository({ adapter: context.adapter, actor: TEST_ACTOR });

    const outcome = await repository.transaction(async () => {
      // The other repository writes while this transaction is open. The adapter refuses a
      // second transaction while one runs, so the write does not join this one and does
      // not land in it.
      const pending = other
        .create(
          'comment_bank_entry',
          fixtureInput(context, 'comment_bank_entry', { text: 'The other repository.' })
        )
        .then(
          () => 'committed',
          (error: unknown) => (error as { code?: string }).code ?? 'failed'
        );

      const page = await repository.list('comment_bank_entry', {
        where: { text: 'The other repository.' },
      });

      return { total: page.total, other: await pending };
    });

    expect(outcome.total).toBe(0);
    expect(outcome.other).toBe('nested_transaction');

    // The write was refused, so the row was never created - not inside the transaction
    // and not after it.
    const after = await repository.list('comment_bank_entry', {
      where: { text: 'The other repository.' },
    });
    expect(after.total).toBe(0);

    // The refusal left no stuck state: the other repository writes again once the
    // transaction is over.
    const written = await other.create(
      'comment_bank_entry',
      fixtureInput(context, 'comment_bank_entry', { text: 'The other repository, later.' })
    );
    expect((await repository.get('comment_bank_entry', written.id))?.text).toBe(
      'The other repository, later.'
    );
  });

  it('counts the rows the transaction wrote', async () => {
    const before = await repository.list('comment_bank_entry');

    const inside = await repository.transaction(async () => {
      await repository.create(
        'comment_bank_entry',
        fixtureInput(context, 'comment_bank_entry', { text: 'Counted inside.' })
      );
      await repository.create(
        'comment_bank_entry',
        fixtureInput(context, 'comment_bank_entry', { text: 'Counted inside too.' })
      );

      const page = await repository.list('comment_bank_entry');
      return page.total;
    });

    expect(inside).toBe(before.total + 2);

    const after = await repository.list('comment_bank_entry');
    expect(after.total).toBe(before.total + 2);
  });

  it('sees the audit row the transaction wrote', async () => {
    const trail = await repository.transaction(async () => {
      const created = await repository.create(
        'comment_bank_entry',
        fixtureInput(context, 'comment_bank_entry', { text: 'Audited inside.' })
      );

      const inside = await repository.auditTrail('comment_bank_entry', created.id);
      expect(inside).toHaveLength(1);
      expect(inside[0]?.action).toBe('create');

      return inside.length;
    });

    expect(trail).toBe(1);
  });

  it('leaves the reads outside a transaction unchanged', async () => {
    const created = await repository.create(
      'comment_bank_entry',
      fixtureInput(context, 'comment_bank_entry', { text: 'Outside a transaction.' })
    );

    const read = await repository.get('comment_bank_entry', created.id);
    expect(read?.text).toBe('Outside a transaction.');

    const page = await repository.list('comment_bank_entry', {
      where: { text: 'Outside a transaction.' },
    });
    expect(page.total).toBe(1);
  });

  it('does not deliver the rows of a transaction that rolls back', async () => {
    const pages: Array<readonly { text?: string }[]> = [];
    const unsubscribe = repository.watch('comment_bank_entry', (rows) => {
      pages.push(rows);
    });
    await repository.whenIdle();

    // A write outside a transaction schedules a delivery on a macrotask.
    await repository.create(
      'comment_bank_entry',
      fixtureInput(context, 'comment_bank_entry', { text: 'Committed.' })
    );

    // The transaction writes a row of its own and then fails. The delivery queued above
    // runs while the transaction is still open.
    await repository
      .transaction(async () => {
        await repository.create(
          'comment_bank_entry',
          fixtureInput(context, 'comment_bank_entry', { text: 'Rolled back.' })
        );
        // Give the queued delivery time to run while this transaction is open.
        await new Promise<void>((resolve) => setTimeout(resolve, 50));
        throw new Error('the transaction fails');
      })
      .catch(() => undefined);

    await repository.whenIdle();
    unsubscribe();

    // The delivery shows the committed state, so it never carries the row of a
    // transaction that was rolled back.
    for (const page of pages) {
      expect(page.some((row) => row.text === 'Rolled back.')).toBe(false);
    }
  });

  it('leaves no ambient state behind a failed transaction', async () => {    await repository
      .transaction(async () => {
        await repository.create(
          'comment_bank_entry',
          fixtureInput(context, 'comment_bank_entry', { text: 'Rolled back.' })
        );
        throw new Error('the transaction fails');
      })
      .catch(() => undefined);

    // The next read runs on the adapter again and works normally.
    const page = await repository.list('comment_bank_entry', {
      where: { text: 'Rolled back.' },
    });
    expect(page.total).toBe(0);

    const created = await repository.create(
      'comment_bank_entry',
      fixtureInput(context, 'comment_bank_entry', { text: 'After the rollback.' })
    );
    expect((await repository.get('comment_bank_entry', created.id))?.text).toBe(
      'After the rollback.'
    );
  });
});
