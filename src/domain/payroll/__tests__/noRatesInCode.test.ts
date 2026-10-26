// ABOUTME: Guards the rule that no statutory figure lives in the payroll code: the source files hold no
// ABOUTME: numeric literal beyond the structural zero, one and ten, and name no country or authority.

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const MODULE_DIR = resolve(__dirname, '..');

/** The source files of the module, not its tests and not its README. */
function sourceFiles(): string[] {
  return readdirSync(MODULE_DIR).filter((name) => name.endsWith('.ts'));
}

/** A regular expression literal: it follows an operator or a bracket, never an operand. */
const REGEX_LITERAL = /(?<=(?:[=(,:!&|?{};]|\breturn)\s*)\/(?![*/])(?:[^/\\\n[]|\\.|\[(?:[^\]\\\n]|\\.)*\])+\/[dgimsuvy]*/g;

/** The source with comments, regular expressions and string literals removed, so only code remains. */
function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1 ')
    .replace(REGEX_LITERAL, '/re/')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""');
}

/** Numeric literals that are structure, not a statutory figure: zero, one and the decimal base. */
const STRUCTURAL = new Set(['0', '1', '10', '0n', '1n', '10n']);

describe('the payroll code holds no statutory figure', () => {
  it('has source files to check', () => {
    expect(sourceFiles().length).toBeGreaterThan(3);
  });

  it('contains no numeric literal other than zero, one and the decimal base', () => {
    const found: string[] = [];
    for (const file of sourceFiles()) {
      const code = codeOnly(readFileSync(resolve(MODULE_DIR, file), 'utf8'));
      for (const match of code.matchAll(/(?<![A-Za-z_$.])\d[\d_]*(?:\.\d+)?n?\b/g)) {
        if (!STRUCTURAL.has(match[0])) found.push(`${file}: ${match[0]}`);
      }
    }
    expect(found).toEqual([]);
  });

  it('names no country, tax or authority of a pack', () => {
    const found: string[] = [];
    for (const file of sourceFiles()) {
      const code = codeOnly(readFileSync(resolve(MODULE_DIR, file), 'utf8'));
      for (const word of ['kenya', 'kra', 'nssf', 'nhif', 'shif', 'paye', 'housing', 'nita']) {
        if (new RegExp(`\\b${word}\\b`, 'i').test(code)) found.push(`${file}: ${word}`);
      }
    }
    expect(found).toEqual([]);
  });
});
