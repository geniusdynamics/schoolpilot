// ABOUTME: The CSV reader: quoted fields with embedded delimiters and newlines, a BOM, CRLF, the
// ABOUTME: delimiter the header picks, and the line each record came from.

import { describe, expect, it } from 'vitest';

import { detectDelimiter, parseCsv } from '../csv';
import { readFixture, refusalOf } from './fixtures';

describe('detectDelimiter', () => {
  it('picks the delimiter the header uses most', () => {
    expect(detectDelimiter('a,b,c\n1,2,3')).toBe(',');
    expect(detectDelimiter('a;b;c\n1;2;3')).toBe(';');
    expect(detectDelimiter('a\tb\tc')).toBe('\t');
    expect(detectDelimiter('a|b|c')).toBe('|');
  });

  it('ignores a delimiter inside a quoted field', () => {
    expect(detectDelimiter('"a,b";c\n1;2')).toBe(';');
  });

  it('returns null for a text with no delimiter', () => {
    expect(detectDelimiter('OFXHEADER:100')).toBeNull();
    expect(detectDelimiter('')).toBeNull();
  });
});

describe('parseCsv', () => {
  it('reads a real statement file record by record, keeping the line each came from', () => {
    const records = parseCsv(readFixture('bank-statement.csv'));

    expect(records).toHaveLength(5);
    expect(records[0].fields).toEqual(['Date', 'Description', 'Reference', 'Amount']);
    expect(records[0].line).toBe(1);
    expect(records[1].line).toBe(2);
    expect(records[4].line).toBe(5);
    expect(records[1].fields).toEqual([
      '2027-01-05',
      'Fees payment, Term 1 - Amina Otieno',
      'RCT/2027/000101',
      '1500.00',
    ]);
    expect(records[1].raw).toBe(
      '2027-01-05,"Fees payment, Term 1 - Amina Otieno",RCT/2027/000101,1500.00'
    );
  });

  it('keeps a newline inside a quoted field and still counts the lines after it', () => {
    const records = parseCsv('a,b\n"one\ntwo",2\nthree,3');
    expect(records).toHaveLength(3);
    expect(records[1].fields).toEqual(['one\ntwo', '2']);
    expect(records[1].line).toBe(2);
    expect(records[2].line).toBe(4);
    expect(records[2].fields).toEqual(['three', '3']);
  });

  it('reads a doubled quote as one quote', () => {
    const records = parseCsv('a,b\n"He said ""hi""",2');
    expect(records[1].fields).toEqual(['He said "hi"', '2']);
  });

  it('reads CRLF and a byte-order mark', () => {
    const records = parseCsv('\uFEFFa,b\r\n1,2\r\n');
    expect(records[0].fields).toEqual(['a', 'b']);
    expect(records[1].fields).toEqual(['1', '2']);
    expect(records[1].line).toBe(2);
  });

  it('skips a blank line but keeps the line numbering of the records after it', () => {
    const records = parseCsv('a,b\n\n1,2\n');
    expect(records).toHaveLength(2);
    expect(records[1].line).toBe(3);
  });

  it('refuses an unterminated quote, naming the line it opened on', () => {
    const error = refusalOf(() => parseCsv(readFixture('unterminated.csv')));
    expect(error.code).toBe('malformed_row');
    expect(error.detail.line).toBe(2);
  });

  it('refuses a text with no delimiter', () => {
    expect(refusalOf(() => parseCsv('OFXHEADER:100\nDATA:OFXSGML')).code).toBe('unknown_format');
  });
});
