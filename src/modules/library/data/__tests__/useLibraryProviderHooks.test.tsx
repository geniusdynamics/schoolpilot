// ABOUTME: The three self-contained library hooks read the provider's live `subscribe()` observable.
// ABOUTME: They used to read RxDB's `find().$`, which the canonical providers never implemented, so
// ABOUTME: every page they fed rendered empty even with rows in the collection.

import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { ToastProvider } from '@/hooks/useToast';

const subscriptions: Array<{ next: (rows: unknown[]) => void }> = [];

vi.mock('@/services/database/databaseService', () => ({
  getDatabase: vi.fn(async () => ({
    collections: {
      books: {
        subscribe: () => ({
          subscribe: (next: (rows: unknown[]) => void) => {
            subscriptions.push({ next });
            return { unsubscribe: () => undefined };
          },
        }),
      },
      loans: {
        subscribe: () => ({
          subscribe: (next: (rows: unknown[]) => void) => {
            subscriptions.push({ next });
            return { unsubscribe: () => undefined };
          },
        }),
      },
      fines: {
        subscribe: () => ({
          subscribe: (next: (rows: unknown[]) => void) => {
            subscriptions.push({ next });
            return { unsubscribe: () => undefined };
          },
        }),
      },
    },
  })),
}));

import { useBookData } from '../useBookData';
import { useFineData } from '../useFineData';
import { useLoanData } from '../useLoanData';

describe('the library hooks read the provider subscribe() observable', () => {
  it('useBookData receives the collection rows and clears its loading state', async () => {
    const { result } = renderHook(() => useBookData());

    await waitFor(() => expect(subscriptions.length).toBeGreaterThan(0));
    const subscription = subscriptions[subscriptions.length - 1];
    subscription.next([
      { id: 'b1', title: 'Things Fall Apart', status: 'Available' },
      { id: 'b2', title: 'The River Between', status: 'Loaned' },
    ]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it('useLoanData receives the loans', async () => {
    const { result } = renderHook(() => useLoanData(), { wrapper: ToastProvider });

    await waitFor(() => expect(subscriptions.length).toBeGreaterThan(1));
    const subscription = subscriptions[subscriptions.length - 1];
    subscription.next([{ id: 'l1', book_title: 'Things Fall Apart', due_date: '2099-01-01' }]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(1);
  });

  it('useFineData receives the fines', async () => {
    const { result } = renderHook(() => useFineData());

    await waitFor(() => expect(subscriptions.length).toBeGreaterThan(2));
    const subscription = subscriptions[subscriptions.length - 1];
    subscription.next([{ id: 'f1', amount: 50 }]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(1);
  });
});
