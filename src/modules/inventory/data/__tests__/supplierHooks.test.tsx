// ABOUTME: Regression tests for inventory supplier and supplier contract data hooks.
// ABOUTME: The hooks are database-backed (`useDatabaseCollection`), so these suites stub
// ABOUTME: `databaseService` with seeded rows (mirroring the demo-mode seed shapes from
// ABOUTME: ../mockData) and assert the hooks surface them with page-ready derived data.

import { renderHook, waitFor } from '@testing-library/react';
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

const seededSuppliers = [
  {
    id: 1,
    name: 'Acme Books',
    contact_person: 'Acme Books',
    email: 'acme@example.com',
    phone: '0700000001',
    address: 'Nairobi',
    status: 'Active',
    payment_terms: 'Net 30',
    credit_limit: 100000,
    performance_rating: 4,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    name: 'Bookish Suppliers',
    contact_person: 'Bookish Suppliers',
    email: 'bookish@example.com',
    phone: '0700000002',
    address: 'Mombasa',
    status: 'Active',
    payment_terms: 'Net 30',
    credit_limit: 50000,
    performance_rating: 3,
    created_at: '2024-01-02T00:00:00.000Z',
    updated_at: '2024-01-02T00:00:00.000Z',
  },
];

const seededContracts = [
  {
    id: 'SC-001',
    supplier_id: 1,
    contract_number: 'SC-001',
    title: 'Main supply agreement',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    status: 'Active',
    supplier_name: 'Acme Books',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'SC-002',
    supplier_id: 2,
    contract_number: 'SC-002',
    title: 'Renewal agreement',
    start_date: '2024-02-01',
    end_date: '2024-11-30',
    status: 'Active',
    supplier_name: 'Bookish Suppliers',
    created_at: '2024-01-02T00:00:00.000Z',
    updated_at: '2024-01-02T00:00:00.000Z',
  },
];

const mockCollections: Record<string, Record<string, ReturnType<typeof vi.fn>>> = {
  suppliers: {
    find: vi.fn(async () => seededSuppliers),
    insert: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  supplier_contracts: {
    find: vi.fn(async () => seededContracts),
    insert: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
};

const mockDb = {
  getCollection: vi.fn((name: string) => mockCollections[name] ?? null),
};

describe('inventory supplier data hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (databaseService.getDatabase as any).mockResolvedValue(mockDb);
  });

  it('returns seeded suppliers from the suppliers collection', async () => {
    const { result } = renderHook(() => useSupplierData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.suppliers).toEqual(seededSuppliers);
    expect(result.current.count).toBe(result.current.suppliers.length);
    expect(result.current.findActiveSuppliers().length).toBeGreaterThan(0);
    expect(result.current.findById(result.current.suppliers[0].id)).toEqual(result.current.suppliers[0]);
  });

  it('returns seeded contracts with page-ready titles', async () => {
    const { result } = renderHook(() => useSupplierContractData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.contracts).toEqual(seededContracts);
    expect(result.current.contracts.every((contract) => Boolean(contract.title?.trim()))).toBe(true);
    expect(result.current.contracts.every((contract) => Boolean(contract.supplier_name?.trim()))).toBe(true);
  });
});
