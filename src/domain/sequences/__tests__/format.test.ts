// ABOUTME: Tests for the number grammar: compiling a pattern, rendering a number, and parsing one
// ABOUTME: back, including the values a pattern must refuse.

import { describe, expect, it } from 'vitest';

import { compileFormat, formatNumber, parseNumber, parseNumberForDefinition } from '../format';
import { SequenceFormatError } from '../errors';
import { SEQUENCE_DEFINITIONS } from '../catalog';
import type { ScopeValues } from '../types';

const ADMISSION = SEQUENCE_DEFINITIONS.admission;
const INVOICE = SEQUENCE_DEFINITIONS.invoice;
const RECEIPT = SEQUENCE_DEFINITIONS.receipt;
const STUDENT = SEQUENCE_DEFINITIONS.student_number;

describe('compileFormat', () => {
  it('records the width, the rendered segments and the parts of a pattern', () => {
    const compiled = compileFormat('ADM/{YYYY}/{SEQ:3}');
    expect(compiled.width).toBe(3);
    expect(compiled.segments).toEqual(['year']);
    expect(compiled.parts).toEqual([
      { kind: 'literal', text: 'ADM/' },
      { kind: 'segment', segment: 'year', token: '{YYYY}' },
      { kind: 'literal', text: '/' },
      { kind: 'counter', width: 3 },
    ]);
  });

  it('treats a bare {SEQ} as width one and honours {SEQ:5}', () => {
    expect(compileFormat('{CAMPUS}-{SEQ}').width).toBe(1);
    expect(compileFormat('{INST}/{SEQ:5}').width).toBe(5);
  });

  it('refuses a pattern with no counter, two counters, or an unknown token', () => {
    expect(() => compileFormat('ADM/{YYYY}')).toThrow(SequenceFormatError);
    expect(() => compileFormat('{SEQ}/{SEQ:2}')).toThrow(/exactly one/);
    expect(() => compileFormat('ADM/{YEARS}/{SEQ:3}')).toThrow(/unknown token/);
    expect(() => compileFormat('ADM/{seq}/{SEQ:3}')).toThrow(/unknown token/);
  });

  it('refuses a counter padded to zero digits and a width on a scope token', () => {
    expect(() => compileFormat('{SEQ:0}')).toThrow(/pads the counter/);
    expect(() => compileFormat('{YYYY:2}/{SEQ:3}')).toThrow(/not the counter/);
  });

  it('refuses an unmatched brace and two tokens with no literal between them', () => {
    expect(() => compileFormat('ADM/{YYYY/{SEQ:3}')).toThrow(/no matching/);
    expect(() => compileFormat('ADM/{YYYY}/{SEQ:3}}')).toThrow(/no matching/);
    expect(() => compileFormat('{YYYY}{SEQ:3}')).toThrow(/next to each other/);
  });

  it('refuses a pattern that renders a segment twice', () => {
    expect(() => compileFormat('{YYYY}/{YYYY}/{SEQ:3}')).toThrow(/twice/);
  });

  it('refuses an empty pattern', () => {
    expect(() => compileFormat('')).toThrow(SequenceFormatError);
  });
});

describe('formatNumber', () => {
  it('renders the catalog patterns as the spec writes them', () => {
    const table: readonly [string, ScopeValues, number, string][] = [
      ['admission', { institution: 'INST-1', year: 2027 }, 1, 'ADM/2027/001'],
      ['admission', { institution: 'INST-1', year: 2027 }, 1234, 'ADM/2027/1234'],
      ['invoice', { institution: 'INST-1', year: 2027, term: 'T1' }, 123, 'INV/2027/T1/000123'],
      ['receipt', { institution: 'INST-1', year: 2027 }, 123, 'RCT/2027/000123'],
      ['student_number', { institution: 'GA' }, 7, 'GA/00007'],
    ];
    for (const [name, scope, seq, expected] of table) {
      const definition = SEQUENCE_DEFINITIONS[name as keyof typeof SEQUENCE_DEFINITIONS];
      expect(formatNumber(compileFormat(definition.pattern), scope, seq)).toBe(expected);
    }
  });

  it('never truncates a counter that outgrows its width', () => {
    const compiled = compileFormat(ADMISSION.pattern);
    expect(formatNumber(compiled, { year: 2027 }, 1000)).toBe('ADM/2027/1000');
  });

  it('pads a month and a year, and refuses a month outside 1..12', () => {
    const compiled = compileFormat('{YYYY}-{MM}-{SEQ:2}');
    expect(formatNumber(compiled, { year: 2027, month: 3 }, 4)).toBe('2027-03-04');
    expect(() => formatNumber(compiled, { year: 2027, month: 13 }, 4)).toThrow(/month/);
    expect(() => formatNumber(compiled, { year: 2027, month: 0 }, 4)).toThrow(/month/);
  });

  it('refuses a counter that is not a positive integer', () => {
    const compiled = compileFormat(RECEIPT.pattern);
    expect(() => formatNumber(compiled, { year: 2027 }, 0)).toThrow(SequenceFormatError);
    expect(() => formatNumber(compiled, { year: 2027 }, 1.5)).toThrow(SequenceFormatError);
  });

  it('refuses a missing scope value', () => {
    expect(() => formatNumber(compileFormat(INVOICE.pattern), { year: 2027 }, 1)).toThrow(/term/);
  });

  it('refuses a free-form value with a slash or a brace, so a number stays parseable', () => {
    const compiled = compileFormat(STUDENT.pattern);
    expect(() => formatNumber(compiled, { institution: 'A/B' }, 1)).toThrow(/may not contain/);
    expect(() => formatNumber(compiled, { institution: 'A{B' }, 1)).toThrow(/may not contain/);
  });

  it('refuses a value that contains the literal which follows it', () => {
    const compiled = compileFormat('{CAMPUS}-{SEQ:3}');
    expect(() => formatNumber(compiled, { campus: 'A-B' }, 1)).toThrow(/separator/);
    expect(formatNumber(compiled, { campus: 'AB' }, 1)).toBe('AB-001');
  });
});

describe('parseNumber', () => {
  it('round-trips every built-in sequence', () => {
    const cases: readonly [keyof typeof SEQUENCE_DEFINITIONS, ScopeValues, number][] = [
      ['admission', { institution: 'INST-1', year: 2027 }, 42],
      ['invoice', { institution: 'INST-1', year: 2027, term: 'T2' }, 900001],
      ['receipt', { institution: 'INST-1', year: 2027 }, 1],
      ['credit_note', { institution: 'INST-1', year: 2027 }, 17],
      ['payment_voucher', { institution: 'INST-1', year: 2027 }, 17],
      ['student_number', { institution: 'GA' }, 250],
    ];
    for (const [name, scope, seq] of cases) {
      const definition = SEQUENCE_DEFINITIONS[name];
      const number = formatNumber(compileFormat(definition.pattern), scope, seq);
      const parsed = parseNumberForDefinition(definition, number);
      expect(parsed?.seq, name).toBe(seq);

      // Only the segments the pattern renders come back; a scope that is not printed cannot be.
      const rendered: ScopeValues = {};
      for (const segment of compileFormat(definition.pattern).segments) {
        rendered[segment] = scope[segment];
      }
      expect(parsed?.scope, name).toEqual(rendered);
    }
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseNumber(compileFormat(RECEIPT.pattern), '  RCT/2027/000004 ')).toEqual({
      seq: 4,
      scope: { year: 2027 },
    });
  });

  it('refuses a number of another sequence, a manual number and an empty value', () => {
    const compiled = compileFormat(RECEIPT.pattern);
    expect(parseNumber(compiled, 'INV/2027/T1/000001')).toBeNull();
    expect(parseNumber(compiled, 'RCPT/2023/001')).toBeNull();
    expect(parseNumber(compiled, 'PRB-1700000000000')).toBeNull();
    expect(parseNumber(compiled, 'RCT/2027/abc')).toBeNull();
    expect(parseNumber(compiled, '')).toBeNull();
    expect(parseNumber(compiled, null)).toBeNull();
    expect(parseNumber(compiled, undefined)).toBeNull();
  });

  it('refuses a counter shorter than the pattern pads, and a zero counter', () => {
    const compiled = compileFormat(ADMISSION.pattern);
    expect(parseNumber(compiled, 'ADM/2027/1')).toBeNull();
    expect(parseNumber(compiled, 'ADM/2027/000')).toBeNull();
    expect(parseNumber(compiled, 'ADM/2027/001')).toEqual({ seq: 1, scope: { year: 2027 } });
  });

  it('refuses a year that is not four digits', () => {
    expect(parseNumber(compileFormat(RECEIPT.pattern), 'RCT/27/000001')).toBeNull();
  });
});
