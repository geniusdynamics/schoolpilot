// ABOUTME: Tests that the unified configuration manager is the single source of truth for dataMode.
// ABOUTME: Covers init() hydration from storage, the single localStorage key, and legacy key migration.

import { describe, it, expect, beforeEach, vi } from 'vitest';

const CONFIG_KEY = 'unified_app_config';
const LEGACY_KEY = 'app_data_mode';

type ConfigModule = typeof import('../configManager');
type UnifiedModule = typeof import('../unifiedConfig');

// Each test loads fresh module instances so the singleton is constructed against the
// localStorage state prepared by that test (as happens on a real page reload).
const loadFresh = async (): Promise<{ cm: ConfigModule; uc: UnifiedModule }> => {
  vi.resetModules();
  const cm = await import('../configManager');
  const uc = await import('../unifiedConfig');
  return { cm, uc };
};

const keysHoldingDataMode = (): string[] => {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    const raw = localStorage.getItem(key) ?? '';
    if (raw === 'demo' || raw === 'production' || raw === 'development') {
      keys.push(key);
      continue;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && 'dataMode' in parsed) keys.push(key);
    } catch {
      // not JSON, not a dataMode holder
    }
  }
  return keys;
};

describe('Single configuration source (WS1.2)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('init() hydrates the manager from the stored unified config', async () => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ dataMode: 'production', demo: { available: true, active: false, canToggle: true } }));
    const { cm, uc } = await loadFresh();

    await cm.initUnifiedConfig();

    expect(cm.unifiedConfigManager.getConfig().dataMode).toBe('production');
    expect(uc.getAppMode()).toBe('production');
  });

  it('getAppMode() equals the persisted onboarding choice after a reload, even with a stale legacy key', async () => {
    // Session 1: onboarding chooses production through the manager.
    let { cm, uc } = await loadFresh();
    await cm.initUnifiedConfig();
    localStorage.setItem(LEGACY_KEY, 'demo');
    cm.unifiedConfigManager.updateConfig({ dataMode: 'production' });

    // Session 2: reload.
    ({ cm, uc } = await loadFresh());
    await cm.initUnifiedConfig();

    expect(uc.getAppMode()).toBe('production');
  });

  it('getStoredDataMode() is derived from the unified config key', async () => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ dataMode: 'production' }));
    localStorage.setItem(LEGACY_KEY, 'demo');
    const { getStoredDataMode } = await import('../dataModePolicies');

    expect(getStoredDataMode()).toBe('production');
  });

  it('switchDataMode() persists dataMode in exactly one localStorage key', async () => {
    const { cm } = await loadFresh();
    await cm.initUnifiedConfig();

    const result = await cm.unifiedConfigManager.switchDataMode('production', { skipConfirmation: true });

    expect(result.success).toBe(true);
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
    expect(JSON.parse(localStorage.getItem(CONFIG_KEY) ?? '{}').dataMode).toBe('production');
    expect(keysHoldingDataMode()).toEqual([CONFIG_KEY]);
  });

  it('init() migrates a legacy app_data_mode value into the unified config and removes the legacy key', async () => {
    localStorage.setItem(LEGACY_KEY, 'production');
    const { cm, uc } = await loadFresh();

    await cm.initUnifiedConfig();

    expect(uc.getAppMode()).toBe('production');
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
    expect(JSON.parse(localStorage.getItem(CONFIG_KEY) ?? '{}').dataMode).toBe('production');
    expect(keysHoldingDataMode()).toEqual([CONFIG_KEY]);
  });

  it('init() keeps the stored unified dataMode over a conflicting legacy key and removes the legacy key', async () => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ dataMode: 'production' }));
    localStorage.setItem(LEGACY_KEY, 'demo');
    const { cm, uc } = await loadFresh();

    await cm.initUnifiedConfig();

    expect(uc.getAppMode()).toBe('production');
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
  });

  it('init() notifies subscribers with the hydrated config', async () => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ dataMode: 'production' }));
    const { cm } = await loadFresh();
    const listener = vi.fn();
    cm.unifiedConfigManager.subscribe(listener);

    await cm.initUnifiedConfig();

    expect(listener).toHaveBeenCalled();
    expect(listener.mock.calls.at(-1)?.[0].dataMode).toBe('production');
  });
});
