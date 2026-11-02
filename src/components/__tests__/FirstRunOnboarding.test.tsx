// ABOUTME: Tests that the production onboarding path opens the real database before the setup wizard renders.
// ABOUTME: Only the browser boundary (SQLite WASM module, OPFS storage worker, navigator.storage) is stubbed.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

// Boundary stub: the sqlite3 WASM module. Every statement succeeds with no rows.
vi.mock('@sqlite.org/sqlite-wasm', () => {
  class MockDB {
    pointer = 1;
    exec = () => [];
    close = () => undefined;
    checkRc = () => undefined;
  }
  return {
    default: async () => ({
      oo1: { DB: MockDB },
      capi: {
        sqlite3_deserialize: () => 0,
        SQLITE_DESERIALIZE_FREEONCLOSE: 1,
        SQLITE_DESERIALIZE_RESIZEABLE: 2,
      },
      wasm: { allocFromTypedArray: () => 42 },
    }),
  };
});

// The wizard is replaced by a probe that records which collections resolve on its very first render.
const wizardProbe = vi.hoisted(() => ({ firstRender: null as Record<string, boolean> | null }));
vi.mock('@/components/setup/SetupWizard', async () => {
  const { UnifiedDatabaseManager } = await import('@/services/database/UnifiedDatabaseManager');
  const SetupWizard = () => {
    if (!wizardProbe.firstRender) {
      const udm = UnifiedDatabaseManager.getInstance();
      wizardProbe.firstRender = Object.fromEntries(
        ['academic_years', 'school_periods', 'classes', 'class_streams', 'subjects', 'fee_templates'].map(
          (name) => [name, udm.getCollection(name) !== null]
        )
      );
    }
    return <div data-testid="setup-wizard">wizard</div>;
  };
  return { SetupWizard };
});

// The canonical sample school is its own covered suite; the demo-path test here is about the order
// of the database work, so it is stubbed out.
vi.mock('@/data/demo/seedCanonicalDemo', () => ({
  seedCanonicalDemoSchool: vi.fn().mockResolvedValue({ created: true, demoSeeded: true, counts: {} }),
}));

import { UnifiedConfigProvider } from '@/contexts/UnifiedConfigContext';
import { UnifiedDatabaseManager } from '@/services/database/UnifiedDatabaseManager';
import { SQLiteWASMProvider } from '@/services/database/SQLiteWASMProvider';
import { CapabilityDetector } from '@/services/database/detection/CapabilityDetector';
import { FirstRunOnboarding, shouldShowOnboarding } from '../FirstRunOnboarding';

type Reply = (msg: any) => any;

/** Boundary stub for the OPFS storage Web Worker; `reply` decides each response. */
class FakeStorageWorker {
  onmessage: ((event: { data: any }) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onmessageerror: ((event: any) => void) | null = null;
  terminate = vi.fn();
  constructor(private reply: Reply) {}
  postMessage(msg: any) {
    const response = this.reply(msg);
    if (response !== undefined) {
      queueMicrotask(() => this.onmessage?.({ data: { id: msg.id, ...response } }));
    }
  }
}

const okWorker = () =>
  new FakeStorageWorker((msg) => (msg.type === 'open' ? { ok: true, bytes: new Uint8Array() } : { ok: true }));

const missingOpfsWorker = () =>
  new FakeStorageWorker((msg) =>
    msg.type === 'open' ? { ok: false, error: 'Missing required OPFS APIs.' } : { ok: true }
  );

function renderOnboarding() {
  return render(
    <UnifiedConfigProvider>
      <FirstRunOnboarding />
    </UnifiedConfigProvider>
  );
}

async function chooseProduction() {
  fireEvent.click(await screen.findByRole('button', { name: /get started/i }));
  fireEvent.click(screen.getByRole('button', { name: /go direct to production/i }));
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  fireEvent.click(screen.getByRole('button', { name: /initialize production/i }));
}

describe('FirstRunOnboarding production path', () => {
  const originalStorage = (navigator as any).storage;

  beforeEach(() => {
    localStorage.clear();
    wizardProbe.firstRender = null;
    vi.stubEnv('VITE_DB_PROVIDER', 'sqlite-wasm');
    vi.stubEnv('VITE_DB_ALLOW_MEMORY', '');
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        getDirectory: vi.fn(),
        persist: vi.fn().mockResolvedValue(true),
        persisted: vi.fn().mockResolvedValue(true),
      },
    });
    (UnifiedDatabaseManager as any).instance = undefined;
    // Unit tests register no stores; register the real SQLite WASM provider as the app's factory does.
    UnifiedDatabaseManager.getInstance().getProviderFactory().registerProvider(new SQLiteWASMProvider());
    vi.spyOn(CapabilityDetector.getInstance(), 'detectCapabilities').mockResolvedValue({
      runtime: { type: 'browser' },
      storage: { hasOPFS: true, hasWASM: true },
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    Object.defineProperty(navigator, 'storage', { configurable: true, value: originalStorage });
  });

  it('initialises the database before the wizard so its collections resolve on first render', async () => {
    // Hold the worker's open reply until the progress UI has been asserted.
    const pending: Array<() => void> = [];
    vi.spyOn(SQLiteWASMProvider.prototype as any, 'createStorageWorker').mockImplementation(() => {
      const worker = new FakeStorageWorker(() => undefined);
      worker.postMessage = (msg: any) => {
        const respond = () =>
          worker.onmessage?.({
            data: { id: msg.id, ...(msg.type === 'open' ? { ok: true, bytes: new Uint8Array() } : { ok: true }) },
          });
        if (msg.type === 'open') pending.push(respond);
        else queueMicrotask(respond);
      };
      return worker;
    });

    renderOnboarding();
    await chooseProduction();

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('setup-wizard')).not.toBeInTheDocument();

    await waitFor(() => expect(pending.length).toBeGreaterThan(0));
    pending.forEach((respond) => respond());

    expect(await screen.findByTestId('setup-wizard', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(wizardProbe.firstRender).toEqual({
      academic_years: true,
      school_periods: true,
      classes: true,
      class_streams: true,
      subjects: true,
      fee_templates: true,
    });
    expect(UnifiedDatabaseManager.getInstance().isReady()).toBe(true);
    expect(shouldShowOnboarding()).toBe(false);
  });

  it('shows the storage error screen, not the wizard, when initialisation fails', async () => {
    vi.spyOn(SQLiteWASMProvider.prototype as any, 'createStorageWorker').mockImplementation(missingOpfsWorker);

    renderOnboarding();
    await chooseProduction();

    expect(await screen.findByRole('alertdialog', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText(/cannot store data offline/i)).toBeInTheDocument();
    expect(screen.getByText(/Missing required OPFS APIs/)).toBeInTheDocument();
    expect(screen.queryByTestId('setup-wizard')).not.toBeInTheDocument();
    expect(wizardProbe.firstRender).toBeNull();
    // A failed initialisation must not mark onboarding complete, or the wizard would never return.
    expect(shouldShowOnboarding()).toBe(true);
  });

  it('opens the wizard straight away when the storage worker answers immediately', async () => {
    vi.spyOn(SQLiteWASMProvider.prototype as any, 'createStorageWorker').mockImplementation(okWorker);

    renderOnboarding();
    await chooseProduction();

    expect(await screen.findByTestId('setup-wizard', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(wizardProbe.firstRender?.classes).toBe(true);
  });
});

describe('FirstRunOnboarding demo path', () => {
  const originalStorage = (navigator as any).storage;

  beforeEach(() => {
    localStorage.clear();
    wizardProbe.firstRender = null;
    vi.stubEnv('VITE_DB_PROVIDER', 'sqlite-wasm');
    vi.stubEnv('VITE_DB_ALLOW_MEMORY', '');
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        getDirectory: vi.fn(),
        persist: vi.fn().mockResolvedValue(true),
        persisted: vi.fn().mockResolvedValue(true),
      },
    });
    (UnifiedDatabaseManager as any).instance = undefined;
    UnifiedDatabaseManager.getInstance().getProviderFactory().registerProvider(new SQLiteWASMProvider());
    vi.spyOn(CapabilityDetector.getInstance(), 'detectCapabilities').mockResolvedValue({
      runtime: { type: 'browser' },
      storage: { hasOPFS: true, hasWASM: true },
    } as any);
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: vi.fn() },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    Object.defineProperty(navigator, 'storage', { configurable: true, value: originalStorage });
  });

  async function chooseDemo() {
    fireEvent.click(await screen.findByRole('button', { name: /get started/i }));
    fireEvent.click(screen.getByRole('button', { name: /explore with demo data/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.click(screen.getByRole('button', { name: /load demo data/i }));
  }

  it('opens the database before the legacy modules are seeded, and the seed runs on a live provider', async () => {
    vi.spyOn(SQLiteWASMProvider.prototype as any, 'createStorageWorker').mockImplementation(okWorker);

    const realInitialize = (UnifiedDatabaseManager.prototype as any).initialize;
    const order: string[] = [];
    vi.spyOn(UnifiedDatabaseManager.prototype as any, 'initialize').mockImplementation(
      async function (this: any) {
        await realInitialize.call(this);
        order.push('initialize');
      }
    );

    let providerAtSeed: unknown = null;
    let readyAtSeed: boolean | null = null;
    let seedConfig: Record<string, unknown> | null = null;
    vi.spyOn(UnifiedDatabaseManager.prototype as any, 'seedDatabase').mockImplementation(
      async function (this: any, config: any) {
        order.push('seedDatabase');
        providerAtSeed = this.getProvider();
        readyAtSeed = this.isReady();
        seedConfig = config;
        return { success: true, message: 'seeded (test)' };
      }
    );

    renderOnboarding();
    await chooseDemo();

    await waitFor(() => expect(order).toEqual(['initialize', 'seedDatabase']), { timeout: 5000 });
    // The defect this pins: the seed used to run against a closed database, so every legacy
    // collection stayed empty and the library, inventory, nutrition and payroll pages showed nothing.
    expect(providerAtSeed).not.toBeNull();
    expect(readyAtSeed).toBe(true);
    expect(seedConfig).toMatchObject({ volume: 'medium', dataMode: 'demo' });
    expect(shouldShowOnboarding()).toBe(false);
  });

  it('shows the storage error screen when the database cannot be opened, and seeds nothing', async () => {
    vi.spyOn(SQLiteWASMProvider.prototype as any, 'createStorageWorker').mockImplementation(missingOpfsWorker);
    const seedSpy = vi
      .spyOn(UnifiedDatabaseManager.prototype as any, 'seedDatabase')
      .mockResolvedValue({ success: true, message: 'seeded (test)' });

    renderOnboarding();
    await chooseDemo();

    expect(await screen.findByRole('alertdialog', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(seedSpy).not.toHaveBeenCalled();
    expect(shouldShowOnboarding()).toBe(true);
  });
});
