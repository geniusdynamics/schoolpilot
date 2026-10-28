// ABOUTME: The two Xero exports: the manual-journal CSV a bursar imports through Xero's Import screen, and
// ABOUTME: the ManualJournals payload the Accounting API documents, with its signed line amounts and DRAFT
// ABOUTME: status so nothing posts until the bursar posts it.

import { amountNumber } from './amounts';
import { toCsv } from './csv';
import { journalFileName } from './files';
import type { AccountingDocument, AccountingExport, ExportFile } from './types';

const DOCUMENTATION = [
  'https://developer.xero.com/documentation/api/accounting/manualjournals',
  'https://raw.githubusercontent.com/XeroAPI/Xero-OpenAPI/master/xero_accounting.yaml',
];

/** The columns of the manual-journal import file, in the order the template presents them. */
const HEADER = ['Narration', 'Date', 'Description', 'AccountCode', 'Debit', 'Credit'];

/**
 * Xero Central's import article could not be read (it answers automated requests with a CAPTCHA), so the
 * header row is written from the field names the API uses and is a draft until a bursar compares it with
 * the template Xero's Import screen downloads.
 */
const CSV_DRAFT_FIELDS = ['header row', 'column order'];

/** The manual-journal CSV: one row per journal line, the narration and date repeated on every line. */
export const xeroCsvExport: AccountingExport = {
  id: 'xero',
  label: 'Xero manual journal import',
  documentation: DOCUMENTATION,
  draftFields: CSV_DRAFT_FIELDS,
  mappingRequirements: [],

  render(document: AccountingDocument): ExportFile {
    const rows = document.entries.flatMap((entry) =>
      entry.lines.map((line) => [
        entry.description,
        entry.date,
        line.description,
        line.targetCode,
        line.side === 'debit' ? line.amountText : '',
        line.side === 'credit' ? line.amountText : '',
      ])
    );

    return {
      target: 'xero',
      filename: journalFileName('xero-journal', 'csv', document),
      mediaType: 'text/csv',
      content: toCsv([HEADER, ...rows]),
      documentation: DOCUMENTATION,
      draftFields: CSV_DRAFT_FIELDS,
    };
  },
};

/**
 * The ManualJournals payload: what `POST /api.xro/2.0/ManualJournals` takes.
 *
 * The shape is the OpenAPI schema's: `Narration` (the one required field), `Date`, `Status`,
 * `LineAmountTypes`, and `JournalLines` of `Description`, `LineAmount` and `AccountCode`. Xero documents
 * the sign of a line amount - debits positive, credits negative - and the payload carries no tax type, so
 * `LineAmountTypes` is `NoTax`, the value the API's own example uses.
 */
export const xeroApiExport: AccountingExport = {
  id: 'xero-api',
  label: 'Xero Accounting API (ManualJournals)',
  documentation: DOCUMENTATION,
  draftFields: [],
  mappingRequirements: [],

  render(document: AccountingDocument): ExportFile {
    const payload = {
      ManualJournals: document.entries.map((entry) => ({
        Narration: entry.description,
        Date: entry.date,
        Status: 'DRAFT',
        LineAmountTypes: 'NoTax',
        JournalLines: entry.lines.map((line) => ({
          Description: line.description,
          LineAmount:
            line.side === 'debit' ? amountNumber(line.amountText) : -amountNumber(line.amountText),
          AccountCode: line.targetCode,
        })),
      })),
    };

    return {
      target: 'xero-api',
      filename: journalFileName('xero-manual-journals', 'json', document),
      mediaType: 'application/json',
      content: `${JSON.stringify(payload, null, 2)}\n`,
      documentation: DOCUMENTATION,
      draftFields: [],
    };
  },
};
