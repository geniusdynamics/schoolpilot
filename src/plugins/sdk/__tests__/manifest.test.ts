// ABOUTME: Manifest-schema tests for the plug-in SDK: one accepted manifest, and one refused for each
// ABOUTME: failure kind (missing field, unknown permission/hook/slot, bad version range, unknown field).

import { describe, expect, it } from 'vitest';

import { validateManifest } from '../index';
import { makeManifest, manifestWithout } from './fixtures';

/** Collects the issue messages of a manifest the schema must refuse. */
function refusalMessages(input: unknown): string[] {
  const result = validateManifest(input);
  if (result.success) throw new Error('expected the manifest to be refused');
  return result.issues.map((issue) => `${issue.path}: ${issue.message}`);
}

function expectRefusal(input: unknown, ...needles: string[]): void {
  const messages = refusalMessages(input);
  const joined = messages.join('\n');
  for (const needle of needles) {
    expect(joined).toContain(needle);
  }
}

describe('validateManifest', () => {
  it('accepts a third-party manifest and returns it with the declared values', () => {
    const result = validateManifest(makeManifest());

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.manifest.id).toBe('com.example.attendance-digest');
    expect(result.manifest.sdkVersion).toBe('^1.0.0');
    expect(result.manifest.permissions).toEqual(['data:read', 'network:access']);
    expect(result.manifest.slots).toEqual(['dashboard-widget', 'report-block']);
    expect(result.manifest.hooks).toEqual(['report.published']);
    expect(result.manifest.settings).toHaveLength(2);
  });

  it('defaults the optional contribution lists to empty arrays', () => {
    const minimal = manifestWithout('permissions');
    delete minimal.slots;
    delete minimal.hooks;
    delete minimal.routes;
    delete minimal.settings;

    const result = validateManifest(minimal);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.manifest.permissions).toEqual([]);
    expect(result.manifest.slots).toEqual([]);
    expect(result.manifest.hooks).toEqual([]);
    expect(result.manifest.routes).toEqual([]);
    expect(result.manifest.settings).toEqual([]);
  });

  it('refuses a manifest missing a required field, naming the field', () => {
    expectRefusal(manifestWithout('name'), 'name');
    expectRefusal(manifestWithout('sdkVersion'), 'sdkVersion');
    expectRefusal(manifestWithout('version'), 'version');
  });

  it('refuses a permission the SDK does not define', () => {
    expectRefusal(
      makeManifest({ permissions: ['data:read', 'learners:teleport'] }),
      'learners:teleport'
    );
  });

  it('refuses a hook the SDK does not define', () => {
    expectRefusal(
      makeManifest({ hooks: ['learner.expelled'] }),
      'learner.expelled'
    );
  });

  it('refuses a slot the host does not render', () => {
    expectRefusal(
      makeManifest({ slots: ['dashboard-widget', 'timetable-overlay'] }),
      'timetable-overlay'
    );
  });

  it('refuses an SDK version range that is not a semver range', () => {
    expectRefusal(makeManifest({ sdkVersion: 'one-dot-oh' }), 'semver range');
    expectRefusal(makeManifest({ sdkVersion: '1.0.0.0' }), 'semver range');
  });

  it('refuses a plug-in version that is not a semantic version', () => {
    expectRefusal(makeManifest({ version: '1.2' }), 'semantic version');
    expectRefusal(makeManifest({ version: 'v1.2.0-beta' }), 'semantic version');
  });

  it('refuses an unknown top-level field so a typo fails loudly', () => {
    expectRefusal(makeManifest({ permisions: ['data:read'] }), 'permisions');
  });

  it('refuses an unknown field inside a nested contribution', () => {
    expectRefusal(
      makeManifest({
        settings: [{ key: 'recipient', label: 'Recipient', type: 'string', rquired: true }],
      }),
      'rquired'
    );
    expectRefusal(
      makeManifest({
        routes: [{ path: '/plugins/x', component: 'X', title: 'X', lazy: true }],
      }),
      'lazy'
    );
  });

  it('refuses a plug-in id that is not a lowercase dotted or dashed identifier', () => {
    expectRefusal(makeManifest({ id: 'Com.Example.Plugin' }), 'id');
    expectRefusal(makeManifest({ id: 'com example' }), 'id');
  });

  it('refuses something that is not an object at all', () => {
    expectRefusal(null, 'object');
    expectRefusal('{"id":"com.example.x"}', 'object');
  });
});
