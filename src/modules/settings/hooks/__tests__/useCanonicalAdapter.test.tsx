// ABOUTME: A settings page that reads the canonical database opens it itself and waits for it, instead of
// ABOUTME: reporting "not open yet" whenever it is the first page the user visits.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import type { SqliteAdapter } from '@/data/adapters/sqlite';

const adapterNow = vi.fn<() => SqliteAdapter | null>();
const openRepository = vi.fn<() => Promise<unknown>>();

vi.mock('@/data/canonicalRepository', () => ({
  canonicalAdapter: () => adapterNow(),
  openCanonicalRepository: () => openRepository(),
}));

import { useCanonicalAdapter } from '../useCanonicalAdapter';

const opened = { name: 'the canonical adapter' } as unknown as SqliteAdapter;

describe('useCanonicalAdapter', () => {
  beforeEach(() => {
    adapterNow.mockReset();
    openRepository.mockReset();
  });

  it('hands back the adapter at once when the database is already open, without opening it again', () => {
    adapterNow.mockReturnValue(opened);

    const { result } = renderHook(() => useCanonicalAdapter());

    expect(result.current.adapter).toBe(opened);
    expect(result.current.error).toBeNull();
    expect(openRepository).not.toHaveBeenCalled();
  });

  it('opens the database when no other page has, then hands back the adapter', async () => {
    adapterNow.mockReturnValueOnce(null).mockReturnValue(opened);
    openRepository.mockResolvedValue({});

    const { result } = renderHook(() => useCanonicalAdapter());

    // Opening: neither an adapter nor an error yet, so a page can show that it is waiting.
    expect(result.current.adapter).toBeNull();
    expect(result.current.error).toBeNull();

    await waitFor(() => expect(result.current.adapter).toBe(opened));
    // It asked for the database to be opened. How many times is not the hook's business: opening is
    // idempotent, and React's development double effect may ask twice.
    expect(openRepository).toHaveBeenCalled();
  });

  it('leaves the database alone when the caller already has an adapter of its own', () => {
    adapterNow.mockReturnValue(null);

    const { result } = renderHook(() => useCanonicalAdapter(false));

    expect(openRepository).not.toHaveBeenCalled();
    expect(result.current.adapter).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('reports why when the database cannot be opened', async () => {
    adapterNow.mockReturnValue(null);
    openRepository.mockRejectedValue(new Error('OPFS is unavailable'));

    const { result } = renderHook(() => useCanonicalAdapter());

    await waitFor(() => expect(result.current.error).toBe('OPFS is unavailable'));
    expect(result.current.adapter).toBeNull();
  });
});
