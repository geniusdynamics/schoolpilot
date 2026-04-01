// ABOUTME: Regression tests for inventory supplier and supplier contract data hooks.
// ABOUTME: Verifies fallback seed data remains available when global app data is absent.

import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSupplierContractData } from '../useSupplierContractData';
import { useSupplierData } from '../useSupplierData';

vi.mock('../../../../hooks/useAppData', () => ({
  useAppDataInternal: () => null
}));

vi.mock('../../../../contexts/AppDataContext', () => ({
  hasAppDataContextContract: () => false
}));

describe('inventory supplier data hooks', () => {
  it('returns seeded suppliers when no AppDataContext collection is available', async () => {
    const { result } = renderHook(() => useSupplierData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.suppliers.length).toBeGreaterThan(0);
    expect(result.current.count).toBe(result.current.suppliers.length);
    expect(result.current.findActiveSuppliers().length).toBeGreaterThan(0);
    expect(result.current.findById(result.current.suppliers[0].id)).toEqual(result.current.suppliers[0]);
  });

  it('returns seeded contracts with page-ready titles when no AppDataContext collection is available', async () => {
    const { result } = renderHook(() => useSupplierContractData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.contracts.length).toBeGreaterThan(0);
    expect(result.current.contracts.every((contract) => Boolean(contract.title?.trim()))).toBe(true);
    expect(result.current.contracts.every((contract) => Boolean(contract.supplier_name?.trim()))).toBe(true);
  });
});
