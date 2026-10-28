// ABOUTME: Tests for the CSV writer and reader the file connectors share: quoting, escaping, the trailing
// ABOUTME: newline, and a parse that returns exactly what was written.

import { describe, expect, it } from 'vitest';

import { parseCsv, toCsv } from '../csv';

describe('the CSV writer', () => {
  it('writes a header and rows with a trailing newline', () => {
    expect(
      toCsv([
        ['Journal No.', 'Debits'],
        ['INV/1', '1250.00'],
      ])
    ).toBe('Journal No.,Debits\nINV/1,1250.00\n');
  });

  it('quotes a value that carries a comma, a quote or a line break', () => {
    expect(toCsv([['a,b', 'say "hi"', 'two\nlines']])).toBe(
      '"a,b","say ""hi""","two\nlines"\n'
    );
  });

  it('writes an empty value as an empty cell, not as a zero', () => {
    expect(toCsv([['INV/1', '', '1250.00']])).toBe('INV/1,,1250.00\n');
  });
});

describe('the CSV reader', () => {
  it('returns the cells the writer wrote, quoted or not', () => {
    const rows = [
      ['Journal No.', 'Journal/Description', 'Debits'],
      ['INV/1', 'Term 1 fees, Amina Otieno', '1250.00'],
      ['INV/1', 'a "quoted" memo', ''],
    ];

    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });

  it('accepts CRLF line endings and a final newline that is absent', () => {
    expect(parseCsv('a,b\r\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('keeps a quoted line break inside one cell', () => {
    expect(parseCsv('a,"two\nlines"\n')).toEqual([['a', 'two\nlines']]);
  });
});
