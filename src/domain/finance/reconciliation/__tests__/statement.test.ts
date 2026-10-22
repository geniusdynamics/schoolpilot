// ABOUTME: The statement parser over real statement files: the two clean shapes it reads, the
// ABOUTME: tolerance it shows the real world, and every refusal with the line that caused it.

import { describe, expect, it } from 'vitest';

import { detectFormat, parseStatement } from '../statement';
import type { StatementAccount } from '../types';
import { readFixture, refusalOf } from './fixtures';

const BANK: StatementAccount = {
  id: 'acct-bank',
  institutionId: 'inst-1',
  name: 'Equity Bank 0123456789',
  currency: 'KES',
  kind: 'bank',
};

const WALLET: StatementAccount = {
  id: 'acct-mpesa',
  institutionId: 'inst-1',
  name: 'M-Pesa paybill',
  currency: 'KES',
  kind: 'mobile_money',
};

const UGX_BANK: StatementAccount = { ...BANK, id: 'acct-ugx', currency: 'UGX' };

const kes = (minor: number) => ({ amount_minor: minor, currency: 'KES' as const });

describe('detectFormat', () => {
  it('tells an OFX document from a delimited file', () => {
    expect(detectFormat(readFixture('bank-statement.ofx'))).toBe('ofx');
    expect(detectFormat(readFixture('wallet-statement.ofx'))).toBe('ofx');
    expect(detectFormat(readFixture('bank-statement.csv'))).toBe('csv');
  });

  it('refuses a text that is neither', () => {
    expect(refusalOf(() => detectFormat('')).code).toBe('unknown_format');
    expect(refusalOf(() => detectFormat('just a sentence')).code).toBe('unknown_format');
  });
});

describe('a clean CSV', () => {
  it('reads a signed amount column, a quoted field and a negative line', () => {
    const parsed = parseStatement(readFixture('bank-statement.csv'), {
      account: BANK,
      sourceName: 'bank-statement.csv',
    });

    expect(parsed.format).toBe('csv');
    expect(parsed.currency).toBe('KES');
    expect(parsed.sourceName).toBe('bank-statement.csv');
    expect(parsed.lines).toHaveLength(4);

    const [first, charge, second, third] = parsed.lines;
    expect(first.fileLine).toBe(2);
    expect(first.valueDate).toBe('2027-01-05');
    expect(first.amount).toEqual(kes(150_000));
    expect(first.direction).toBe('inflow');
    expect(first.reference).toBe('RCT2027000101');
    expect(first.description).toBe('Fees payment, Term 1 - Amina Otieno');
    expect(first.raw).toContain('"Fees payment, Term 1 - Amina Otieno"');

    expect(charge.fileLine).toBe(3);
    expect(charge.amount).toEqual(kes(15_000));
    expect(charge.direction).toBe('outflow');

    expect(second.valueDate).toBe('2027-01-06');
    expect(third.fileLine).toBe(5);
  });

  it('reads a mobile-money file with a debit/credit pair, a currency column and a time', () => {
    const parsed = parseStatement(readFixture('mpesa-statement.csv'), { account: WALLET });

    expect(parsed.lines).toHaveLength(3);
    expect(parsed.lines[0]).toMatchObject({
      fileLine: 2,
      valueDate: '2027-01-10',
      direction: 'inflow',
      reference: 'QK12AB34CD',
      description: 'Fees payment Amina Otieno',
    });
    expect(parsed.lines[0].amount).toEqual(kes(150_000));
    expect(parsed.lines[2]).toMatchObject({ fileLine: 4, direction: 'outflow' });
    expect(parsed.lines[2].amount).toEqual(kes(500_000));
  });

  it('reads the same file re-saved with a byte-order mark and CRLF endings as the same file', () => {
    // The fixture is read as the checkout wrote it (git may have given it CRLF), so it is put into
    // LF first and then into CRLF: the test is about the CRLF form, not about the checkout.
    const text = readFixture('bank-statement.csv').replace(/\r\n?/g, '\n');
    const windows = `\uFEFF${text.replace(/\n/g, '\r\n')}`;

    const plain = parseStatement(text, { account: BANK });
    const wrapped = parseStatement(windows, { account: BANK });

    expect(wrapped.lines).toHaveLength(plain.lines.length);
    expect(wrapped.fingerprint).toBe(plain.fingerprint);
    expect(wrapped.lines[0].raw).toBe(plain.lines[0].raw);
  });
});

describe('a clean OFX', () => {
  it('reads the OFX 1.x body, keeping the line of each transaction', () => {
    const parsed = parseStatement(readFixture('bank-statement.ofx'), { account: BANK });

    expect(parsed.format).toBe('ofx');
    expect(parsed.currency).toBe('KES');
    expect(parsed.lines.map((line) => line.fileLine)).toEqual([39, 48, 57]);
    expect(parsed.lines[0]).toMatchObject({
      valueDate: '2027-01-05',
      direction: 'inflow',
      reference: 'RCT2027000101',
      payerName: 'AMINA OTIENO',
    });
    expect(parsed.lines[0].amount).toEqual(kes(150_000));
    expect(parsed.lines[1]).toMatchObject({ direction: 'outflow', reference: 'CHG20270009' });
    expect(parsed.lines[1].amount).toEqual(kes(15_000));
  });

  it('reads the OFX 2.x body, taking the direction from the sign of a neutral type', () => {
    const parsed = parseStatement(readFixture('wallet-statement.ofx'), { account: WALLET });

    expect(parsed.format).toBe('ofx');
    expect(parsed.lines.map((line) => line.fileLine)).toEqual([9, 18, 27]);
    expect(parsed.lines[0]).toMatchObject({ direction: 'inflow', reference: 'QK12AB34CD' });
    expect(parsed.lines[2]).toMatchObject({ direction: 'outflow', reference: 'QK12AB34CF' });
    expect(parsed.lines[2].amount).toEqual(kes(500_000));
  });
});

describe('the refusals of a malformed file', () => {
  it('refuses a date that does not exist, naming the line', () => {
    const error = refusalOf(() =>
      parseStatement(readFixture('malformed-date.csv'), { account: BANK })
    );
    expect(error.code).toBe('invalid_date');
    expect(error.detail.line).toBe(3);
    expect(error.detail.value).toBe('2027-02-30');
  });

  it('refuses an amount that is not one, naming the line', () => {
    const error = refusalOf(() =>
      parseStatement(readFixture('malformed-amount.csv'), { account: BANK })
    );
    expect(error.code).toBe('invalid_amount');
    expect(error.detail.line).toBe(3);
  });

  it('refuses an unterminated quote, naming the line it opened on', () => {
    const error = refusalOf(() =>
      parseStatement(readFixture('unterminated.csv'), { account: BANK })
    );
    expect(error.code).toBe('malformed_row');
    expect(error.detail.line).toBe(2);
  });

  it('refuses an OFX transaction whose type and sign disagree, naming its line', () => {
    const error = refusalOf(() => parseStatement(readFixture('malformed.ofx'), { account: BANK }));
    expect(error.code).toBe('ambiguous_direction');
    expect(error.detail.line).toBe(17);
  });

  it('refuses an OFX transaction dated on a day that does not exist', () => {
    const error = refusalOf(() =>
      parseStatement(readFixture('malformed-date.ofx'), { account: BANK })
    );
    expect(error.code).toBe('invalid_date');
    expect(error.detail.line).toBe(17);
    expect(error.detail.value).toBe('20270230');
  });

  it('refuses a statement counted in another currency than the account', () => {
    const error = refusalOf(() =>
      parseStatement(readFixture('mpesa-statement.csv'), { account: UGX_BANK })
    );
    expect(error.code).toBe('currency_mismatch');
    expect(error.detail.line).toBe(2);
    expect(error.detail.expected).toBe('UGX');
    expect(error.detail.actual).toBe('KES');
  });

  it('refuses a currency code the money module does not know', () => {
    const error = refusalOf(() =>
      parseStatement('Date,Amount,Currency\n2027-01-05,1500.00,XYZ\n', { account: BANK })
    );
    expect(error.code).toBe('unknown_currency');
    expect(error.detail.line).toBe(2);
  });

  it('refuses an OFX document counted in another currency than the account', () => {
    const error = refusalOf(() =>
      parseStatement(readFixture('bank-statement.ofx'), { account: UGX_BANK })
    );
    expect(error.code).toBe('currency_mismatch');
    expect(error.detail.field).toBe('CURDEF');
  });

  it('refuses a header without a date or without an amount', () => {
    expect(
      refusalOf(() => parseStatement('Description,Amount\nx,1500.00\n', { account: BANK })).code
    ).toBe('missing_columns');
    expect(
      refusalOf(() => parseStatement('Date,Description\n2027-01-05,x\n', { account: BANK })).code
    ).toBe('missing_columns');
  });

  it('refuses a record that does not have the field count its header promised', () => {
    const error = refusalOf(() =>
      parseStatement('Date,Amount\n2027-01-05,1500.00,extra\n', { account: BANK })
    );
    expect(error.code).toBe('malformed_row');
    expect(error.detail.line).toBe(2);
    expect(error.detail.expected).toBe(2);
    expect(error.detail.actual).toBe(3);
  });

  it('refuses a zero amount', () => {
    const error = refusalOf(() =>
      parseStatement('Date,Amount,Type\n2027-01-05,0.00,Credit\n', { account: BANK })
    );
    expect(error.code).toBe('zero_amount');
    expect(error.detail.line).toBe(2);
  });

  it('refuses an amount with more precision than the currency holds', () => {
    const error = refusalOf(() =>
      parseStatement('Date,Amount\n2027-01-05,1500.005\n', { account: BANK })
    );
    expect(error.code).toBe('invalid_amount');
    expect(error.detail.reason).toBe('over_precision');
  });

  it('refuses a file with no lines', () => {
    expect(
      refusalOf(() => parseStatement('Date,Description,Reference,Amount\n', { account: BANK })).code
    ).toBe('empty_statement');
    expect(
      refusalOf(() => parseStatement('<OFX>\n<CURDEF>KES\n</OFX>\n', { account: BANK })).code
    ).toBe('empty_statement');
  });
});

describe('the direction of an unsigned amount', () => {
  it('is taken from the direction column when one names it', () => {
    const parsed = parseStatement('Date,Amount,Type\n2027-01-05,1500.00,Credit\n', { account: BANK });
    expect(parsed.lines[0].direction).toBe('inflow');

    const debit = parseStatement('Date,Amount,Type\n2027-01-05,1500.00,Debit\n', { account: BANK });
    expect(debit.lines[0].direction).toBe('outflow');
  });

  it('is money in by the convention of a signed amount column, and the caller may override it', () => {
    const parsed = parseStatement('Date,Amount\n2027-01-05,1500.00\n', { account: BANK });
    expect(parsed.lines[0].direction).toBe('inflow');

    const outgoing = parseStatement('Date,Amount\n2027-01-05,1500.00\n', {
      account: BANK,
      defaultDirection: 'outflow',
    });
    expect(outgoing.lines[0].direction).toBe('outflow');
  });

  it('is refused when a signed amount and a direction column disagree', () => {
    const error = refusalOf(() =>
      parseStatement('Date,Amount,Type\n2027-01-05,-1500.00,Credit\n', { account: BANK })
    );
    expect(error.code).toBe('ambiguous_direction');
    expect(error.detail.sign).toBe('outflow');
    expect(error.detail.column).toBe('inflow');
  });

  it('is refused when a record carries both a debit and a credit', () => {
    const error = refusalOf(() =>
      parseStatement('Date,Debit,Credit\n2027-01-05,1500.00,2500.00\n', { account: BANK })
    );
    expect(error.code).toBe('ambiguous_direction');
  });
});
