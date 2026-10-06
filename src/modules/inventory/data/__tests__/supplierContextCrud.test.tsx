// ABOUTME: Regression tests for inventory supplier hooks persisting through the database.
// ABOUTME: Verifies the singular create/update/remove API maps onto the suppliers and
// ABOUTME: supplier_contracts collections via `useDatabaseCollection`.

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSupplierContractData } from '../useSupplierContractData';
import { useSupplierData } from '../useSupplierData';
import { databaseService } from '@/services/database/databaseService';

vi.mock('@/services/database/databaseService', () => ({
  databaseService: {
    getDatabase: vi.fn(),
    generateId: vi.fn(() => 'mock-id-123'),
  },
}));

const mockCollections: Record<string, Record<string, ReturnType<typeof vi.fn>>> = {
  suppliers: {
    find: vi.fn(async () => []),
    insert: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  supplier_contracts: {
    find: vi.fn(async () => []),
    insert: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
};

const mockDb = {
  getCollection: vi.fn((name: string) => mockCollections[name] ?? null),
};

describe('inventory supplier hooks database CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (databaseService.getDatabase as any).mockResolvedValue(mockDb);
  });

  it('persists supplier create/update/remove to the suppliers collection', async () => {
    const { result } = renderHook(() => useSupplierData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.create({
        name: 'Stationery Hub',
        status: 'Active'
      } as any);
    });

    await act(async () => {
      await result.current.update(7, { name: 'Acme Learning Supplies' } as any);
    });

    await act(async () => {
      await result.current.remove(7);
    });

    expect(mockCollections.suppliers.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Stationery Hub',
        status: 'Active',
        id: 'mock-id-123',
        created_at: expect.any(String),
        updated_at: expect.any(String)
      })
    );
    expect(mockCollections.suppliers.update).toHaveBeenCalledWith(
      '7',
      expect.objectContaining({ name: 'Acme Learning Supplies', updated_at: expect.any(String) })
    );
    expect(mockCollections.suppliers.remove).toHaveBeenCalledWith('7');
  });

  it('persists supplier contract create/update/remove to the supplier_contracts collection', async () => {
    const { result } = renderHook(() => useSupplierContractData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.create({
        supplier_id: 7,
        contract_number: 'SC-900',
        title: 'Renewal agreement',
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        status: 'Active'
      } as any);
    });

    await act(async () => {
      await result.current.update('SC-001', { title: 'Updated supply agreement' } as any);
    });

    await act(async () => {
      await result.current.remove('SC-001');
    });

    expect(mockCollections.supplier_contracts.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        supplier_id: 7,
        contract_number: 'SC-900',
        title: 'Renewal agreement',
        status: 'Active',
        id: 'mock-id-123',
        created_at: expect.any(String),
        updated_at: expect.any(String)
      })
    );
    expect(mockCollections.supplier_contracts.update).toHaveBeenCalledWith(
      'SC-001',
      expect.objectContaining({ title: 'Updated supply agreement', updated_at: expect.any(String) })
    );
    expect(mockCollections.supplier_contracts.remove).toHaveBeenCalledWith('SC-001');
  });
});
