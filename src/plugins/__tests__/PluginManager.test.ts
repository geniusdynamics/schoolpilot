// ABOUTME: Tests the plugin manager's lifecycle contract: activation receives the plugin context,
// ABOUTME: settings survive a new manager instance, and an active plugin is restored after reload.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PluginManager } from '../PluginManager';
import type { LoadedPlugin } from '../types';

const builtin = (id: string, activate: (context: unknown) => void | Promise<void>): LoadedPlugin =>
  ({
    manifest: {
      id,
      name: id,
      version: '1.0.0',
      type: 'integration',
      entry: './index.ts',
      settings: [
        { key: 'apiKey', label: 'API key', type: 'string', defaultValue: '' },
        { key: 'retry', label: 'Retry', type: 'number', defaultValue: 2 },
      ],
    },
    module: { activate },
    status: 'inactive',
    loadedAt: new Date(),
    source: 'builtin',
  }) as unknown as LoadedPlugin;

beforeEach(() => {
  localStorage.clear();
});

describe('PluginManager', () => {
  it('passes the plugin context to activate and marks the plugin active', async () => {
    const seen: unknown[] = [];
    const manager = new PluginManager();
    manager.registerBuiltinPlugin(
      builtin('plugin.one', async (context) => {
        seen.push(context);
      })
    );

    await manager.activatePlugin('plugin.one');

    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({
      pluginId: 'plugin.one',
      settings: { apiKey: '', retry: 2 },
    });
    expect(manager.getPlugin('plugin.one')?.status).toBe('active');
  });

  it('reads saved settings in a later manager instance', async () => {
    const first = new PluginManager();
    first.registerBuiltinPlugin(builtin('plugin.one', () => undefined));
    await first.setPluginSetting('plugin.one', 'apiKey', 'secret-123');

    const second = new PluginManager();
    second.registerBuiltinPlugin(builtin('plugin.one', () => undefined));

    expect(second.getPluginSettings('plugin.one')).toMatchObject({ apiKey: 'secret-123' });
  });

  it('restores a plugin that was active when the app last closed', async () => {
    const first = new PluginManager();
    first.registerBuiltinPlugin(builtin('plugin.one', () => undefined));
    await first.activatePlugin('plugin.one');

    const activate = vi.fn();
    const second = new PluginManager();
    second.registerBuiltinPlugin(builtin('plugin.one', activate));

    await second.restoreActivePlugins();

    expect(activate).toHaveBeenCalledTimes(1);
    expect(second.getPlugin('plugin.one')?.status).toBe('active');
  });

  it('does not restore a plugin that was switched off', async () => {
    const first = new PluginManager();
    first.registerBuiltinPlugin(builtin('plugin.one', () => undefined));
    await first.activatePlugin('plugin.one');
    await first.deactivatePlugin('plugin.one');

    const activate = vi.fn();
    const second = new PluginManager();
    second.registerBuiltinPlugin(builtin('plugin.one', activate));

    await second.restoreActivePlugins();

    expect(activate).not.toHaveBeenCalled();
    expect(second.getPlugin('plugin.one')?.status).toBe('inactive');
  });
});
