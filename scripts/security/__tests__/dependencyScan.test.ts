// ABOUTME: The dependency scan's reading of an audit report, the severity ratchet it enforces and
// ABOUTME: the baseline it compares against, with fixtures so the feed is not needed to test them.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  compareToBaseline,
  enforcedFindings,
  findingsFromAudit,
  readBaseline,
  writeBaseline,
} from '../dependency-scan';

const REPORT = {
  advisories: {
    '1': {
      module_name: 'vite',
      severity: 'high',
      title: 'a dev-server request can read a file',
      github_advisory_id: 'GHSA-aaaa',
    },
    '2': {
      module_name: 'lodash',
      severity: 'moderate',
      title: 'a prototype-pollution gadget',
      github_advisory_id: 'GHSA-bbbb',
    },
    // The same advisory filed under a second id: it collapses into one finding, at the higher
    // severity, because the ratchet compares advisories and not advisory ids.
    '3': {
      module_name: 'vite',
      severity: 'critical',
      title: 'a dev-server request can read a file',
      github_advisory_id: 'GHSA-aaaa',
    },
    '4': {
      module_name: 'no-ghsa',
      severity: 'low',
      title: 'an advisory without a GitHub id',
      npm_advisory_id: 'npm-1',
    },
  },
};

const temporary: string[] = [];

afterEach(() => {
  for (const file of temporary.splice(0)) fs.rmSync(file, { force: true });
});

describe('reading an audit report', () => {
  it('reduces the advisories to stable findings', () => {
    expect(findingsFromAudit(REPORT)).toEqual([
      { key: 'lodash:GHSA-bbbb', module: 'lodash', severity: 'moderate', title: 'a prototype-pollution gadget' },
      { key: 'no-ghsa:npm-1', module: 'no-ghsa', severity: 'low', title: 'an advisory without a GitHub id' },
      { key: 'vite:GHSA-aaaa', module: 'vite', severity: 'critical', title: 'a dev-server request can read a file' },
    ]);
  });

  it('enforces only the high and critical advisories', () => {
    expect(enforcedFindings(findingsFromAudit(REPORT)).map((finding) => finding.key)).toEqual([
      'vite:GHSA-aaaa',
    ]);
  });

  it('refuses a report that is not an audit report', () => {
    expect(() => findingsFromAudit({})).toThrow(/advisories/);
    expect(() => findingsFromAudit({ error: { code: 'ENOAUDIT' } })).toThrow(/feed/);
    expect(() => findingsFromAudit('not json')).toThrow(/not an object/);
  });
});

describe('the severity ratchet', () => {
  const enforced = enforcedFindings(findingsFromAudit(REPORT));

  it('fails on an advisory the baseline does not know', () => {
    expect(compareToBaseline(enforced, []).added.map((finding) => finding.key)).toEqual([
      'vite:GHSA-aaaa',
    ]);
  });

  it('passes when every advisory is already in the baseline', () => {
    const diff = compareToBaseline(enforced, ['vite:GHSA-aaaa']);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
  });

  it('reports an advisory the baseline still lists as fixed', () => {
    const diff = compareToBaseline([], ['vite:GHSA-aaaa', 'lodash:GHSA-bbbb']);
    expect(diff.removed).toEqual(['lodash:GHSA-bbbb', 'vite:GHSA-aaaa']);
  });
});

describe('the baseline file', () => {
  it('writes the enforced advisories sorted and deduplicated, and reads them back', () => {
    const file = path.join(os.tmpdir(), `dependency-baseline-${process.pid}.json`);
    temporary.push(file);

    const written = writeBaseline(file, findingsFromAudit(REPORT), '2026-10-24');
    expect(written.advisories).toEqual(['vite:GHSA-aaaa']);
    expect(written.severityFloor).toEqual(['high', 'critical']);

    const read = readBaseline(file);
    expect(read.advisories).toEqual(['vite:GHSA-aaaa']);
    expect(read.generatedAt).toBe('2026-10-24');
  });

  it('treats a missing baseline as empty', () => {
    const read = readBaseline(path.join(os.tmpdir(), 'dependency-baseline-that-does-not-exist.json'));
    expect(read.advisories).toEqual([]);
  });
});
