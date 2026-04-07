// ABOUTME: Tests the standardized data hook factory against AppDataContext edge cases.
// ABOUTME: Verifies empty collection handling and safe fallback behavior for missing context data.

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDataHook } from '../useDataHookFactory';
import { useAppDataInternal } from '../useAppData';

vi.mock('../useAppData', () => ({
  useAppDataInternal: vi.fn()
}));

vi.mock('../useMemoryManagement', () => ({
  useMemoryAwareCache: vi.fn(() => ({
    setCache: vi.fn(),
    getCache: vi.fn(),
    clearCache: vi.fn()
  }))
}));

vi.mock('../../services/consistency/DataConsistencyService', () => ({
  globalDataConsistencyService: {
    validateEntity: vi.fn().mockResolvedValue({
      isValid: true,
      errors: []
    })
  }
}));

vi.mock('../../services/performance/performanceMonitor', () => ({
  performanceMonitor: {
    recordDataOperation: vi.fn()
  }
}));

type TestEntity = {
  id: string;
  name: string;
};

const mockedUseAppDataInternal = vi.mocked(useAppDataInternal);

const createHook = () => createDataHook<TestEntity>({
  entityName: 'academicYears',
  initialData: [{ id: 'initial-year', name: 'Initial Year' }],
  entityModule: 'academics'
});

const createContextValue = (overrides: Record<string, unknown> = {}) => ({
  loading: { all: false, academicYears: false },
  syncStatus: {
    state: 'idle',
    progress: 0,
    lastError: null,
    lastSyncTime: null,
    pendingOperations: 0,
    conflictsCount: 0
  },
  refreshData: vi.fn(),
  ...overrides
});

describe('createDataHook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses an empty collection from AppDataContext instead of falling back to initial data', async () => {
    mockedUseAppDataInternal.mockReturnValue(
      createContextValue({ academicYears: [] }) as any
    );

    const useAcademicYearData = createHook();
    const { result } = renderHook(() => useAcademicYearData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
  });

  it('falls back to initial data when the AppDataContext collection is missing', async () => {
    mockedUseAppDataInternal.mockReturnValue(createContextValue() as any);

    const useAcademicYearData = createHook();
    const { result } = renderHook(() => useAcademicYearData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual([{ id: 'initial-year', name: 'Initial Year' }]);
  });
});
