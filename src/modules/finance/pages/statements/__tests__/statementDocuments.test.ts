// ABOUTME: The statement's document column names receipts, invoices and credit notes, never the
// ABOUTME: internal ids the ledger stores, while leaving the description readable.

import { describe, expect, it } from 'vitest';

import {
  resolveStatementDocument,
  type StatementDocumentLookup,
} from '../statementDocuments';

const lookup = (): StatementDocumentLookup => ({
  invoiceNumberById: new Map([['invoice-1', 'INV/2027/1/000001']]),
  receiptNumberByPaymentId: new Map([['payment-1', 'RCT/2027/000009']]),
  paymentById: new Map([['payment-1', { channel: 'mobile_money', reference: 'MPESA-1' }]]),
  creditNoteNumberById: new Map([['note-1', 'CNT/2027/000001']]),
  refundNumberById: new Map([['refund-1', 'REF/2027/000001']]),
});

const paymentSource = { kind: 'payment', id: 'payment-1' };

describe('a statement movement document', () => {
  it('shows the receipt number and the channel of an allocation, and the invoice it settled', () => {
    const resolved = resolveStatementDocument(
      {
        kind: 'allocation',
        source: paymentSource,
        description: 'allocated to invoice invoice-1',
      },
      lookup()
    );

    expect(resolved.document).toBe('RCT/2027/000009');
    expect(resolved.description).toContain('INV/2027/1/000001');
    expect(resolved.description).toContain('Mobile money');
    expect(resolved.description).not.toContain('invoice-1');
  });

  it('shows a payment credit as its receipt and channel, not the payment id', () => {
    const resolved = resolveStatementDocument(
      { kind: 'credit', source: paymentSource, description: 'learner credit' },
      lookup()
    );

    expect(resolved.document).toBe('RCT/2027/000009');
    expect(resolved.description).toBe('Unallocated credit · Mobile money');
  });

  it('resolves an invoice, a credit note and a refund to their own numbers', () => {
    expect(
      resolveStatementDocument(
        { kind: 'invoice', source: { kind: 'invoice', id: 'invoice-1' }, description: 'Tuition' },
        lookup()
      ).document
    ).toBe('INV/2027/1/000001');
    expect(
      resolveStatementDocument(
        { kind: 'credit_note', source: { kind: 'credit_note', id: 'note-1' }, description: 'Scholarship' },
        lookup()
      ).document
    ).toBe('CNT/2027/000001');
    expect(
      resolveStatementDocument(
        { kind: 'refund', source: { kind: 'refund', id: 'refund-1' }, description: 'Refund paid' },
        lookup()
      ).document
    ).toBe('REF/2027/000001');
  });

  it('never falls back to an internal id', () => {
    const empty: StatementDocumentLookup = {
      invoiceNumberById: new Map(),
      receiptNumberByPaymentId: new Map(),
      paymentById: new Map(),
      creditNoteNumberById: new Map(),
      refundNumberById: new Map(),
    };

    expect(
      resolveStatementDocument(
        { kind: 'credit', source: paymentSource, description: 'learner credit' },
        empty
      ).document
    ).toBe('\u2014');
    const missingInvoice = resolveStatementDocument(
      {
        kind: 'allocation',
        source: paymentSource,
        description: 'allocated to invoice 11111111-1111-7111-8111-111111111111',
      },
      empty
    );
    expect(missingInvoice.description).toBe('Allocated to invoice');
    expect(missingInvoice.document).toBe('\u2014');
  });
});
