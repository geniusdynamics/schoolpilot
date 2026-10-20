// ABOUTME: The end-to-end acceptance of the query layer: a write through the real repository
// ABOUTME: over SQLite updates every dependent view that watches the same entity.

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { Page, RepositoryRow } from '@/data/repository';
import {
  closeTestContext,
  createTestContext,
  fixtureInput,
  type TestContext,
} from '@/data/repository/__tests__/helpers';

import { queryCache, queryKey, useEntityQuery, useMutation } from '..';

type EntryRow = RepositoryRow<'comment_bank_entry'>;

describe('the live query cache over a real repository', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestContext();
  });

  afterAll(async () => {
    await closeTestContext(context);
  });

  afterEach(() => {
    queryCache.clear();
  });

  it('updates every dependent view when the repository writes', async () => {
    const repository = context.repository;
    const list = vi.spyOn(repository, 'list');

    const entries = renderHook(() => useEntityQuery(repository, 'comment_bank_entry'));
    const sameKey = renderHook(() => useEntityQuery(repository, 'comment_bank_entry'));
    const dependent = renderHook(() =>
      useEntityQuery(repository, 'promotion_decision', {}, { deps: ['comment_bank_entry'] })
    );

    await waitFor(() => expect(entries.result.current.status).toBe('success'));
    await waitFor(() => expect(dependent.result.current.status).toBe('success'));

    const before = entries.result.current.data?.items.length ?? 0;
    const listsBefore = list.mock.calls.length;

    await act(async () => {
      await repository.create(
        'comment_bank_entry',
        fixtureInput(context, 'comment_bank_entry', { text: 'Written by the live cache test.' })
      );
    });

    await waitFor(() => expect(entries.result.current.data?.items.length).toBe(before + 1));
    expect(sameKey.result.current.data?.items.length).toBe(before + 1);
    expect(
      entries.result.current.data?.items.some(
        (row) => row.text === 'Written by the live cache test.'
      )
    ).toBe(true);

    // The dependent view refetched its base query when the entity it depends on changed.
    await waitFor(() => expect(list.mock.calls.length).toBeGreaterThan(listsBefore));
    expect(dependent.result.current.status).toBe('success');

    list.mockRestore();
  });

  it('shows the new value as soon as the mutation resolved', async () => {
    const repository = context.repository;
    const key = queryKey('comment_bank_entry', {});

    const entries = renderHook(() => useEntityQuery(repository, 'comment_bank_entry'));
    await waitFor(() => expect(entries.result.current.status).toBe('success'));

    const mutation = renderHook(() =>
      useMutation<{ text: string }, EntryRow, Page<EntryRow>>({
        mutationFn: async (input) =>
          repository.create(
            'comment_bank_entry',
            fixtureInput(context, 'comment_bank_entry', { text: input.text })
          ),
        optimistic: () => [
          {
            key,
            update: (previous) =>
              previous ? { ...previous, total: previous.total + 1 } : previous,
          },
        ],
      })
    );

    let settlement = { observed: false, error: null as unknown };
    await act(async () => {
      const outcome = await mutation.result.current.mutateAsync({
        text: 'Read your writes.',
      });
      settlement = outcome.settlement;
    });

    expect(settlement.observed).toBe(true);
    expect(settlement.error).toBeNull();
    expect(
      entries.result.current.data?.items.some((row) => row.text === 'Read your writes.')
    ).toBe(true);
  });
});
