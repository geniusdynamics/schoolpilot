// ABOUTME: Integration tests for the watch contract: the current page on subscribe, delivery
// ABOUTME: after the write promise resolves, a commit sequence tag and read-your-writes.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { ChangeEvent, RepositoryRow } from '..';
import {
  closeTestContext,
  createTestContext,
  fixtureInput,
  type TestContext,
} from './helpers';

describe('repository watch', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestContext();
  });

  afterAll(async () => {
    await closeTestContext(context);
  });

  it('delivers the current page when a watcher subscribes', async () => {
    const seen: Array<readonly RepositoryRow<'comment_bank_entry'>[]> = [];
    const unsubscribe = context.repository.watch('comment_bank_entry', (rows) => {
      seen.push(rows);
    });

    await context.repository.whenIdle();
    unsubscribe();

    expect(seen).toHaveLength(1);
    expect(seen[0]?.length).toBeGreaterThan(0);
  });

  it('delivers a change only after the write promise resolved', async () => {
    const order: string[] = [];
    const unsubscribe = context.repository.watch('comment_bank_entry', () => {
      order.push('watch');
    });

    await context.repository.whenIdle();
    order.length = 0;

    const created = await context.repository.create(
      'comment_bank_entry',
      fixtureInput(context, 'comment_bank_entry', { text: 'Watched.' })
    );

    // The write has resolved, but the payload is still on its way.
    expect(order).toEqual([]);

    await context.repository.whenIdle();
    unsubscribe();

    expect(order).toEqual(['watch']);
    expect(created.rowVersion).toBe(1);
  });

  it('tags a payload with the commit sequence it reflects', async () => {
    const sequences: number[] = [];
    const unsubscribe = context.repository.watch('comment_bank_entry', (_rows, commitSequence) => {
      sequences.push(commitSequence);
    });

    await context.repository.whenIdle();

    const before = context.repository.currentCommitSequence;
    await context.repository.create(
      'comment_bank_entry',
      fixtureInput(context, 'comment_bank_entry', { text: 'Tagged.' })
    );
    await context.repository.whenIdle();
    unsubscribe();

    expect(sequences[0]).toBeGreaterThan(0);
    expect(sequences[sequences.length - 1]).toBeGreaterThan(before);
  });

  it('emits a change event synchronously, before the write promise resolves', async () => {
    const events: ChangeEvent[] = [];
    const unsubscribe = context.repository.subscribe((event) => {
      events.push(event);
    });

    const created = await context.repository.create(
      'comment_bank_entry',
      fixtureInput(context, 'comment_bank_entry', { text: 'Announced.' })
    );
    unsubscribe();

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      entity: 'comment_bank_entry',
      type: 'create',
      ids: [created.id],
    });
    expect(events[0]?.commitSequence).toBeGreaterThan(0);
  });

  it('drops a soft-deleted row out of the watched page', async () => {
    const created = await context.repository.create(
      'comment_bank_entry',
      fixtureInput(context, 'comment_bank_entry', { text: 'Doomed.' })
    );

    const pages: Array<readonly RepositoryRow<'comment_bank_entry'>[]> = [];
    const unsubscribe = context.repository.watch('comment_bank_entry', (rows) => {
      pages.push(rows);
    });
    await context.repository.whenIdle();

    await context.repository.remove('comment_bank_entry', created.id);
    await context.repository.whenIdle();
    unsubscribe();

    const last = pages[pages.length - 1] ?? [];
    expect(last.some((row) => row.id === created.id)).toBe(false);
  });

  it('lets a caller read its own write right after the promise resolved', async () => {
    const created = await context.repository.create(
      'comment_bank_entry',
      fixtureInput(context, 'comment_bank_entry', { text: 'Read your write.' })
    );

    const stored = await context.repository.get('comment_bank_entry', created.id);
    expect(stored?.text).toBe('Read your write.');
  });

  it('stops delivering after the watcher unsubscribes', async () => {
    let calls = 0;
    const unsubscribe = context.repository.watch('comment_bank_entry', () => {
      calls += 1;
    });
    await context.repository.whenIdle();
    const afterSubscribe = calls;

    unsubscribe();
    await context.repository.create(
      'comment_bank_entry',
      fixtureInput(context, 'comment_bank_entry', { text: 'After unsubscribe.' })
    );
    await context.repository.whenIdle();

    expect(calls).toBe(afterSubscribe);
  });
});
