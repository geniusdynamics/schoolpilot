// ABOUTME: Unit tests for document-number sequences (receipts etc.) of the form <PREFIX>/<YEAR>/<SEQ>.
// ABOUTME: Covers formatting, parsing and gap-free, per-year, unique next-number computation.

import { describe, it, expect } from 'vitest';
import {
  RECEIPT_PREFIX,
  formatSequenceNumber,
  parseSequenceNumber,
  nextSequenceNumber,
  nextReceiptNumber,
  sequenceYear,
} from '../sequences';

describe('formatSequenceNumber', () => {
  it('formats prefix, year and a zero-padded sequence', () => {
    expect(formatSequenceNumber({ prefix: 'RCT', year: 2027 }, 123)).toBe('RCT/2027/000123');
  });

  it('honours a custom width and never truncates long sequences', () => {
    expect(formatSequenceNumber({ prefix: 'INV', year: 2026, width: 3 }, 7)).toBe('INV/2026/007');
    expect(formatSequenceNumber({ prefix: 'RCT', year: 2027 }, 1234567)).toBe('RCT/2027/1234567');
  });

  it('rejects non-positive or fractional sequences and invalid years', () => {
    expect(() => formatSequenceNumber({ prefix: 'RCT', year: 2027 }, 0)).toThrow();
    expect(() => formatSequenceNumber({ prefix: 'RCT', year: 2027 }, 1.5)).toThrow();
    expect(() => formatSequenceNumber({ prefix: 'RCT', year: 27.5 }, 1)).toThrow();
  });
});

describe('parseSequenceNumber', () => {
  it('parses a well-formed number for the given prefix', () => {
    expect(parseSequenceNumber('RCT/2027/000123', 'RCT')).toEqual({ year: 2027, seq: 123 });
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseSequenceNumber('  RCT/2027/000004 ', 'RCT')).toEqual({ year: 2027, seq: 4 });
  });

  it('returns null for other prefixes, manual numbers and empty values', () => {
    expect(parseSequenceNumber('INV/2027/000001', 'RCT')).toBeNull();
    expect(parseSequenceNumber('RCPT/2023/001', 'RCT')).toBeNull();
    expect(parseSequenceNumber('PRB-1700000000000', 'RCT')).toBeNull();
    expect(parseSequenceNumber('RCT/2027/abc', 'RCT')).toBeNull();
    expect(parseSequenceNumber('RCT/2027/000000', 'RCT')).toBeNull();
    expect(parseSequenceNumber('', 'RCT')).toBeNull();
    expect(parseSequenceNumber(null, 'RCT')).toBeNull();
    expect(parseSequenceNumber(undefined, 'RCT')).toBeNull();
  });
});

describe('nextSequenceNumber', () => {
  const spec = { prefix: 'RCT', year: 2027 };

  it('starts each year at 000001', () => {
    expect(nextSequenceNumber([], spec)).toBe('RCT/2027/000001');
    expect(nextSequenceNumber(['RCT/2026/000041', 'RCT/2026/000042'], spec)).toBe('RCT/2027/000001');
  });

  it('continues gap-free from the highest number issued that year, regardless of order', () => {
    expect(nextSequenceNumber(['RCT/2027/000002', 'RCT/2027/000001', 'RCT/2027/000003'], spec)).toBe('RCT/2027/000004');
  });

  it('ignores other prefixes, manual receipt numbers and missing values', () => {
    const existing = ['INV/2027/000099', 'PRB-1700000000000', 'RCPT/2027/500', null, undefined, '', 'RCT/2027/000001'];
    expect(nextSequenceNumber(existing, spec)).toBe('RCT/2027/000002');
  });

  it('issues unique, gap-free numbers when used repeatedly', () => {
    const existing: string[] = [];
    for (let i = 0; i < 25; i++) {
      const next = nextSequenceNumber(existing, spec);
      expect(existing).not.toContain(next);
      existing.push(next);
    }
    expect(existing[0]).toBe('RCT/2027/000001');
    expect(existing[24]).toBe('RCT/2027/000025');
    expect(existing.map((n) => parseSequenceNumber(n, 'RCT')?.seq)).toEqual(
      Array.from({ length: 25 }, (_, i) => i + 1),
    );
  });
});

describe('sequenceYear', () => {
  it('reads the calendar year from an ISO date string or a Date', () => {
    expect(sequenceYear('2027-01-15')).toBe(2027);
    expect(sequenceYear('2026-12-31T10:00:00Z')).toBe(2026);
    expect(sequenceYear(new Date(2028, 5, 1))).toBe(2028);
  });

  it('falls back to the current year for missing or invalid input', () => {
    const now = new Date().getFullYear();
    expect(sequenceYear(undefined)).toBe(now);
    expect(sequenceYear('not a date')).toBe(now);
  });
});

describe('nextReceiptNumber', () => {
  it('uses the RCT prefix and the year of the given date', () => {
    expect(RECEIPT_PREFIX).toBe('RCT');
    expect(nextReceiptNumber(['RCT/2027/000009'], '2027-03-01')).toBe('RCT/2027/000010');
    expect(nextReceiptNumber(['RCT/2027/000009'], '2028-01-02')).toBe('RCT/2028/000001');
  });
});
