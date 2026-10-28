// ABOUTME: The acceptance test for the SDK: the example third-party plug-in loads through the manifest
// ABOUTME: validator, contributes its slot, receives its hook, and imports nothing but the SDK.

import fs from 'node:fs';
import path from 'node:path';

import { beforeEach, describe, expect, it } from 'vitest';

import {
  SDK_VERSION,
  isCompatible,
  pluginSlots,
  validateManifest,
} from '../index';
import type { PluginAPI, PluginContext } from '../index';
import example from '../../examples/birthday-notices/index';
import exampleManifestJson from '../../examples/birthday-notices/plugin.json';
import { buildWidgetModel } from '../../examples/birthday-notices/index';

const EXAMPLE_DIR = path.join(process.cwd(), 'src', 'plugins', 'examples', 'birthday-notices');

interface FakeHost {
  readonly context: PluginContext;
  readonly notifications: string[];
  readonly handlers: Map<string, (event: unknown) => void>;
}

/** A minimal host context: records the hooks the plug-in registers and the notifications it raises. */
function makeHost(settings: Record<string, unknown> = {}): FakeHost {
  const notifications: string[] = [];
  const handlers = new Map<string, (event: unknown) => void>();

  const api: PluginAPI = {
    getData: async () => [],
    setData: async () => undefined,
    registerRoute: () => undefined,
    registerMenuItem: () => undefined,
    registerWidget: () => undefined,
    showNotification: (message) => {
      notifications.push(message);
    },
    addHook: (name, handler) => {
      handlers.set(name, handler as (event: unknown) => void);
    },
    removeHook: (name) => {
      handlers.delete(name);
    },
    doHook: () => [],
    getSetting: (key) => settings[key],
    setSetting: async () => undefined,
    translate: (key) => key,
    formatDate: (date) => new Date(date).toISOString(),
    formatNumber: (number) => String(number),
  };

  return {
    context: {
      pluginId: example.manifest.id,
      manifest: example.manifest,
      settings,
      api,
    },
    notifications,
    handlers,
  };
}

const ADMISSION = {
  learnerId: 'learner-amina',
  institutionId: 'institution-1',
  admittedAt: '2026-05-20T08:00:00.000Z',
  learnerName: 'Amina Otieno',
  dateOfBirth: '2012-05-25',
};

describe('the example birthday-notices plug-in', () => {
  beforeEach(() => {
    pluginSlots.clear();
  });

  it('passes the manifest validator and declares its SDK support', () => {
    const validation = validateManifest(exampleManifestJson);

    expect(validation.success).toBe(true);
    if (!validation.success) return;
    expect(validation.manifest.id).toBe('com.example.birthday-notices');
    expect(validation.manifest.slots).toEqual(['dashboard-widget']);
    expect(validation.manifest.hooks).toEqual(['learner.admitted']);
    expect(validation.manifest.permissions).toEqual(['data:read', 'ui:inject']);
  });

  it('is compatible with the running SDK', () => {
    expect(isCompatible(example.manifest, SDK_VERSION)).toBe(true);
  });

  it('exports the manifest the validator accepted, not a second copy', async () => {
    const validation = validateManifest(exampleManifestJson);

    expect(validation.success).toBe(true);
    if (!validation.success) return;
    expect(example.manifest).toEqual(validation.manifest);
  });

  it('contributes its dashboard widget when activated', async () => {
    const host = makeHost();

    await example.module.activate?.(host.context);

    const widgets = pluginSlots.getSlots('dashboard-widget');
    expect(widgets).toHaveLength(1);
    expect(widgets[0].pluginId).toBe('com.example.birthday-notices');
    expect(widgets[0].id).toBe('birthday-notices');
    expect(widgets[0].component).toBe('BirthdayNoticesWidget');
  });

  it('subscribes to the learner-admitted hook and shows the learner in its widget', async () => {
    const host = makeHost();
    await example.module.activate?.(host.context);

    const handler = host.handlers.get('learner.admitted');
    expect(handler).toBeTypeOf('function');
    handler?.(ADMISSION);

    const model = buildWidgetModel(host.context.settings, new Date('2026-05-20T09:00:00.000Z'));
    expect(model).toHaveLength(1);
    expect(model[0].learnerId).toBe('learner-amina');
    expect(model[0].name).toBe('Amina Otieno');
    expect(model[0].daysUntil).toBe(5);
  });

  it('uses its settings for the window and the notice text', async () => {
    const narrow = makeHost({ daysAhead: 3 });
    await example.module.activate?.(narrow.context);
    narrow.handlers.get('learner.admitted')?.(ADMISSION);

    expect(buildWidgetModel(narrow.context.settings, new Date('2026-05-20T09:00:00.000Z'))).toEqual([]);
    await example.module.deactivate?.(narrow.context);

    const wider = makeHost({ daysAhead: 7, noticeTemplate: '{name} ({days} days)' });
    await example.module.activate?.(wider.context);
    wider.handlers.get('learner.admitted')?.(ADMISSION);

    const model = buildWidgetModel(wider.context.settings, new Date('2026-05-20T09:00:00.000Z'));
    expect(model[0].message).toBe('Amina Otieno (5 days)');
  });

  it('gives up its slot and its hook when deactivated', async () => {
    const host = makeHost();
    await example.module.activate?.(host.context);

    await example.module.deactivate?.(host.context);

    expect(pluginSlots.getSlots('dashboard-widget')).toEqual([]);
    expect(host.handlers.has('learner.admitted')).toBe(false);
  });

  it('imports nothing but the SDK and its own files', () => {
    const files = fs
      .readdirSync(EXAMPLE_DIR)
      .filter((name) => name.endsWith('.ts'))
      .map((name) => path.join(EXAMPLE_DIR, name));

    expect(files.length).toBeGreaterThan(0);

    const violations: string[] = [];
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      for (const match of source.matchAll(/from\s+'([^']+)'/g)) {
        const specifier = match[1];
        if (specifier === '@/plugins/sdk') continue;
        if (specifier.startsWith('./') || specifier.startsWith('../')) continue;
        violations.push(`${path.basename(file)} imports ${specifier}`);
      }
    }

    expect(violations).toEqual([]);
  });
});
