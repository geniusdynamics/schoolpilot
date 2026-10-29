// ABOUTME: The QuickBooks Online journal export: the exact CSV Intuit's import screen takes, the header
// ABOUTME: it documents, and a round-trip that parses the file back and compares the lines it carries.

import { describe, expect, it } from 'vitest';

import { parseCsv } from '../csv';
import { exportJournal } from '../index';
import type { ExportFile } from '../types';
import { batchFor, expected, mappingFor } from './fixtures';

/** The file a balanced QuickBooks export produces, or a failure naming why it produced none. */
function quickBooksFile(): ExportFile {
  const result = exportJournal(batchFor('quickbooks'), mappingFor('quickbooks'));
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.file;
}

describe('the QuickBooks Online export', () => {
  it('writes the documented import file, row for row', () => {
    expect(quickBooksFile().content).toBe(expected('quickbooks.expected.csv'));
  });

  it('heads the file with the six columns Intuit requires, and the class column', () => {
    const [header] = parseCsv(quickBooksFile().content);

    expect(header).toEqual([
      'Journal No.',
      'Journal Date',
      'Account Name',
      'Journal/Description',
      'Debits',
      'Credits',
      'Class',
    ]);
  });

  it('is a CSV named after the target and the dates it covers', () => {
    const file = quickBooksFile();

    expect(file.mediaType).toBe('text/csv');
    expect(file.filename).toBe('quickbooks-journal-2027-02-10_2027-02-11.csv');
  });

  it('reads back as the same lines, with each journal balancing', () => {
    const rows = parseCsv(quickBooksFile().content).slice(1);
    const journals = new Map<string, { debit: number; credit: number }>();

    for (const [number, , account, description, debit, credit] of rows) {
      expect(account).not.toBe('');
      expect(description).not.toBe('');
      const running = journals.get(number) ?? { debit: 0, credit: 0 };
      running.debit += Number(debit || '0');
      running.credit += Number(credit || '0');
      journals.set(number, running);
    }

    expect(rows).toHaveLength(4);
    expect([...journals.keys()]).toEqual(['INV/2027/T1/000123', 'PAY/2027/T1/000045']);
    for (const totals of journals.values()) {
      expect(totals.debit).toBeCloseTo(totals.credit, 2);
    }
    expect(rows[1]).toEqual([
      'INV/2027/T1/000123',
      '2027-02-10',
      'Fee revenue',
      'Term 1 tuition',
      '',
      '1250.00',
      '',
    ]);
  });

  it('marks the fields Intuit documents only in prose as draft', () => {
    const file = quickBooksFile();

    expect(file.documentation).toContain(
      'https://quickbooks.intuit.com/learn-support/en-us/help-article/import-export-data-files/import-journal-entries-quickbooks-online/L4tQBwbs7_US_en_US'
    );
    expect(file.draftFields).toContain('Class');
    expect(file.draftFields).toContain('Journal Date');
  });

  it('carries the account name the mapping gives, not the school account code', () => {
    const csv = quickBooksFile().content;

    expect(csv).toContain('Fee receivables');
    expect(csv).not.toContain('1100');
  });
});
