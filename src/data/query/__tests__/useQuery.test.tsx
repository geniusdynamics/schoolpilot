// ABOUTME: Hook tests for useQuery: one read per key, the loading, error and empty states, the
// ABOUTME: invalidation rules and the optimistic settlement of a mutation.

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryCache, queryKey, useMutation, useQuery } from '..';
import { FakeRepository } from './fakeRepository';

/** Lets the queued macrotasks of the repository run. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

interface Count {
  readonly count: number;
}

describe('useQuery', () => {
  let repository: FakeRepository;

  beforeEach(() => {
    queryCache.clear();
    repository = new FakeRepository();
    repository.seed('learner', [{ id: 'l1', name: 'Amani' }]);
  });

  afterEach(() => {
    queryCache.clear();
  });

  it('serves every component of one key with a single read and one snapshot', async () => {
    const key = queryKey('learner', {});
    const fetcher = vi.fn(async () => ({ count: repository.rowsOf('learner').length }));

    const first = renderHook(() => useQuery(key, fetcher, { repository }));
    const second = renderHook(() => useQuery(key, fetcher, { repository }));

    await waitFor(() => expect(first.result.current.status).toBe('success'));

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(second.result.current.status).toBe('success');
    expect(second.result.current.data).toBe(first.result.current.data);
  });

  it('reports the loading state before the first read settles', async () => {
    const key = queryKey('learner', {});
    const { result } = renderHook(() =>
      useQuery(key, async () => ({ count: 0 }), { repository })
    );

    expect(result.current.status).toBe('loading');
    expect(result.current.isFetching).toBe(true);
    expect(result.current.data).toBeUndefined();

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.isFetching).toBe(false);
  });

  it('leaves the data undefined when the first read fails', async () => {
    const key = queryKey('learner', {});
    const { result } = renderHook(() =>
      useQuery(
        key,
        async () => {
          throw new Error('offline');
        },
        { repository }
      )
    );

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.data).toBeUndefined();
    expect((result.current.error as Error).message).toBe('offline');
  });

  it('keeps the last good data when a refresh fails', async () => {
    const key = queryKey('learner', {});
    let fail = false;
    const { result } = renderHook(() =>
      useQuery(
        key,
        async () => {
          if (fail) throw new Error('refresh failed');
          return { count: 1 };
        },
        { repository }
      )
    );

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.data).toEqual({ count: 1 });

    fail = true;
    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.data).toEqual({ count: 1 });
    expect((result.current.error as Error).message).toBe('refresh failed');
  });

  it('stays idle while it is disabled', async () => {
    const key = queryKey('learner', {});
    const fetcher = vi.fn(async () => ({ count: 1 }));
    const { result } = renderHook(() => useQuery(key, fetcher, { repository, enabled: false }));

    await flush();

    expect(result.current.status).toBe('idle');
    expect(result.current.data).toBeUndefined();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('refreshes on an event of a dependency and ignores an unrelated one', async () => {
    const key = queryKey('enrolment', {});
    const fetcher = vi.fn(async () => ({ count: repository.rowsOf('enrolment').length }));
    const { result } = renderHook(() =>
      useQuery(key, fetcher, { repository, deps: ['learner'] })
    );

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(fetcher).toHaveBeenCalledTimes(1);

    await act(async () => {
      await repository.write('staff', { id: 's1', name: 'Grace' });
      await flush();
    });
    expect(fetcher).toHaveBeenCalledTimes(1);

    await act(async () => {
      await repository.write('learner', { id: 'l2', name: 'Baraka' });
      await flush();
    });
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  });

  it('does not re-render when nothing changed', async () => {
    const key = queryKey('learner', {});
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useQuery(
        key,
        async () => ({ count: repository.rowsOf('learner').length }),
        { repository }
      );
    });

    await waitFor(() => expect(result.current.status).toBe('success'));
    const settled = renders;

    await act(async () => {
      await repository.write('staff', { id: 's1', name: 'Grace' });
      await flush();
    });

    expect(renders).toBe(settled);
    expect(result.current.data).toEqual({ count: 1 });
  });

  it('refetches an entry that went stale while nobody watched it', async () => {
    const key = queryKey('learner', {});
    const fetcher = vi.fn(async () => ({ count: repository.rowsOf('learner').length }));

    const first = renderHook(() => useQuery(key, fetcher, { repository }));
    await waitFor(() => expect(first.result.current.status).toBe('success'));
    expect(fetcher).toHaveBeenCalledTimes(1);

    first.unmount();

    await act(async () => {
      await repository.write('learner', { id: 'l2', name: 'Baraka' });
      await flush();
    });
    expect(fetcher).toHaveBeenCalledTimes(1);

    const second = renderHook(() => useQuery(key, fetcher, { repository }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    expect(second.result.current.data).toEqual({ count: 2 });
  });
});

describe('useMutation', () => {
  let repository: FakeRepository;
  const key = queryKey('learner', {});

  beforeEach(() => {
    queryCache.clear();
    repository = new FakeRepository();
    repository.seed('learner', [{ id: 'l1', name: 'Amani' }]);
  });

  afterEach(() => {
    queryCache.clear();
  });

  it('shows the optimistic layer while the write runs and drops it once it was observed', async () => {
    const view = renderHook(() =>
      useQuery(key, async () => ({ count: 1 }), { repository })
    );
    await waitFor(() => expect(view.result.current.status).toBe('success'));

    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const mutation = renderHook(() =>
      useMutation<{ id: string; name: string }, Count, Count>({
        mutationFn: async (input) => {
          await gate;
          await repository.write('learner', { id: input.id, name: input.name });
          return { count: 1 };
        },
        optimistic: () => [{ key, update: (previous) => ({ count: previous.count + 1 }) }],
      })
    );

    let pending: Promise<{ result: Count; settlement: { observed: boolean; error: unknown } }> =
      Promise.resolve({ result: { count: 0 }, settlement: { observed: false, error: null } });
    await act(async () => {
      pending = mutation.result.current.mutateAsync({ id: 'l2', name: 'Baraka' });
      await flush();
    });

    expect(view.result.current.data).toEqual({ count: 2 });

    let settlement = { observed: false, error: null as unknown };
    await act(async () => {
      release();
      const outcome = await pending;
      settlement = outcome.settlement;
    });

    expect(settlement.observed).toBe(true);
    expect(settlement.error).toBeNull();
    // The refreshed base replaced the layer; the patch was not applied twice.
    await waitFor(() => expect(view.result.current.data).toEqual({ count: 1 }));
    expect(mutation.result.current.settlement?.observed).toBe(true);
    expect(mutation.result.current.isPending).toBe(false);
  });

  it('does not report a write that never reached the repository as observed', async () => {
    const view = renderHook(() =>
      useQuery(key, async () => ({ count: 1 }), { repository })
    );
    await waitFor(() => expect(view.result.current.status).toBe('success'));

    const mutation = renderHook(() =>
      useMutation<{ id: string }, Count, Count>({
        // The write never reaches the repository, so its counter never moves.
        mutationFn: async () => ({ count: 1 }),
        optimistic: () => [{ key, update: (previous) => ({ count: previous.count + 1 }) }],
      })
    );

    let settlement = { observed: true, error: null as unknown };
    await act(async () => {
      const outcome = await mutation.result.current.mutateAsync({ id: 'l2' });
      settlement = outcome.settlement;
    });

    expect(settlement.observed).toBe(false);
    // The layer that no observation can prove does not hide the value of the database.
    await waitFor(() => expect(view.result.current.data).toEqual({ count: 1 }));
  });

  it('surfaces the error of a rejected write and keeps the previous data', async () => {
    const view = renderHook(() =>
      useQuery(key, async () => ({ count: 1 }), { repository })
    );
    await waitFor(() => expect(view.result.current.status).toBe('success'));

    const mutation = renderHook(() =>
      useMutation<{ id: string }, Count, Count>({
        mutationFn: async () => {
          throw new Error('denied');
        },
        optimistic: () => [{ key, update: (previous) => ({ count: previous.count + 1 }) }],
      })
    );

    await act(async () => {
      await expect(mutation.result.current.mutateAsync({ id: 'l2' })).rejects.toThrow('denied');
    });

    expect((mutation.result.current.error as Error).message).toBe('denied');
    expect(mutation.result.current.isPending).toBe(false);
    expect(view.result.current.data).toEqual({ count: 1 });
    expect(view.result.current.status).toBe('success');
  });

  it('keeps the optimistic layer and reports the error when the refresh fails', async () => {
    let fail = false;
    const view = renderHook(() =>
      useQuery(
        key,
        async () => {
          if (fail) throw new Error('refresh failed');
          return { count: 1 };
        },
        { repository }
      )
    );
    await waitFor(() => expect(view.result.current.status).toBe('success'));

    const mutation = renderHook(() =>
      useMutation<{ id: string; name: string }, Count, Count>({
        mutationFn: async () => {
          fail = true;
          await repository.write('learner', { id: 'l2', name: 'Baraka' });
          return { count: 1 };
        },
        optimistic: () => [{ key, update: (previous) => ({ count: previous.count + 1 }) }],
      })
    );

    let settlement = { observed: false, error: null as unknown };
    await act(async () => {
      const outcome = await mutation.result.current.mutateAsync({ id: 'l2', name: 'Baraka' });
      settlement = outcome.settlement;
    });

    expect(settlement.observed).toBe(false);
    expect((settlement.error as Error).message).toBe('refresh failed');
    expect(view.result.current.data).toEqual({ count: 2 });
    expect(view.result.current.status).toBe('error');

    // The next successful read drops the retained layer.
    fail = false;
    await act(async () => {
      await view.result.current.refetch();
    });
    expect(view.result.current.data).toEqual({ count: 1 });
  });
});
