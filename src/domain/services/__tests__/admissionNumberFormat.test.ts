// ABOUTME: Tests the admission-number format: prefix/suffix/year and the next-number rule.
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ADMISSION_NUMBER_FORMAT,
  admissionNumberStartsWith,
  formatAdmissionNumber,
  nextAdmissionNumber,
  normaliseAdmissionNumberFormat,
  parseAdmissionNumber,
} from '../admissionNumberFormat';

describe('admission number format', () => {
  it('writes the default school number', () => {
    expect(formatAdmissionNumber(DEFAULT_ADMISSION_NUMBER_FORMAT, 2027, 1)).toBe('ADM/2027/001');
    expect(admissionNumberStartsWith(DEFAULT_ADMISSION_NUMBER_FORMAT, '2027-02-01')).toBe(
      'ADM/2027/'
    );
    expect(parseAdmissionNumber(DEFAULT_ADMISSION_NUMBER_FORMAT, 'ADM/2027/012')).toBe(12);
  });

  it('supports a prefix and a suffix, and a section sequence', () => {
    const format = normaliseAdmissionNumberFormat({
      prefix: 'PRI',
      suffix: 'JSS',
      separator: '-',
      includeYear: true,
      width: 2,
    });
    expect(formatAdmissionNumber(format, 2026, 7)).toBe('PRI-2026-07-JSS');
    expect(parseAdmissionNumber(format, 'PRI-2026-07-JSS')).toBe(7);
    expect(parseAdmissionNumber(format, 'PRI-2026-07')).toBeNull();
    expect(admissionNumberStartsWith(format, '2026-01-01')).toBe('PRI-2026-');
  });

  it('supports a number with no prefix, year or suffix', () => {
    const format = normaliseAdmissionNumberFormat({
      prefix: '',
      suffix: '',
      includeYear: false,
      width: 4,
    });
    expect(formatAdmissionNumber(format, 2026, 12)).toBe('0012');
    expect(parseAdmissionNumber(format, '0012')).toBe(12);
    expect(admissionNumberStartsWith(format, '2026-01-01')).toBe('');
  });

  it('takes the next number from matching numbers only, and never reuses one', () => {
    const next = nextAdmissionNumber(
      DEFAULT_ADMISSION_NUMBER_FORMAT,
      ['ADM/2027/001', 'ADM/2027/007', 'ADM/2026/099', 'MANUAL-7'],
      '2027-02-01'
    );
    expect(next).toBe('ADM/2027/008');
  });

  it('clamps an invalid width and leaves an explicit empty separator empty', () => {
    const format = normaliseAdmissionNumberFormat({ width: 99, separator: '', prefix: 'X' });
    expect(format.width).toBe(3);
    expect(formatAdmissionNumber(format, 2027, 1)).toBe('X2027001');
  });

  it('refuses a non-positive sequence', () => {
    expect(() => formatAdmissionNumber(DEFAULT_ADMISSION_NUMBER_FORMAT, 2027, 0)).toThrow(
      RangeError
    );
  });
});
