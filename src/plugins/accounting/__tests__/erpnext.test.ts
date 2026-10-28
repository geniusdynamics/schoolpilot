// ABOUTME: The ERPNext journal export: the Journal Entry documents the documented REST API creates, read
// ABOUTME: back and checked for balanced rows, the mapped company and the cost centre it carries.

import { describe, expect, it } from 'vitest';

import { exportJournal } from '../index';
import type { ExportFile } from '../types';
import { batchFor, expected, mappingFor } from './fixtures';

interface ErpNextRow {
  readonly account: string;
  readonly debit_in_account_currency: number;
  readonly credit_in_account_currency: number;
  readonly user_remark: string;
  readonly cost_center?: string;
}

interface ErpNextEntry {
  readonly doctype: string;
  readonly voucher_type: string;
  readonly company: string;
  readonly cheque_no: string;
  readonly posting_date: string;
  readonly user_remark: string;
  readonly accounts: readonly ErpNextRow[];
}

interface ErpNextPayload {
  readonly resource: string;
  readonly documents: readonly ErpNextEntry[];
}

function erpNextFile(): ExportFile {
  const result = exportJournal(batchFor('erpnext'), mappingFor('erpnext'));
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.file;
}

describe('the ERPNext export', () => {
  it('matches the documented Journal Entry document exactly', () => {
    expect(erpNextFile().content).toBe(expected('erpnext.expected.json'));
  });

  it('is a JSON payload for the Journal Entry resource', () => {
    const file = erpNextFile();
    const payload = JSON.parse(file.content) as ErpNextPayload;

    expect(payload.resource).toBe('Journal Entry');
    expect(file.mediaType).toBe('application/json');
    expect(file.filename).toBe('erpnext-journal-entries-2027-02-10_2027-02-11.json');
  });

  it('reads back as one balanced Journal Entry per posting, for the mapped company', () => {
    const payload = JSON.parse(erpNextFile().content) as ErpNextPayload;

    expect(payload.documents).toHaveLength(2);
    for (const entry of payload.documents) {
      expect(entry.doctype).toBe('Journal Entry');
      expect(entry.voucher_type).toBe('Journal Entry');
      expect(entry.company).toBe('Nova Schools');
      expect(entry.posting_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const debit = entry.accounts.reduce((sum, row) => sum + row.debit_in_account_currency, 0);
      const credit = entry.accounts.reduce((sum, row) => sum + row.credit_in_account_currency, 0);
      expect(debit).toBeCloseTo(credit, 2);
    }

    expect(payload.documents[0].cheque_no).toBe('INV/2027/T1/000123');
    expect(payload.documents[1].accounts[0].cost_center).toBe('Main campus');
  });

  it('cites the user manual and the REST API it was written against', () => {
    const file = erpNextFile();

    expect(file.documentation).toContain('https://docs.frappe.io/erpnext/user/manual/en/journal-entry');
    expect(file.documentation).toContain('https://docs.frappe.io/framework/user/en/api/rest');
  });
});
