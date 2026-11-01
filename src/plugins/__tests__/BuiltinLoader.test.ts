// ABOUTME: The builtin loader exposes the SMS gateway's send API beside its lifecycle module, so the
// ABOUTME: fee-reminder screen can use the configured gateway rather than re-implementing a provider.

import { describe, expect, it } from 'vitest';

import { loadAllBuiltinPlugins } from '../BuiltinLoader';

describe('builtin plugin loader', () => {
  it('loads the SMS gateway with its send API', async () => {
    const plugins = await loadAllBuiltinPlugins();
    const sms = plugins.find((plugin) => plugin.manifest.id === 'com.schoolpilot.sms-gateway');

    expect(sms).toBeDefined();
    expect(typeof sms?.api?.send).toBe('function');
    expect(typeof sms?.api?.bulkSend).toBe('function');
  });
});
