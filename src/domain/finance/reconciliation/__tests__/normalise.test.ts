// ABOUTME: The reader of the real world's text: the amount shapes a statement writes, the date
// ABOUTME: shapes, the reference and name forms the rules compare, and the fingerprint that makes a
// ABOUTME: re-import idempotent.

import { describe, expect, it } from 'vitest';

import {
  dayDifference,
  fingerprintOf,
  nameSimilarity,
  normaliseReference,
  parseAmountText,
  parseStatementAmount,
  parseStatementDate,
} from '../normalise';
import { refusalOf } from './fixtures';

describe('parseAmountText', () => {
  it('reads a plain decimal', () => {
    expect(parseAmountText('1500.55')).toBe('1500.55');
    expect(parseAmountText(' 1500 ')).toBe('1500');
  });

  it('drops a thousands separator on either convention', () => {
    expect(parseAmountText('1,500.55')).toBe('1500.55');
    expect(parseAmountText('1.500,55')).toBe('1500.55');
    expect(parseAmountText('1,234,567.89')).toBe('1234567.89');
    expect(parseAmountText('1,500')).toBe('1500');
  });

  it('reads a comma as a decimal point when it is not grouping', () => {
    expect(parseAmountText('1500,55')).toBe('1500.55');
    expect(parseAmountText('1,50')).toBe('1.50');
  });

  it('reads an accounting negative and a trailing minus', () => {
    expect(parseAmountText('(1,500.00)')).toBe('-1500.00');
    expect(parseAmountText('1500.00-')).toBe('-1500.00');
    expect(parseAmountText('-1500.00')).toBe('-1500.00');
    expect(parseAmountText('+1500.00')).toBe('1500.00');
  });

  it('drops a currency symbol or code glued to the figure', () => {
    expect(parseAmountText('KSh 1,500.55')).toBe('1500.55');
    expect(parseAmountText('KES1500.55')).toBe('1500.55');
    expect(parseAmountText('$1,500.55')).toBe('1500.55');
  });

  it('refuses a text with no figure in it', () => {
    const error = refusalOf(() => parseAmountText('N/A'));
    expect(error.code).toBe('invalid_amount');
    expect(error.detail.value).toBe('N/A');
  });
});

describe('parseStatementAmount', () => {
  it('reads an amount exact in the currency minor units', () => {
    expect(parseStatementAmount('1500.55', 'KES')).toEqual({
      amount_minor: 150055,
      currency: 'KES',
    });
    expect(parseStatementAmount('150000', 'UGX')).toEqual({
      amount_minor: 150000,
      currency: 'UGX',
    });
  });

  it('refuses precision the currency cannot hold rather than rounding it', () => {
    const error = refusalOf(() => parseStatementAmount('1500.005', 'KES'));
    expect(error.code).toBe('invalid_amount');
    expect(error.detail.reason).toBe('over_precision');

    const shillings = refusalOf(() => parseStatementAmount('150000.50', 'UGX'));
    expect(shillings.code).toBe('invalid_amount');
    expect(shillings.detail.reason).toBe('over_precision');
  });
});

describe('parseStatementDate', () => {
  it('reads the ISO shapes, with a time after them', () => {
    expect(parseStatementDate('2027-01-10')).toBe('2027-01-10');
    expect(parseStatementDate('2027-01-10 12:34:56')).toBe('2027-01-10');
    expect(parseStatementDate('2027-01-10T12:34:56Z')).toBe('2027-01-10');
    expect(parseStatementDate('2027/01/10')).toBe('2027-01-10');
    expect(parseStatementDate('20270110')).toBe('2027-01-10');
    expect(parseStatementDate('20270110123456')).toBe('2027-01-10');
  });

  it('reads a day-first date by default and a month-first one on request', () => {
    expect(parseStatementDate('10/01/2027')).toBe('2027-01-10');
    expect(parseStatementDate('10/01/2027', { dateOrder: 'mdy' })).toBe('2027-10-01');
    expect(parseStatementDate('10-01-2027')).toBe('2027-01-10');
    expect(parseStatementDate('10.01.2027')).toBe('2027-01-10');
  });

  it('lets a component greater than 12 decide on its own', () => {
    expect(parseStatementDate('13/01/2027')).toBe('2027-01-13');
    expect(parseStatementDate('01/13/2027')).toBe('2027-01-13');
  });

  it('reads a month name', () => {
    expect(parseStatementDate('10 Jan 2027')).toBe('2027-01-10');
    expect(parseStatementDate('10 January 2027')).toBe('2027-01-10');
  });

  it('returns null for a day that does not exist and for text that is not a date', () => {
    expect(parseStatementDate('2027-02-30')).toBeNull();
    expect(parseStatementDate('20270230')).toBeNull();
    expect(parseStatementDate('not a date')).toBeNull();
    expect(parseStatementDate('')).toBeNull();
  });
});

describe('normaliseReference', () => {
  it('keeps the letters and digits of a reference and nothing else', () => {
    expect(normaliseReference('RCT/2027/000101')).toBe('RCT2027000101');
    expect(normaliseReference('ref 2027-000123')).toBe('REF2027000123');
    expect(normaliseReference('   ')).toBeNull();
    expect(normaliseReference(null)).toBeNull();
  });
});

describe('nameSimilarity', () => {
  it('agrees when one name carries all of the other', () => {
    expect(nameSimilarity('JOHN KAMAU', 'JOHN KAMAU MWANGI')).toBe(1);
    expect(nameSimilarity('AMINA OTIENO', 'Fees payment, Term 1 - Amina Otieno')).toBe(1);
  });

  it('scores the overlap of two names that differ', () => {
    expect(nameSimilarity('AMINA OTIENO', 'BRIAN MWANGI')).toBe(0);
    expect(nameSimilarity('AMINA OTIENO', 'AMINA WANJIKU')).toBeCloseTo(1 / 3, 5);
    expect(nameSimilarity('', 'AMINA OTIENO')).toBe(0);
  });
});

describe('fingerprintOf', () => {
  it('is stable, and the same for a file re-saved by another editor', () => {
    const text = 'Date,Amount\n2027-01-05,1500.00\n';
    expect(fingerprintOf(['inst-1', 'acct-1', text])).toBe(fingerprintOf(['inst-1', 'acct-1', text]));
    expect(fingerprintOf(['inst-1', 'acct-1', `\uFEFF${text.replace(/\n/g, '\r\n')}`])).toBe(
      fingerprintOf(['inst-1', 'acct-1', text])
    );
    expect(fingerprintOf(['inst-1', 'acct-1', `${text}   \n`])).toBe(
      fingerprintOf(['inst-1', 'acct-1', text])
    );
  });

  it('differs for another file, another account or another institution', () => {
    const text = 'Date,Amount\n2027-01-05,1500.00\n';
    expect(fingerprintOf(['inst-1', 'acct-1', text])).not.toBe(
      fingerprintOf(['inst-1', 'acct-1', 'Date,Amount\n2027-01-05,1500.01\n'])
    );
    expect(fingerprintOf(['inst-1', 'acct-1', text])).not.toBe(
      fingerprintOf(['inst-1', 'acct-2', text])
    );
    expect(fingerprintOf(['inst-1', 'acct-1', text])).not.toBe(
      fingerprintOf(['inst-2', 'acct-1', text])
    );
  });
});

describe('dayDifference', () => {
  it('counts whole days between two ISO days', () => {
    expect(dayDifference('2027-01-05', '2027-01-05')).toBe(0);
    expect(dayDifference('2027-01-05', '2027-01-06')).toBe(1);
    expect(dayDifference('2027-01-06', '2027-01-05')).toBe(1);
    expect(dayDifference('2027-01-05', 'not a date')).toBeNull();
  });
});
