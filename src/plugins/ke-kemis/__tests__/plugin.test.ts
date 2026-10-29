// ABOUTME: Tests the KEMIS plug-in as a plug-in: the manifest the SDK accepts, a compatible SDK range,
// ABOUTME: the settings it reads, and that it imports nothing beyond the SDK and its own files.

import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { SDK_VERSION, isCompatible, validateManifest } from '@/plugins/sdk';

import manifestJson from '../plugin.json';
import kemis, { exportRegister, kemisOptions } from '../index';
import { KemisExportError } from '../register';
import { LEARNERS } from './fixtures';

const PLUGIN_DIR = path.join(process.cwd(), 'src', 'plugins', 'ke-kemis');

describe('the KEMIS plug-in manifest', () => {
  it('passes the SDK schema as the plug-in parses it', () => {
    const validation = validateManifest(manifestJson);

    expect(validation.success).toBe(true);
    if (!validation.success) return;
    expect(validation.manifest).toEqual(kemis.manifest);
  });

  it('declares the identity, type and permissions the register needs', () => {
    expect(kemis.manifest.id).toBe('ke.education.kemis-register');
    expect(kemis.manifest.type).toBe('integration');
    expect(kemis.manifest.permissions).toEqual(['data:read', 'settings:access']);
    expect(kemis.manifest.hooks).toEqual([]);
    expect(kemis.manifest.slots).toEqual([]);
  });

  it('is compatible with the running SDK', () => {
    expect(isCompatible(kemis.manifest, SDK_VERSION)).toBe(true);
  });

  it('declares the settings it reads', () => {
    expect(kemis.manifest.settings.map((setting) => setting.key)).toEqual([
      'institutionCode',
      'guardianContacts',
      'byteOrderMark',
    ]);
    const institutionCode = kemis.manifest.settings[0];
    expect(institutionCode?.required).toBe(true);
    expect(institutionCode?.type).toBe('string');
  });
});

describe('the KEMIS plug-in settings', () => {
  it('takes the institution code and defaults the output options on', () => {
    expect(kemisOptions({ institutionCode: 'KE-021-0042' })).toEqual({
      institutionCode: 'KE-021-0042',
      includeGuardianContacts: true,
      byteOrderMark: true,
    });
  });

  it('honours the output options a school turns off', () => {
    expect(
      kemisOptions({
        institutionCode: 'KE-021-0042',
        guardianContacts: false,
        byteOrderMark: false,
      })
    ).toMatchObject({ includeGuardianContacts: false, byteOrderMark: false });
  });

  it('refuses to export without an institution code, naming the setting', () => {
    let issues: readonly { path: string }[] = [];
    try {
      kemisOptions({ institutionCode: '   ' });
    } catch (error) {
      if (!(error instanceof KemisExportError)) throw error;
      issues = error.issues;
    }

    expect(issues.map((issue) => issue.path)).toEqual(['settings.institutionCode']);
  });
});

describe('the KEMIS plug-in export', () => {
  it('writes the register from the school settings and the moment it was asked for', () => {
    const register = exportRegister(
      { settings: { institutionCode: 'KE-021-0042' } },
      LEARNERS,
      new Date('2026-10-28T09:15:00.000Z')
    );

    expect(register.fileName).toBe('kemis-learner-register_KE-021-0042_2026-10-28.csv');
    expect(register.rows).toHaveLength(3);
    expect(register.rows.every((row) => row.institution_code === 'KE-021-0042')).toBe(true);
  });
});

describe('the KEMIS plug-in source', () => {
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
