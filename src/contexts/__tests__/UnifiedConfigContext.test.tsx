// ABOUTME: Tests that UnifiedConfigContext delegates configuration reads and writes to the unified manager.
// ABOUTME: Ensures context updates persist through the manager's single localStorage key.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { useContext } from 'react';
import { render, screen, act } from '@testing-library/react';

const modeEvents = new EventEmitter();

vi.mock('../../services/data/dataModeManager', () => ({
  getDataModeManager: () => ({
    on: (event: string, handler: (...args: unknown[]) => void) => modeEvents.on(event, handler),
    off: (event: string, handler: (...args: unknown[]) => void) => modeEvents.off(event, handler),
    getDataModeStatus: () => ({ mode: 'demo', isDemo: true, canSwitchToDemo: true, canSwitchToProduction: true }),
    validateServices: async () => ({ rxdbAvailable: false, mockDataAvailable: false, allServicesReady: false }),
  }),
}));

vi.mock('../../services/backend/backendDetection', () => ({
  backendDetectionService: {
    subscribe: () => () => undefined,
    detectBackend: async () => ({ environment: 'unknown', version: 'unknown', demoModeEnabled: false, available: false }),
  },
}));

import { UnifiedConfigProvider, UnifiedConfigContext } from '../UnifiedConfigContext';
import { unifiedConfigManager } from '../../config/configManager';

const CONFIG_KEY = 'unified_app_config';
const LEGACY_KEY = 'app_data_mode';

let latest: React.ContextType<typeof UnifiedConfigContext>;

const Probe = () => {
  const ctx = useContext(UnifiedConfigContext);
  latest = ctx;
  return <span data-testid="mode">{ctx?.config.dataMode}</span>;
};

describe('UnifiedConfigContext delegates to the unified manager', () => {
  beforeEach(() => {
    localStorage.clear();
    unifiedConfigManager.updateConfig({ dataMode: 'demo' });
    localStorage.clear();
  });

  it('starts from the manager configuration', () => {
    unifiedConfigManager.updateConfig({ dataMode: 'production' });
    render(<UnifiedConfigProvider><Probe /></UnifiedConfigProvider>);

    expect(screen.getByTestId('mode').textContent).toBe('production');
  });

  it('updateConfig persists through the manager in a single localStorage key', () => {
    render(<UnifiedConfigProvider><Probe /></UnifiedConfigProvider>);

    act(() => {
      latest?.updateConfig({ dataMode: 'production' });
    });

    expect(unifiedConfigManager.getConfig().dataMode).toBe('production');
    expect(JSON.parse(localStorage.getItem(CONFIG_KEY) ?? '{}').dataMode).toBe('production');
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
    expect(screen.getByTestId('mode').textContent).toBe('production');
  });

  it('records data layer mode changes in the manager so the unified config stays authoritative', () => {
    render(<UnifiedConfigProvider><Probe /></UnifiedConfigProvider>);

    act(() => {
      modeEvents.emit('modeChanged', { mode: 'production' });
    });

    expect(unifiedConfigManager.getConfig().dataMode).toBe('production');
    expect(JSON.parse(localStorage.getItem(CONFIG_KEY) ?? '{}').dataMode).toBe('production');
    expect(screen.getByTestId('mode').textContent).toBe('production');
  });

  it('removes the legacy dataMode key written by the data layer switch so only the unified config holds dataMode', () => {
    render(<UnifiedConfigProvider><Probe /></UnifiedConfigProvider>);

    act(() => {
      // dataModeManager.switchMode writes the legacy key right before emitting modeChanged
      localStorage.setItem(LEGACY_KEY, 'production');
      modeEvents.emit('modeChanged', { mode: 'production' });
    });

    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
    expect(JSON.parse(localStorage.getItem(CONFIG_KEY) ?? '{}').dataMode).toBe('production');
    const storedKeys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i) ?? '');
    expect(storedKeys).toContain(CONFIG_KEY);
    const keysHoldingDataMode = storedKeys.filter((key) => {
      const value = localStorage.getItem(key) ?? '';
      return value === 'production' || value.includes('"dataMode"');
    });
    expect(keysHoldingDataMode).toEqual([CONFIG_KEY]);
  });

  it('removes the legacy dataMode key even when the manager already holds the switched mode', () => {
    render(<UnifiedConfigProvider><Probe /></UnifiedConfigProvider>);

    act(() => {
      // The settings switch calls updateConfig({ dataMode }) before dataModeManager.switchMode
      latest?.updateConfig({ dataMode: 'production' });
      localStorage.setItem(LEGACY_KEY, 'production');
      modeEvents.emit('modeChanged', { mode: 'production' });
    });

    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
    expect(JSON.parse(localStorage.getItem(CONFIG_KEY) ?? '{}').dataMode).toBe('production');
  });

  it('ignores data layer modes that are not configuration data modes', () => {
    render(<UnifiedConfigProvider><Probe /></UnifiedConfigProvider>);

    act(() => {
      modeEvents.emit('modeChanged', { mode: 'development' });
    });

    expect(unifiedConfigManager.getConfig().dataMode).toBe('demo');
  });

  it('does not let the data layer start-up default override the persisted choice', () => {
    render(<UnifiedConfigProvider><Probe /></UnifiedConfigProvider>);

    act(() => {
      modeEvents.emit('modeInitialized', 'production');
    });

    expect(unifiedConfigManager.getConfig().dataMode).toBe('demo');
  });
});
