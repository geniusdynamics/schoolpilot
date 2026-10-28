// ABOUTME: Compatibility tests for the builtin plug-ins: every manifest validates against the SDK schema,
// ABOUTME: declares the SDK range it supports, and the two engines carry their spec 06 §10 names.

import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { SDK_VERSION, isCompatible, validateManifest } from '../index';
import feeCalculator from '../../builtin/fee-calculator/index';
import resultsEngine from '../../builtin/grading-engine/index';
import whiteLabel from '../../builtin/whitelabel/index';

const BUILTIN_DIR = path.join(process.cwd(), 'src', 'plugins', 'builtin');

interface BuiltinManifestFile {
  readonly dir: string;
  readonly file: string;
}

/** Every builtin directory that ships a plugin.json, including the template and the dormant ones. */
function manifestFiles(): BuiltinManifestFile[] {
  return fs
    .readdirSync(BUILTIN_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ dir: entry.name, file: path.join(BUILTIN_DIR, entry.name, 'plugin.json') }))
    .filter((entry) => fs.existsSync(entry.file));
}

function readManifest(file: string): unknown {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

describe('builtin manifests', () => {
  it('finds exactly the twelve manifests to check', () => {
    expect(manifestFiles().length).toBe(12);
  });

  it.each(manifestFiles())('$dir validates against the SDK schema', ({ dir, file }) => {
    const result = validateManifest(readManifest(file));
    if (!result.success) {
      throw new Error(`${dir}: ${JSON.stringify(result.issues)}`);
    }

    expect(result.manifest.sdkVersion).toBeTypeOf('string');
  });

  it.each(manifestFiles())('$dir is compatible with the running SDK', ({ dir, file }) => {
    const manifest = readManifest(file) as { sdkVersion?: string };

    expect(isCompatible(manifest, SDK_VERSION), dir).toBe(true);
  });

  it('validates the manifests the loader actually receives', () => {
    for (const plugin of [whiteLabel, resultsEngine, feeCalculator]) {
      const result = validateManifest(plugin.manifest);
      if (!result.success) {
        throw new Error(`${plugin.manifest.id}: ${JSON.stringify(result.issues)}`);
      }
      expect(result.manifest.id).toBe(plugin.manifest.id);
      expect(isCompatible(plugin.manifest, SDK_VERSION)).toBe(true);
    }
  });

  it('names the two engines as spec 06 §10 does, without changing their ids', () => {
    expect(resultsEngine.manifest.name).toBe('Results Engine');
    expect(resultsEngine.manifest.id).toBe('poc-grading-engine');
    expect(feeCalculator.manifest.name).toBe('Billing Service');
    expect(feeCalculator.manifest.id).toBe('poc-fee-calculator');
    expect(whiteLabel.manifest.name).toBe('White-Label Branding');
    expect(whiteLabel.manifest.id).toBe('builtin-whitelabel');
  });
});
