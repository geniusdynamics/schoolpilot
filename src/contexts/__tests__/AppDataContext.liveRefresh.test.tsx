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
  // True once the provider watches this collection for change events.
  const watched = { value: false };
  return {
    docs,
    changes,
    watched,
    find: vi.fn(async () => docs.map((d) => ({ ...d }))),
    subscribeToChanges: () => {
      watched.value = true;
      return changes.asObservable();
    },
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

/** The read counter of a collection double. */
type ReadCounter = { mock: { calls: readonly unknown[] } };

/**
 * Waits until the read count of a collection stops moving.
 *
 * The provider reads a collection when it loads, and again when a change event arrives
 * after a debounce. A snapshot taken while a read is still on its way counts a read that
 * belongs to the previous burst, which is what made this test flaky under load. The
 * helper waits for the count to be quiet for a while, and for the collection to have been
 * read at least once, so the count it returns is a settled one.
 */
const waitForStableReads = async (
  find: ReadCounter,
  options: { quietMs?: number; timeoutMs?: number } = {}
): Promise<number> => {
  const quietMs = options.quietMs ?? 200;
  let last = -1;
  let quietSince = Date.now();

  await waitFor(
    () => {
      const current = find.mock.calls.length;
      if (current !== last) {
        last = current;
        quietSince = Date.now();
        throw new Error('the read count is still moving');
      }
      if (current < 1) throw new Error('the collection was not read yet');
      if (Date.now() - quietSince < quietMs) throw new Error('the read count is not quiet yet');
    },
    { timeout: options.timeoutMs ?? 10_000, interval: 25 }
  );

  return last;
};

/**
 * Waits until the provider watches a collection for change events.
 *
 * The provider subscribes when the initialisation finishes, which is after the first
 * render that shows the loaded rows. A change event emitted before that subscription
 * exists is lost, so the test waits for the watch instead of racing it.
 */
const waitForWatch = async (collection: { watched: { value: boolean } }) => {
  await waitFor(
    () => {
      if (!collection.watched.value) {
        throw new Error('the provider does not watch the collection yet');
      }
    },
    { timeout: 10_000, interval: 25 }
  );
};

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

    await waitForWatch(years);
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

    // The initial load of both collections has to have settled before the count is
    // compared, so a read that was still on its way is not counted as a re-read.
    const yearReads = await waitForStableReads(years.find);
    await waitForStableReads(classes.find);
    expect(yearReads).toBeGreaterThan(0);

    await waitForWatch(classes);
    act(() => {
      classes.insertFromElsewhere({ id: 7, name: 'Grade 7' });
    });

    expect(await screen.findByText('Grade 7')).toBeTruthy();

    // The change was in `classes`, so `years` was not read again.
    await waitForStableReads(years.find);
    expect(years.find.mock.calls.length).toBe(yearReads);
  });

  it('coalesces a burst of change events into one read per collection', async () => {
    const classes = makeCollection([]);
    collections.set('classes', classes);
    renderApp();

    // The initial load has to have settled, so the burst is measured against a quiet
    // database.
    const before = await waitForStableReads(classes.find);
    expect(before).toBeGreaterThan(0);

    await waitForWatch(classes);
    act(() => {
      classes.insertFromElsewhere({ id: 'a', name: 'Form 1' });
      classes.insertFromElsewhere({ id: 'b', name: 'Form 2' });
      classes.insertFromElsewhere({ id: 'c', name: 'Form 3' });
    });

    // The new row is on screen, so the read of the burst has already happened.
    expect(await screen.findByText('Form 3')).toBeTruthy();

    // One read for the burst of three change events, and no second one.
    const after = await waitForStableReads(classes.find);
    expect(after - before).toBe(1);
  });
});
