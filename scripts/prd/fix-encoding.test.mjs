// ABOUTME: Tests for scripts/prd/fix-encoding.mjs, the mojibake repair and UTF-8 encoding check.
// ABOUTME: Mojibake samples are built at runtime with escapes so this file itself stays clean UTF-8.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixText, hasMojibake, reverseFixes } from './fix-encoding.mjs';

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fix-encoding.mjs');
const ROOT = path.resolve(path.dirname(SCRIPT), '..', '..');

// Simulates the faulty re-save: UTF-8 bytes read as Windows-1252, then written back as UTF-8.
// Bytes 0x80..0x9F use their Windows-1252 letters (undefined ones stay C1 controls); the rest are Latin-1.
const CP1252 = '\u20AC\u0081\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u008D\u017D\u008F'
  + '\u0090\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u009D\u017E\u0178';
const breakText = (s, times = 1) => {
  let out = s;
  for (let i = 0; i < times; i++) {
    out = Array.from(new TextEncoder().encode(out), (b) => (b >= 0x80 && b <= 0x9f ? CP1252[b - 0x80] : String.fromCharCode(b))).join('');
  }
  return out;
};

const US_FLAG = '\u{1F1FA}\u{1F1F8}';
const EM_DASH = '\u2014';

describe('fixText', () => {
  it('repairs a double-encoded flag emoji', () => {
    const broken = `{ code: 'en', flag: '${breakText(US_FLAG)}' }`;
    expect(hasMojibake(broken)).toBe(true);
    expect(fixText(broken).text).toBe(`{ code: 'en', flag: '${US_FLAG}' }`);
  });

  it('repairs a double-encoded em dash, check mark and accented letter', () => {
    const clean = `Setup ${EM_DASH} step 2 \u2705 caf\u00E9`;
    const result = fixText(breakText(clean));
    expect(result.text).toBe(clean);
    expect(hasMojibake(result.text)).toBe(false);
  });

  it('repairs text that was mis-encoded more than once', () => {
    const clean = `log: \u{1F50D} search ${EM_DASH} done`;
    expect(fixText(breakText(clean, 3)).text).toBe(clean);
  });

  it('leaves clean UTF-8 and ASCII untouched', () => {
    const clean = `\uFEFFconst a = 'caf\u00E9 \u00C0 la carte \u00A9 2024 ${EM_DASH} ${US_FLAG}';\r\n`;
    const result = fixText(clean);
    expect(result.text).toBe(clean);
    expect(result.fixes).toHaveLength(0);
  });

  it('does not mistake other corruptions for Windows-1252 mojibake', () => {
    // UTF-8 read as CP850 (a two-letter Chinese word and a books emoji); a pair inside each happens to decode as UTF-8.
    const cp850 = 'za ba\u00D5\u00AB\u00F3\u00B5\u00EA\u00C0 \u251C\u2591\u253C\u00A9\u00D4\u00C7\u00A3\u253C\u00ED';
    expect(fixText(cp850).fixes).toHaveLength(0);
    expect(hasMojibake(cp850)).toBe(false);
  });

  it('records fixes that round-trip exactly back to the original text', () => {
    const original = `a ${breakText(EM_DASH)} b ${breakText(US_FLAG, 2)} c\n`;
    const result = fixText(original);
    expect(reverseFixes(result)).toBe(original);
  });
});

describe('CLI', () => {
  let dir;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fix-encoding-'));
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, encoding: 'utf8' });

  it('--check fails on a directory containing mojibake and --write repairs it', () => {
    const file = path.join(dir, 'broken.ts');
    fs.writeFileSync(file, `export const dash = '${breakText(EM_DASH)}';\n`);
    expect(run('--check', dir).status).toBe(1);
    const write = run('--write', dir);
    expect(write.status).toBe(0);
    expect(write.stdout).toMatch(/round-trip OK/);
    expect(fs.readFileSync(file, 'utf8')).toBe(`export const dash = '${EM_DASH}';\n`);
    expect(run('--check', dir).status).toBe(0);
  });

  it('--write keeps a leading UTF-8 BOM and changes only the repaired bytes', () => {
    const sub = fs.mkdtempSync(path.join(dir, 'bom-'));
    const file = path.join(sub, 'bom.ts');
    const BOM = Buffer.from([0xef, 0xbb, 0xbf]);
    fs.writeFileSync(file, Buffer.concat([BOM, Buffer.from(`export const dash = '${breakText(EM_DASH)}';\r\n`, 'utf8')]));
    const write = run('--write', sub);
    expect(write.status).toBe(0);
    const bytes = fs.readFileSync(file);
    expect([...bytes.subarray(0, 3)]).toEqual([...BOM]);
    expect(bytes.subarray(3).toString('utf8')).toBe(`export const dash = '${EM_DASH}';\r\n`);
    expect(run('--check', sub).status).toBe(0);
  });

  it('fixText keeps a leading BOM and reverseFixes restores the exact original', () => {
    const original = `﻿x ${breakText(EM_DASH)} y`;
    const result = fixText(original);
    expect(result.text).toBe(`﻿x ${EM_DASH} y`);
    expect(reverseFixes(result)).toBe(original);
  });

  it('--check fails on a file that is not valid UTF-8', () => {
    const sub = fs.mkdtempSync(path.join(dir, 'latin1-'));
    fs.writeFileSync(path.join(sub, 'latin1.ts'), Buffer.from([0x63, 0x61, 0x66, 0xe9, 0x0a]));
    const r = run('--check', sub);
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/not valid UTF-8/);
  });

  it('--check passes on src/', () => {
    const r = run('--check');
    expect(r.stdout + r.stderr).toMatch(/0 file\(s\) with encoding problems/);
    expect(r.status).toBe(0);
  });
});
