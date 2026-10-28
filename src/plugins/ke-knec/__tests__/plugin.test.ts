// ABOUTME: Tests the KNEC plug-in as a plug-in: the manifest the SDK accepts, a compatible SDK range,
// ABOUTME: the centre settings it reads, and that it imports nothing beyond the SDK and its own files.

import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { SDK_VERSION, isCompatible, validateManifest } from '@/plugins/sdk';

import manifestJson from '../plugin.json';
import knec, { exportRegistration, knecOptions } from '../index';
import { KnecRegistrationError } from '../registration';
import { CANDIDATES, CENTRE } from './fixtures';

const PLUGIN_DIR = path.join(process.cwd(), 'src', 'plugins', 'ke-knec');

describe('the KNEC plug-in manifest', () => {
  it('passes the SDK schema as the plug-in parses it', () => {
    const validation = validateManifest(manifestJson);

    expect(validation.success).toBe(true);
    if (!validation.success) return;
    expect(validation.manifest).toEqual(knec.manifest);
  });

  it('declares the identity, type and permissions the registration needs', () => {
    expect(knec.manifest.id).toBe('ke.education.knec-registration');
    expect(knec.manifest.type).toBe('integration');
    expect(knec.manifest.permissions).toEqual(['data:read', 'settings:access']);
    expect(knec.manifest.hooks).toEqual([]);
    expect(knec.manifest.slots).toEqual([]);
  });

  it('is compatible with the running SDK', () => {
    expect(isCompatible(knec.manifest, SDK_VERSION)).toBe(true);
  });

  it('declares the centre settings it reads', () => {
    expect(knec.manifest.settings.map((setting) => setting.key)).toEqual([
      'countyCode',
      'centreNumber',
      'writeJsonBundle',
    ]);
    expect(knec.manifest.settings.map((setting) => setting.required ?? false)).toEqual([
      true,
      true,
      false,
    ]);
  });
});

describe('the KNEC plug-in settings', () => {
  it('takes the centre from the school settings and writes the bundle by default', () => {
    expect(knecOptions({ ...CENTRE })).toEqual({
      countyCode: '24',
      centreNumber: '950500',
      writeJsonBundle: true,
    });
  });

  it('honours a school that only wants the CSV files', () => {
    expect(knecOptions({ ...CENTRE, writeJsonBundle: false })).toMatchObject({
      writeJsonBundle: false,
    });
  });

  it('refuses a centre it cannot build index numbers from, naming the setting', () => {
    let paths: readonly string[] = [];
    try {
      knecOptions({ countyCode: '24' });
    } catch (error) {
      if (!(error instanceof KnecRegistrationError)) throw error;
      paths = error.issues.map((issue) => issue.path);
    }

    expect(paths).toEqual(['settings.centreNumber']);
  });

  it('refuses both centre settings when neither is configured', () => {
    let paths: readonly string[] = [];
    try {
      knecOptions({});
    } catch (error) {
      if (!(error instanceof KnecRegistrationError)) throw error;
      paths = error.issues.map((issue) => issue.path);
    }

    expect(paths).toEqual(['settings.countyCode', 'settings.centreNumber']);
  });
});

describe('the KNEC plug-in export', () => {
  it('writes the registration from the school settings and the moment it was asked for', () => {
    const registration = exportRegistration(
      { settings: { ...CENTRE } },
      CANDIDATES,
      new Date('2026-10-28T09:15:00.000Z')
    );

    expect(registration.fileNames.candidates).toBe('knec-kcse-candidates_24950500_2026-10-28.csv');
    expect(registration.candidates).toHaveLength(4);
    expect(registration.fileNames.json).not.toBeNull();
  });
});

describe('the KNEC plug-in source', () => {
  it('imports nothing but the SDK and its own files', () => {
    const files = fs
      .readdirSync(PLUGIN_DIR)
      .filter((name) => name.endsWith('.ts'))
      .map((name) => path.join(PLUGIN_DIR, name));

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
