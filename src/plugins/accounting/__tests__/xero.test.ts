// ABOUTME: The two Xero exports: the manual-journal CSV a bursar imports and the ManualJournals payload
// ABOUTME: the Accounting API documents, each read back and compared line for line.

import { describe, expect, it } from 'vitest';

import { parseCsv } from '../csv';
import { exportJournal } from '../index';
import type { ExportFile } from '../types';
import { batchFor, expected, mappingFor } from './fixtures';

function fileFor(target: 'xero' | 'xero-api'): ExportFile {
  const result = exportJournal(batchFor(target), mappingFor(target));
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.file;
}

interface XeroJournalLine {
  readonly Description: string;
  readonly LineAmount: number;
  readonly AccountCode: string;
}

interface XeroManualJournal {
  readonly Narration: string;
  readonly Date: string;
  readonly Status: string;
  readonly LineAmountTypes: string;
  readonly JournalLines: readonly XeroJournalLine[];
}

describe('the Xero manual journal CSV', () => {
  it('writes the import file row for row', () => {
    expect(fileFor('xero').content).toBe(expected('xero.expected.csv'));
  });

  it('names the CSV after the dates it covers', () => {
    const file = fileFor('xero');

    expect(file.filename).toBe('xero-journal-2027-02-10_2027-02-11.csv');
    expect(file.mediaType).toBe('text/csv');
  });

  it('reads back as the same lines, each journal balancing', () => {
    const [header, ...rows] = parseCsv(fileFor('xero').content);
    expect(header).toEqual(['Narration', 'Date', 'Description', 'AccountCode', 'Debit', 'Credit']);

    const journals = new Map<string, { debit: number; credit: number }>();
    for (const [narration, date, description, accountCode, debit, credit] of rows) {
      expect(accountCode).toMatch(/^\d{4}$/);
      expect(description).not.toBe('');
      const key = `${narration} ${date}`;
      const running = journals.get(key) ?? { debit: 0, credit: 0 };
      running.debit += Number(debit || '0');
      running.credit += Number(credit || '0');
      journals.set(key, running);
    }

    expect(rows).toHaveLength(4);
    expect([...journals.keys()]).toEqual([
      'Term 1 fees for Amina Otieno 2027-02-10',
      'Bank deposit for term 1 2027-02-11',
    ]);
    for (const totals of journals.values()) {
      expect(totals.debit).toBeCloseTo(totals.credit, 2);
    }
  });

  it('says that the import template itself is unconfirmed, so every column is draft', () => {
    const file = fileFor('xero');

    expect(file.draftFields.length).toBeGreaterThan(0);
    expect(file.draftFields).toContain('header row');
    expect(file.documentation.length).toBeGreaterThan(0);
  });
});

describe('the Xero ManualJournals payload', () => {
  it('matches the documented payload exactly', () => {
    expect(fileFor('xero-api').content).toBe(expected('xero-manual-journals.expected.json'));
  });

  it('posts nothing on its own: every journal is a DRAFT', () => {
    const payload = JSON.parse(fileFor('xero-api').content) as {
      ManualJournals: readonly XeroManualJournal[];
    };

    expect(payload.ManualJournals).toHaveLength(2);
    for (const journal of payload.ManualJournals) {
      expect(journal.Status).toBe('DRAFT');
      expect(journal.LineAmountTypes).toBe('NoTax');
    }
  });

  it('holds the documented sign convention: debits positive, credits negative', () => {
    const payload = JSON.parse(fileFor('xero-api').content) as {
      ManualJournals: readonly XeroManualJournal[];
    };

    const [invoice, deposit] = payload.ManualJournals;
    expect(invoice.JournalLines[0]).toEqual({
      Description: 'Term 1 fees for Amina Otieno',
      LineAmount: 1250,
      AccountCode: '1100',
    });
    expect(invoice.JournalLines[1].LineAmount).toBe(-1250);
    expect(deposit.Date).toBe('2027-02-11');

    for (const journal of payload.ManualJournals) {
      const total = journal.JournalLines.reduce((sum, line) => sum + line.LineAmount, 0);
      expect(total).toBe(0);
    }
  });

  it('is JSON named after the dates it covers', () => {
    const file = fileFor('xero-api');

    expect(file.filename).toBe('xero-manual-journals-2027-02-10_2027-02-11.json');
    expect(file.mediaType).toBe('application/json');
  });
});
