// ABOUTME: Tests that DataModeManager survives a failed provider start-up when nobody listens for 'error'.
// ABOUTME: Fail-closed SQLite now rejects here; an unlistened EventEmitter 'error' must not become an unhandled rejection.

import { describe, it, expect, vi } from 'vitest';

vi.mock('../DatabaseProviderFactory', () => ({
  getDatabaseProviderFactory: vi.fn(() => ({
    getActiveProvider: vi.fn(() => null),
    switchProvider: vi.fn().mockRejectedValue(new Error('Persistent storage unavailable')),
  })),
}));

import { DataModeManager } from '@/services/data/dataModeManager';

describe('DataModeManager start-up failure', () => {
  it('does not throw when the provider fails and no error listener is attached', async () => {
    const manager = new DataModeManager();

    await expect((manager as any).initializeMode()).resolves.toBeUndefined();
  });

  it('still reports the failure to an attached error listener', async () => {
    const manager = new DataModeManager();
    const onError = vi.fn();
    manager.on('error', onError);

    await (manager as any).initializeMode();

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Persistent storage unavailable' }));
  });
});
