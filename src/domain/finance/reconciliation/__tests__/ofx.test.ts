// ABOUTME: The OFX reader: the OFX 1.x SGML body whose tags have no closing form, the OFX 2.x XML
// ABOUTME: body, the currency, and the file line each transaction started on.

import { describe, expect, it } from 'vitest';

import { parseOfx } from '../ofx';
import { readFixture, refusalOf } from './fixtures';

describe('parseOfx', () => {
  it('reads an OFX 1.x document, the line of each transaction and its currency', () => {
    const document = parseOfx(readFixture('bank-statement.ofx'));

    expect(document.currency).toBe('KES');
    expect(document.transactions).toHaveLength(3);
    expect(document.transactions.map((transaction) => transaction.line)).toEqual([39, 48, 57]);
    expect(document.transactions[0]).toMatchObject({
      trnType: 'CREDIT',
      datePosted: '20270105120000',
      amountText: '1500.00',
      fitId: '202701050001',
      refNum: 'RCT/2027/000101',
      name: 'AMINA OTIENO',
      memo: 'Fees payment Term 1',
    });
    expect(document.transactions[1].amountText).toBe('-150.00');
    expect(document.transactions[1].trnType).toBe('DEBIT');
  });

  it('reads an OFX 2.x XML document with closing tags', () => {
    const document = parseOfx(readFixture('wallet-statement.ofx'));

    expect(document.currency).toBe('KES');
    expect(document.transactions).toHaveLength(3);
    expect(document.transactions.map((transaction) => transaction.line)).toEqual([9, 18, 27]);
    expect(document.transactions[0]).toMatchObject({
      trnType: 'CREDIT',
      datePosted: '20270110091422',
      amountText: '1500.00',
      refNum: 'QK12AB34CD',
    });
    expect(document.transactions[2]).toMatchObject({ trnType: 'XFER', amountText: '-5000.00' });
  });

  it('refuses a text that is not OFX', () => {
    expect(refusalOf(() => parseOfx(readFixture('bank-statement.csv'))).code).toBe('unknown_format');
    expect(refusalOf(() => parseOfx('hello')).code).toBe('unknown_format');
  });
});
