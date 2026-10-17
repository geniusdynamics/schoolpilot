// ABOUTME: Tests for the useTermBilling hook's database repository (useFinanceServices.ts).
// ABOUTME: A missing collection must fail the run with a clear error instead of billing from an empty list.

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { databaseService } from '@/services/database/databaseService';
import { useTermBilling } from '../useFinanceServices';

vi.mock('@/services/database/databaseService', () => ({
  databaseService: { getDatabase: vi.fn(), generateId: vi.fn(() => 'gen-id') },
}));

const insert = vi.fn();
const update = vi.fn();
vi.mock('@/hooks/useDatabaseCollection', () => ({
  useDatabaseCollection: () => ({ data: [], insert, update }),
}));

const collection = (rows: unknown[]) => ({ find: vi.fn(async () => rows) });

describe('useTermBilling', () => {
  it('fails with a clear error naming a missing collection and writes nothing', async () => {
    const collections: Record<string, ReturnType<typeof collection>> = {
      students: collection([{ id: 'S1', status: 'Active', current_class_stream_id: 'F1E' }]),
      fee_templates: collection([{ id: 'FT1', name: 'Tuition', school_period_id: 'T1', items: [{ id: 'I1', description: 'Tuition', amount: 100 }] }]),
      student_invoices: collection([]),
    };
    vi.mocked(databaseService.getDatabase).mockResolvedValue({ getCollection: (name: string) => collections[name] } as never);

    const { result } = renderHook(() => useTermBilling());
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.generateTermInvoices({ periodId: 'T1', dryRun: false });
    });

    expect(outcome).toBeNull();
    expect(result.current.error?.message).toMatch(/class_streams/);
    expect(insert).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
});
