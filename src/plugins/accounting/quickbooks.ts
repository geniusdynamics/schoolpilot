// ABOUTME: The QuickBooks Online journal export: the CSV Intuit's Import Data screen takes, one row per
// ABOUTME: journal line, headed by the six columns the help article names plus the class column it mentions.

import { toCsv } from './csv';
import { journalFileName } from './files';
import type { AccountingDocument, AccountingExport, ExportFile } from './types';

const DOCUMENTATION = [
  'https://quickbooks.intuit.com/learn-support/en-us/help-article/import-export-data-files/import-journal-entries-quickbooks-online/L4tQBwbs7_US_en_US',
];

/**
 * The columns Intuit documents for a journal-entry import, then the class column.
 *
 * Intuit names the six required columns verbatim, and says class and location tracking can be turned on
 * to import journals that carry them; the header it writes for those columns is not in the article, so
 * `Class` is a draft field a bursar checks against QuickBooks' own sample file.
 */
const HEADER = [
  'Journal No.',
  'Journal Date',
  'Account Name',
  'Journal/Description',
  'Debits',
  'Credits',
  'Class',
];

const DRAFT_FIELDS = ['Journal Date', 'Class'];

/** The QuickBooks Online target: a CSV import file, one row per journal line. */
export const quickBooksExport: AccountingExport = {
  id: 'quickbooks',
  label: 'QuickBooks Online',
  documentation: DOCUMENTATION,
  draftFields: DRAFT_FIELDS,
  mappingRequirements: [],

  render(document: AccountingDocument): ExportFile {
    const rows = document.entries.flatMap((entry) =>
      entry.lines.map((line) => [
        entry.reference,
        entry.date,
        line.targetName,
        line.description,
        line.side === 'debit' ? line.amountText : '',
        line.side === 'credit' ? line.amountText : '',
        line.costCentre ?? '',
      ])
    );

    return {
      target: 'quickbooks',
      filename: journalFileName('quickbooks-journal', 'csv', document),
      mediaType: 'text/csv',
      content: toCsv([HEADER, ...rows]),
      documentation: DOCUMENTATION,
      draftFields: DRAFT_FIELDS,
    };
  },
};
