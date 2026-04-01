// ABOUTME: Regression tests for inventory supplier hooks delegating through shared app context.
// ABOUTME: Verifies plural collections use the singular CRUD names exposed by the app-data contract.

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mockAppData: any = null;

vi.mock('../../../../hooks/useAppData', () => ({
  useAppDataInternal: () => mockAppData
}));

vi.mock('../../../../contexts/AppDataContext', () => ({
  hasAppDataContextContract: () => Boolean(mockAppData)
}));

vi.mock('../../../../hooks/useMemoryManagement', () => ({
  useMemoryAwareCache: () => ({
    setCache: vi.fn(),
    getCache: vi.fn(),
    clearCache: vi.fn()
  })
}));

vi.mock('../../../../services/DataConsistencyService', () => ({
  globalDataConsistencyService: {
    validateEntity: vi.fn().mockResolvedValue({
      isValid: true,
      errors: []
    })
  }
}));

vi.mock('../../../../services/performanceMonitor', () => ({
  performanceMonitor: {
    recordDataOperation: vi.fn()
  }
}));

import { useSupplierContractData } from '../useSupplierContractData';
import { useSupplierData } from '../useSupplierData';

describe('inventory supplier hooks shared-context CRUD naming', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppData = null;
  });

  it('delegates supplier CRUD operations to add/update/deleteSupplier methods', async () => {
    const addSupplier = vi.fn(async (item) => ({ ...item, id: 42 }));
    const updateSupplier = vi.fn(async (id, updates) => ({ id, ...updates }));
    const deleteSupplier = vi.fn(async () => true);

    mockAppData = {
      loading: { all: false, suppliers: false },
      suppliers: [
        {
          id: 7,
          name: 'Acme Books',
          status: 'Active',
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ],
      addSupplier,
      updateSupplier,
      deleteSupplier
    };

    const { result } = renderHook(() => useSupplierData());

    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.suppliers[0]?.id).toBe(7));

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

    expect(addSupplier).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Stationery Hub', status: 'Active' })
    );
    expect(updateSupplier).toHaveBeenCalledWith(7, { name: 'Acme Learning Supplies' });
    expect(deleteSupplier).toHaveBeenCalledWith(7);
  });

  it('delegates supplier contract CRUD operations to add/update/deleteSupplierContract methods', async () => {
    const addSupplierContract = vi.fn(async (item) => ({ ...item, id: 'SC-900' }));
    const updateSupplierContract = vi.fn(async (id, updates) => ({ id, ...updates }));
    const deleteSupplierContract = vi.fn(async () => true);

    mockAppData = {
      loading: { all: false, supplierContracts: false },
      supplierContracts: [
        {
          id: 'SC-001',
          supplier_id: 7,
          contract_number: 'SC-001',
          title: 'Main supply agreement',
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          status: 'Active',
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ],
      addSupplierContract,
      updateSupplierContract,
      deleteSupplierContract
    };

    const { result } = renderHook(() => useSupplierContractData());

    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.contracts[0]?.id).toBe('SC-001'));

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

    expect(addSupplierContract).toHaveBeenCalledWith(
      expect.objectContaining({ contract_number: 'SC-900', title: 'Renewal agreement' })
    );
    expect(updateSupplierContract).toHaveBeenCalledWith('SC-001', { title: 'Updated supply agreement' });
    expect(deleteSupplierContract).toHaveBeenCalledWith('SC-001');
  });
});
