// ABOUTME: The Odoo journal export: the account.move payload the documented external API creates, read back
// ABOUTME: and checked for balanced lines and the account ids the mapping supplies.

import { describe, expect, it } from 'vitest';

import { exportJournal } from '../index';
import type { ExportFile } from '../types';
import { batchFor, expected, mappingFor } from './fixtures';

interface OdooLine {
  readonly name: string;
  readonly account_id: number;
  readonly debit: number;
  readonly credit: number;
}

interface OdooMove {
  readonly move_type: string;
  readonly journal_id: number;
  readonly date: string;
  readonly ref: string;
  readonly line_ids: readonly OdooLine[];
}

interface OdooPayload {
  readonly resource: string;
  readonly documents: readonly OdooMove[];
}

function odooFile(): ExportFile {
  const result = exportJournal(batchFor('odoo'), mappingFor('odoo'));
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.file;
}

describe('the Odoo export', () => {
  it('matches the documented account.move payload exactly', () => {
    expect(odooFile().content).toBe(expected('odoo.expected.json'));
  });

  it('is a JSON payload that names its resource, the Odoo model', () => {
    const file = odooFile();
    const payload = JSON.parse(file.content) as OdooPayload;

    expect(payload.resource).toBe('account.move');
    expect(file.mediaType).toBe('application/json');
    expect(file.filename).toBe('odoo-account-moves-2027-02-10_2027-02-11.json');
  });

  it('reads back as one balanced entry per account.move, in the mapped journal', () => {
    const payload = JSON.parse(odooFile().content) as OdooPayload;

    expect(payload.documents).toHaveLength(2);
    for (const move of payload.documents) {
      expect(move.move_type).toBe('entry');
      expect(move.journal_id).toBe(3);
      expect(move.ref).not.toBe('');
      const debit = move.line_ids.reduce((sum, line) => sum + line.debit, 0);
      const credit = move.line_ids.reduce((sum, line) => sum + line.credit, 0);
      expect(debit).toBeCloseTo(credit, 2);
      for (const line of move.line_ids) {
        expect(line.account_id).toBeGreaterThan(0);
        expect(line.name).not.toBe('');
      }
    }

    expect(payload.documents[0].line_ids.map((line) => line.account_id)).toEqual([42, 43]);
    expect(payload.documents[1].line_ids[0].debit).toBe(500.55);
  });

  it('names the payload’s account and journal ids as the ids the mapping supplies', () => {
    const file = odooFile();

    expect(file.draftFields).toContain('account_id and journal_id as Odoo database ids');
    expect(file.documentation).toContain(
      'https://www.odoo.com/documentation/18.0/developer/reference/external_api.html'
    );
  });
});
