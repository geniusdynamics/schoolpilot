// ABOUTME: The useMutation hook: an optimistic write with a commit-epoch settlement, so a
// ABOUTME: write is only reported as applied once the cache has observed it.

import { useCallback, useRef, useState } from 'react';

import { queryCache, type Settlement } from './cache';
import { type QueryKey } from './keys';

/** One optimistic patch of a mutation: the entry it touches and how it changes it. */
export interface OptimisticPatch<TData = unknown> {
  readonly key: QueryKey;
  readonly update: (previous: TData) => TData;
}

/** How a mutation is configured. */
export interface UseMutationOptions<TInput, TResult, TData = unknown> {
  /** The write itself. It resolves when the repository committed. */
  readonly mutationFn: (input: TInput) => Promise<TResult>;
  /** The patches applied while the write is in flight. */
  readonly optimistic?: (input: TInput) => readonly OptimisticPatch<TData>[];
  readonly onSuccess?: (result: TResult, input: TInput) => void;
  readonly onError?: (error: unknown, input: TInput) => void;
}

/** What a mutation hands to the view. */
export interface UseMutationResult<TInput, TResult> {
  /** Runs the mutation without waiting for it. */
  readonly mutate: (input: TInput) => void;
  /** Runs the mutation and waits until the cache observed the write. */
  readonly mutateAsync: (
    input: TInput
  ) => Promise<{ readonly result: TResult; readonly settlement: Settlement }>;
  readonly isPending: boolean;
  /** The settlement of the last mutation. */
  readonly settlement: Settlement | null;
  readonly error: unknown;
  readonly reset: () => void;
}

interface MutationState {
  readonly isPending: boolean;
  readonly error: unknown;
  readonly settlement: Settlement | null;
}

const IDLE_STATE: MutationState = { isPending: false, error: null, settlement: null };

let mutationCounter = 0;

function nextMutationId(): string {
  mutationCounter += 1;
  return `mutation-${mutationCounter}`;
}

/**
 * Runs one write.
 *
 * The optimistic layers are applied before the write and dropped as soon as the cache
 * observed them, so a non-idempotent patch is never applied twice. A layer that the
 * cache never observed stays visible, because dropping it would revert a write that
 * may well have landed. A write that never reached the repository is never reported as
 * observed. A rejected write rolls its layers back and rethrows.
 */
export function useMutation<TInput, TResult, TData = unknown>(
  options: UseMutationOptions<TInput, TResult, TData>
): UseMutationResult<TInput, TResult> {
  const [state, setState] = useState<MutationState>(IDLE_STATE);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const mutateAsync = useCallback(
    async (input: TInput) => {
      const current = optionsRef.current;
      const mutationId = nextMutationId();
      const patches = current.optimistic?.(input) ?? [];
      const rollbacks = patches.map((patch) =>
        queryCache.applyOptimistic(patch.key, mutationId, (previous) =>
          patch.update(previous as TData)
        )
      );

      setState({ isPending: true, error: null, settlement: null });

      try {
        const result = await current.mutationFn(input);
        const outcomes = patches.map((patch) =>
          queryCache.markCommitted(patch.key, mutationId)
        );
        // A write that never moved the repository's counter never reached the
        // repository, so no observation can prove it.
        const unobserved = outcomes.some((outcome) => outcome === 'unobserved');
        // The change bus of the repository schedules the refresh on a macrotask; the
        // flush waits for it, so the view shows the new value when this resolves.
        await queryCache.flush();
        const settled = await queryCache.settlePatches(
          patches.map((patch) => patch.key),
          mutationId
        );
        const settlement: Settlement = unobserved
          ? { observed: false, error: settled.error }
          : settled;
        setState({ isPending: false, error: null, settlement });
        current.onSuccess?.(result, input);
        return { result, settlement };
      } catch (error) {
        for (const rollback of rollbacks) rollback();
        setState({ isPending: false, error, settlement: null });
        current.onError?.(error, input);
        throw error;
      }
    },
    []
  );

  const mutate = useCallback(
    (input: TInput) => {
      void mutateAsync(input).catch(() => {
        // The failure is already recorded in the state and reported to onError.
      });
    },
    [mutateAsync]
  );

  const reset = useCallback(() => setState(IDLE_STATE), []);

  return {
    mutate,
    mutateAsync,
    isPending: state.isPending,
    settlement: state.settlement,
    error: state.error,
    reset,
  };
}
