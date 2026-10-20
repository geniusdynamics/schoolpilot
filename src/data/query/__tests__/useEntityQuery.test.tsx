// ABOUTME: Hook tests for useEntityQuery: the watch stream owns the entity, a write updates
// ABOUTME: every dependent view and a stale payload is rejected instead of applied.

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { queryCache, useEntityQuery } from '..';
import { FakeRepository } from './fakeRepository';

/** Lets the queued macrotasks of the repository run. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('useEntityQuery', () => {
  let repository: FakeRepository;

  beforeEach(() => {
    queryCache.clear();
    repository = new FakeRepository();
    repository.seed('class_group', [{ id: 'l1', name: 'Amani' }]);
    repository.seed('enrolment', [{ id: 'e1', name: 'Enrolment' }]);
  });

  afterEach(() => {
    queryCache.clear();
  });

  it('reads the current page from the watch stream without an initial list', async () => {
    const { result } = renderHook(() => useEntityQuery(repository, 'class_group'));

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('success'));

    expect(repository.listCalls).toBe(0);
    expect(result.current.data?.items.map((row) => row.name)).toEqual(['Amani']);
    expect(result.current.data?.total).toBe(1);
  });

  it('updates every dependent view when the repository writes', async () => {
    const groups = renderHook(() => useEntityQuery(repository, 'class_group'));
    const sameKey = renderHook(() => useEntityQuery(repository, 'class_group'));
    const dependent = renderHook(() =>
      useEntityQuery(repository, 'enrolment', {}, { deps: ['class_group'] })
    );

    await waitFor(() => expect(groups.result.current.status).toBe('success'));
    await waitFor(() => expect(dependent.result.current.status).toBe('success'));

    const listsBefore = repository.listCalls;

    await act(async () => {
      await repository.write('class_group', { id: 'l2', name: 'Baraka' });
      await flush();
    });

    await waitFor(() =>
      expect(groups.result.current.data?.items.map((row) => row.name)).toEqual([
        'Amani',
        'Baraka',
      ])
    );
    expect(sameKey.result.current.data?.items).toHaveLength(2);
    expect(dependent.result.current.status).toBe('success');
    expect(dependent.result.current.data?.items).toHaveLength(1);
    expect(repository.listCalls).toBeGreaterThan(listsBefore);
  });

  it('lets the stream own the entity instead of refetching on its own events', async () => {
    const { result } = renderHook(() => useEntityQuery(repository, 'class_group'));
    await waitFor(() => expect(result.current.status).toBe('success'));

    const listsBefore = repository.listCalls;
    await act(async () => {
      await repository.write('class_group', { id: 'l2', name: 'Baraka' });
      await flush();
    });

    expect(repository.listCalls).toBe(listsBefore);
    expect(result.current.data?.items).toHaveLength(2);
  });

  it('rejects a payload that is tagged below the committed sequence', async () => {
    const { result } = renderHook(() => useEntityQuery(repository, 'class_group'));
    await waitFor(() => expect(result.current.status).toBe('success'));

    await act(async () => {
      await repository.write('class_group', { id: 'l2', name: 'Baraka' });
      await flush();
    });
    await waitFor(() => expect(result.current.data?.items).toHaveLength(2));

    // A payload from before the write arrives late: it is stale and must be rejected.
    await act(async () => {
      repository.deliver('class_group', [{ id: 'l1', name: 'Stale' }], 0);
    });

    expect(result.current.data?.items.map((row) => row.name)).toEqual(['Amani', 'Baraka']);
    expect(result.current.status).toBe('success');
  });

  it('keeps the page metadata advisory until a refetch', async () => {
    const { result } = renderHook(() => useEntityQuery(repository, 'class_group'));
    await waitFor(() => expect(result.current.status).toBe('success'));

    await act(async () => {
      await repository.write('class_group', { id: 'l2', name: 'Baraka' });
      await flush();
    });
    await waitFor(() => expect(result.current.data?.items).toHaveLength(2));

    expect(result.current.data?.total).toBe(1);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.data?.total).toBe(2);
    expect(result.current.data?.items).toHaveLength(2);
  });

  it('gives the watch up after the failure budget and lives on the change bus', async () => {
    repository.failDelivery = true;
    const { result } = renderHook(() => useEntityQuery(repository, 'class_group'));

    // The watch failed twice, so the entry fell back to the list.
    await waitFor(() => expect(repository.listCalls).toBeGreaterThan(0), { timeout: 5000 });
    expect(result.current.status).toBe('success');

    const subscriptions = repository.watchSubscriptions;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2500));
    });

    expect(repository.watchSubscriptions).toBe(subscriptions);
    expect(repository.listCalls).toBeGreaterThan(0);
  });

  it('keeps two repositories over one entity apart', async () => {
    const other = new FakeRepository();
    other.seed('class_group', [{ id: 'g9', name: 'Grade 8 Gold' }]);

    const first = renderHook(() => useEntityQuery(repository, 'class_group'));
    const second = renderHook(() => useEntityQuery(other, 'class_group'));

    await waitFor(() => expect(first.result.current.status).toBe('success'));
    await waitFor(() => expect(second.result.current.status).toBe('success'));

    expect(first.result.current.data?.items.map((row) => row.name)).toEqual(['Amani']);
    expect(second.result.current.data?.items.map((row) => row.name)).toEqual(['Grade 8 Gold']);
  });
});
