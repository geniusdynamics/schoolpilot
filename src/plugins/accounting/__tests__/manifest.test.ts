// ABOUTME: Tests that the accounting plug-in's manifest validates against the plug-in SDK and declares the
// ABOUTME: settings an export needs: the target, the mapping file and the date range.

import { describe, expect, it } from 'vitest';

import { SDK_VERSION, isCompatible, validateManifest } from '@/plugins/sdk';

import manifest from '../plugin.json';

describe('the accounting plug-in manifest', () => {
  it('validates against the SDK manifest schema', () => {
    const result = validateManifest(manifest);

    expect(result.success).toBe(true);
    if (!result.success) throw new Error(JSON.stringify(result.issues));
    expect(result.manifest.id).toBe('builtin-accounting-connectors');
    expect(result.manifest.type).toBe('integration');
  });

  it('is compatible with the running SDK', () => {
    expect(isCompatible(manifest, SDK_VERSION)).toBe(true);
  });

  it('declares the target, the mapping file and the date range', () => {
    const result = validateManifest(manifest);
    if (!result.success) throw new Error(JSON.stringify(result.issues));

    const keys = result.manifest.settings.map((setting) => setting.key);
    expect(keys).toEqual(['target', 'mappingFile', 'periodStart', 'periodEnd']);

    const target = result.manifest.settings.find((setting) => setting.key === 'target');
    expect(target?.type).toBe('select');
    expect((target?.options ?? []).map((option) => option.value)).toEqual([
      'quickbooks',
      'xero',
      'xero-api',
      'odoo',
      'erpnext',
    ]);

    const mappingFile = result.manifest.settings.find((setting) => setting.key === 'mappingFile');
    expect(mappingFile?.type).toBe('file');
  });

  it('asks for no more than it uses: school data to read, its own settings to keep', () => {
    const result = validateManifest(manifest);
    if (!result.success) throw new Error(JSON.stringify(result.issues));

    expect([...result.manifest.permissions].sort()).toEqual(['data:read', 'settings:access']);
  });
});
