// ABOUTME: Regression guard for React context identity across hook/provider entry points
// ABOUTME: Would fail if a domain context (e.g. AppData) is duplicated in another module —
// ABOUTME: the bug class behind "useX must be used within Y Provider" runtime errors

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import {
  AppDataContext,
  useAppData as useAppDataFromContext,
} from '@/contexts/AppDataContext';
import { useAppData as useAppDataFromHooks } from '@/hooks/useAppData';
import {
  AdministrationDataContext,
  useAdministrationDataContext,
} from '@/modules/administration/data/AdministrationDataContext';
import {
  FinanceDataContext,
  useFinanceDataContext,
} from '@/modules/finance/data/FinanceDataContext';
import {
  HRDataContext,
  useHRDataContext,
} from '@/modules/hr/data/HRDataContext';
import {
  InventoryDataContext,
  useInventoryDataContext,
} from '@/modules/inventory/data/InventoryDataContext';
import {
  LibraryDataContext,
  useLibraryDataContext,
} from '@/modules/library/data/LibraryDataContext';
import {
  NutritionDataContext,
  useNutritionDataContext,
} from '@/modules/nutrition/data/NutritionDataContext';

/**
 * Mounts a consumer under the CANONICAL context provider (created from the
 * exported context object) and asserts the hook resolves. If a module defines a
 * second, same-named context somewhere else (the historical bug), its hook reads
 * the wrong object and this throws instead of rendering.
 */
const expectHookResolvesUnder = (
  Context: React.Context<any>,
  useHook: () => unknown,
  marker: string
) => {
  const Probe: React.FC = () => {
    const value = useHook() as any;
    return <div data-testid="probe">{String(value?.__marker ?? 'resolved')}</div>;
  };
  const stub = { __marker: marker } as any;

  const { container, unmount } = render(
    <Context.Provider value={stub}>
      <Probe />
    </Context.Provider>
  );

  expect(within(container).getByTestId('probe')).toHaveTextContent(marker);
  unmount();
};

describe('Context identity across provider/hook entry points', () => {
  it('AppData: both hook entry points resolve under the single exported context', () => {
    expectHookResolvesUnder(AppDataContext as React.Context<any>, useAppDataFromHooks, 'appdata-hooks');
    expectHookResolvesUnder(AppDataContext as React.Context<any>, useAppDataFromContext, 'appdata-context');
  });

  it('AdministrationData: context file hook resolves under context file provider', () => {
    expectHookResolvesUnder(AdministrationDataContext as React.Context<any>, useAdministrationDataContext, 'admin');
  });

  it('FinanceData: context file hook resolves under context file provider', () => {
    expectHookResolvesUnder(FinanceDataContext as React.Context<any>, useFinanceDataContext, 'finance');
  });

  it('HRData: context file hook resolves under context file provider', () => {
    expectHookResolvesUnder(HRDataContext as React.Context<any>, useHRDataContext, 'hr');
  });

  it('InventoryData: context file hook resolves under context file provider', () => {
    expectHookResolvesUnder(InventoryDataContext as React.Context<any>, useInventoryDataContext, 'inventory');
  });

  it('LibraryData: context file hook resolves under context file provider', () => {
    expectHookResolvesUnder(LibraryDataContext as React.Context<any>, useLibraryDataContext, 'library');
  });

  it('NutritionData: context file hook resolves under context file provider', () => {
    expectHookResolvesUnder(NutritionDataContext as React.Context<any>, useNutritionDataContext, 'nutrition');
  });
});
