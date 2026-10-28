// ABOUTME: The Odoo journal export: the account.move documents the documented external API creates, one per
// ABOUTME: posted entry, with balanced line_ids in the journal the mapping names and accounts by the database
// ABOUTME: ids the school maps.

import { amountNumber } from './amounts';
import { journalFileName } from './files';
import type {
  AccountingDocument,
  AccountingExport,
  ExportFile,
  ExportIssue,
} from './types';
import type { ChartMapping } from './mapping';

const DOCUMENTATION = [
  'https://www.odoo.com/documentation/18.0/developer/reference/external_api.html',
  'https://raw.githubusercontent.com/odoo/odoo/18.0/addons/account/models/account_move.py',
  'https://raw.githubusercontent.com/odoo/odoo/18.0/addons/account/models/account_move_line.py',
];

/**
 * The payload names accounts and the journal by database id, because that is what a many2one field takes;
 * the external API documents a many2one as an id, and documents no lookup by code.
 */
const DRAFT_FIELDS = ['account_id and journal_id as Odoo database ids'];

/** The Odoo target: an `account.move` payload for the external API's create call. */
export const odooExport: AccountingExport = {
  id: 'odoo',
  label: 'Odoo journal entries',
  documentation: DOCUMENTATION,
  draftFields: DRAFT_FIELDS,
  mappingRequirements: ['journal'],

  /**
   * Refuses a mapping whose identifiers are not database ids.
   *
   * Odoo's create call takes an integer for every many2one, so a school that maps an account to a code
   * such as `4000` would post to whatever record happens to carry that id. The mapping file therefore
   * carries the ids Odoo assigned, and a non-numeric one is refused here rather than guessed at.
   */
  validateMapping(mapping: ChartMapping, document: AccountingDocument): readonly ExportIssue[] {
    const issues: ExportIssue[] = [];
    if (mapping.journal !== null && !isDatabaseId(mapping.journal)) {
      issues.push({
        path: 'mapping.journal',
        message: `Odoo posts into a journal by database id, not "${mapping.journal}"`,
      });
    }

    const checked = new Set<string>();
    for (const entry of document.entries) {
      for (const line of entry.lines) {
        if (checked.has(line.accountCode)) continue;
        checked.add(line.accountCode);
        if (!isDatabaseId(line.targetCode)) {
          issues.push({
            path: `mapping["${line.accountCode}"].targetCode`,
            message: `Odoo names an account by database id, not "${line.targetCode}"; map account ${line.accountCode} to the id Odoo assigned it`,
          });
        }
      }
    }
    return issues;
  },

  render(document: AccountingDocument, mapping: ChartMapping): ExportFile {
    const journalId = databaseId(mapping.journal ?? '');
    const payload = {
      resource: 'account.move',
      documents: document.entries.map((entry) => ({
        move_type: 'entry',
        journal_id: journalId,
        date: entry.date,
        ref: entry.reference,
        line_ids: entry.lines.map((line) => ({
          name: line.description,
          account_id: databaseId(line.targetCode),
          debit: line.side === 'debit' ? amountNumber(line.amountText) : 0,
          credit: line.side === 'credit' ? amountNumber(line.amountText) : 0,
        })),
      })),
    };

    return {
      target: 'odoo',
      filename: journalFileName('odoo-account-moves', 'json', document),
      mediaType: 'application/json',
      content: `${JSON.stringify(payload, null, 2)}\n`,
      documentation: DOCUMENTATION,
      draftFields: DRAFT_FIELDS,
    };
  },
};

/** True when the text is the digits of a database id, which validation has already established. */
function isDatabaseId(text: string): boolean {
  return /^[1-9]\d*$/.test(text);
}

/** An Odoo database id from the digits the mapping states; an external integer, not a SchoolPilot id. */
function databaseId(digits: string): number {
  return parseInt(digits, 10);
}
