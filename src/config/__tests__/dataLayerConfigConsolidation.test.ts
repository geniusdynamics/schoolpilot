// ABOUTME: Unit tests for consolidated data-management compatibility helpers
// ABOUTME: Verifies mode, database, and backend filtering rules used by settings UI

import { describe, expect, it } from 'vitest';
import {
  getBackendOptionsForModeAndProvider,
  getConsolidatedConfigurationOptions,
  getDatabaseOptionsForMode,
  normalizeProvider,
  resolveConsolidatedConfigurationOption,
} from '../dataLayerConfig';

describe('dataLayerConfig consolidation helpers', () => {
  it('maps local SQLite file storage to a distinct normalized provider', () => {
    expect(normalizeProvider('sqlite', 'file')).toBe('sqlite-file');
    expect(normalizeProvider('sqlite-wasm', 'opfs')).toBe('sqlite-wasm');
  });

  it('returns demo and production compatibility options separately', () => {
    const demoOptions = getConsolidatedConfigurationOptions('demo');
    const productionOptions = getConsolidatedConfigurationOptions('production');

    expect(demoOptions.every((option) => option.applicationMode === 'demo')).toBe(true);
    expect(productionOptions.every((option) => option.applicationMode === 'production')).toBe(true);
    // Demo mode surfaces the development (local) option alongside the browser demo
    // option; both are SQLite WASM/OPFS-based now (development no longer uses a
    // native sqlite-file provider).
    expect(demoOptions.some((option) => option.sourceMode === 'development')).toBe(true);
    expect(demoOptions.every((option) => option.normalizedProvider === 'sqlite-wasm')).toBe(true);
    expect(productionOptions.some((option) => option.normalizedProvider === 'livestore')).toBe(true);
  });

  it('filters database choices by application mode', () => {
    const demoDatabases = getDatabaseOptionsForMode('demo').map((option) => option.value);
    const productionDatabases = getDatabaseOptionsForMode('production').map((option) => option.value);

    // Demo mode is browser-only: SQLite WASM (no native sqlite-file, no LiveStore)
    expect(demoDatabases).toContain('sqlite-wasm');
    expect(demoDatabases).not.toContain('sqlite-file');
    expect(demoDatabases).not.toContain('livestore');
    expect(productionDatabases).toContain('livestore');
    expect(productionDatabases).toContain('sqlite-wasm');
    expect(productionDatabases).not.toContain('sqlite-file');
  });

  it('filters backend options by selected database', () => {
    const sqliteProductionBackends = getBackendOptionsForModeAndProvider('production', 'sqlite-wasm');
    const liveStoreBackends = getBackendOptionsForModeAndProvider('production', 'livestore');

    expect(sqliteProductionBackends.length).toBeGreaterThan(1);
    expect(sqliteProductionBackends.some((option) => option.backendIntegration === 'api')).toBe(true);
    expect(sqliteProductionBackends.some((option) => option.backendIntegration === 'erpnext')).toBe(true);
    expect(liveStoreBackends).toHaveLength(1);
    expect(liveStoreBackends[0].backendIntegration).toBe('none');
  });

  it('resolves the requested backend combination when present', () => {
    const resolved = resolveConsolidatedConfigurationOption('production', 'sqlite-wasm', 'erpnext');

    expect(resolved?.backendIntegration).toBe('erpnext');
    expect(resolved?.backendType).toBe('frappe-education');
  });
});
