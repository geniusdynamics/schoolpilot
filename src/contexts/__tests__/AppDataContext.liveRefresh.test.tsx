// ABOUTME: Tests that AppDataProvider refreshes shared lookups when a collection emits a change event.
// ABOUTME: A record written through any hook must reach useAppData() consumers without a reload (SO-26).

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { Subject } from 'rxjs';

vi.mock('@sqlite.org/sqlite-wasm', () => ({ default: vi.fn() }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

type Doc = { id: string | number; name: string };
type ChangeEvent = { type: 'insert' | 'update' | 'delete'; doc: Doc; id: string };

const makeCollection = (initial: Doc[]) => {
  const docs = [...initial];
  const changes = new Subject<ChangeEvent>();
  return {
    docs,
    changes,
    find: vi.fn(async () => docs.map((d) => ({ ...d }))),
    subscribeToChanges: () => changes.asObservable(),
    // Simulates a write made by another hook (useDatabaseCollection, useEntityCrud, …).
    insertFromElsewhere(doc: Doc) {
      docs.push(doc);
      changes.next({ type: 'insert', doc, id: String(doc.id) });
    },
  };
};

const collections = vi.hoisted(() => new Map<string, any>());

const manager = vi.hoisted(() => ({
  initialize: vi.fn(),
  getProvider: vi.fn(() => null),
  getProviderType: vi.fn(() => 'sqlite-wasm'),
  getAllCollections: vi.fn(() => new Map(collections)),
  getCollection: vi.fn((name: string) => collections.get(name) ?? null),
  getCurrentProvider: vi.fn(() => null),
  getDeploymentMode: vi.fn(() => 'production'),
}));

vi.mock('../../services/database/UnifiedDatabaseManager', () => ({
  UnifiedDatabaseManager: { getInstance: () => manager },
}));

vi.mock('../../hooks/useToast', () => {
  const toast = { showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn(), showInfo: vi.fn() };
  return { useToastHelpers: () => toast };
});

// Module providers keep their own state; this test is about the shared AppDataContext only.
vi.mock('../data', () => {
  const PassThrough = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  return {
    SystemDataProvider: PassThrough,
    AdministrationDataProvider: PassThrough,
    AcademicDataProvider: PassThrough,
    FinanceDataProvider: PassThrough,
    HRDataProvider: PassThrough,
    InventoryDataProvider: PassThrough,
    LibraryDataProvider: PassThrough,
    NutritionDataProvider: PassThrough,
  };
});

import { AppDataProvider, useAppData } from '../AppDataContext';
import { BackupRestoreProvider } from '../appData/BackupRestoreContext';
import { DataGenerationProvider } from '../appData/DataGenerationContext';
import { PaginationProvider } from '../appData/PaginationContext';
import { ValidationProvider } from '../appData/ValidationContext';
import { moduleRegistry } from '../../core/moduleRegistry';

const Picker: React.FC = () => {
  const appData = useAppData() as any;
  const years: Doc[] = appData.academicYears || [];
  const classes: Doc[] = appData.classes || [];
  return (
    <div>
      <ul aria-label="years">{years.map((y) => <li key={y.id}>{y.name}</li>)}</ul>
      <ul aria-label="classes">{classes.map((c) => <li key={c.id}>{c.name}</li>)}</ul>
    </div>
  );
};

const renderApp = () =>
  render(
    <BackupRestoreProvider>
      <DataGenerationProvider>
        <PaginationProvider>
          <ValidationProvider>
            <AppDataProvider>
              <Picker />
            </AppDataProvider>
          </ValidationProvider>
        </PaginationProvider>
      </DataGenerationProvider>
    </BackupRestoreProvider>
  );

describe('AppDataProvider live refresh of shared lookups', () => {
  beforeEach(() => {
    collections.clear();
    manager.initialize.mockReset();
    manager.initialize.mockResolvedValue(undefined);
    vi.spyOn(moduleRegistry, 'isEnabled').mockReturnValue(true);
  });

  it('shows a record inserted through a collection without a reload', async () => {
    const years = makeCollection([{ id: 'y1', name: '2026' }]);
    collections.set('academic_years', years);
    renderApp();

    expect(await screen.findByText('2026')).toBeTruthy();
    expect(screen.queryByText('2027')).toBeNull();

    act(() => {
      years.insertFromElsewhere({ id: 'y2', name: '2027' });
    });

    expect(await screen.findByText('2027')).toBeTruthy();
    expect(screen.getByText('2026')).toBeTruthy();
  });

  it('refreshes only the collection that changed', async () => {
    const years = makeCollection([{ id: 'y1', name: '2026' }]);
    const classes = makeCollection([{ id: 'c1', name: 'Grade 6' }]);
    collections.set('academic_years', years);
    collections.set('classes', classes);
    renderApp();

    expect(await screen.findByText('Grade 6')).toBeTruthy();
    const yearReads = years.find.mock.calls.length;

    act(() => {
      classes.insertFromElsewhere({ id: 7, name: 'Grade 7' });
    });

    expect(await screen.findByText('Grade 7')).toBeTruthy();
    expect(years.find.mock.calls.length).toBe(yearReads);
  });

  it('coalesces a burst of change events into one read per collection', async () => {
    const classes = makeCollection([]);
    collections.set('classes', classes);
    renderApp();

    await waitFor(() => expect(classes.find).toHaveBeenCalled());
    const before = classes.find.mock.calls.length;

    act(() => {
      classes.insertFromElsewhere({ id: 'a', name: 'Form 1' });
      classes.insertFromElsewhere({ id: 'b', name: 'Form 2' });
      classes.insertFromElsewhere({ id: 'c', name: 'Form 3' });
    });

    expect(await screen.findByText('Form 3')).toBeTruthy();
    expect(classes.find.mock.calls.length - before).toBe(1);
  });
});
