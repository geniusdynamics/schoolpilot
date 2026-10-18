// ABOUTME: Tests for useItemData (database-backed, no mock state) and useStockLevelService (P0-H01, SO-22/25):
// ABOUTME: items persist to 'items_inv' with update(id, patch); new stock levels keep UUID warehouse ids as strings.

import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { databaseService } from '@/services/database/databaseService';
import { ItemTypeInv } from '@/core/types';
import { useItemData } from '../useItemData';
import { useStockLevelService } from '../../hooks/useStockLevelService';
import { StockTransactionType } from '../types';

vi.mock('@/services/database/databaseService', () => ({
  databaseService: {
    getDatabase: vi.fn(),
    generateId: vi.fn(),
  },
}));

type Row = { id: string } & Record<string, unknown>;

const memoryCollection = (seed: Row[] = []) => {
  let rows = seed.map((row) => ({ ...row }));
  return {
    rows: () => rows,
    find: vi.fn(async () => rows.map((row) => ({ ...row }))),
    insert: vi.fn(async (doc: Row) => {
      rows = [...rows, { ...doc }];
      return { ...doc };
    }),
    update: vi.fn(async (id: string, patch: Record<string, unknown>) => {
      rows = rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
      return rows.find((row) => row.id === id) ?? null;
    }),
    remove: vi.fn(async (id: string) => {
      rows = rows.filter((row) => row.id !== id);
      return true;
    }),
  };
};

let collections: Record<string, ReturnType<typeof memoryCollection>>;
let nextId = 0;

beforeEach(() => {
  nextId = 0;
  collections = {
    items_inv: memoryCollection([
      { id: 'item-uuid-1', name: 'Chalk Box', item_type: ItemTypeInv.CONSUMABLE, created_at: 'x', updated_at: 'x' },
    ]),
    stock_levels: memoryCollection(),
  };
  vi.mocked(databaseService.getDatabase).mockResolvedValue({
    getCollection: (name: string) => collections[name] ?? null,
  } as never);
  vi.mocked(databaseService.generateId).mockImplementation(() => `uuid-${++nextId}`);
});

describe('useItemData (P0-H01)', () => {
  it('reads items from the database instead of mock data', async () => {
    const { result } = renderHook(() => useItemData());
    await waitFor(() => expect(result.current.data.map((i) => i.name)).toEqual(['Chalk Box']));
  });

  it('creates, updates with (id, patch) and removes items in the database', async () => {
    const { result } = renderHook(() => useItemData());
    await waitFor(() => expect(result.current.data).toHaveLength(1));

    await act(async () => {
      await result.current.create({ name: 'Marker Pen', item_type: ItemTypeInv.CONSUMABLE });
    });
    expect(collections.items_inv.rows().map((r) => r.name)).toContain('Marker Pen');

    await act(async () => {
      await result.current.update('item-uuid-1', { name: 'Chalk Box (White)' });
    });
    expect(collections.items_inv.update).toHaveBeenCalledWith(
      'item-uuid-1',
      expect.objectContaining({ name: 'Chalk Box (White)' })
    );

    await act(async () => {
      await result.current.remove('item-uuid-1');
    });
    expect(collections.items_inv.remove).toHaveBeenCalledWith('item-uuid-1');
  });
});

describe('useStockLevelService (P0-H01)', () => {
  it('inserts a new stock level keeping the UUID warehouse id a string', async () => {
    const { result } = renderHook(() => useStockLevelService());
    await waitFor(() => expect(collections.stock_levels.find).toHaveBeenCalled());

    await act(async () => {
      await result.current.processTransaction({
        item_id: 'item-uuid-1',
        warehouse_id: '0d3c7a52-6f1e-4b8a-9a43-1d2e3f4a5b6c',
        transaction_type: StockTransactionType.RECEIPT,
        quantity: 12,
      });
    });

    expect(collections.stock_levels.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        item_id: 'item-uuid-1',
        warehouse_id: '0d3c7a52-6f1e-4b8a-9a43-1d2e3f4a5b6c',
        quantity: 12,
      })
    );
  });
});
